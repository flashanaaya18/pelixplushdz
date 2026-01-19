document.addEventListener('DOMContentLoaded', () => {
    // --- OBTENER REFERENCIAS A ELEMENTOS DEL DOM ---
    const grid = document.getElementById('comedia-grid');
    const genreFilter = document.getElementById('genre-filter');
    const sortBy = document.getElementById('sort-by');
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');

    // Asegurarse de que los elementos existen antes de continuar
    if (!grid || !genreFilter || !sortBy || !gridViewBtn || !listViewBtn) {
        console.warn("Algunos elementos UI no se encontraron en comedia.html. Posible disparidad de IDs.");
        if (!grid) return;
    }

    let contentList = [];

    // --- FUNCIONES DE CARGA Y PREPARACIÓN DE DATOS ---
    const loadContent = () => {
        const favoriteIds = window.dataManager ? window.dataManager.getFavorites() : [];
        if (window.peliculas) {
            window.peliculas.forEach(p => {
                p.favorito = favoriteIds.includes(p.id);
            });
            contentList = window.peliculas.filter(p => {
                if (p.esta_roto) return false;
                const cats = Array.isArray(p.categoria) ? p.categoria : [p.categoria];
                return cats.map(t => String(t).toLowerCase()).includes('comedia');
            });
        }
    };

    // Rellena el filtro de géneros
    const populateGenreFilter = () => {
        if (!genreFilter) return;
        const allGenres = contentList.flatMap(p => {
            const genero = p.genero;
            if (!genero) return [];
            if (Array.isArray(genero)) return genero;
            return genero.split(/[\s,]+/);
        }).map(g => String(g).trim().toLowerCase()).filter(Boolean);

        const genres = [...new Set(allGenres)];

        genreFilter.innerHTML = '<option value="all">Todos los Géneros</option>';
        genres.sort().forEach(genre => {
            if (genre) {
                const option = document.createElement('option');
                option.value = genre.toLowerCase();
                option.textContent = genre.charAt(0).toUpperCase() + genre.slice(1);
                genreFilter.appendChild(option);
            }
        });
    };

    // --- LÓGICA DE RENDERIZADO, FILTRADO Y ORDENACIÓN ---
    const renderContent = () => {
        let filtrados = [...contentList];

        // 1. Filtrar por género
        if (genreFilter) {
            const selectedGenre = genreFilter.value;
            if (selectedGenre !== 'all' && typeof window.normalizeText === 'function') {
                filtrados = filtrados.filter(p => p.genero && normalizeText(p.genero).includes(selectedGenre));
            }
        }

        // 2. Ordenar
        if (sortBy) {
            const sortValue = sortBy.value;
            filtrados.sort((a, b) => {
                switch (sortValue) {
                    case 'popularity': return (b.votos || 0) - (a.votos || 0);
                    case 'release_date_desc':
                        const dateA = a.addedDate ? new Date(a.addedDate) : new Date(a.año, 0, 1);
                        const dateB = b.addedDate ? new Date(b.addedDate) : new Date(b.año, 0, 1);
                        return dateB - dateA;
                    case 'rating_desc': return (b.calificacion || 0) - (a.calificacion || 0);
                    case 'title_asc': return a.titulo.localeCompare(b.titulo);
                    default: return 0;
                }
            });
        }

        // 3. Renderizar
        grid.innerHTML = '';
        if (filtrados.length === 0) {
            grid.innerHTML = `<p class="no-results-message" style="width:100%; text-align:center; padding:2rem; color:#888;">No se encontraron resultados.</p>`;
        } else {
            filtrados.forEach(item => {
                if (window.createMovieCard) {
                    grid.appendChild(window.createMovieCard(item));
                }
            });
        }
    };

    // --- EVENT LISTENERS ---
    if (genreFilter) genreFilter.addEventListener('change', renderContent);
    if (sortBy) sortBy.addEventListener('change', renderContent);
    if (gridViewBtn && listViewBtn) {
        gridViewBtn.addEventListener('click', () => { grid.classList.remove('list-view'); gridViewBtn.classList.add('active'); listViewBtn.classList.remove('active'); });
        listViewBtn.addEventListener('click', () => { grid.classList.add('list-view'); listViewBtn.classList.add('active'); gridViewBtn.classList.remove('active'); });
    }

    // --- INICIALIZACIÓN ---
    const init = () => {
        loadContent();
        populateGenreFilter();
        renderContent();
    };

    // Esperamos a que script.js nos avise que todo está listo
    if (window.peliculas && window.peliculas.length > 0) {
        init();
    } else {
        document.addEventListener('app-ready', () => {
            console.log("Evento 'app-ready' recibido en comedia.js. Inicializando...");
            init();
        });
    }
});
