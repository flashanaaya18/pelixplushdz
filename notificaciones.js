console.log("--- Cargando notificaciones.js v5.0 --- ¡Sistema de detección real activo!");

// Sistema de Notificaciones para Series y Películas
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar sistema de notificaciones
    initNotificationsSystem();
});

function initNotificationsSystem() {
    console.log("Inicializando sistema de notificaciones...");
    
    // Configurar localStorage para notificaciones
    if (!localStorage.getItem('notifications')) {
        localStorage.setItem('notifications', JSON.stringify([]));
    }
    
    if (!localStorage.getItem('notification_settings')) {
        localStorage.setItem('notification_settings', JSON.stringify({
            enabled: true,
            newMovies: true,
            newSeries: true,
            updates: true,
            recommendations: true,
            sound: false,
            vibration: false,
            pushNotifications: true
        }));
    }
    
    // Elementos del DOM
    const notificationsBtn = document.getElementById('notifications-btn');
    const notificationsPanel = document.getElementById('notifications-panel');
    const notificationsBadge = document.getElementById('notifications-badge');
    const notificationsList = document.getElementById('notifications-list');
    const markAllReadBtn = document.getElementById('mark-all-read');
    const clearNotificationsBtn = document.getElementById('clear-notifications');
    
    // Cargar notificaciones
    loadNotifications();
    
    // Event Listeners
    if (notificationsBtn) {
        notificationsBtn.addEventListener('click', toggleNotificationsPanel);
    }
    
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', markAllNotificationsAsRead);
    }
    
    if (clearNotificationsBtn) {
        clearNotificationsBtn.addEventListener('click', clearAllNotifications);
    }
    
    // Cerrar panel al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (notificationsPanel && notificationsPanel.classList.contains('active') &&
            !notificationsPanel.contains(e.target) && 
            !notificationsBtn.contains(e.target)) {
            notificationsPanel.classList.remove('active');
        }
    });
    
    // Detectar contenido nuevo real (basado en datos cargados) usando el evento 'app-ready'
    document.addEventListener('app-ready', () => {
        console.log("Evento 'app-ready' recibido. Verificando contenido nuevo.");
        detectRealNewContent();
        setInterval(detectRealNewContent, 60000); // Revisar periódicamente por si acaso
    });
}

// Funciones del sistema de notificaciones

function toggleNotificationsPanel() {
    const notificationsPanel = document.getElementById('notifications-panel');
    const notificationsBadge = document.getElementById('notifications-badge');
    
    if (notificationsPanel) {
        notificationsPanel.classList.toggle('active');
        
        // Si el panel se abre, actualizar las notificaciones
        if (notificationsPanel.classList.contains('active')) {
            loadNotifications();
            
            // Marcar como leídas cuando se abren
            const notifications = getNotifications();
            const unreadCount = notifications.filter(n => !n.read).length;
            
            if (unreadCount > 0) {
                markNotificationsAsRead(notifications.filter(n => !n.read).map(n => n.id));
                updateBadgeCount();
            }
        }
    }
}

function loadNotifications() {
    const notifications = getNotifications();
    const notificationsList = document.getElementById('notifications-list');
    
    if (!notificationsList) return;
    
    // Ordenar por fecha (más recientes primero)
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (notifications.length === 0) {
        notificationsList.innerHTML = `
            <div class="notifications-empty">
                <i class="far fa-bell"></i>
                <p>No hay notificaciones</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    notifications.forEach(notification => {
        const timeAgo = getTimeAgo(notification.timestamp);
        const typeIcon = getNotificationIcon(notification.type);
        
        html += `
            <div class="notification-item ${notification.read ? '' : 'unread'}" data-id="${notification.id}">
                <div class="notification-icon">
                    ${notification.image ? 
                        `<img src="${notification.image}" alt="${notification.title}">` : 
                        `<i class="${typeIcon}"></i>`
                    }
                </div>
                <div class="notification-content">
                    <h4 class="notification-title">${notification.title}</h4>
                    <p class="notification-message">${notification.message}</p>
                    <div class="notification-time">
                        <i class="far fa-clock"></i> ${timeAgo}
                    </div>
                </div>
                ${!notification.read ? '<div class="notification-dot"></div>' : ''}
            </div>
        `;
    });
    
    notificationsList.innerHTML = html;
    
    // Agregar event listeners a las notificaciones
    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', function() {
            const id = this.dataset.id;
            markNotificationsAsRead([id]);
            
            // Navegar al contenido si tiene link
            const notification = notifications.find(n => n.id === id);
            if (notification && notification.link) {
                window.location.href = notification.link;
            }
        });
    });
}

function addNotification(notification) {
    const notifications = getNotifications();
    const settings = getNotificationSettings();
    
    // Verificar si las notificaciones están habilitadas
    if (!settings.enabled) return;
    
    // Verificar tipo específico
    if (notification.type === 'new_movie' && !settings.newMovies) return;
    if (notification.type === 'new_series' && !settings.newSeries) return;
    if (notification.type === 'update' && !settings.updates) return;
    if (notification.type === 'recommendation' && !settings.recommendations) return;
    
    // Crear ID único
    notification.id = 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    notification.timestamp = new Date().toISOString();
    notification.read = false;
    
    // Añadir a la lista
    notifications.unshift(notification);
    
    // Mantener solo las últimas 100 notificaciones
    if (notifications.length > 100) {
        notifications.splice(100);
    }
    
    // Guardar en localStorage
    localStorage.setItem('notifications', JSON.stringify(notifications));
    
    // Actualizar interfaz
    updateBadgeCount();
    loadNotifications();
    
    // Mostrar notificación push si está habilitado
    if (settings.pushNotifications) {
        showPushNotification(notification);
    }
    
    // Efectos de sonido/vibración
    if (settings.sound) {
        playNotificationSound();
    }
    
    if (settings.vibration && 'vibrate' in navigator) {
        navigator.vibrate(200);
    }
    
    return notification.id;
}

function getNotifications() {
    try {
        return JSON.parse(localStorage.getItem('notifications')) || [];
    } catch (e) {
        console.error('Error al cargar notificaciones:', e);
        return [];
    }
}

function getNotificationSettings() {
    try {
        return JSON.parse(localStorage.getItem('notification_settings')) || {
            enabled: true,
            newMovies: true,
            newSeries: true,
            updates: true,
            recommendations: true,
            sound: false,
            vibration: false,
            pushNotifications: true
        };
    } catch (e) {
        console.error('Error al cargar configuración:', e);
        return {
            enabled: true,
            newMovies: true,
            newSeries: true,
            updates: true,
            recommendations: true,
            sound: false,
            vibration: false,
            pushNotifications: true
        };
    }
}

function updateNotificationSettings(newSettings) {
    localStorage.setItem('notification_settings', JSON.stringify(newSettings));
}

function markNotificationsAsRead(ids) {
    const notifications = getNotifications();
    
    notifications.forEach(notification => {
        if (ids.includes(notification.id)) {
            notification.read = true;
        }
    });
    
    localStorage.setItem('notifications', JSON.stringify(notifications));
    updateBadgeCount();
    loadNotifications();
}

function markAllNotificationsAsRead() {
    const notifications = getNotifications();
    
    notifications.forEach(notification => {
        notification.read = true;
    });
    
    localStorage.setItem('notifications', JSON.stringify(notifications));
    updateBadgeCount();
    loadNotifications();
}

function clearAllNotifications() {
    localStorage.setItem('notifications', JSON.stringify([]));
    updateBadgeCount();
    loadNotifications();
}

function updateBadgeCount() {
    const notificationsBadge = document.getElementById('notifications-badge');
    const notifications = getNotifications();
    const unreadCount = notifications.filter(n => !n.read).length;
    
    if (notificationsBadge) {
        if (unreadCount > 0) {
            notificationsBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            notificationsBadge.style.display = 'flex';
        } else {
            notificationsBadge.style.display = 'none';
        }
    }
    
    // Actualizar también el favicon si hay notificaciones
    updateFaviconBadge(unreadCount);
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Hace unos segundos';
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} minutos`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} horas`;
    if (seconds < 604800) return `Hace ${Math.floor(seconds / 86400)} días`;
    
    return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function getNotificationIcon(type) {
    switch(type) {
        case 'new_movie': return 'fas fa-film';
        case 'new_series': return 'fas fa-tv';
        case 'update': return 'fas fa-sync-alt';
        case 'recommendation': return 'fas fa-star';
        case 'system': return 'fas fa-cog';
        default: return 'fas fa-info-circle';
    }
}

function showPushNotification(notification) {
    // Crear elemento de notificación push
    const pushNotification = document.createElement('div');
    pushNotification.className = 'push-notification';
    pushNotification.dataset.id = notification.id;
    
    const timeAgo = getTimeAgo(notification.timestamp);
    const typeIcon = getNotificationIcon(notification.type);
    
    pushNotification.innerHTML = `
        <div class="push-notification-icon">
            ${notification.image ? 
                `<img src="${notification.image}" alt="${notification.title}">` : 
                `<i class="${typeIcon}" style="font-size: 2rem; color: #666; margin: auto;"></i>`
            }
        </div>
        <div class="push-notification-content">
            <h4 class="push-notification-title">${notification.title}</h4>
            <p class="push-notification-message">${notification.message}</p>
            <div class="push-notification-time">
                <i class="far fa-clock"></i> ${timeAgo}
            </div>
        </div>
        <button class="push-notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(pushNotification);
    
    // Mostrar con animación
    setTimeout(() => {
        pushNotification.classList.add('show');
    }, 100);
    
    // Cerrar al hacer clic en la X
    pushNotification.querySelector('.push-notification-close').addEventListener('click', function() {
        pushNotification.classList.remove('show');
        setTimeout(() => {
            if (pushNotification.parentNode) {
                pushNotification.parentNode.removeChild(pushNotification);
            }
        }, 300);
    });
    
    // Cerrar automáticamente después de 5 segundos
    setTimeout(() => {
        if (pushNotification.parentNode && pushNotification.classList.contains('show')) {
            pushNotification.classList.remove('show');
            setTimeout(() => {
                if (pushNotification.parentNode) {
                    pushNotification.parentNode.removeChild(pushNotification);
                }
            }, 300);
        }
    }, 5000);
    
    // Al hacer clic en la notificación
    pushNotification.addEventListener('click', function(e) {
        if (!e.target.closest('.push-notification-close')) {
            markNotificationsAsRead([notification.id]);
            
            if (notification.link) {
                window.location.href = notification.link;
            }
            
            pushNotification.classList.remove('show');
            setTimeout(() => {
                if (pushNotification.parentNode) {
                    pushNotification.parentNode.removeChild(pushNotification);
                }
            }, 300);
        }
    });
}

function playNotificationSound() {
    // Crear un sonido de notificación simple
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.log('No se pudo reproducir sonido de notificación:', e);
    }
}

function updateFaviconBadge(count) {
    if (count > 0) {
        // Crear un favicon con badge
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        
        const ctx = canvas.getContext('2d');
        
        // Dibujar icono base
        const img = new Image();
        img.src = 'fondo.png';
        img.onload = function() {
            ctx.drawImage(img, 0, 0, 32, 32);
            
            // Dibujar círculo rojo para notificaciones
            ctx.fillStyle = '#e50914';
            ctx.beginPath();
            ctx.arc(24, 8, 10, 0, Math.PI * 2);
            ctx.fill();
            
            // Dibujar número
            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(count > 9 ? '9+' : count, 24, 8);
            
            // Actualizar favicon
            const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
            link.type = 'image/x-icon';
            link.rel = 'shortcut icon';
            link.href = canvas.toDataURL('image/png');
            document.head.appendChild(link);
        };
    } else {
        // Restaurar favicon original
        const link = document.querySelector("link[rel*='icon']");
        if (link) {
            link.href = 'fondo.png';
        }
    }
}

// Funciones para notificaciones específicas de contenido

function detectRealNewContent() {
    console.log("🔎 [Notificaciones] Iniciando 'detectRealNewContent'");
    const knownContent = JSON.parse(localStorage.getItem('known_content_ids')) || { movies: [], series: [] };
    let hasChanges = false;
    let newContentFound = 0;

    // Verificar Películas
    if (window.peliculas && Array.isArray(window.peliculas) && window.peliculas.length > 0) {
        console.log(`[Notificaciones] Verificando ${window.peliculas.length} películas.`);
        // Si es la primera vez, inicializamos sin notificar para evitar spam
        if (knownContent.movies.length === 0) {
            console.log("[Notificaciones] Primera ejecución para películas. Guardando estado inicial sin notificar.");
            knownContent.movies = window.peliculas.map(p => p.id);
            hasChanges = true;
        } else {
            // Detectar nuevas películas
            window.peliculas.forEach(movie => {
                if (movie.id && !knownContent.movies.includes(movie.id)) {
                    console.log(`%c[Notificaciones] ¡Nueva película encontrada!: ${movie.titulo} (ID: ${movie.id})`, "color: #28a745; font-weight: bold;");
                    notifyNewMovie(movie);
                    knownContent.movies.push(movie.id);
                    hasChanges = true;
                    newContentFound++;
                }
            });
        }
    } else {
        console.warn("[Notificaciones] 'window.peliculas' no está disponible o está vacío.");
    }

    // Verificar Series
    if (window.series && Array.isArray(window.series) && window.series.length > 0) {
        console.log(`[Notificaciones] Verificando ${window.series.length} series.`);
        if (knownContent.series.length === 0) {
            console.log("[Notificaciones] Primera ejecución para series. Guardando estado inicial sin notificar.");
            knownContent.series = window.series.map(s => s.id);
            hasChanges = true;
        } else {
            // Detectar nuevas series
            window.series.forEach(serie => {
                if (serie.id && !knownContent.series.includes(serie.id)) {
                    console.log(`%c[Notificaciones] ¡Nueva serie encontrada!: ${serie.titulo} (ID: ${serie.id})`, "color: #007bff; font-weight: bold;");
                    notifyNewSeries(serie);
                    knownContent.series.push(serie.id);
                    hasChanges = true;
                    newContentFound++;
                }
            });
        }
    } else {
        // Esto es esperado si no hay un archivo de series.
        // console.log("[Notificaciones] 'window.series' no está disponible o está vacío.");
    }

    if (hasChanges) {
        console.log(`[Notificaciones] Se encontraron ${newContentFound} contenidos nuevos. Actualizando 'known_content_ids' en localStorage.`);
        localStorage.setItem('known_content_ids', JSON.stringify(knownContent));
    } else {
        console.log("[Notificaciones] No se encontró contenido nuevo en esta pasada.");
    }
}

function notifyNewMovie(movie) {
    addNotification({
        type: 'new_movie',
        title: '🎬 Nueva Película',
        message: `"${movie.titulo}" ha sido añadida al catálogo`,
        image: movie.poster,
        link: `detalles.html?id=${movie.id}`
    });
}

function notifyNewSeries(series) {
    addNotification({
        type: 'new_series',
        title: '📺 Nueva Serie',
        message: `"${series.titulo}" ha sido añadida al catálogo`,
        image: series.poster,
        link: `detalles.html?id=${series.id}`
    });
}

function notifySeriesUpdate(series, season, episode) {
    addNotification({
        type: 'update',
        title: '🔄 Actualización de Serie',
        message: `Nuevo episodio disponible: "${series.titulo}" - Temporada ${season} Episodio ${episode}`,
        image: series.poster,
        link: `detalles.html?id=${series.id}`
    });
}

function notifyMovieRecommendation(movie, reason) {
    addNotification({
        type: 'recommendation',
        title: '⭐ Recomendación para ti',
        message: `Te recomendamos "${movie.titulo}" ${reason ? `porque ${reason}` : ''}`,
        image: movie.poster,
        link: `detalles.html?id=${movie.id}`
    });
}

// Exportar funciones para uso global
window.NotificationSystem = {
    addNotification,
    getNotifications,
    updateNotificationSettings,
    markAllNotificationsAsRead,
    clearAllNotifications,
    notifyNewMovie,
    notifyNewSeries,
    notifySeriesUpdate,
    notifyMovieRecommendation,
    updateBadgeCount
};

// Inicializar badge al cargar
updateBadgeCount();