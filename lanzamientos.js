document.addEventListener('DOMContentLoaded', () => {
    // --- OBTENER REFERENCIAS A ELEMENTOS DEL DOM ---
    const grid = document.getElementById('lanzamientos-grid');
    const genreFilter = document.getElementById('genre-filter');
    const sortBy = document.getElementById('sort-by');
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');

    // Asegurarse de que los elementos existen antes de continuar
    if (!grid || !genreFilter || !sortBy || !gridViewBtn || !listViewBtn) {
        console.error("No se encontraron todos los elementos necesarios en la página de lanzamientos.");
        return;
    }

    let lanzamientos = [];

    // --- FUNCIONES DE CARGA Y PREPARACIÓN DE DATOS ---

    // Carga los favoritos desde el dataManager del script principal
    const loadFavorites = () => {
        // CORRECCIÓN: Se utiliza la base de datos global 'window.peliculas' que ya está
        // procesada y unificada por script.js. Esto simplifica el código y asegura
        // que se use la fuente de datos correcta.
        const allPeliculas = window.peliculas || [];
        const favoriteIds = window.dataManager.getFavorites();
        allPeliculas.forEach(p => {
            p.favorito = favoriteIds.includes(p.id);
        });
        // Filtra solo las películas de la categoría 'lanzamientos-recientes'
        // CORRECCIÓN: Excluye contenido roto.
        // CORRECCIÓN: Se ajusta el filtro para que funcione si 'categoria' es un array.
        lanzamientos = allPeliculas.filter(p => {
            if (p.esta_roto) return false;
            const categorias = Array.isArray(p.categoria) ? p.categoria.map(c => c.toLowerCase()) : [String(p.categoria).toLowerCase()];
            return categorias.includes('lanzamientos-recientes');
        });
    };

    // Rellena el filtro de géneros basado en las películas de lanzamientos
    const populateGenreFilter = () => {
        // Obtiene géneros únicos de las películas de lanzamientos
        const allGenres = lanzamientos.flatMap(p => {
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
                // Capitaliza la primera letra para mostrarlo en el filtro
                option.textContent = genre.charAt(0).toUpperCase() + genre.slice(1);
                genreFilter.appendChild(option);
            }
        });
    };

    // --- LÓGICA DE RENDERIZADO, FILTRADO Y ORDENACIÓN ---

    const renderLanzamientos = () => {
        let peliculasFiltradas = [...lanzamientos];

        // 1. Filtrar por género
        const selectedGenre = genreFilter.value;
        if (selectedGenre !== 'all' && window.normalizeText) {
            peliculasFiltradas = peliculasFiltradas.filter(p => p.genero && normalizeText(p.genero).includes(selectedGenre));
        }

        // 2. Ordenar
        const sortValue = sortBy.value;
        peliculasFiltradas.sort((a, b) => {
            switch (sortValue) {
                case 'popularity':
                    return (b.votos || 0) - (a.votos || 0);
                case 'release_date_desc':
                    // Ordena por fecha de adición (más precisa) o por año como alternativa
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
            grid.innerHTML = `<p class="no-favorites-message">No se encontraron lanzamientos que coincidan con los filtros.</p>`;
        } else {
            peliculasFiltradas.forEach(pelicula => {
                // Usamos la función global `createMovieCard` de script.js para crear las tarjetas
                const tarjeta = window.createMovieCard(pelicula);
                grid.appendChild(tarjeta);
            });
        }
    };

    // --- EVENT LISTENERS ---
    genreFilter.addEventListener('change', renderLanzamientos);
    sortBy.addEventListener('change', renderLanzamientos);

    gridViewBtn.addEventListener('click', () => { grid.classList.remove('list-view'); gridViewBtn.classList.add('active'); listViewBtn.classList.remove('active'); });
    listViewBtn.addEventListener('click', () => { grid.classList.add('list-view'); listViewBtn.classList.add('active'); gridViewBtn.classList.remove('active'); });

    // --- INICIALIZACIÓN ---
    const init = () => {
        loadFavorites();
        populateGenreFilter();
        renderLanzamientos();
    };

    // --- CORRECCIÓN: INICIALIZACIÓN BASADA EN EVENTOS ---
    // En lugar de ejecutarse inmediatamente, esperamos a que script.js
    // nos avise que todo está listo (incluyendo dataManager).
    document.addEventListener('app-ready', () => {
        console.log("Evento 'app-ready' recibido en lanzamientos.js. Inicializando...");
        init();
    });
});