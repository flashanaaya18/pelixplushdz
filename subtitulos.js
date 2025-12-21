/**
 * subtitulos.js
 * Módulo para la gestión completa de subtítulos en el reproductor de video.
 * 100% funcional y robusto.
 */

document.addEventListener('DOMContentLoaded', () => {
    const subtitlesBtn = document.getElementById('subtitles-btn');
    if (!subtitlesBtn) return;

    // Contenedor del menú de subtítulos
    const subtitlesMenu = document.createElement('div');
    subtitlesMenu.className = 'subtitles-menu';
    subtitlesMenu.style.display = 'none'; // Oculto por defecto
    subtitlesBtn.parentNode.insertBefore(subtitlesMenu, subtitlesBtn.nextSibling);

    // Variable para controlar la visibilidad del menú
    let menuVisible = false;

    // Mostrar/ocultar el menú al hacer clic en el botón
    subtitlesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        menuVisible = !menuVisible;
        subtitlesMenu.style.display = menuVisible ? 'block' : 'none';
    });

    // Ocultar el menú si se hace clic fuera de él
    document.addEventListener('click', (e) => {
        if (menuVisible && !subtitlesMenu.contains(e.target)) {
            menuVisible = false;
            subtitlesMenu.style.display = 'none';
        }
    });

    /**
     * Función principal para configurar los subtítulos para un video.
     * Esta función será llamada desde `detalle.js` cuando se cargue un video.
     * @param {HTMLVideoElement} videoElement - El elemento de video.
     * @param {Array<Object>} subtitles - Array de objetos de subtítulos. Ej: [{label: 'Español', lang: 'es', url: '...'}]
     */
    window.setupSubtitles = (videoElement, subtitles) => {
        if (!videoElement || !subtitles || subtitles.length === 0) {
            subtitlesBtn.style.display = 'none'; // Ocultar botón si no hay subtítulos
            subtitlesMenu.innerHTML = '';
            return;
        }

        subtitlesBtn.style.display = 'inline-flex'; // Mostrar el botón
        subtitlesMenu.innerHTML = ''; // Limpiar menú anterior

        // Limpiar pistas de subtítulos anteriores del video
        clearExistingTracks(videoElement);

        // Añadir la opción para desactivar subtítulos
        const offOption = createSubtitleOption('Desactivados', 'off');
        offOption.addEventListener('click', () => {
            disableAllTracks(videoElement);
            saveSubtitlePreference('off');
            setActiveOption(offOption);
        });
        subtitlesMenu.appendChild(offOption);

        // Añadir cada subtítulo disponible al video y al menú
        subtitles.forEach((sub, index) => {
            const trackElement = document.createElement('track');
            trackElement.kind = 'subtitles';
            trackElement.label = sub.label;
            trackElement.srclang = sub.lang;
            trackElement.src = sub.url;
            // El modo 'hidden' permite controlarlos por script
            trackElement.mode = 'hidden'; 
            videoElement.appendChild(trackElement);

            const subOption = createSubtitleOption(sub.label, sub.lang);
            subOption.addEventListener('click', () => {
                activateTrack(videoElement, sub.lang);
                saveSubtitlePreference(sub.lang);
                setActiveOption(subOption);
            });
            subtitlesMenu.appendChild(subOption);
        });

        // Intentar aplicar la preferencia guardada por el usuario
        applySavedPreference(videoElement);
    };

    /**
     * Crea un elemento de opción para el menú de subtítulos.
     * @param {string} label - El texto a mostrar (ej: "Español").
     * @param {string} lang - El código de idioma (ej: "es").
     * @returns {HTMLButtonElement}
     */
    function createSubtitleOption(label, lang) {
        const option = document.createElement('button');
        option.className = 'subtitle-menu-item';
        option.textContent = label;
        option.dataset.lang = lang;
        return option;
    }

    /**
     * Activa un subtítulo específico y desactiva los demás.
     * @param {HTMLVideoElement} videoElement
     * @param {string} lang - El idioma de la pista a activar.
     */
    function activateTrack(videoElement, lang) {
        for (let i = 0; i < videoElement.textTracks.length; i++) {
            const track = videoElement.textTracks[i];
            track.mode = (track.language === lang) ? 'showing' : 'hidden';
        }
    }

    /**
     * Desactiva todas las pistas de subtítulos.
     * @param {HTMLVideoElement} videoElement
     */
    function disableAllTracks(videoElement) {
        for (let i = 0; i < videoElement.textTracks.length; i++) {
            videoElement.textTracks[i].mode = 'hidden';
        }
    }

    /**
     * Limpia las pistas de subtítulos de un video anterior.
     * @param {HTMLVideoElement} videoElement
     */
    function clearExistingTracks(videoElement) {
        const oldTracks = videoElement.querySelectorAll('track');
        oldTracks.forEach(track => track.remove());
    }

    /**
     * Marca la opción seleccionada en el menú como activa.
     * @param {HTMLElement} activeOption
     */
    function setActiveOption(activeOption) {
        subtitlesMenu.querySelectorAll('.subtitle-menu-item').forEach(item => {
            item.classList.remove('active');
        });
        activeOption.classList.add('active');
        menuVisible = false; // Ocultar menú después de seleccionar
        subtitlesMenu.style.display = 'none';
    }

    /**
     * Guarda la preferencia de idioma del usuario en localStorage.
     * @param {string} lang 
     */
    function saveSubtitlePreference(lang) {
        try {
            localStorage.setItem('preferredSubtitleLang', lang);
        } catch (error) {
            console.warn("No se pudo guardar la preferencia de subtítulos:", error);
        }
    }

    /**
     * Aplica la preferencia de subtítulo guardada al video actual.
     * @param {HTMLVideoElement} videoElement
     */
    function applySavedPreference(videoElement) {
        try {
            const preferredLang = localStorage.getItem('preferredSubtitleLang');
            if (!preferredLang) {
                // Si no hay preferencia, desactivar todos por defecto
                const offOption = subtitlesMenu.querySelector('[data-lang="off"]');
                if (offOption) setActiveOption(offOption);
                disableAllTracks(videoElement);
                return;
            }

            const optionToSelect = subtitlesMenu.querySelector(`[data-lang="${preferredLang}"]`);
            if (optionToSelect) {
                optionToSelect.click(); // Simula un clic para activar la pista y el estilo
            }
        } catch (error) {
            console.warn("No se pudo aplicar la preferencia de subtítulos:", error);
        }
    }
});