// =============================================
// 🎬 SISTEMA "SEGUIR VIENDO" - COMPLETO Y FUNCIONAL
// =============================================

// DataManager mejorado con funciones de "Seguir Viendo"
window.dataManager = {
    // Obtener usuario actual
    getCurrentUser() {
        const userData = JSON.parse(localStorage.getItem('peliXxUserData') || '{}');
        return userData.currentUser || 'default';
    },

    // Obtener datos del usuario
    getUserData() {
        const userData = JSON.parse(localStorage.getItem('peliXxUserData') || '{}');
        const currentUser = this.getCurrentUser();
        
        if (!userData[currentUser]) {
            userData[currentUser] = {
                continueWatching: {},
                watchHistory: [],
                favorites: [],
                preferences: {}
            };
            localStorage.setItem('peliXxUserData', JSON.stringify(userData));
        }
        
        return userData[currentUser];
    },

    // Guardar datos del usuario
    saveUserData(data) {
        const userData = JSON.parse(localStorage.getItem('peliXxUserData') || '{}');
        const currentUser = this.getCurrentUser();
        userData[currentUser] = data;
        localStorage.setItem('peliXxUserData', JSON.stringify(userData));
    },

    // ==================== "SEGUIR VIENDO" ====================
    
    // Obtener "Seguir Viendo"
    getContinueWatching() {
        return this.getUserData().continueWatching || {};
    },

    // Guardar "Seguir Viendo"
    saveContinueWatching(data) {
        const userData = this.getUserData();
        userData.continueWatching = data;
        this.saveUserData(userData);
    },

    // Agregar/actualizar contenido en "Seguir Viendo"
    addToContinueWatching(itemData) {
        console.log('🎬 Intentando agregar a "Seguir Viendo":', itemData);
        
        const continueWatching = this.getContinueWatching();
        
        // Verificar si el item tiene datos válidos
        if (!itemData || !itemData.id) {
            console.error('❌ Datos inválidos para "Seguir Viendo"');
            return false;
        }
        
        // Verificar si ya existe
        const existingItem = continueWatching[itemData.id];
        
        if (existingItem) {
            console.log('📝 Actualizando item existente en "Seguir Viendo"');
            // Actualizar timestamp
            continueWatching[itemData.id].lastWatched = new Date().toISOString();
            
            // Si tenemos tiempo actual, actualizarlo
            if (itemData.currentTime !== undefined) {
                continueWatching[itemData.id].currentTime = itemData.currentTime;
            }
            
            // Si tenemos duración, actualizarla
            if (itemData.duration !== undefined) {
                continueWatching[itemData.id].duration = itemData.duration;
            }
        } else {
            console.log('✨ Agregando nuevo item a "Seguir Viendo"');
            // Crear nuevo item con datos mínimos
            continueWatching[itemData.id] = {
                id: itemData.id,
                type: itemData.type || 'pelicula',
                title: itemData.title || itemData.name || 'Sin título',
                poster: itemData.poster || itemData.thumbnail || itemData.cover || '',
                currentTime: itemData.currentTime || 0,
                duration: itemData.duration || 0,
                lastWatched: new Date().toISOString(),
                progressPercentage: itemData.progressPercentage || 0
            };
        }
        
        this.saveContinueWatching(continueWatching);
        console.log('✅ Guardado en "Seguir Viendo":', continueWatching[itemData.id]);
        return true;
    },

    // Eliminar de "Seguir Viendo"
    removeFromContinueWatching(itemId) {
        const continueWatching = this.getContinueWatching();
        if (continueWatching[itemId]) {
            delete continueWatching[itemId];
            this.saveContinueWatching(continueWatching);
            console.log('🗑️ Eliminado de "Seguir Viendo":', itemId);
            return true;
        }
        return false;
    },

    // Limpiar todo "Seguir Viendo"
    clearContinueWatching() {
        this.saveContinueWatching({});
        console.log('🧹 "Seguir Viendo" limpiado completamente');
        return true;
    },

    // ==================== HISTORIAL ====================
    
    // Agregar al historial
    addToHistory(itemData) {
        const userData = this.getUserData();
        const history = userData.watchHistory || [];
        
        // Evitar duplicados recientes
        const existingIndex = history.findIndex(item => item.id === itemData.id);
        if (existingIndex > -1) {
            history.splice(existingIndex, 1);
        }
        
        // Agregar al inicio
        history.unshift({
            id: itemData.id,
            type: itemData.type || 'pelicula',
            title: itemData.title || itemData.name || 'Sin título',
            poster: itemData.poster || itemData.thumbnail || itemData.cover || '',
            watchedAt: new Date().toISOString(),
            durationWatched: itemData.currentTime || 0
        });
        
        // Mantener máximo 50 items
        if (history.length > 50) {
            history.pop();
        }
        
        userData.watchHistory = history;
        this.saveUserData(userData);
        console.log('📖 Agregado al historial:', itemData.title);
    }
};

// =============================================
// 🎬 FUNCIONES PARA DETALLES.HTML
// =============================================

// Función para extraer datos de la página de detalles
function extractDetailsData() {
    console.log('🔍 Extrayendo datos de la página de detalles...');
    
    // Intentar obtener datos del window.currentMovie primero
    if (window.currentMovie) {
        console.log('📦 Datos encontrados en window.currentMovie:', window.currentMovie);
        return window.currentMovie;
    }
    
    // Si no, buscar en la página
    const detailsData = {
        id: window.location.pathname.includes('/pelicula/') 
            ? window.location.pathname.split('/pelicula/')[1]?.split('.')[0]
            : window.location.pathname.includes('/serie/')
            ? window.location.pathname.split('/serie/')[1]?.split('.')[0]
            : Date.now().toString(),
        type: window.location.pathname.includes('/pelicula/') ? 'pelicula' : 'serie',
        title: document.querySelector('.movie-title')?.textContent?.trim() || 
               document.querySelector('h1')?.textContent?.trim() || 
               document.title,
        poster: document.querySelector('.movie-poster img')?.src ||
                document.querySelector('.poster img')?.src ||
                document.querySelector('img[src*="poster"]')?.src ||
                '',
        // Para iframes, establecer un progreso estimado
        currentTime: 0,
        duration: 0,
        progressPercentage: 10 // 10% para iframes por defecto
    };
    
    console.log('📄 Datos extraídos de la página:', detailsData);
    return detailsData;
}

// Función para manejar videos directos (mp4, webm, m3u8)
function setupVideoTracking(videoElement) {
    console.log('🎥 Configurando seguimiento para video directo');
    
    const detailsData = extractDetailsData();
    let saveTimeout;
    
    // Función para guardar progreso
    function saveProgress() {
        if (videoElement.duration && videoElement.duration > 0) {
            const progressPercentage = (videoElement.currentTime / videoElement.duration) * 100;
            
            const progressData = {
                ...detailsData,
                currentTime: videoElement.currentTime,
                duration: videoElement.duration,
                progressPercentage: progressPercentage
            };
            
            // Agregar a "Seguir Viendo"
            window.dataManager.addToContinueWatching(progressData);
            
            // Agregar al historial si se vio suficiente
            if (videoElement.currentTime > 60) { // Más de 1 minuto
                window.dataManager.addToHistory(progressData);
            }
            
            console.log(`💾 Progreso guardado: ${progressPercentage.toFixed(1)}%`);
        }
    }
    
    // Eventos del video
    videoElement.addEventListener('timeupdate', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveProgress, 3000); // Guardar cada 3 segundos de inactividad
    });
    
    videoElement.addEventListener('pause', saveProgress);
    videoElement.addEventListener('ended', saveProgress);
    
    // Guardar también cuando se cierra la página
    window.addEventListener('beforeunload', saveProgress);
    
    console.log('✅ Seguimiento de video configurado');
}

// Función para manejar iframes (Terabox, etc.)
function setupIframeTracking(iframeElement) {
    console.log('🖼️ Configurando seguimiento para iframe');
    
    const detailsData = extractDetailsData();
    
    // Para iframes, marcar como "viendo" inmediatamente
    const iframeData = {
        ...detailsData,
        progressPercentage: 10, // 10% para iframes
        isIframe: true
    };
    
    // Agregar a "Seguir Viendo"
    window.dataManager.addToContinueWatching(iframeData);
    
    // Agregar al historial
    window.dataManager.addToHistory(iframeData);
    
    console.log('✅ Iframe registrado en "Seguir Viendo"');
}

// Detectar y configurar el reproductor en detalles.html
function setupPlayerTracking() {
    console.log('🎬 Iniciando configuración de seguimiento en detalles.html');
    
    // Esperar a que cargue el contenido
    setTimeout(() => {
        const detailsData = extractDetailsData();
        
        if (!detailsData.id) {
            console.error('❌ No se pudo obtener ID del contenido');
            return;
        }
        
        console.log('🎯 Contenido detectado:', detailsData);
        
        // Buscar video directo
        const videoElement = document.querySelector('video');
        if (videoElement) {
            console.log('🎥 Video directo encontrado');
            setupVideoTracking(videoElement);
            return;
        }
        
        // Buscar iframe
        const iframeElement = document.querySelector('iframe');
        if (iframeElement) {
            console.log('🖼️ Iframe encontrado');
            setupIframeTracking(iframeElement);
            return;
        }
        
        // Si no hay reproductor visible, agregar igual (para series)
        console.log('📝 No se encontró reproductor, agregando a "Seguir Viendo" de todas formas');
        window.dataManager.addToContinueWatching(detailsData);
        window.dataManager.addToHistory(detailsData);
        
    }, 1000); // Esperar 1 segundo para que cargue la página
}

// =============================================
// 🎬 FUNCIONES PARA INDEX.HTML
// =============================================

// Función para crear la sección "Seguir Viendo"
function createContinueWatchingSection() {
    console.log('📺 Creando sección "Seguir Viendo"...');
    
    const continueWatching = window.dataManager.getContinueWatching();
    const items = Object.values(continueWatching);
    
    console.log(`📊 Total items en "Seguir Viendo": ${items.length}`);
    
    // Ordenar por fecha de visualización (más reciente primero)
    items.sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched));
    
    // Si no hay items, no mostrar la sección
    if (items.length === 0) {
        console.log('📭 No hay contenido en "Seguir Viendo"');
        return;
    }
    
    // Buscar donde insertar la sección (después del banner principal)
    const mainContainer = document.querySelector('.movies-grid')?.parentElement || 
                         document.querySelector('main') || 
                         document.body;
    
    if (!mainContainer) {
        console.error('❌ No se encontró contenedor principal');
        return;
    }
    
    // Crear contenedor de la sección
    const sectionContainer = document.createElement('div');
    sectionContainer.className = 'continue-watching-section';
    sectionContainer.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">
                <i class="fas fa-play-circle"></i>
                Seguir Viendo
                <span class="item-count">${items.length} título${items.length !== 1 ? 's' : ''}</span>
            </h2>
            <button class="clear-all-btn" onclick="clearContinueWatching()">
                <i class="fas fa-trash"></i> Limpiar todo
            </button>
        </div>
        <div class="continue-watching-grid">
            ${items.map(item => createContinueWatchingCard(item)).join('')}
        </div>
    `;
    
    // Insertar al inicio del contenido principal
    if (mainContainer.firstChild) {
        mainContainer.insertBefore(sectionContainer, mainContainer.firstChild);
    } else {
        mainContainer.appendChild(sectionContainer);
    }
    
    console.log('✅ Sección "Seguir Viendo" creada');
    return sectionContainer;
}

// Función para crear tarjeta individual
function createContinueWatchingCard(item) {
    const progressPercentage = item.progressPercentage || 
                              (item.duration > 0 ? (item.currentTime / item.duration) * 100 : 10);
    
    const progressBarWidth = Math.min(Math.max(progressPercentage, 5), 100); // Entre 5% y 100%
    
    const timeRemaining = item.duration > 0 
        ? formatTime(item.duration - item.currentTime)
        : '--:--';
    
    return `
        <div class="continue-watching-card" data-id="${item.id}">
            <button class="remove-btn" onclick="removeFromContinueWatching('${item.id}')" title="Eliminar">
                <i class="fas fa-times"></i>
            </button>
            <a href="${item.type === 'pelicula' ? 'pelicula' : 'serie'}/${item.id}.html" class="card-link">
                <div class="card-poster">
                    <img src="${item.poster || 'https://via.placeholder.com/300x450/333/666?text=No+Poster'}" 
                         alt="${item.title}" 
                         loading="lazy">
                    <div class="progress-overlay">
                        <div class="progress-bar" style="width: ${progressBarWidth}%"></div>
                    </div>
                    <div class="resume-overlay">
                        <i class="fas fa-play"></i>
                        <span>Continuar</span>
                    </div>
                    <div class="card-badge">
                        <i class="fas fa-${item.type === 'pelicula' ? 'film' : 'tv'}"></i>
                        ${item.type === 'pelicula' ? 'Película' : 'Serie'}
                    </div>
                </div>
                <div class="card-info">
                    <h3 class="card-title">${item.title}</h3>
                    <div class="card-progress">
                        <div class="progress-text">
                            <span>${progressPercentage.toFixed(0)}% visto</span>
                            <span>${timeRemaining} restantes</span>
                        </div>
                        <div class="progress-time">
                            ${formatTime(item.currentTime || 0)} / ${item.duration > 0 ? formatTime(item.duration) : '--:--'}
                        </div>
                    </div>
                    <div class="card-date">
                        <i class="far fa-clock"></i>
                        ${formatDate(item.lastWatched)}
                    </div>
                </div>
            </a>
        </div>
    `;
}

// Formatear tiempo (segundos a HH:MM:SS o MM:SS)
function formatTime(seconds) {
    if (!seconds || seconds < 0) return '00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Formatear fecha
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    
    return date.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short' 
    });
}

// =============================================
// 🎬 FUNCIONES GLOBALES
// =============================================

// Función para eliminar un item específico
function removeFromContinueWatching(itemId) {
    if (window.dataManager.removeFromContinueWatching(itemId)) {
        const card = document.querySelector(`.continue-watching-card[data-id="${itemId}"]`);
        if (card) {
            card.style.opacity = '0';
            card.style.transform = 'scale(0.8)';
            setTimeout(() => {
                card.remove();
                updateContinueWatchingSection();
            }, 300);
        }
    }
}

// Función para limpiar todo
function clearContinueWatching() {
    if (confirm('¿Estás seguro de que quieres eliminar todo de "Seguir Viendo"?')) {
        window.dataManager.clearContinueWatching();
        const section = document.querySelector('.continue-watching-section');
        if (section) {
            section.style.opacity = '0';
            section.style.transform = 'translateY(-20px)';
            setTimeout(() => section.remove(), 300);
        }
    }
}

// Función para actualizar la sección
function updateContinueWatchingSection() {
    const section = document.querySelector('.continue-watching-section');
    if (section) {
        section.remove();
    }
    createContinueWatchingSection();
}

// =============================================
// 🎬 INICIALIZACIÓN AUTOMÁTICA
// =============================================

// Ejecutar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando sistema "Seguir Viendo"...');
    
    // Verificar si dataManager está disponible
    if (!window.dataManager) {
        console.error('❌ window.dataManager no está disponible');
        return;
    }
    
    // Verificar datos actuales
    console.log('📁 Datos de usuario:', window.dataManager.getUserData());
    console.log('🎬 "Seguir Viendo" actual:', window.dataManager.getContinueWatching());
    
    // Detectar tipo de página
    if (window.location.pathname.includes('detalles.html') || 
        window.location.pathname.includes('/pelicula/') || 
        window.location.pathname.includes('/serie/')) {
        console.log('📍 Página de detalles detectada');
        setupPlayerTracking();
    } else {
        console.log('🏠 Página principal detectada');
        createContinueWatchingSection();
    }
    
    // Forzar guardado al cerrar la página
    window.addEventListener('beforeunload', function() {
        console.log('💾 Guardando datos antes de salir...');
        // Los datos ya se guardan automáticamente, esto es solo como respaldo
    });
    
    console.log('✅ Sistema "Seguir Viendo" inicializado correctamente');
});

// Exportar funciones globales
window.removeFromContinueWatching = removeFromContinueWatching;
window.clearContinueWatching = clearContinueWatching;
window.updateContinueWatchingSection = updateContinueWatchingSection;