document.addEventListener('DOMContentLoaded', () => {
    const gridContainer = document.getElementById('todo-lo-nuevo-2025-grid-new');
    const genreFilter = document.getElementById('genre-filter');
    const sortBy = document.getElementById('sort-by');

    // Check if critical elements exist
    if (!gridContainer || !genreFilter || !sortBy) {
        console.error('Missing critical elements in todo-lo-nuevo-2025.html');
        return;
    }

    let movies2025 = [];

    // Wait for movies to be loaded
    const checkMoviesLoaded = setInterval(() => {
        if (window.peliculas && window.peliculas.length > 0) {
            clearInterval(checkMoviesLoaded);
            init2025Page();
        }
    }, 100);

    // Timeout to stop checking after 10 seconds
    setTimeout(() => clearInterval(checkMoviesLoaded), 10000);

    function init2025Page() {
        // Filter movies for 2025
        movies2025 = window.peliculas.filter(p => p.año == 2025);

        // Populate genre filter
        const genres = new Set();
        movies2025.forEach(p => {
            if (Array.isArray(p.genero)) {
                p.genero.forEach(g => genres.add(g));
            } else if (p.genero) {
                genres.add(p.genero);
            }
        });

        // Sort genres alphabetically
        const sortedGenres = Array.from(genres).sort();

        // Add options to select
        sortedGenres.forEach(genre => {
            const option = document.createElement('option');
            value = genre.toLowerCase();
            option.value = value;
            option.textContent = value.charAt(0).toUpperCase() + value.slice(1);
            genreFilter.appendChild(option);
        });

        // Initial render
        filterAndRenderMovies();

        // Event listeners
        genreFilter.addEventListener('change', filterAndRenderMovies);
        sortBy.addEventListener('change', filterAndRenderMovies);
    }

    function filterAndRenderMovies() {
        const selectedGenre = genreFilter.value;
        const sortValue = sortBy.value;

        // Filter
        let filteredMovies = movies2025;
        if (selectedGenre !== 'all') {
            filteredMovies = filteredMovies.filter(p => {
                if (Array.isArray(p.genero)) {
                    return p.genero.some(g => g.toLowerCase() === selectedGenre);
                }
                return p.genero && p.genero.toLowerCase() === selectedGenre;
            });
        }

        // Sort
        filteredMovies.sort((a, b) => {
            switch (sortValue) {
                case 'popularity':
                    // Assuming 'votos' or 'popularidad' exists, otherwise default to rating
                    return (b.popularidad || 0) - (a.popularidad || 0);
                case 'release_date_desc':
                    // If addedDate exists use it, otherwise fall back to year (which is same) or ID
                    const dateA = new Date(a.addedDate || 0);
                    const dateB = new Date(b.addedDate || 0);
                    return dateB - dateA;
                case 'rating_desc':
                    return (b.calificacion || 0) - (a.calificacion || 0);
                case 'title_asc':
                    return (a.titulo || '').localeCompare(b.titulo || '');
                default:
                    return 0;
            }
        });

        renderGrid(filteredMovies);
    }

    function renderGrid(movies) {
        gridContainer.innerHTML = '';

        if (movies.length === 0) {
            gridContainer.innerHTML = '<div class="no-results" style="width:100%; text-align:center; padding: 50px;">No se encontraron películas con estos criterios.</div>';
            return;
        }

        movies.forEach(movie => {
            // Use the global createMovieCard function from script.js
            if (window.createMovieCard) {
                const card = window.createMovieCard(movie);
                gridContainer.appendChild(card);
            } else {
                // Fallback if createMovieCard is not available (should not happen)
                console.error('createMovieCard function not found');
            }
        });
    }
});
