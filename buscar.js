document.addEventListener('DOMContentLoaded', () => {
    // If global data is ready, verify and start. If not, wait for event.
    if (window.peliculas && window.peliculas.length > 0) {
        initSearchPage();
    } else {
        document.addEventListener('app-ready', initSearchPage);
        // Fallback safety
        setTimeout(() => {
            if (!window.searchPageInitialized && window.peliculas && window.peliculas.length > 0) {
                initSearchPage();
            }
        }, 1000);
    }
});

function initSearchPage() {
    if (window.searchPageInitialized) return;
    window.searchPageInitialized = true;

    console.log("Iniciando página de búsqueda...");

    const searchInput = document.getElementById('search-page-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const resultsContainer = document.getElementById('movies-results-container');
    const resultsGrid = document.getElementById('results-grid');
    const placeholder = document.getElementById('search-placeholder');
    const loader = document.getElementById('loader');
    const genreFilter = document.getElementById('genre-filter');
    const sortBy = document.getElementById('sort-by');
    const resultsCount = document.getElementById('results-count');

    let debounceTimer;

    // 1. Populate Genre Filter
    populateGenreFilter();

    // 2. Event Listeners
    if (searchInput) {
        // Auto-focus on desktop, maybe not on mobile to prevent keyboard popping up immediately
        if (window.innerWidth > 768) {
            searchInput.focus();
        }

        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            const val = searchInput.value.trim();
            if (clearSearchBtn) clearSearchBtn.style.display = val ? 'block' : 'none';

            if (!val) {
                clearResults();
                return;
            }

            loader.style.display = 'block';
            placeholder.style.display = 'none';
            resultsContainer.style.display = 'none'; // Hide current results while loading

            debounceTimer = setTimeout(performSearch, 500);
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearSearchBtn.style.display = 'none';
            clearResults();
            searchInput.focus();
        });
    }

    if (genreFilter) genreFilter.addEventListener('change', performSearch);
    if (sortBy) sortBy.addEventListener('change', performSearch);

    // --- Helper Functions ---

    function populateGenreFilter() {
        if (!genreFilter) return;
        const genres = new Set();
        // Use global window.peliculas
        window.peliculas.forEach(item => {
            if (item.genero) {
                if (Array.isArray(item.genero)) {
                    item.genero.forEach(g => genres.add(g.trim().charAt(0).toUpperCase() + g.trim().slice(1).toLowerCase()));
                } else if (typeof item.genero === 'string') {
                    genres.add(item.genero.trim().charAt(0).toUpperCase() + item.genero.trim().slice(1).toLowerCase());
                }
            }
            // Also check 'categoria' as fallback
            if (item.categoria) {
                if (Array.isArray(item.categoria)) {
                    item.categoria.forEach(c => genres.add(c.trim().charAt(0).toUpperCase() + c.trim().slice(1).toLowerCase()));
                } else {
                    genres.add(item.categoria.trim().charAt(0).toUpperCase() + item.categoria.trim().slice(1).toLowerCase());
                }
            }
        });

        const sortedGenres = Array.from(genres).sort();
        sortedGenres.forEach(genre => {
            if (genre.toLowerCase() === 'todos') return; // Skip 'todos' tag if present
            const option = document.createElement('option');
            option.value = genre.toLowerCase();
            option.textContent = genre;
            genreFilter.appendChild(option);
        });
    }

    function clearResults() {
        if (resultsGrid) resultsGrid.innerHTML = '';
        if (resultsContainer) resultsContainer.style.display = 'none';
        if (placeholder) {
            placeholder.style.display = 'block';
            placeholder.textContent = 'Comienza a escribir para descubrir contenido increíble.';
        }
        if (loader) loader.style.display = 'none';
        if (resultsCount) resultsCount.textContent = '';
    }

    function performSearch() {
        const query = searchInput.value.toLowerCase().trim();
        const selectedGenre = genreFilter ? genreFilter.value : 'all';
        const sortCriteria = sortBy ? sortBy.value : 'popularity';

        if (!query && selectedGenre === 'all') {
            clearResults();
            return;
        }

        // Filter
        let results = window.peliculas.filter(item => {
            // Text Search
            const title = normalizeText(item.titulo);
            const director = normalizeText(item.director || '');
            const normalizedQuery = normalizeText(query);

            const matchesText = !query || title.includes(normalizedQuery) || director.includes(normalizedQuery);

            // Genre Filter
            let matchesGenre = true;
            if (selectedGenre !== 'all') {
                const itemGenres = [];
                if (Array.isArray(item.genero)) itemGenres.push(...item.genero.map(g => g.toLowerCase()));
                else if (item.genero) itemGenres.push(item.genero.toLowerCase());

                if (Array.isArray(item.categoria)) itemGenres.push(...item.categoria.map(c => c.toLowerCase()));
                else if (item.categoria) itemGenres.push(item.categoria.toLowerCase());

                matchesGenre = itemGenres.some(g => g.includes(selectedGenre) || selectedGenre.includes(g));
            }

            return matchesText && matchesGenre;
        });

        // Sort
        sortResults(results, sortCriteria);

        // Render
        displayResults(results, query);
        if (loader) loader.style.display = 'none';
    }

    function sortResults(results, criteria) {
        switch (criteria) {
            case 'popularity':
                // Assuming 'votos' or 'calificacion' acts as popularity proxy if 'popularidad' is missing.
                // Or prefer newer items if no popularity metric.
                results.sort((a, b) => {
                    const popA = a.votos || 0;
                    const popB = b.votos || 0;
                    if (popB !== popA) return popB - popA;
                    return (b.año || 0) - (a.año || 0);
                });
                break;
            case 'release_date_desc':
                results.sort((a, b) => (b.año || 0) - (a.año || 0));
                break;
            case 'rating_desc':
                results.sort((a, b) => (b.calificacion || 0) - (a.calificacion || 0));
                break;
            case 'title_asc':
                results.sort((a, b) => (a.titulo || '').localeCompare(b.titulo || ''));
                break;
        }
    }

    function displayResults(results, query) {
        if (!resultsGrid) return;
        resultsGrid.innerHTML = '';

        if (results.length === 0) {
            resultsContainer.style.display = 'none';
            placeholder.style.display = 'block';
            placeholder.innerHTML = `No encontramos "<strong>${searchInput.value}</strong>" localmente. <br><span class="ultra-search-badge">Iniciando Ultra Búsqueda TMDB...</span>`;

            // Ultra Búsqueda Fallback
            performUltraSearch(searchInput.value);
            return;
        }

        placeholder.style.display = 'none';
        resultsContainer.style.display = 'block';
        if (resultsCount) resultsCount.textContent = `${results.length} resultados encontrados`;

        results.slice(0, 50).forEach(movie => {
            // Use global card creator if available
            if (window.createMovieCard) {
                const card = window.createMovieCard(movie, true, query); // Pass query for highlighting
                resultsGrid.appendChild(card);
            } else {
                // Fallback basic card creation
                const card = document.createElement('div');
                card.className = 'movie-card';
                card.innerHTML = `<img src="${movie.poster}" style="width:100%; border-radius:8px;"><h3>${movie.titulo}</h3>`;
                resultsGrid.appendChild(card);
            }
        });

        // Setup lazy load if needed (though createMovieCard usually handles it)
        if (window.setupLazyLoading) {
            // window.setupLazyLoading(); 
        }
    }

    async function performUltraSearch(query) {
        const TMDB_KEY = '9869fab7c867e72214c8628c6029ec74';
        try {
            const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&language=es-ES&query=${encodeURIComponent(query)}&page=1&include_adult=false`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                placeholder.style.display = 'none';
                resultsContainer.style.display = 'block';
                resultsGrid.innerHTML = '';
                resultsCount.textContent = `Ultra Búsqueda: ${data.results.length} resultados`;

                data.results.forEach(item => {
                    if (item.media_type !== 'movie' && item.media_type !== 'tv') return;

                    const movieData = {
                        id: `tmdb-${item.id}`,
                        tmdbId: item.id,
                        tipo: item.media_type === 'tv' ? 'serie' : 'pelicula',
                        titulo: item.title || item.name,
                        descripcion: item.overview,
                        poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://via.placeholder.com/180x270/333333/ffffff?text=No+Image',
                        año: (item.release_date || item.first_air_date || '').split('-')[0] || 'N/A',
                        calificacion: item.vote_average,
                        esTmdb: true
                    };

                    if (window.createMovieCard) {
                        const card = window.createMovieCard(movieData, true, query);
                        // Redirigir a TMDB especial
                        card.onclick = (e) => {
                            if (!e.target.closest('.card-favorite-btn')) {
                                window.location.href = `detalles.html?tmdb=${item.id}&type=${item.media_type}`;
                            }
                        };
                        resultsGrid.appendChild(card);
                    }
                });
            } else {
                placeholder.innerHTML = `No encontramos nada para "<strong>${query}</strong>" ni en Ultra Búsqueda.`;
            }
        } catch (error) {
            console.error("Error en Ultra Búsqueda (buscar.js):", error);
            if (error.message.includes('Failed to fetch') || error.message.includes('Network response')) {
                placeholder.innerHTML = `Error de conexión. Por favor, revisa tu conexión a internet e intenta de nuevo.`;
            } else {
                placeholder.innerHTML = `Error al conectar con Ultra Búsqueda.`;
            }
            placeholder.style.display = 'block';
            resultsContainer.style.display = 'none';
        }
    }
}

// Utility included just in case script.js hasn't defined it yet (though it should have)
function normalizeText(text) {
    if (!text) return '';
    return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}