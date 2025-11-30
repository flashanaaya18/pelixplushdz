document.addEventListener('DOMContentLoaded', () => {
    // --- OBTENER REFERENCIAS A ELEMENTOS DEL DOM ---
    const grid = document.getElementById('series-grid');
    const genreFilter = document.getElementById('genre-filter');
    const sortBy = document.getElementById('sort-by');
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');

    // Asegurarse de que los elementos existen antes de continuar
    if (!grid || !genreFilter || !sortBy || !gridViewBtn || !listViewBtn) {
        console.error("No se encontraron todos los elementos necesarios en la página de series.");
        return;
    }

    let series = [];

    // --- FUNCIONES DE CARGA Y PREPARACIÓN DE DATOS ---

    // Carga los favoritos desde el dataManager del script principal
    const loadFavorites = () => {
        // Asumimos que `dataManager` y `peliculas` están disponibles globalmente desde script.js y peliculas.js
        const favoriteIds = window.dataManager.getFavorites();
        peliculas.forEach(p => {
            p.favorito = favoriteIds.includes(p.id);
        });
        // Filtra solo el contenido de tipo 'serie'
        // CORRECCIÓN: Filtra series y excluye las que están marcadas como rotas.
        series = peliculas.filter(p => p.tipo === 'serie' && !p.esta_roto);
    };

    // Rellena el filtro de géneros basado en las series disponibles
    const populateGenreFilter = () => {
        // Obtiene géneros únicos de las series
        const allGenres = series.flatMap(p => {
            const genero = p.genero;
            if (!genero) return []; // Si no hay género, devuelve un array vacío
            if (Array.isArray(genero)) {
                return genero; // Si ya es un array, devuélvelo
            }
            // Si es un string, divídelo por espacios o comas
            return genero.split(/[\s,]+/);
        }).map(g => g.trim().toLowerCase()).filter(Boolean); // Limpia, convierte a minúsculas y filtra vacíos
        const genres = [...new Set(allGenres)];
        genreFilter.innerHTML = '<option value="all">Todos los Géneros</option>'; // Reset
        genres.sort().forEach(genre => {
            if (genre) {
                const option = document.createElement('option');
                option.value = genre.toLowerCase();
                // Capitaliza la primera letra para mostrarlo en el filtro
                option.textContent = genre.charAt(0).toUpperCase() + genre.slice(1);
                genreFilter.appendChild(option);
            }
        });
    };

    // --- LÓGICA DE RENDERIZADO, FILTRADO Y ORDENACIÓN ---

    const renderSeries = () => {
        let peliculasFiltradas = [...series];

        // 1. Filtrar por género
        const selectedGenre = genreFilter.value;
        if (selectedGenre !== 'all') {
            peliculasFiltradas = peliculasFiltradas.filter(p => p.genero && normalizeText(p.genero).includes(selectedGenre));
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
            grid.innerHTML = `<p class="no-favorites-message">No se encontraron series que coincidan con los filtros.</p>`;
        } else {
            peliculasFiltradas.forEach(pelicula => {
                // Usamos la función global `createMovieCard` de script.js para crear las tarjetas
                const tarjeta = window.createMovieCard(pelicula);
                grid.appendChild(tarjeta);
            });
        }
    };

    // --- EVENT LISTENERS ---
    genreFilter.addEventListener('change', renderSeries);
    sortBy.addEventListener('change', renderSeries);

    gridViewBtn.addEventListener('click', () => { grid.classList.remove('list-view'); gridViewBtn.classList.add('active'); listViewBtn.classList.remove('active'); });
    listViewBtn.addEventListener('click', () => { grid.classList.add('list-view'); listViewBtn.classList.add('active'); gridViewBtn.classList.remove('active'); });

    // --- INICIALIZACIÓN ---
    const init = () => {
        loadFavorites();
        populateGenreFilter();
        renderSeries();
    };

    init();
});