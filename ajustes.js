document.addEventListener('DOMContentLoaded', () => {
    // Limpiar caché automáticamente al iniciar sesión (si no se hizo en index)
    (async function autoClearCache() {
        // Leer la preferencia del usuario. Por defecto, está activado.
        const autoCacheClearEnabled = localStorage.getItem('settings_auto_cache_clear') !== 'false';
        if (!autoCacheClearEnabled) {
            console.log('Limpieza automática de caché desactivada por el usuario.');
            return;
        }

        const SESSION_KEY = 'pelix_cache_cleared';
        if (!sessionStorage.getItem(SESSION_KEY)) {
            if ('caches' in window) {
                try {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(key => caches.delete(key)));
                    console.log('Caché limpiada automáticamente en Ajustes.');
                } catch (e) { console.error('Error al limpiar caché:', e); }
            }
            sessionStorage.setItem(SESSION_KEY, 'true');
            window.location.reload();
            return; // Detener ejecución hasta recarga
        }
    })();

    // Espera a que el script principal (script.js) esté listo
    if (window.dataManager) {
        initializeSettings();
    } else {
        document.addEventListener('app-ready', initializeSettings);
    }
});

function initializeSettings() {
    const btnUpgradeVip = document.getElementById('btn-upgrade-vip');

    // Botón para activar VIP desde Ajustes (Usuario Gratuito)
    if (btnUpgradeVip) {
        btnUpgradeVip.addEventListener('click', () => {
            sessionStorage.setItem('trigger_vip_modal', 'true');
            window.location.href = 'index.html';
        });
    }

    // Lógica para Inicio de Sesión Automático
    const autoLoginToggle = document.getElementById('auto-login-toggle');
    if (autoLoginToggle) {
        // Verificar estado actual
        if (localStorage.getItem('pelix_vip_auto_code')) {
            autoLoginToggle.checked = true;
        }

        autoLoginToggle.addEventListener('change', function() {
            if (this.checked) {
                const currentCode = sessionStorage.getItem('pelix_user_code');
                const isVip = sessionStorage.getItem('pelix_access_type') === 'vip';
                
                if (isVip && currentCode) {
                    localStorage.setItem('pelix_vip_auto_code', currentCode);
                } else {
                    alert('Debes tener una sesión VIP activa para habilitar esta opción.');
                    this.checked = false;
                }
            } else {
                localStorage.removeItem('pelix_vip_auto_code');
            }
        });
    }

    // Inicializar lógica de suscripción y pedidos VIP
    initializeVipFeatures();
}

async function initializeVipFeatures() {
    const vipRequestsSection = document.getElementById('vip-requests-section');
    const vipSection = document.getElementById('vip-subscription-section');
    const freeSection = document.getElementById('free-subscription-section');
    const usernameDisplay = document.getElementById('vip-username-display');
    const expirationDisplay = document.getElementById('vip-expiration-date');
    const timeRemainingDisplay = document.getElementById('vip-time-remaining');
    const btnRenew = document.getElementById('btn-renew-vip');

    const accessType = sessionStorage.getItem('pelix_access_type');
    const userCode = sessionStorage.getItem('pelix_user_code');

    if (accessType === 'vip' && userCode) {
        if(vipSection) vipSection.style.display = 'block';
        if(vipRequestsSection) vipRequestsSection.style.display = 'block';
        if(freeSection) freeSection.style.display = 'none';
        
        try {
            // Obtener datos frescos de la base de datos
            const response = await fetch(`codigos_vip.json?v=${new Date().getTime()}`);
            const users = await response.json();
            const user = users.find(u => u.codigo === userCode);

            if (user && user.fecha_inicio) {
                if(usernameDisplay) usernameDisplay.textContent = user.nombre;

                const startDate = new Date(user.fecha_inicio + 'T00:00:00');
                const diasValidez = user.dias_validez || 30;
                const expirationDate = new Date(startDate);
                expirationDate.setDate(startDate.getDate() + diasValidez);
                expirationDate.setHours(23, 59, 59, 999);

                if(expirationDisplay) {
                    const options = { year: 'numeric', month: 'long', day: 'numeric' };
                    expirationDisplay.textContent = expirationDate.toLocaleDateString('es-ES', options);
                }

                function updateCounter() {
                    const now = new Date();
                    const timeDiff = expirationDate - now;

                    if (timeDiff > 0) {
                        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
                        
                        if(timeRemainingDisplay) timeRemainingDisplay.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
                    } else {
                        if(timeRemainingDisplay) {
                            timeRemainingDisplay.textContent = 'EXPIRADO';
                            timeRemainingDisplay.style.color = 'red';
                        }
                        alert('Tu tiempo VIP ha terminado. Por favor renueva.');
                        sessionStorage.clear();
                        window.location.href = 'index.html';
                    }
                }

                updateCounter();
                setInterval(updateCounter, 1000);

                if(btnRenew) {
                    btnRenew.addEventListener('click', () => {
                        const adminPhone = "+525616840524"; 
                        const message = `Hola, mi suscripción VIP está por vencer o venció.%0A%0A👤 Usuario: ${user.nombre}%0A🔑 Código: ${user.codigo}%0A%0AQuiero renovar.`;
                        window.open(`https://wa.me/${adminPhone}?text=${message}`, '_blank');
                    });
                }
            }
        } catch (e) {
            console.error("Error verificando suscripción VIP", e);
        }
    } else {
        if(freeSection) freeSection.style.display = 'block';
    }

    // Lógica de Pedidos VIP
    setupRequestsSystem();
    
    // Lógica de Canjeo
    setupRedeemSystem();
}

function setupRequestsSystem() {
    const requestInput = document.getElementById('request-search-input');
    const requestBtn = document.getElementById('request-search-btn');
    const requestResults = document.getElementById('request-results');
    const myRequestsList = document.getElementById('my-requests-list');
    const TMDB_API_KEY = window.TMDB_API_KEY || '9869fab7c867e72214c8628c6029ec74';

    // Función para cargar solicitudes guardadas
    const loadMyRequests = () => {
        const localMovies = window.peliculas || [];
        const requests = JSON.parse(localStorage.getItem('pelix_vip_requests') || '[]').sort((a, b) => b.id - a.id);
        
        if (myRequestsList) {
            myRequestsList.innerHTML = '';
            
            if (requests.length === 0) {
                myRequestsList.innerHTML = '<p style="color:#666; font-size:0.9rem; font-style:italic;">No tienes solicitudes pendientes.</p>';
                return;
            }

            requests.forEach(req => {
                // Verificar si el contenido solicitado ya existe en el catálogo
                const existingItem = localMovies.find(m => 
                    (m.tmdb_id && String(m.tmdb_id) === String(req.tmdbId)) || 
                    (m.tmdbId && String(m.tmdbId) === String(req.tmdbId)) ||
                    (window.normalizeText && window.normalizeText(m.titulo) === window.normalizeText(req.title) && String(m.año) === String(req.year))
                );

                let statusLabel = 'Procesando';
                let statusClass = 'pending';
                let progressWidth = 50;
                let actionContent = '';

                if (existingItem) {
                    statusLabel = 'Disponible';
                    statusClass = 'available';
                    progressWidth = 100;
                    actionContent = `<button class="btn-request-action" style="background: linear-gradient(135deg, #2ecc71, #27ae60); margin-left: auto;" onclick="window.location.href='detalles.html?id=${existingItem.id}'"><i class="fas fa-play"></i> Ver Ahora</button>`;
                } else {
                    actionContent = `<span class="request-status ${statusClass}" style="margin-left:auto;">${statusLabel.toUpperCase()}</span>`;
                }
                
                const item = document.createElement('div');
                item.className = 'my-request-item';
                item.style.display = 'block';
                item.innerHTML = `
                    <div style="display:flex; gap:10px; align-items:center; margin-bottom:8px;">
                        <img src="${req.poster}" alt="Poster" style="width:40px; height:60px; object-fit:cover; border-radius:4px;">
                        <div class="my-request-info">
                            <h4 style="margin:0; color:white;">${req.title}</h4>
                            <span style="color:#aaa; font-size:0.8rem;">${req.year} • ${req.type === 'movie' ? 'Película' : 'Serie'}</span>
                        </div>
                        ${actionContent}
                    </div>
                    <div style="width:100%; height:4px; background:#333; border-radius:2px; overflow:hidden; position:relative;">
                        <div style="width:${progressWidth}%; height:100%; background: ${existingItem ? 'linear-gradient(90deg, #2ecc71, #27ae60)' : 'linear-gradient(90deg, #e67e22, #f39c12)'}; transition: width 0.5s;"></div>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:4px; font-size:0.65rem; color:#666;">
                        <span>${new Date(req.id).toLocaleDateString()}</span>
                        <span>${existingItem ? '¡Listo para ver!' : 'Buscando fuentes...'}</span>
                    </div>
                `;
                myRequestsList.appendChild(item);
            });
        }
    };

    // Cargar solicitudes inicialmente
    loadMyRequests();

    // Lógica de búsqueda
    if (requestBtn && requestInput) {
        const performSearch = async () => {
            const query = requestInput.value.trim();
            if (!query) return;

            requestResults.innerHTML = '<div style="color:white; text-align:center; grid-column: 1/-1;"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>';

            try {
                const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&language=es-MX&query=${encodeURIComponent(query)}&page=1&include_adult=false`);
                const data = await res.json();

                requestResults.innerHTML = '';
                const localMovies = window.peliculas || [];

                if (data.results && data.results.length > 0) {
                    data.results.forEach(item => {
                        if (item.media_type !== 'movie' && item.media_type !== 'tv') return;
                        
                        const title = item.title || item.name;
                        const poster = item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : 'fondo.png';
                        const year = (item.release_date || item.first_air_date || '').split('-')[0] || 'N/A';
                        
                        const existingItem = localMovies.find(m => 
                            (m.tmdb_id && String(m.tmdb_id) === String(item.id)) || 
                            (m.tmdbId && String(m.tmdbId) === String(item.id))
                        );

                        const card = document.createElement('div');
                        card.className = 'request-card';
                        
                        let overlayContent = '';
                        let statusBadge = '';

                        if (existingItem) {
                            statusBadge = '<div style="position:absolute; top:10px; right:10px; background:#2ecc71; color:white; padding:4px 8px; border-radius:4px; font-size:0.7rem; font-weight:bold; box-shadow: 0 2px 5px rgba(0,0,0,0.5); z-index:5;">DISPONIBLE</div>';
                            overlayContent = `
                                <button class="btn-request-action" style="background: linear-gradient(135deg, #2ecc71, #27ae60);" onclick="window.location.href='detalles.html?id=${existingItem.id}'">
                                    <i class="fas fa-play"></i> Ver Ahora
                                </button>
                            `;
                        } else {
                            overlayContent = `
                                <button class="btn-request-action" onclick="openRequestModal('${title.replace(/'/g, "\\'")}', '${year}', '${item.media_type}', '${poster}', '${item.id}')">
                                    <i class="fas fa-paper-plane"></i> Pedir
                                </button>
                            `;
                        }

                        card.innerHTML = `
                            <img src="${poster}" alt="${title}">
                            ${statusBadge}
                            <div class="request-info">${title} (${year})</div>
                            <div class="request-overlay">
                                ${overlayContent}
                            </div>
                        `;
                        requestResults.appendChild(card);
                    });
                } else {
                    requestResults.innerHTML = '<p style="color:#ccc; text-align:center; grid-column: 1/-1;">No se encontraron resultados.</p>';
                }
            } catch (error) {
                console.error(error);
                requestResults.innerHTML = '<p style="color:red; text-align:center; grid-column: 1/-1;">Error al buscar. Verifica tu conexión o API Key.</p>';
            }
        };

        let debounceTimer;
        requestInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(performSearch, 600);
        });

        requestBtn.addEventListener('click', performSearch);
        requestInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') performSearch(); });
    }

    // Modal Logic
    const modal = document.getElementById('request-modal');
    const closeModal = document.getElementById('close-request-modal');
    const confirmBtn = document.getElementById('confirm-request-btn');
    let currentRequest = {};

    // Exponer función globalmente para el onclick del HTML generado
    window.openRequestModal = (title, year, type, poster, tmdbId) => {
        currentRequest = { title, year, type, tmdbId };
        
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-year').textContent = year;
        document.getElementById('modal-type').textContent = type === 'movie' ? 'PELÍCULA' : 'SERIE';
        document.getElementById('modal-poster').src = poster;
        document.getElementById('request-notes').value = '';
        
        if(modal) modal.classList.add('active');
    };

    if(closeModal) {
        closeModal.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    if(modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    }

    if(confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            const userName = sessionStorage.getItem('pelix_user_name') || 'Usuario VIP';
            const notes = document.getElementById('request-notes').value;
            const userCode = sessionStorage.getItem('pelix_user_code') || 'N/A';

            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            confirmBtn.disabled = true;

            const newRequest = {
                id: Date.now(),
                title: currentRequest.title,
                year: currentRequest.year,
                type: currentRequest.type,
                tmdbId: currentRequest.tmdbId,
                poster: document.getElementById('modal-poster').src,
                notes: notes,
                user: userName,
                date: new Date().toLocaleDateString()
            };

            const requests = JSON.parse(localStorage.getItem('pelix_vip_requests') || '[]');
            requests.push(newRequest);
            localStorage.setItem('pelix_vip_requests', JSON.stringify(requests));

            const adminPhone = "+525616840524";
            const whatsappMsg = `🎬 *Nueva Solicitud VIP*\n\n👤 *Usuario:* ${userName}\n🔑 *Código:* ${userCode}\n\n📺 *Título:* ${currentRequest.title}\n📅 *Año:* ${currentRequest.year}\n🏷️ *Tipo:* ${currentRequest.type === 'movie' ? 'Película' : 'Serie'}\n📝 *Notas:* ${notes || 'Sin notas'}`;
            const whatsappUrl = `https://wa.me/${adminPhone}?text=${encodeURIComponent(whatsappMsg)}`;

            setTimeout(() => {
                if(typeof showNotification === 'function') showNotification('Abriendo WhatsApp para enviar...', 'success');
                loadMyRequests();
                modal.classList.remove('active');
                confirmBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Solicitud';
                confirmBtn.disabled = false;
                window.open(whatsappUrl, '_blank');
            }, 800);
        });
    }
}

function setupRedeemSystem() {
    const btnRedeem = document.getElementById('btn-redeem-code');
    const inputRedeem = document.getElementById('settings-vip-code-input');
    const msgRedeem = document.getElementById('redeem-message');

    if (btnRedeem && inputRedeem) {
        btnRedeem.addEventListener('click', async () => {
            const code = inputRedeem.value.trim();
            if (!code) {
                msgRedeem.textContent = "Por favor ingresa un código.";
                msgRedeem.style.color = "#e50914";
                msgRedeem.style.display = "block";
                return;
            }

            const originalBtnText = btnRedeem.innerHTML;
            btnRedeem.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btnRedeem.disabled = true;
            msgRedeem.style.display = "none";

            try {
                const response = await fetch(`codigos_vip.json?v=${new Date().getTime()}`);
                const users = await response.json();
                const user = users.find(u => u.codigo === code);

                if (user) {
                    const startDate = new Date(user.fecha_inicio + 'T00:00:00');
                    const diasValidez = user.dias_validez || 30;
                    const expirationDate = new Date(startDate);
                    expirationDate.setDate(startDate.getDate() + diasValidez);
                    expirationDate.setHours(23, 59, 59, 999);
                    
                    if (new Date() > expirationDate) {
                        msgRedeem.textContent = "⛔ Este código ha expirado.";
                        msgRedeem.style.color = "#e50914";
                        msgRedeem.style.display = "block";
                        btnRedeem.innerHTML = originalBtnText;
                        btnRedeem.disabled = false;
                        return;
                    }

                    sessionStorage.setItem('pelix_access_granted', 'true');
                    sessionStorage.setItem('pelix_access_type', 'vip');
                    sessionStorage.setItem('pelix_user_name', user.nombre);
                    sessionStorage.setItem('pelix_user_code', user.codigo);

                    msgRedeem.textContent = "✅ ¡Código activado! Actualizando...";
                    msgRedeem.style.color = "#2ecc71";
                    msgRedeem.style.display = "block";
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    msgRedeem.textContent = "❌ Código no encontrado.";
                    msgRedeem.style.color = "#e50914";
                    msgRedeem.style.display = "block";
                    btnRedeem.innerHTML = originalBtnText;
                    btnRedeem.disabled = false;
                }
            } catch (error) {
                console.error(error);
                msgRedeem.textContent = "⚠️ Error de conexión.";
                msgRedeem.style.color = "#e50914";
                msgRedeem.style.display = "block";
                btnRedeem.innerHTML = originalBtnText;
                btnRedeem.disabled = false;
            }
        });
    }
}