document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.getAttribute('data-page');
    if (page !== 'Animes') return;

    // Bandera para evitar doble inicialización
    let initialized = false;

    function initializeAnimePage() {
        if (initialized) return;
        initialized = true;

        const animeSections = [
            { id: 'naruto-section', gridId: 'naruto-grid', category: 'naruto' },
            { id: 'dragon-ball-section', gridId: 'dragon-ball-grid', category: 'dragon ball' },
            { id: 'one-piece-section', gridId: 'one-piece-grid', category: 'one piece' },
            { id: 'animes-populares-section', gridId: 'animes-populares-grid', category: 'animes populares' }
        ];

        // Filtra todo el contenido de anime una sola vez
        // Asegurarse de que window.peliculas existe
        if (!window.peliculas || !Array.isArray(window.peliculas)) {
            console.warn('window.peliculas no está disponible aún en animes1.js');
            initialized = false;
            return;
        }

        const allAnimeContent = window.peliculas.filter(p =>
            !p.esta_roto && Array.isArray(p.categoria) && p.categoria.some(c => ['naruto', 'dragon ball', 'one piece', 'animes populares'].includes(c.toLowerCase()))
        );

        animeSections.forEach(section => {
            const sectionElement = document.getElementById(section.id);
            const gridElement = document.getElementById(section.gridId);

            if (!sectionElement || !gridElement) return;

            const contentForSection = allAnimeContent.filter(p => p.categoria.includes(section.category));

            if (contentForSection.length > 0) {
                gridElement.innerHTML = '';
                contentForSection.forEach(item => {
                    // createMovieCard debe estar disponible globalmente desde script.js
                    if (typeof createMovieCard === 'function') {
                        gridElement.appendChild(createMovieCard(item));
                    }
                });

                // Lógica de Carrusel (Flechas)
                const container = sectionElement.querySelector('.carrusel-contenedor');
                if (container) {
                    // Eliminar flechas existentes si las hay (por seguridad)
                    container.querySelectorAll('.carrusel-flecha').forEach(el => el.remove());

                    const flechaIzquierda = document.createElement('button');
                    flechaIzquierda.className = 'carrusel-flecha izquierda';
                    flechaIzquierda.innerHTML = '<i class="fas fa-chevron-left"></i>';

                    const flechaDerecha = document.createElement('button');
                    flechaDerecha.className = 'carrusel-flecha derecha';
                    flechaDerecha.innerHTML = '<i class="fas fa-chevron-right"></i>';

                    container.appendChild(flechaIzquierda);
                    container.appendChild(flechaDerecha);

                    const scrollAmount = gridElement.clientWidth * 0.8;

                    flechaIzquierda.addEventListener('click', () => {
                        gridElement.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
                    });

                    flechaDerecha.addEventListener('click', () => {
                        gridElement.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                    });
                }
            } else {
                sectionElement.style.display = 'none'; // Oculta la sección si no hay contenido
            }
        });
    }

    // --- Inicialización basada en eventos ---
    // Esperamos a que script.js nos avise que todo está listo.
    document.addEventListener('app-ready', () => {
        console.log("Evento 'app-ready' recibido en animes1.js. Inicializando...");
        initializeAnimePage();
    });

    // Fallback: Si el script carga tarde y el evento ya pasó (o si peliculas ya está poblado)
    if (window.peliculas && window.peliculas.length > 0) {
        initializeAnimePage();
    }
});