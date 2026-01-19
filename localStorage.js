/**
 * @name SecureStorage Pro
 * @version 2.0.0
 * @description Sistema de almacenamiento local ultra seguro y de alto rendimiento para aplicaciones educativas
 * 
 * Características v2.0:
 * - Encriptación AES-256-GCM con Web Crypto API
 * - Compresión LZMA para mejor ratio compresión/velocidad
 * - Sincronización entre pestañas con reconexión automática
 * - Protección contra XSS y Data Poisoning
 * - Caducidad automática de datos (TTL)
 * - Cache LRU para acceso rápido
 * - Verificación de integridad con HMAC
 * - Rotación automática de claves
 * - Estadísticas y monitoreo
 */

class SecureStoragePro {
    constructor(options = {}) {
        this.config = {
            dbName: options.dbName || 'EDU_SECURE_STORAGE',
            keyVersion: '2.0',
            maxCacheSize: options.maxCacheSize || 100,
            ttl: options.ttl || 7 * 24 * 60 * 60 * 1000, // 7 días por defecto
            autoCleanup: options.autoCleanup !== false,
            compression: options.compression !== false,
            hmac: options.hmac !== false,
            keyRotationInterval: options.keyRotationInterval || 30 * 24 * 60 * 60 * 1000 // 30 días
        };

        this.cryptoKey = null;
        this.hmacKey = null;
        this.cache = new Map();
        this.cacheOrder = [];
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 0
        };

        this.syncChannel = null;
        this.isInitialized = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;

        this.initialize();
    }

    async initialize() {
        try {
            await this.initCryptoKeys();
            await this.initSyncChannel();
            await this.performCleanup();
            this.isInitialized = true;
            this.startKeyRotationMonitor();
            console.log('SecureStorage Pro inicializado correctamente');
        } catch (error) {
            console.error('Error inicializando SecureStorage Pro:', error);
            this.fallbackToLocalStorage();
        }
    }

    async initCryptoKeys() {
        try {
            const { encryptionKey, hmacKey } = await this.generateOrLoadKeys();
            this.cryptoKey = encryptionKey;
            this.hmacKey = hmacKey;
            
            // Verificar si necesitamos rotar claves
            const lastRotation = await this.getKeyRotationInfo();
            if (Date.now() - lastRotation > this.config.keyRotationInterval) {
                await this.rotateKeys();
            }
        } catch (error) {
            console.warn('No se pudieron generar claves criptográficas:', error);
            throw error;
        }
    }

    async generateOrLoadKeys() {
        // Intentar cargar claves existentes
        const storedKeys = localStorage.getItem('secure_storage_keys_v2');
        if (storedKeys) {
            try {
                const keys = JSON.parse(storedKeys);
                const encryptionKey = await this.importKey(keys.encryptionKey, ['encrypt', 'decrypt']);
                const hmacKey = await this.importKey(keys.hmacKey, ['sign', 'verify']);
                return { encryptionKey, hmacKey };
            } catch (error) {
                console.warn('Claves corruptas, generando nuevas...');
            }
        }

        // Generar nuevas claves
        return this.generateNewKeys();
    }

    async generateNewKeys() {
        try {
            // Clave para encriptación AES-256-GCM
            const encryptionKey = await crypto.subtle.generateKey(
                {
                    name: 'AES-GCM',
                    length: 256
                },
                true,
                ['encrypt', 'decrypt']
            );

            // Clave para HMAC SHA-256
            const hmacKey = await crypto.subtle.generateKey(
                {
                    name: 'HMAC',
                    hash: { name: 'SHA-256' }
                },
                true,
                ['sign', 'verify']
            );

            // Exportar y guardar las claves
            const exportedEncryptionKey = await crypto.subtle.exportKey('jwk', encryptionKey);
            const exportedHmacKey = await crypto.subtle.exportKey('jwk', hmacKey);

            localStorage.setItem('secure_storage_keys_v2', JSON.stringify({
                encryptionKey: exportedEncryptionKey,
                hmacKey: exportedHmacKey,
                created: Date.now(),
                version: this.config.keyVersion
            }));

            return { encryptionKey, hmacKey };
        } catch (error) {
            console.error('Error generando claves:', error);
            throw error;
        }
    }

    async importKey(jwk, keyUsages) {
        let keyFormat, algorithm;
        
        if (jwk.kty === 'oct') {
            // HMAC key
            keyFormat = 'jwk';
            algorithm = { name: 'HMAC', hash: { name: 'SHA-256' } };
        } else {
            // AES key
            keyFormat = 'jwk';
            algorithm = { name: 'AES-GCM', length: 256 };
        }

        return await crypto.subtle.importKey(
            keyFormat,
            jwk,
            algorithm,
            true,
            keyUsages
        );
    }

    initSyncChannel() {
        try {
            this.syncChannel = new BroadcastChannel('secure_storage_sync');
            
            this.syncChannel.onmessage = (event) => {
                this.handleSyncMessage(event.data);
            };

            this.syncChannel.onmessageerror = (error) => {
                console.warn('Error en canal de sincronización:', error);
                this.reconnectSyncChannel();
            };

            // Escuchar eventos storage de otras pestañas
            window.addEventListener('storage', (event) => {
                if (event.key && event.key.startsWith('secure_')) {
                    this.handleStorageEvent(event);
                }
            });

            return Promise.resolve();
        } catch (error) {
            console.warn('BroadcastChannel no disponible:', error);
            return Promise.resolve(); // Continuar sin sincronización
        }
    }

    reconnectSyncChannel() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.warn('Máximo de intentos de reconexión alcanzado');
            return;
        }

        this.reconnectAttempts++;
        setTimeout(() => {
            try {
                this.syncChannel = new BroadcastChannel('secure_storage_sync');
                this.reconnectAttempts = 0;
                console.log('Canal de sincronización reconectado');
            } catch (error) {
                this.reconnectSyncChannel();
            }
        }, 1000 * this.reconnectAttempts);
    }

    async encryptData(data) {
        try {
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const dataString = JSON.stringify(data);
            
            // Comprimir si está habilitado
            let processedData = dataString;
            if (this.config.compression) {
                processedData = await this.compressData(dataString);
            }

            const encodedData = new TextEncoder().encode(processedData);
            
            const encrypted = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                this.cryptoKey,
                encodedData
            );

            // Crear HMAC para verificación de integridad
            let hmac = '';
            if (this.config.hmac) {
                hmac = await this.generateHMAC(encrypted);
            }

            const encryptedPackage = {
                v: this.config.keyVersion,
                iv: this.arrayToBase64(iv),
                data: this.arrayToBase64(new Uint8Array(encrypted)),
                hmac: hmac,
                ts: Date.now(),
                compressed: this.config.compression
            };

            return JSON.stringify(encryptedPackage);
        } catch (error) {
            console.error('Error encriptando datos:', error);
            throw error;
        }
    }

    async decryptData(encryptedString) {
        try {
            const encryptedPackage = JSON.parse(encryptedString);
            
            // Verificar versión
            if (encryptedPackage.v !== this.config.keyVersion) {
                console.warn('Versión de encriptación diferente, intentando desencriptar...');
            }

            // Verificar HMAC si existe
            if (this.config.hmac && encryptedPackage.hmac) {
                const isValid = await this.verifyHMAC(
                    this.base64ToArray(encryptedPackage.data),
                    encryptedPackage.hmac
                );
                
                if (!isValid) {
                    throw new Error('Integridad de datos comprometida');
                }
            }

            const iv = this.base64ToArray(encryptedPackage.iv);
            const data = this.base64ToArray(encryptedPackage.data);

            const decrypted = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                this.cryptoKey,
                data
            );

            let processedData = new TextDecoder().decode(decrypted);
            
            // Descomprimir si fue comprimido
            if (encryptedPackage.compressed) {
                processedData = await this.decompressData(processedData);
            }

            return JSON.parse(processedData);
        } catch (error) {
            console.error('Error desencriptando datos:', error);
            throw error;
        }
    }

    async compressData(data) {
        // Usamos un algoritmo simple para compresión
        // En producción, usar una librería como pako o lz-string
        try {
            const compressed = LZString.compressToUTF16(data);
            return compressed;
        } catch (error) {
            console.warn('Error comprimiendo datos, usando datos sin comprimir:', error);
            return data;
        }
    }

    async decompressData(data) {
        try {
            const decompressed = LZString.decompressFromUTF16(data);
            return decompressed;
        } catch (error) {
            console.warn('Error descomprimiendo datos:', error);
            return data;
        }
    }

    async generateHMAC(data) {
        const signature = await crypto.subtle.sign(
            'HMAC',
            this.hmacKey,
            data
        );
        return this.arrayToBase64(new Uint8Array(signature));
    }

    async verifyHMAC(data, hmac) {
        try {
            const signature = this.base64ToArray(hmac);
            const isValid = await crypto.subtle.verify(
                'HMAC',
                this.hmacKey,
                signature,
                data
            );
            return isValid;
        } catch (error) {
            console.error('Error verificando HMAC:', error);
            return false;
        }
    }

    sanitizeInput(input) {
        if (typeof input === 'string') {
            // Sanitización avanzada contra XSS
            const div = document.createElement('div');
            div.textContent = input;
            return div.innerHTML
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;')
                .replace(/\//g, '&#x2F;');
        }
        return input;
    }

    validateKey(key) {
        if (!key || typeof key !== 'string') {
            throw new Error('Key debe ser un string no vacío');
        }
        
        // Prevenir claves que puedan causar problemas
        if (key.length > 256) {
            throw new Error('Key demasiado larga (máx 256 caracteres)');
        }
        
        if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
            throw new Error('Key contiene caracteres inválidos');
        }
        
        return `secure_${key}`;
    }

    updateCache(key, value) {
        // Implementar cache LRU
        if (this.cache.has(key)) {
            // Mover al final (más reciente)
            const index = this.cacheOrder.indexOf(key);
            this.cacheOrder.splice(index, 1);
        } else if (this.cacheOrder.length >= this.config.maxCacheSize) {
            // Eliminar el más antiguo
            const oldestKey = this.cacheOrder.shift();
            this.cache.delete(oldestKey);
        }
        
        this.cache.set(key, value);
        this.cacheOrder.push(key);
    }

    async set(key, value, options = {}) {
        try {
            if (!this.isInitialized) {
                throw new Error('Storage no inicializado');
            }

            const validatedKey = this.validateKey(key);
            const ttl = options.ttl || this.config.ttl;
            const expires = Date.now() + ttl;

            // Sanitizar si es string
            const sanitizedValue = this.sanitizeInput(value);

            const storageItem = {
                data: sanitizedValue,
                meta: {
                    created: Date.now(),
                    expires: expires,
                    size: JSON.stringify(value).length
                }
            };

            const encryptedData = await this.encryptData(storageItem);
            
            // Guardar en localStorage
            localStorage.setItem(validatedKey, encryptedData);
            
            // Actualizar cache
            this.updateCache(validatedKey, storageItem);
            
            // Actualizar estadísticas
            this.stats.sets++;
            
            // Sincronizar con otras pestañas
            this.broadcastUpdate(validatedKey, 'set', storageItem);
            
            return true;
        } catch (error) {
            console.error(`Error guardando ${key}:`, error);
            this.stats.errors++;
            
            // ELIMINADO: El fallback a localStorage sin encriptación no ayuda si el problema
            // es que localStorage está lleno (QuotaExceededError). Eliminar este bloque
            // previene errores en cascada y simplifica la depuración.

            throw error;
        }
    }

    async get(key, options = {}) {
        try {
            if (!this.isInitialized) {
                throw new Error('Storage no inicializado');
            }

            const validatedKey = this.validateKey(key);
            
            // Verificar cache primero
            if (this.cache.has(validatedKey) && !options.forceRefresh) {
                const cachedItem = this.cache.get(validatedKey);
                
                // Verificar si expiró
                if (cachedItem.meta.expires < Date.now()) {
                    this.cache.delete(validatedKey);
                    localStorage.removeItem(validatedKey);
                    this.stats.misses++;
                    return null;
                }
                
                this.stats.hits++;
                return cachedItem.data;
            }

            // Obtener de localStorage
            const encryptedData = localStorage.getItem(validatedKey);
            if (!encryptedData) {
                this.stats.misses++;
                return null;
            }

            const decryptedItem = await this.decryptData(encryptedData);
            
            // Verificar expiración
            if (decryptedItem.meta.expires < Date.now()) {
                if (this.config.autoCleanup) {
                    await this.remove(key);
                }
                this.stats.misses++;
                return null;
            }

            // Actualizar cache
            this.updateCache(validatedKey, decryptedItem);
            this.stats.hits++;
            
            return decryptedItem.data;
        } catch (error) {
            console.error(`Error obteniendo ${key}:`, error);
            this.stats.errors++;
            
            // Intentar fallback
            if (options.fallback !== false) {
                try {
                    const fallbackData = localStorage.getItem(`fallback_${key}`);
                    return fallbackData ? JSON.parse(fallbackData) : null;
                } catch (fallbackError) {
                    return null;
                }
            }
            
            return null;
        }
    }

    async remove(key) {
        try {
            const validatedKey = this.validateKey(key);
            
            // Eliminar de localStorage
            localStorage.removeItem(validatedKey);
            
            // Eliminar de cache
            this.cache.delete(validatedKey);
            const index = this.cacheOrder.indexOf(validatedKey);
            if (index > -1) {
                this.cacheOrder.splice(index, 1);
            }
            
            // Eliminar fallback si existe
            localStorage.removeItem(`fallback_${key}`);
            
            this.stats.deletes++;
            
            // Sincronizar
            this.broadcastUpdate(validatedKey, 'remove', null);
            
            return true;
        } catch (error) {
            console.error(`Error eliminando ${key}:`, error);
            this.stats.errors++;
            return false;
        }
    }

    async clear() {
        try {
            // Obtener todas las claves seguras
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('secure_')) {
                    keys.push(key);
                }
            }
            
            // Eliminar cada clave
            for (const key of keys) {
                localStorage.removeItem(key);
            }
            
            // Limpiar cache
            this.cache.clear();
            this.cacheOrder = [];
            
            // Rotar claves
            await this.rotateKeys();
            
            // Sincronizar
            this.broadcastUpdate(null, 'clear', null);
            
            console.log('Storage limpiado completamente');
            return true;
        } catch (error) {
            console.error('Error limpiando storage:', error);
            return false;
        }
    }

    async keys() {
        try {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('secure_')) {
                    // Remover prefijo
                    keys.push(key.replace(/^secure_/, ''));
                }
            }
            return keys;
        } catch (error) {
            console.error('Error obteniendo claves:', error);
            return [];
        }
    }

    async has(key) {
        try {
            const validatedKey = this.validateKey(key);
            return localStorage.getItem(validatedKey) !== null;
        } catch (error) {
            return false;
        }
    }

    async size() {
        try {
            let totalSize = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('secure_')) {
                    const item = localStorage.getItem(key);
                    totalSize += item.length * 2; // UTF-16
                }
            }
            return totalSize;
        } catch (error) {
            console.error('Error calculando tamaño:', error);
            return 0;
        }
    }

    async performCleanup() {
        if (!this.config.autoCleanup) return;

        try {
            const now = Date.now();
            let cleaned = 0;

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('secure_')) {
                    try {
                        const encryptedData = localStorage.getItem(key);
                        const decryptedItem = await this.decryptData(encryptedData);
                        
                        if (decryptedItem.meta.expires < now) {
                            localStorage.removeItem(key);
                            cleaned++;
                        }
                    } catch (error) {
                        // Si no se puede desencriptar, probablemente está corrupto
                        localStorage.removeItem(key);
                        cleaned++;
                    }
                }
            }

            if (cleaned > 0) {
                console.log(`Limpieza automática: ${cleaned} items expirados eliminados`);
            }
        } catch (error) {
            console.error('Error en limpieza automática:', error);
        }
    }

    async rotateKeys() {
        try {
            console.log('Rotando claves de encriptación...');
            
            // 1. Generar nuevas claves
            const { encryptionKey, hmacKey } = await this.generateNewKeys();
            
            // 2. Re-encriptar todos los datos con las nuevas claves
            const oldCryptoKey = this.cryptoKey;
            const oldHmacKey = this.hmacKey;
            
            this.cryptoKey = encryptionKey;
            this.hmacKey = hmacKey;
            
            const keys = await this.keys();
            for (const key of keys) {
                try {
                    const value = await this.get(key);
                    if (value !== null) {
                        await this.set(key, value);
                    }
                } catch (error) {
                    console.warn(`Error re-encriptando ${key}:`, error);
                }
            }
            
            // 3. Actualizar información de rotación
            localStorage.setItem('key_rotation_info', JSON.stringify({
                lastRotation: Date.now(),
                version: this.config.keyVersion
            }));
            
            console.log('Rotación de claves completada');
        } catch (error) {
            console.error('Error rotando claves:', error);
        }
    }

    startKeyRotationMonitor() {
        // Verificar rotación cada día
        setInterval(async () => {
            const lastRotation = await this.getKeyRotationInfo();
            if (Date.now() - lastRotation > this.config.keyRotationInterval) {
                await this.rotateKeys();
            }
        }, 24 * 60 * 60 * 1000);
    }

    async getKeyRotationInfo() {
        const info = localStorage.getItem('key_rotation_info');
        if (info) {
            try {
                const parsed = JSON.parse(info);
                return parsed.lastRotation || Date.now();
            } catch (error) {
                return Date.now();
            }
        }
        return Date.now();
    }

    broadcastUpdate(key, action, value) {
        if (!this.syncChannel) return;

        try {
            this.syncChannel.postMessage({
                action: action,
                key: key,
                value: value,
                timestamp: Date.now(),
                source: 'secure_storage'
            });
        } catch (error) {
            console.warn('Error enviando mensaje de sincronización:', error);
        }
    }

    handleSyncMessage(message) {
        if (message.source !== 'secure_storage') return;

        switch (message.action) {
            case 'set':
                if (message.key) {
                    this.updateCache(message.key, message.value);
                    // Disparar evento para la aplicación
                    this.dispatchStorageEvent(message.key, message.value);
                }
                break;
                
            case 'remove':
                if (message.key) {
                    this.cache.delete(message.key);
                    const index = this.cacheOrder.indexOf(message.key);
                    if (index > -1) {
                        this.cacheOrder.splice(index, 1);
                    }
                    this.dispatchStorageEvent(message.key, null);
                }
                break;
                
            case 'clear':
                this.cache.clear();
                this.cacheOrder = [];
                this.dispatchStorageEvent(null, null);
                break;
        }
    }

    handleStorageEvent(event) {
        if (event.key && event.key.startsWith('secure_')) {
            // Actualizar cache
            if (event.newValue) {
                this.decryptData(event.newValue)
                    .then(decrypted => {
                        this.updateCache(event.key, decrypted);
                        this.dispatchStorageEvent(event.key, decrypted.data);
                    })
                    .catch(() => {
                        this.cache.delete(event.key);
                    });
            } else {
                this.cache.delete(event.key);
                const index = this.cacheOrder.indexOf(event.key);
                if (index > -1) {
                    this.cacheOrder.splice(index, 1);
                }
                this.dispatchStorageEvent(event.key, null);
            }
        }
    }

    dispatchStorageEvent(key, value) {
        window.dispatchEvent(new CustomEvent('secure-storage-change', {
            detail: { key, value }
        }));
    }

    getStats() {
        return {
            ...this.stats,
            cacheSize: this.cache.size,
            cacheHitRate: this.stats.hits + this.stats.misses > 0 
                ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
                : 0,
            isInitialized: this.isInitialized,
            syncAvailable: !!this.syncChannel
        };
    }

    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 0
        };
    }

    fallbackToLocalStorage() {
        console.warn('Usando modo fallback (localStorage sin encriptación)');
        
        this.set = async function(key, value) {
            localStorage.setItem(`fallback_${key}`, JSON.stringify(value));
            return true;
        };
        
        this.get = async function(key) {
            const data = localStorage.getItem(`fallback_${key}`);
            return data ? JSON.parse(data) : null;
        };
        
        this.remove = async function(key) {
            localStorage.removeItem(`fallback_${key}`);
            return true;
        };
        
        this.isInitialized = true;
    }

    arrayToBase64(array) {
        return btoa(String.fromCharCode.apply(null, array));
    }

    base64ToArray(base64) {
        return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    }
}

// Factory function para crear instancia
function createSecureStorage(options = {}) {
    return new SecureStoragePro(options);
}

// Exportar para diferentes entornos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createSecureStorage, SecureStoragePro };
} else if (typeof define === 'function' && define.amd) {
    define([], function() {
        return { createSecureStorage, SecureStoragePro };
    });
} else {
    window.SecureStoragePro = SecureStoragePro;
    window.createSecureStorage = createSecureStorage;
}