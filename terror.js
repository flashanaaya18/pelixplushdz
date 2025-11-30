document.addEventListener('DOMContentLoaded', () => {
    // --- OBTENER REFERENCIAS A ELEMENTOS DEL DOM ---
    const grid = document.getElementById('terror-grid');
    const genreFilter = document.getElementById('genre-filter');
    const sortBy = document.getElementById('sort-by');
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');

    // Asegurarse de que los elementos existen antes de continuar
    if (!grid || !genreFilter || !sortBy || !gridViewBtn || !listViewBtn) {
        console.error("No se encontraron todos los elementos necesarios en la página de terror.");
        return;
    }

    let terrorContent = [];
    // --- FUNCIONES DE CARGA Y PREPARACIÓN DE DATOS ---

    // Carga los favoritos y filtra el contenido de aventura
    const loadContent = () => {
        const favoriteIds = window.dataManager.getFavorites();
        peliculas.forEach(p => {
            p.favorito = favoriteIds.includes(p.id);
        });
        // CORRECCIÓN: Filtra contenido donde 'terror' esté en la categoría,
        // ya sea como string único o dentro de un array.
        terrorContent = peliculas.filter(p => {
            if (Array.isArray(p.categoria) && !p.esta_roto) {
                return p.categoria.includes('terror');
            }
            return p.categoria === 'terror' && !p.esta_roto;
        });
    };

    // Rellena el filtro de géneros basado en las películas de aventura
    const populateGenreFilter = () => {
        const allGenres = terrorContent.flatMap(p => {
            const genero = p.genero;
            if (!genero) return [];
            if (Array.isArray(genero)) {
                return genero;
            }
            return genero.split(/[\s,]+/);
        }).map(g => g.trim().toLowerCase()).filter(Boolean);
        const genres = [...new Set(allGenres)];

        genreFilter.innerHTML = '<option value="all">Todos los Géneros</option>'; // Reset
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
        let peliculasFiltradas = [...terrorContent];

        // 1. Filtrar por género
        const selectedGenre = genreFilter.value;
        if (selectedGenre !== 'all') {
            peliculasFiltradas = peliculasFiltradas.filter(p => p.genero && window.normalizeText(p.genero).includes(selectedGenre));
        }

        // 2. Ordenar
        const sortValue = sortBy.value;
        peliculasFiltradas.sort((a, b) => {
            switch (sortValue) {
                case 'popularity':
                    return (b.votos || 0) - (a.votos || 0);
                case 'release_date_desc':
                    const dateA = a.addedDate ? new Date(a.addedDate) : new Date(a.año, 0, 1);
                    const dateB = b.addedDate ? new Date(b.addedDate) : new Date(b.año, 0, 1);
                    return dateB - dateA;
                case 'rating_desc':
                    return (b.calificacion || 0) - (a.calificacion || 0);
                case 'title_asc':
                    return a.titulo.localeCompare(b.titulo);
                default:
                    return 0;
            }
        });

        // 3. Renderizar en la cuadrícula
        grid.innerHTML = '';
        if (peliculasFiltradas.length === 0) {
            grid.innerHTML = `<p class="no-favorites-message">No se encontraron películas de terror que coincidan con los filtros.</p>`;
        } else {
            peliculasFiltradas.forEach(pelicula => {
                const tarjeta = window.createMovieCard(pelicula);
                grid.appendChild(tarjeta);
            });
        }
    };

    // --- EVENT LISTENERS ---
    genreFilter.addEventListener('change', renderContent);
    sortBy.addEventListener('change', renderContent);

    gridViewBtn.addEventListener('click', () => { grid.classList.remove('list-view'); gridViewBtn.classList.add('active'); listViewBtn.classList.remove('active'); });
    listViewBtn.addEventListener('click', () => { grid.classList.add('list-view'); listViewBtn.classList.add('active'); gridViewBtn.classList.remove('active'); });

    // --- INICIALIZACIÓN ---
    const init = () => {
        loadContent();
        populateGenreFilter();
        renderContent();
    };

    init();
});