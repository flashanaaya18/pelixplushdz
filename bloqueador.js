// bloqueador.js - Bloqueador de contenido funcional con medidas de seguridad
// Versión: 1.0 (Educativa)
// Propósito: Tarea escolar - demostración técnica
// ADVERTENCIA: Usar solo en sitios propios o con permiso

(function() {
    'use strict';
    
    // ===== CONFIGURACIÓN DE SEGURIDAD =====
    const CONFIG_SEGURIDAD = {
        // Evita interferir con sitios bancarios/gobierno
        sitiosExcluidos: [
            /^https?:\/\/(www\.)?(banco|bancamiga|banesco|provincial|mercantil|bbva|bcv|gov|gobierno|seniat)\./i,
            /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.)/i,
            /online\.banking|bancanet|homebanking/i
        ],
        
        // Evita romper funcionalidades esenciales
        noBloquearSelectores: [
            '[data-adblock-ignore]',
            '[data-no-block]',
            '.essential-ad', // Anuncios marcados como esenciales
            '#cookie-notice',
          '[role="alert"]',
          '[aria-live="polite"]'
        ],
        
        // Lista blanca de dominios
        whitelist: [
            'github.com',
            'stackoverflow.com',
            'developer.mozilla.org',
            'w3schools.com',
            'google.com/search',
            'youtube.com/embed/' // Para videos educativos embebidos
        ]
    };
    
    // ===== VERIFICACIÓN DE SEGURIDAD INICIAL =====
    function verificarSeguridad() {
        const urlActual = window.location.href;
        
        // Verificar si estamos en un sitio excluido
        for (const patron of CONFIG_SEGURIDAD.sitiosExcluidos) {
            if (patron.test(urlActual)) {
                console.warn('⚠️ Bloqueador desactivado por seguridad en este sitio');
                return false;
            }
        }
        
        // Verificar lista blanca
        for (const dominio of CONFIG_SEGURIDAD.whitelist) {
            if (urlActual.includes(dominio)) {
                console.log('✅ Sitio en lista blanca, bloqueador limitado');
                return 'limited';
            }
        }
        
        return true;
    }
    
    // ===== CONFIGURACIÓN PRINCIPAL =====
    const CONFIG = {
        // Niveles de bloqueo
        nivelBloqueo: 'agresivo', // 'ligero', 'medio', 'agresivo'
        
        // Qué bloquear
        bloquearAnuncios: true,
        bloquearTrackers: true,
        bloquearPopups: true,
        bloquearCryptominers: true,
        bloquearSocialWidgets: false, // Los desactivo para no romper sitios
        bloquearFuentesExternas: false,
        
        // Opciones de UI
        mostrarContador: true,
        notificarBloqueos: false, // Cambiar a true para debug
        
        // Performance
        throttleDelay: 100,
        maxElementosPorSegundo: 1000
    };
    
    // ===== LISTAS DE BLOQUEO =====
    const LISTAS_BLOQUEO = {
        // Dominios de anuncios (actualizado)
        anuncios: [
            'doubleclick.net',
            'googleadservices.com',
            'googlesyndication.com',
            'google-analytics.com',
            'facebook.com/tr/',
            'amazon-adsystem.com',
            'adsystem.com',
            'adnxs.com',
            'adsrvr.org',
            'taboola.com',
            'outbrain.com',
            'scorecardresearch.com',
            'zedo.com',
            'advertising.com',
            '2mdn.net',
            'ads.twitter.com',
            'ads.youtube.com',
            'telemetry.mozilla.org',
            'adservice.google.',
            'ads.facebook.com'
        ],
        
        // Trackers
        trackers: [
            'track.',
            'analytics.',
            'metrics.',
            'pixel.',
            'beacon.',
            'tagmanager.',
            'stat.',
            'counter.',
            'collector.',
            'log.',
            'telemetry.'
        ],
        
        // Cryptominers
        miners: [
            'coinhive.com',
            'cryptoloot.pro',
            'miner.pr0gramm',
            'miner.nablabee',
            'miner.cryptobara',
            'jscoinminer.com',
            'webmine.pro',
            'webmine.cz',
            'miner.nimiq.com',
            'crypto-loot.com'
        ],
        
        // Selectores CSS comunes de anuncios
        selectoresCSS: [
            // IDs
            '[id*="ad"]',
            '[id*="Ad"]',
            '[id*="banner"]',
            '[id*="Banner"]',
            '[id*="popup"]',
            '[id*="Popup"]',
            '[id*="sponsor"]',
            '[id*="Sponsor"]',
            '[id^="google_ads"]',
            '[id*="ad_"]',
            
            // Classes
            '[class*="ad"]',
            '[class*="Ad"]',
            '[class*="banner"]',
            '[class*="Banner"]',
            '[class*="popup"]',
            '[class*="Popup"]',
            '[class*="sponsor"]',
            '[class*="Sponsor"]',
            '[class*="advertisement"]',
            '[class*="publicidad"]',
            
            // Elementos específicos
            'iframe[src*="ad"]',
            'iframe[src*="banner"]',
            'ins.adsbygoogle',
            'div[data-ad]',
            'div[data-ad-client]',
            'div[data-ad-slot]',
            'div[data-ad-unit]',
            
            // Overlays y popups
            '.overlay',
            '.modal',
            '.lightbox',
            '[data-modal]',
            '[data-popup]',
            '.popup-backdrop',
            '.cookie-banner',
            '.newsletter-popup'
        ]
    };
    
    // ===== VARIABLES GLOBALES =====
    let contadorBloqueos = {
        anuncios: 0,
        trackers: 0,
        popups: 0,
        miners: 0,
        elementos: 0
    };
    
    let estaActivo = true;
    let ultimoBloqueo = Date.now();
    
    // ===== FUNCIONES PRINCIPALES =====
    
    /**
     * Bloquea elementos DOM basado en selectores CSS
     */
    function bloquearElementosDOM() {
        if (!estaActivo) return;
        
        const ahora = Date.now();
        if (ahora - ultimoBloqueo < CONFIG.throttleDelay) return;
        
        let elementosBloqueados = 0;
        
        LISTAS_BLOQUEO.selectoresCSS.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(elemento => {
                    // Verificar si está en lista de no-bloquear
                    if (!deberiaBloquearElemento(elemento)) return;
                    
                    // Verificar medidas mínimas para evitar bloquear elementos importantes
                    if (esElementoImportante(elemento)) return;
                    
                    // Aplicar bloqueo
                    elemento.style.cssText += '; display: none !important; visibility: hidden !important; height: 0 !important; width: 0 !important; opacity: 0 !important; pointer-events: none !important; position: absolute !important;';
                    elemento.setAttribute('data-bloqueado-por', 'bloqueador-js');
                    
                    elementosBloqueados++;
                    contadorBloqueos.elementos++;
                    
                    if (CONFIG.notificarBloqueos) {
                        console.log(`🚫 Bloqueado elemento: ${selector}`);
                    }
                });
            } catch (e) {
                // Error silencioso para no interrumpir la página
            }
        });
        
        ultimoBloqueo = ahora;
        
        if (elementosBloqueados > 0 && CONFIG.notificarBloqueos) {
            console.log(`📊 Bloqueados ${elementosBloqueados} elementos DOM`);
        }
    }
    
    /**
     * Determina si un elemento debería ser bloqueado
     */
    function deberiaBloquearElemento(elemento) {
        // Verificar lista de no-bloquear
        for (const selector of CONFIG_SEGURIDAD.noBloquearSelectores) {
            if (elemento.matches(selector)) {
                return false;
            }
        }
        
        // Verificar atributos de exclusión
        if (elemento.hasAttribute('data-adblock-ignore') || 
            elemento.hasAttribute('data-no-block') ||
            elemento.hasAttribute('aria-live') ||
            elemento.getAttribute('role') === 'alert') {
            return false;
        }
        
        // Elementos con contenido importante
        const texto = elemento.textContent || '';
        if (texto.includes('error') || 
            texto.includes('importante') || 
            texto.includes('alerta') ||
            texto.includes('cookies') ||
            elemento.querySelector('form')) {
            // Verificar si realmente es un anuncio
            const estilos = window.getComputedStyle(elemento);
            if (estilos.position === 'fixed' || estilos.zIndex > 1000) {
                return true; // Probable overlay publicitario
            }
            return false; // Podría ser importante
        }
        
        return true;
    }
    
    /**
     * Verifica si un elemento es importante para la página
     */
    function esElementoImportante(elemento) {
        // Elementos de navegación
        const tagName = elemento.tagName.toLowerCase();
        if (['nav', 'header', 'footer', 'main', 'article', 'section'].includes(tagName)) {
            return true;
        }
        
        // Formularios importantes
        if (tagName === 'form' && (
            elemento.action.includes('login') || 
            elemento.action.includes('signin') ||
            elemento.action.includes('checkout'))) {
            return true;
        }
        
        // Contenido con mucho texto (probablemente no es anuncio)
        const texto = elemento.textContent || '';
        if (texto.length > 500 && texto.split(' ').length > 50) {
            return true;
        }
        
        // Elementos con vídeos
        if (elemento.querySelector('video, iframe[src*="youtube"], iframe[src*="vimeo"]')) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Intercepta peticiones de red
     */
    function interceptarPeticionesRed() {
        if (!estaActivo) return;
        
        // Interceptar fetch API
        const fetchOriginal = window.fetch;
        window.fetch = function(...args) {
            const url = args[0] instanceof Request ? args[0].url : args[0];
            
            if (deberiaBloquearURL(url)) {
                if (CONFIG.notificarBloqueos) {
                    console.log(`🚫 Bloqueada petición fetch: ${url}`);
                }
                registrarBloqueo(url);
                return Promise.reject(new Error('Bloqueado por bloqueador.js'));
            }
            
            return fetchOriginal.apply(this, args);
        };
        
        // Interceptar XMLHttpRequest
        const XHR = XMLHttpRequest;
        const openOriginal = XHR.prototype.open;
        XHR.prototype.open = function(method, url) {
            if (deberiaBloquearURL(url)) {
                if (CONFIG.notificarBloqueos) {
                    console.log(`🚫 Bloqueada petición XHR: ${url}`);
                }
                registrarBloqueo(url);
                this._bloqueado = true;
                return;
            }
            openOriginal.apply(this, arguments);
        };
        
        // Interceptar send
        const sendOriginal = XHR.prototype.send;
        XHR.prototype.send = function(...args) {
            if (this._bloqueado) {
                return;
            }
            sendOriginal.apply(this, args);
        };
    }
    
    /**
     * Determina si una URL debería ser bloqueada
     */
    function deberiaBloquearURL(url) {
        if (!url) return false;
        
        const urlStr = url.toString().toLowerCase();
        
        // Verificar anuncios
        if (CONFIG.bloquearAnuncios) {
            for (const dominio of LISTAS_BLOQUEO.anuncios) {
                if (urlStr.includes(dominio.toLowerCase())) {
                    contadorBloqueos.anuncios++;
                    return true;
                }
            }
        }
        
        // Verificar trackers
        if (CONFIG.bloquearTrackers) {
            for (const tracker of LISTAS_BLOQUEO.trackers) {
                if (urlStr.includes(tracker.toLowerCase())) {
                    contadorBloqueos.trackers++;
                    return true;
                }
            }
        }
        
        // Verificar miners
        if (CONFIG.bloquearCryptominers) {
            for (const miner of LISTAS_BLOQUEO.miners) {
                if (urlStr.includes(miner.toLowerCase())) {
                    contadorBloqueos.miners++;
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Registra un bloqueo
     */
    function registrarBloqueo(url) {
        // Solo registrar si es necesario
        if (!CONFIG.notificarBloqueos) return;
        
        const dominio = new URL(url).hostname;
        console.group('🚫 Bloqueo registrado');
        console.log('URL:', url);
        console.log('Dominio:', dominio);
        console.log('Timestamp:', new Date().toISOString());
        console.groupEnd();
    }
    
    /**
     * Bloquea popups y ventanas emergentes
     */
    function bloquearPopups() {
        if (!CONFIG.bloquearPopups || !estaActivo) return;
        
        // Bloquear window.open
        const openOriginal = window.open;
        window.open = function(url, name, specs, replace) {
            if (CONFIG.notificarBloqueos) {
                console.log('🚫 Popup bloqueado:', url);
            }
            contadorBloqueos.popups++;
            
            // Devolver una ventana falsa
            const fakeWindow = {
                closed: true,
                close: function() {},
                focus: function() {},
                blur: function() {},
                document: { write: function() {}, close: function() {} }
            };
            
            return fakeWindow;
        };
        
        // Bloquear alertas automáticas después de carga
        setTimeout(() => {
            window.alert = function(message) {
                console.log('🚫 Alert bloqueado:', message.substring(0, 100));
                return true;
            };
            
            window.confirm = function(message) {
                console.log('🚫 Confirm bloqueado:', message.substring(0, 100));
                return false;
            };
        }, 3000);
    }
    
    /**
     * Crea la UI del bloqueador
     */
    function crearUI() {
        if (!CONFIG.mostrarContador) return;
        
        const ui = document.createElement('div');
        ui.id = 'bloqueador-ui';
        ui.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-family: Arial, sans-serif;
            font-size: 12px;
            z-index: 2147483647;
            backdrop-filter: blur(5px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            max-width: 200px;
            transition: all 0.3s ease;
        `;
        
        function actualizarUI() {
            const total = Object.values(contadorBloqueos).reduce((a, b) => a + b, 0);
            ui.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: #4CAF50; font-weight: bold;">🔒</span>
                    <div>
                        <div style="font-weight: bold;">Bloqueados: ${total}</div>
                        <div style="font-size: 10px; opacity: 0.8;">
                            A:${contadorBloqueos.anuncios} T:${contadorBloqueos.trackers}
                        </div>
                    </div>
                    <button id="toggle-bloqueador" style="
                        background: rgba(255,255,255,0.1);
                        border: none;
                        color: white;
                        border-radius: 3px;
                        padding: 2px 6px;
                        font-size: 10px;
                        cursor: pointer;
                    ">${estaActivo ? 'ON' : 'OFF'}</button>
                </div>
            `;
            
            document.getElementById('toggle-bloqueador').addEventListener('click', () => {
                estaActivo = !estaActivo;
                actualizarUI();
                console.log(`Bloqueador ${estaActivo ? 'activado' : 'desactivado'}`);
            });
        }
        
        document.addEventListener('DOMContentLoaded', () => {
            document.body.appendChild(ui);
            actualizarUI();
            
            // Actualizar cada 2 segundos
            setInterval(actualizarUI, 2000);
        });
    }
    
    /**
     * Observa mutaciones del DOM para bloquear elementos nuevos
     */
    function observarDOM() {
        const observer = new MutationObserver((mutations) => {
            if (!estaActivo) return;
            
            let elementosNuevos = false;
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length > 0) {
                    elementosNuevos = true;
                }
            });
            
            if (elementosNuevos) {
                setTimeout(bloquearElementosDOM, 100);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    /**
     * Detecta y bloquea scripts maliciosos
     */
    function bloquearScriptsMaliciosos() {
        // Bloquear WebSocket a servidores conocidos de miners
        const WebSocketOriginal = window.WebSocket;
        window.WebSocket = function(url, protocols) {
            if (url && LISTAS_BLOQUEO.miners.some(miner => url.includes(miner))) {
                console.log('🚫 WebSocket a miner bloqueado:', url);
                contadorBloqueos.miners++;
                throw new Error('Conexión bloqueada por seguridad');
            }
            return new WebSocketOriginal(url, protocols);
        };
        
        // Detectar scripts de mining en ejecución
        const detectarMiners = setInterval(() => {
            if (!estaActivo) return;
            
            // Detectar alto uso de CPU
            if (performance && performance.now) {
                const scripts = document.scripts;
                for (let script of scripts) {
                    if (script.src && LISTAS_BLOQUEO.miners.some(m => script.src.includes(m))) {
                        script.remove();
                        console.log('🚫 Script de minería eliminado');
                    }
                }
            }
        }, 5000);
    }
    
    /**
     * Protege contra bypass attempts
     */
    function protegerContraBypass() {
        // Prevenir que otros scripts desactiven nuestro bloqueador
        Object.defineProperty(window, 'bloqueadorDesactivado', {
            value: false,
            writable: false,
            configurable: false
        });
        
        // Detectar intentos de modificación
        const propiedadesProtegidas = ['fetch', 'open', 'XMLHttpRequest', 'WebSocket'];
        propiedadesProtegidas.forEach(prop => {
            const original = window[prop];
            Object.defineProperty(window, prop, {
                get: () => original,
                set: (value) => {
                    console.warn(`⚠️ Intento de modificar ${prop} detectado`);
                    // No permitir modificación si el bloqueador está activo
                    if (estaActivo) {
                        return original;
                    }
                    return value;
                },
                configurable: false
            });
        });
    }
    
    /**
     * Inicializa el bloqueador
     */
    function inicializar() {
        console.log('🚀 Inicializando Bloqueador.js - Modo educativo');
        
        // Verificar seguridad primero
        const estadoSeguridad = verificarSeguridad();
        if (estadoSeguridad === false) {
            console.log('⏹️ Bloqueador desactivado por seguridad');
            return;
        }
        
        if (estadoSeguridad === 'limited') {
            CONFIG.nivelBloqueo = 'ligero';
            CONFIG.notificarBloqueos = true;
        }
        
        // Inicializar componentes
        protegerContraBypass();
        interceptarPeticionesRed();
        bloquearPopups();
        bloquearScriptsMaliciosos();
        crearUI();
        
        // Esperar a que el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                bloquearElementosDOM();
                observarDOM();
            });
        } else {
            bloquearElementosDOM();
            observarDOM();
        }
        
        // Bloquear periódicamente
        setInterval(bloquearElementosDOM, 2000);
        
        console.log('✅ Bloqueador.js activo - Modo:', CONFIG.nivelBloqueo);
        console.log('📊 Configuración:', JSON.stringify(CONFIG, null, 2));
    }
    
    // ===== INICIALIZACIÓN =====
    
    // Retrasar inicialización para no interferir con carga de página
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(inicializar, 100);
        });
    } else {
        setTimeout(inicializar, 100);
    }
    
    // ===== API PÚBLICA (limitada para desarrollo) =====
    window.BloqueadorJS = {
        version: '1.0-educativo',
        estado: () => estaActivo,
        estadisticas: () => ({...contadorBloqueos}),
        desactivar: () => {
            console.warn('Bloqueador desactivado por API');
            estaActivo = false;
        },
        activar: () => {
            console.log('Bloqueador activado por API');
            estaActivo = true;
            bloquearElementosDOM();
        }
    };
    
})();