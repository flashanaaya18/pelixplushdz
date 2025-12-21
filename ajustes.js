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
    const themeToggle = document.getElementById('theme-toggle');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const clearFavoritesBtn = document.getElementById('clear-favorites-btn');
    const clearCacheBtn = document.getElementById('clear-cache-btn');
    const resetAllBtn = document.getElementById('reset-all-btn');
    const autoplayToggle = document.getElementById('autoplay-toggle');
    const motionToggle = document.getElementById('motion-toggle');
    const ambilightToggle = document.getElementById('ambilight-toggle');
    const skipIntroToggle = document.getElementById('skip-intro-toggle');
    const preferredLangSelect = document.getElementById('preferred-lang-select');
    const countrySelect = document.getElementById('country-select');
    const subtitleSizeSelect = document.getElementById('subtitle-size-select');
    const showRatingsToggle = document.getElementById('show-ratings-toggle');
    const compactModeToggle = document.getElementById('compact-mode-toggle');
    const autoCacheClearToggle = document.getElementById('auto-cache-clear-toggle');
    const exportDataBtn = document.getElementById('export-data-btn');
    const importDataBtn = document.getElementById('import-data-btn');
    const importDataInput = document.getElementById('import-data-input');
    const appVersionSpan = document.getElementById('app-version');

    // Nuevos toggles de personalización de inicio
    const showContinueWatchingToggle = document.getElementById('show-continue-watching-toggle');
    const showTrendingToggle = document.getElementById('show-trending-toggle');
    const showRecentlyAddedToggle = document.getElementById('show-recently-added-toggle');
    const showRecommendationsToggle = document.getElementById('show-recommendations-toggle');

    const APP_VERSION = '4.6';

    // --- SISTEMA DE ACTUALIZACIÓN DE APP ---
    if (appVersionSpan) {
        // Crear contenedor para el actualizador
        const updateContainer = document.createElement('div');
        updateContainer.style.marginTop = '15px';
        updateContainer.style.textAlign = 'center';
        
        // Botón de buscar
        const checkBtn = document.createElement('button');
        checkBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Buscar Actualizaciones';
        checkBtn.className = 'update-check-btn';
        checkBtn.style.cssText = `
            background: var(--primary, #e50914); color: white; border: none; 
            padding: 10px 20px; border-radius: 50px; cursor: pointer; 
            font-size: 14px; font-weight: 600; display: inline-flex; 
            align-items: center; gap: 8px; transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(229, 9, 20, 0.3);
        `;

        checkBtn.onclick = () => {
            checkBtn.disabled = true;
            checkBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Buscando...';
            checkBtn.style.opacity = '0.8';

            // Simular tiempo de búsqueda en servidor
            setTimeout(() => {
                checkBtn.style.display = 'none';
                
                // Botón de instalar
                const installBtn = document.createElement('button');
                installBtn.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Instalar Actualización';
                installBtn.style.cssText = `
                    background: #2ecc71; color: white; border: none; 
                    padding: 10px 20px; border-radius: 50px; cursor: pointer; 
                    font-size: 14px; font-weight: 600; display: inline-flex; 
                    align-items: center; gap: 8px; animation: pulse-green 2s infinite;
                    box-shadow: 0 4px 15px rgba(46, 204, 113, 0.3);
                `;

                // Inyectar estilo de animación
                if (!document.getElementById('update-anim')) {
                    const style = document.createElement('style');
                    style.id = 'update-anim';
                    style.innerHTML = `@keyframes pulse-green { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.7); } 70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(46, 204, 113, 0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); } }`;
                    document.head.appendChild(style);
                }

                installBtn.onclick = async () => {
                    installBtn.innerHTML = 'Actualizando...';
                    if (window.showNotification) window.showNotification('Actualizando aplicación...', 'success');
                    // Forzar limpieza de caché y recarga
                    if ('serviceWorker' in navigator) {
                        const regs = await navigator.serviceWorker.getRegistrations();
                        for (let reg of regs) await reg.unregister();
                    }
                    if ('caches' in window) {
                        const keys = await caches.keys();
                        await Promise.all(keys.map(key => caches.delete(key)));
                    }
                    sessionStorage.removeItem('pelix_cache_cleared');
                    window.location.reload(true);
                };

                updateContainer.appendChild(installBtn);
                if (window.showNotification) window.showNotification('¡Nueva versión disponible!', 'success');
            }, 2000);
        };

        updateContainer.appendChild(checkBtn);
        
        // Insertar después del contenedor de versión
        if (appVersionSpan.parentNode) {
            appVersionSpan.parentNode.appendChild(updateContainer);
        }
    }

    // 1. Cargar y aplicar la configuración guardada
    function loadSettings() {
        // Tema (Claro/Oscuro)
        const currentTheme = localStorage.getItem('theme') || 'dark';
        if (currentTheme === 'light') {
            document.body.classList.add('light-mode');
            if (themeToggle) themeToggle.checked = true;
        }

        // Reproducción Automática
        const autoplay = localStorage.getItem('settings_autoplay') === 'true';
        if (autoplayToggle) autoplayToggle.checked = autoplay;

        // Reducción de Movimiento
        const reducedMotion = localStorage.getItem('settings_reduced_motion') === 'true';
        if (motionToggle) {
            motionToggle.checked = reducedMotion;
            applyReducedMotion(reducedMotion);
        }

        // Ambilight por defecto
        const ambilightEnabled = localStorage.getItem('settings_ambilight') !== 'false'; // Activado por defecto
        if (ambilightToggle) ambilightToggle.checked = ambilightEnabled;

        // Saltar Intros
        const autoSkipIntro = localStorage.getItem('settings_auto_skip_intro') === 'true';
        if (skipIntroToggle) skipIntroToggle.checked = autoSkipIntro;

        // Idioma Preferido
        const preferredLang = localStorage.getItem('settings_preferred_lang') || 'any';
        if (preferredLangSelect) preferredLangSelect.value = preferredLang;

        // País
        const savedCountry = localStorage.getItem('settings_country') || 'auto';
        if (countrySelect) countrySelect.value = savedCountry;

        // Tamaño de Subtítulos
        const subtitleSize = localStorage.getItem('settings_subtitle_size') || '100%';
        if (subtitleSizeSelect) subtitleSizeSelect.value = subtitleSize;

        // Mostrar Calificaciones
        const showRatings = localStorage.getItem('settings_show_ratings') !== 'false'; // Activo por defecto
        if (showRatingsToggle) showRatingsToggle.checked = showRatings;

        // Modo Compacto
        const compactMode = localStorage.getItem('settings_compact_mode') === 'true';
        if (compactModeToggle) compactModeToggle.checked = compactMode;

        // Limpieza de caché automática
        const autoCacheClear = localStorage.getItem('settings_auto_cache_clear') !== 'false'; // Activado por defecto
        if (autoCacheClearToggle) autoCacheClearToggle.checked = autoCacheClear;

        // Personalización de Inicio
        const showContinueWatching = localStorage.getItem('settings_show_continue_watching') !== 'false';
        if (showContinueWatchingToggle) showContinueWatchingToggle.checked = showContinueWatching;

        const showTrending = localStorage.getItem('settings_show_trending') !== 'false';
        if (showTrendingToggle) showTrendingToggle.checked = showTrending;

        const showRecentlyAdded = localStorage.getItem('settings_show_recently_added') !== 'false';
        if (showRecentlyAddedToggle) showRecentlyAddedToggle.checked = showRecentlyAdded;

        const showRecommendations = localStorage.getItem('settings_show_recommendations') !== 'false';
        if (showRecommendationsToggle) showRecommendationsToggle.checked = showRecommendations;

        // Versión de la App
        if (appVersionSpan) appVersionSpan.textContent = APP_VERSION;
    }

    // 2. Asignar eventos a los controles
    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            if (themeToggle.checked) {
                document.body.classList.add('light-mode');
                localStorage.setItem('theme', 'light');
            } else {
                document.body.classList.remove('light-mode');
                localStorage.setItem('theme', 'dark');
            }
        });
    }

    if (autoplayToggle) {
        autoplayToggle.addEventListener('change', () => {
            localStorage.setItem('settings_autoplay', autoplayToggle.checked);
            window.showNotification('Preferencia de reproducción guardada.', 'success');
        });
    }

    if (motionToggle) {
        motionToggle.addEventListener('change', () => {
            const isEnabled = motionToggle.checked;
            localStorage.setItem('settings_reduced_motion', isEnabled);
            applyReducedMotion(isEnabled);
        });
    }

    if (ambilightToggle) {
        ambilightToggle.addEventListener('change', () => {
            localStorage.setItem('settings_ambilight', ambilightToggle.checked);
            window.showNotification('Preferencia de Ambilight guardada.', 'success');
        });
    }

    if (skipIntroToggle) {
        skipIntroToggle.addEventListener('change', () => {
            localStorage.setItem('settings_auto_skip_intro', skipIntroToggle.checked);
            window.showNotification('Preferencia de intros guardada.', 'success');
        });
    }

    if (preferredLangSelect) {
        preferredLangSelect.addEventListener('change', () => {
            localStorage.setItem('settings_preferred_lang', preferredLangSelect.value);
            window.showNotification('Idioma preferido guardado.', 'success');
        });
    }

    if (countrySelect) {
        countrySelect.addEventListener('change', () => {
            const selectedCountry = countrySelect.value;
            localStorage.setItem('settings_country', selectedCountry);

            let preferredLang = 'any';
            let langText = 'Cualquiera';

            switch (selectedCountry) {
                case 'ES':
                    preferredLang = 'castellano';
                    langText = 'Castellano';
                    break;
                case 'MX':
                case 'AR':
                case 'CO':
                    preferredLang = 'latino';
                    langText = 'Latino';
                    break;
                case 'US':
                    preferredLang = 'subtitulado';
                    langText = 'Subtitulado';
                    break;
            }

            if (preferredLangSelect) preferredLangSelect.value = preferredLang;
            localStorage.setItem('settings_preferred_lang', preferredLang);
            window.showNotification(`País guardado. Idioma preferido: ${langText}`, 'success');
        });
    }

    if (subtitleSizeSelect) {
        subtitleSizeSelect.addEventListener('change', () => {
            localStorage.setItem('settings_subtitle_size', subtitleSizeSelect.value);
            document.documentElement.style.setProperty('--subtitle-size', subtitleSizeSelect.value);
            window.showNotification('Tamaño de subtítulos guardado.', 'success');
        });
    }

    if (showRatingsToggle) {
        showRatingsToggle.addEventListener('change', () => {
            localStorage.setItem('settings_show_ratings', showRatingsToggle.checked);
            document.body.classList.toggle('hide-ratings', !showRatingsToggle.checked);
            window.showNotification('Preferencia de calificaciones guardada.', 'success');
        });
    }

    if (compactModeToggle) {
        compactModeToggle.addEventListener('change', () => {
            localStorage.setItem('settings_compact_mode', compactModeToggle.checked);
            document.body.classList.toggle('compact-mode', compactModeToggle.checked);
            window.showNotification('Modo compacto actualizado.', 'success');
        });
    }

    if (autoCacheClearToggle) {
        autoCacheClearToggle.addEventListener('change', () => {
            localStorage.setItem('settings_auto_cache_clear', autoCacheClearToggle.checked);
            window.showNotification('Ajuste de limpieza de caché guardado.', 'success');
        });
    }

    // Eventos para personalización de inicio
    if (showContinueWatchingToggle) {
        showContinueWatchingToggle.addEventListener('change', () => {
            localStorage.setItem('settings_show_continue_watching', showContinueWatchingToggle.checked);
        });
    }
    if (showTrendingToggle) {
        showTrendingToggle.addEventListener('change', () => {
            localStorage.setItem('settings_show_trending', showTrendingToggle.checked);
        });
    }
    if (showRecentlyAddedToggle) {
        showRecentlyAddedToggle.addEventListener('change', () => {
            localStorage.setItem('settings_show_recently_added', showRecentlyAddedToggle.checked);
        });
    }
    if (showRecommendationsToggle) {
        showRecommendationsToggle.addEventListener('change', () => {
            localStorage.setItem('settings_show_recommendations', showRecommendationsToggle.checked);
        });
    }

    if (clearHistoryBtn && window.dataManager) {
        clearHistoryBtn.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que quieres limpiar tu historial de "Seguir Viendo"? Esta acción no se puede deshacer.')) {
                window.dataManager.saveContinueWatching({});
                window.dataManager.saveViewHistory([]);
                window.showNotification('Historial de visualización limpiado.', 'success');
            }
        });
    }

    if (clearFavoritesBtn && window.dataManager) {
        clearFavoritesBtn.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que quieres eliminar todos tus favoritos? Esta acción no se puede deshacer.')) {
                window.dataManager.saveFavorites([]);
                window.showNotification('Favoritos eliminados.', 'success');
            }
        });
    }

    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', async () => {
            if (confirm('Esto eliminará los datos en caché de la aplicación y la recargará. ¿Continuar?')) {
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    try {
                        const keys = await caches.keys();
                        await Promise.all(keys.map(key => caches.delete(key)));
                        window.showNotification('Caché limpiado. Recargando...', 'success');
                        setTimeout(() => location.reload(true), 1500);
                    } catch (error) {
                        window.showNotification('Error al limpiar la caché.', 'error');
                    }
                } else {
                    window.showNotification('No se pudo acceder a la caché.', 'warning');
                }
            }
        });
    }

    if (resetAllBtn && window.dataManager) {
        resetAllBtn.addEventListener('click', () => {
            if (confirm('¡ADVERTENCIA! Esto eliminará TODOS tus datos (favoritos, historial, etc.) y recargará la aplicación. ¿Estás absolutamente seguro?')) {
                localStorage.removeItem(window.dataManager.DATA_KEY);
                window.showNotification('Todos los datos han sido restablecidos. La página se recargará.', 'success');
                setTimeout(() => location.reload(true), 1500);
            }
        });
    }

    // Lógica de Exportar / Importar
    if (exportDataBtn && window.dataManager) {
        exportDataBtn.addEventListener('click', () => {
            try {
                const data = localStorage.getItem(window.dataManager.DATA_KEY);
                if (!data) {
                    window.showNotification('No hay datos para exportar.', 'warning');
                    return;
                }
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `pelixplushd_backup_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                window.showNotification('Datos exportados correctamente.', 'success');
            } catch (error) {
                window.showNotification('Error al exportar los datos.', 'error');
                console.error('Error exporting data:', error);
            }
        });
    }

    if (importDataBtn && importDataInput && window.dataManager) {
        importDataBtn.addEventListener('click', () => {
            importDataInput.click();
        });

        importDataInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    // Validación simple
                    if (importedData && importedData.version && importedData.favorites) {
                        localStorage.setItem(window.dataManager.DATA_KEY, JSON.stringify(importedData));
                        window.showNotification('Datos importados con éxito. La página se recargará.', 'success');
                        setTimeout(() => window.location.reload(), 2000);
                    } else {
                        window.showNotification('El archivo de importación no es válido.', 'error');
                    }
                } catch (error) {
                    window.showNotification('Error al leer el archivo. Asegúrate de que sea un JSON válido.', 'error');
                    console.error('Error importing data:', error);
                }
            };
            reader.readAsText(file);
        });
    }

    function applyReducedMotion(enable) {
        if (enable) {
            document.body.classList.add('reduced-motion');
            // Inyectar estilos forzados para deshabilitar animaciones
            let style = document.getElementById('reduced-motion-style');
            if (!style) {
                style = document.createElement('style');
                style.id = 'reduced-motion-style';
                style.innerHTML = `*, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }`;
                document.head.appendChild(style);
            }
        } else {
            document.body.classList.remove('reduced-motion');
            const style = document.getElementById('reduced-motion-style');
            if (style) style.remove();
        }
    }

    loadSettings();
}