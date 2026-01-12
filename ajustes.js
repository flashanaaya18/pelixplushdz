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
}