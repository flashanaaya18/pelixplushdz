document.addEventListener('DOMContentLoaded', () => {
    // Asegurarse de que las variables globales (peliculas, createMovieCard, etc.) de script.js estén disponibles
    if (typeof peliculas === 'undefined' || typeof createMovieCard === 'undefined') {
        console.error("El script principal (script.js) o los datos (peliculas.js) no se han cargado correctamente.");
        return;
    }

    const grid = document.getElementById('todo-lo-nuevo-2025-grid');
    const genreFilter = document.getElementById('genre-filter');
    const sortBy = document.getElementById('sort-by');
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');

    // 1. Filtrar el contenido que es del año 2025
    let content2025 = peliculas.filter(item => item.año === 2025);

    // Función para renderizar el contenido
    const renderContent = (items) => {
        grid.innerHTML = '';
        if (items.length === 0) {
            grid.innerHTML = '<p class="no-results-message">No se encontró contenido del 2025 que coincida con los filtros.</p>';
            return;
        }
        items.forEach(item => {
            // Usamos la función global createMovieCard de script.js
            const card = createMovieCard(item, grid.classList.contains('list-view'));
            grid.appendChild(card);
        });
    };

    // Función para poblar el filtro de géneros
    const populateGenres = () => {
        const genres = new Set();
        content2025.forEach(item => {
            if (Array.isArray(item.genero)) {
                item.genero.forEach(g => genres.add(g));
            } else if (item.genero) {
                genres.add(item.genero);
            }
        });

        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            genreFilter.appendChild(option);
        });
    };

    // Función para filtrar y ordenar
    const filterAndSort = () => {
        let filtered = [...content2025];

        // Filtrado por género
        const selectedGenre = genreFilter.value;
        if (selectedGenre !== 'all') {
            filtered = filtered.filter(item => 
                (Array.isArray(item.genero) && item.genero.includes(selectedGenre)) || item.genero === selectedGenre
            );
        }

        // Ordenamiento
        const sortValue = sortBy.value;
        const viewCounts = window.dataManager ? window.dataManager.getViewCounts() : {};

        filtered.sort((a, b) => {
            switch (sortValue) {
                case 'popularity':
                    return (viewCounts[b.id] || 0) - (viewCounts[a.id] || 0);
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

        renderContent(filtered);
    };

    // Event Listeners para los controles
    genreFilter.addEventListener('change', filterAndSort);
    sortBy.addEventListener('change', filterAndSort);

    gridViewBtn.addEventListener('click', () => {
        grid.classList.remove('list-view');
        grid.classList.add('grid-view');
        gridViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
        filterAndSort(); // Re-renderizar con el layout correcto
    });

    listViewBtn.addEventListener('click', () => {
        grid.classList.remove('grid-view');
        grid.classList.add('list-view');
        listViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
        filterAndSort(); // Re-renderizar con el layout correcto
    });

    // Inicialización
    if (grid) {
        populateGenres();
        filterAndSort(); // Renderizado inicial
    }
});