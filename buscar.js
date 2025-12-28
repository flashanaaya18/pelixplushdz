document.addEventListener('DOMContentLoaded', function () {
    // Espera a que el script principal (script.js) esté listo y haya cargado los datos.
    document.addEventListener('app-ready', initializeSearchPage);
});

function initializeSearchPage() {
    console.log("Página de búsqueda inicializada.");

    const searchInput = document.getElementById('search-page-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const resultsGrid = document.getElementById('results-grid');
    const resultsContainer = document.getElementById('movies-results-container');
    const placeholder = document.getElementById('search-placeholder');
    const loader = document.getElementById('loader');
    const resultsCount = document.getElementById('results-count');
    const genreFilter = document.getElementById('genre-filter');
    const sortBy = document.getElementById('sort-by');

    if (!searchInput || !resultsGrid || !resultsContainer || !placeholder || !loader) {
        console.error("Faltan elementos esenciales en la página de búsqueda.");
        return;
    }

    // --- Populate Genre Filter ---
    const allGenres = new Set();
    if (window.peliculas && window.peliculas.length > 0) {
        window.peliculas.forEach(p => {
            if (p.genero && Array.isArray(p.genero)) {
                p.genero.forEach(g => allGenres.add(g.trim()));
            }
        });
        allGenres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre.toLowerCase();
            option.textContent = genre.charAt(0).toUpperCase() + genre.slice(1);
            if (genreFilter) genreFilter.appendChild(option);
        });
    }

    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const performSearch = async () => {
        const query = searchInput.value.trim();
        const selectedGenre = genreFilter.value;
        const selectedSort = sortBy.value;

        if (!query && selectedGenre === 'all') {
            resultsContainer.style.display = 'none';
            placeholder.style.display = 'block';
            loader.style.display = 'none';
            resultsGrid.innerHTML = '';
            if (resultsCount) resultsCount.textContent = '';
            return;
        }

        placeholder.style.display = 'none';
        resultsContainer.style.display = 'block';
        resultsGrid.innerHTML = '';
        loader.style.display = 'block'; // Mostrar loader

        // Simular un pequeño retraso para que el loader sea visible
        await new Promise(resolve => setTimeout(resolve, 300));

        let filteredMovies = window.peliculas;

        // Filtrar por género
        if (selectedGenre !== 'all') {
            filteredMovies = filteredMovies.filter(p => 
                p.genero && Array.isArray(p.genero) && p.genero.map(g => g.toLowerCase()).includes(selectedGenre)
            );
        }

        // Filtrar por texto de búsqueda
        if (query) {
            const normalizedQuery = window.normalizeText(query);
            filteredMovies = filteredMovies.filter(p => 
                window.normalizeText(p.titulo).includes(normalizedQuery)
            );
        }

        // Ordenar resultados
        // (La lógica de ordenación completa de script.js se puede añadir aquí si es necesario)

        loader.style.display = 'none'; // Ocultar loader

        if (resultsCount) {
            resultsCount.textContent = `${filteredMovies.length} resultados`;
        }

        if (filteredMovies.length === 0) {
            resultsGrid.innerHTML = `<div class="no-results-container">
                <h2 class="no-results-title">Sin resultados</h2>
                <p class="no-results-subtitle">No encontramos nada que coincida con tu búsqueda.</p>
            </div>`;
        } else {
            filteredMovies.forEach(pelicula => {
                if (window.createMovieCard) {
                    resultsGrid.appendChild(window.createMovieCard(pelicula));
                }
            });
        }
    };

    searchInput.addEventListener('input', debounce(performSearch, 400));
    genreFilter.addEventListener('change', performSearch);
    sortBy.addEventListener('change', performSearch);

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchInput.focus();
            performSearch();
        });
    }
}