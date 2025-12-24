document.addEventListener('DOMContentLoaded', () => {
    if ((window.peliculas && window.peliculas.length > 0) || (window.tmdbConfig && window.tmdbConfig.accessToken)) {
        initSearchPage();
    } else {
        document.addEventListener('app-ready', initSearchPage);
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
    let currentSearchTerm = '';

    // 1. Populate Genre Filter
    populateGenreFilter();

    // 2. Event Listeners
    if (searchInput) {
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

            debounceTimer = setTimeout(performSearch, 400);
        });

        // Permitir búsqueda con Enter
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch();
            }
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

    // Cargar resultados iniciales (Tendencias + Local) automáticamente
    performSearch();

    // --- Helper Functions ---

    function populateGenreFilter() {
        if (!genreFilter) return;
        const genres = new Set();
        
        // Añadir géneros de las películas
        if (window.peliculas && Array.isArray(window.peliculas)) {
        window.peliculas.forEach(item => {
            if (item.genero) {
                if (Array.isArray(item.genero)) {
                    item.genero.forEach(g => {
                        if (g && g.trim()) {
                            const genre = g.trim().charAt(0).toUpperCase() + g.trim().slice(1).toLowerCase();
                            genres.add(genre);
                        }
                    });
                } else if (typeof item.genero === 'string' && item.genero.trim()) {
                    const genre = item.genero.trim().charAt(0).toUpperCase() + item.genero.trim().slice(1).toLowerCase();
                    genres.add(genre);
                }
            }
        });
        }

        const sortedGenres = Array.from(genres).sort();
        genreFilter.innerHTML = '<option value="all">Todos los Géneros</option>';
        
        sortedGenres.forEach(genre => {
            if (genre.toLowerCase() === 'todos') return;
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
            placeholder.innerHTML = `
                <h2 class="no-results-title">
                    <i class="fas fa-search"></i> Buscar
                </h2>
                <p class="no-results-subtitle">Encuentra tus películas y series favoritas</p>
            `;
        }
        if (loader) loader.style.display = 'none';
        if (resultsCount) resultsCount.textContent = '';
    }

    async function performSearch() {
        const query = searchInput.value.toLowerCase().trim();
        const selectedGenre = genreFilter ? genreFilter.value : 'all';
        const sortCriteria = sortBy ? sortBy.value : 'popularity';

        currentSearchTerm = query;

        // Mostrar loader
        if (loader) {
            loader.style.display = 'block';
            loader.innerHTML = `
                <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: #00aaff;"></i>
                <p style="margin-top: 15px; color: #00aaff;">
                    Buscando...
                </p>
            `;
        }
        
        if (placeholder) placeholder.style.display = 'none';

        // 1. Filtrar resultados locales
        let results = [];
        if (window.peliculas && Array.isArray(window.peliculas)) {
            results = window.peliculas.filter(item => {
            // Búsqueda de texto
            const title = normalizeText(item.titulo);
            const director = normalizeText(item.director || '');
            const actors = normalizeText(item.reparto || '');
            const normalizedQuery = normalizeText(query);

            const matchesText = !query || 
                title.includes(normalizedQuery) || 
                director.includes(normalizedQuery) ||
                actors.includes(normalizedQuery);

            // Filtro de género
            let matchesGenre = true;
            if (selectedGenre !== 'all') {
                const itemGenres = [];
                if (Array.isArray(item.genero)) {
                    itemGenres.push(...item.genero.map(g => g.toLowerCase()));
                } else if (item.genero) {
                    itemGenres.push(item.genero.toLowerCase());
                }

                matchesGenre = itemGenres.some(g => 
                    g.includes(selectedGenre) || selectedGenre.includes(g)
                );
            }

            return matchesText && matchesGenre;
        });
        }

        // 2. Búsqueda en TMDB (Búsqueda o Tendencias si está vacío)
        if (selectedGenre === 'all' && window.tmdbConfig && window.tmdbConfig.accessToken) {
            try {
                let tmdbUrl = '';
                if (query) {
                    tmdbUrl = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=es-ES&page=1`;
                } else {
                    // Si no hay búsqueda, mostrar tendencias semanales (Películas y Series)
                    tmdbUrl = `https://api.themoviedb.org/3/trending/all/week?language=es-ES&page=1`;
                }

                const response = await fetch(tmdbUrl, {
                    headers: {
                        'Authorization': `Bearer ${window.tmdbConfig.accessToken}`,
                        'accept': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.results) {
                        const localTitles = new Set(results.map(r => normalizeText(r.titulo)));
                        
                        const tmdbResults = data.results.map(item => {
                            if (item.media_type !== 'movie' && item.media_type !== 'tv') return null;
                            if (!item.poster_path) return null;
                            
                            return {
                                id: `tmdb-${item.id}`,
                                tmdbId: item.id,
                                titulo: item.title || item.name,
                                poster: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
                                año: (item.release_date || item.first_air_date || '').split('-')[0],
                                calificacion: item.vote_average,
                                tipo: item.media_type === 'tv' ? 'serie' : 'pelicula',
                                esTmdb: true,
                                descripcion: item.overview,
                                genero: [] 
                            };
                        }).filter(item => item && !localTitles.has(normalizeText(item.titulo)));
                        
                        results = [...results, ...tmdbResults];
                    }
                }
            } catch (error) {
                console.error("Error buscando en TMDB:", error);
            }
        }

        // Ordenar resultados
        sortResults(results, sortCriteria);

        // Renderizar resultados
        displayResults(results, query);
        
        if (loader) loader.style.display = 'none';
    }

    function sortResults(results, criteria) {
        switch (criteria) {
            case 'popularity':
                results.sort((a, b) => {
                    const popA = a.votos || a.calificacion || 0;
                    const popB = b.votos || b.calificacion || 0;
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

        if (results.length === 0 && query) {
            resultsContainer.style.display = 'none';
            loader.style.display = 'none';
            
            placeholder.style.display = 'block';
            placeholder.innerHTML = `
                <div class="no-results-container">
                    <i class="fas fa-search" style="font-size: 3rem; color: #00aaff; margin-bottom: 20px;"></i>
                    <h2 class="no-results-title">"${query}"</h2>
                    <p class="no-results-subtitle">No disponible</p>
                </div>
            `;
            return;
        }

        if (results.length > 0) {
            placeholder.style.display = 'none';
            resultsContainer.style.display = 'block';
            
            if (resultsCount) {
                resultsCount.textContent = `${results.length} ${results.length === 1 ? 'resultado' : 'resultados'}`;
            }

            // Mostrar todos los resultados
            const displayResults = results;
            
            displayResults.forEach(movie => {
                let card;
                // Usa la función global existente si está disponible
                if (window.createMovieCard) {
                    card = window.createMovieCard(movie, true, query);
                } else {
                    // O crea una tarjeta de respaldo
                    card = document.createElement('div');
                    card.className = 'movie-card';
                    card.style.position = 'relative';
                    
                    card.innerHTML = `
                        <img src="${movie.poster || 'https://via.placeholder.com/180x270/333333/ffffff?text=No+Image'}"
                             alt="${movie.titulo}"
                             style="width:100%; border-radius:8px; aspect-ratio: 2/3; object-fit: cover;">
                        <h3 style="margin-top: 10px; font-size: 0.9rem; color: #fff;">${movie.titulo}</h3>
                    `;
                }

                // Manejador de clics centralizado para todas las tarjetas
                card.onclick = (e) => {
                    e.preventDefault(); // Detener cualquier navegación predeterminada
                    
                    // Si la película es de TMDB y no está en nuestra lista local, la añadimos temporalmente.
                    if (movie.esTmdb) {
                        const exists = window.peliculas.some(p => p.id === movie.id);
                        if (!exists) {
                            window.peliculas.push(movie);
                        }
                    }
                    
                    // Navegar a la página de detalles
                    window.location.href = `detalles.html?id=${movie.id}`;
                };
                
                resultsGrid.appendChild(card);
            });
        }
    }
}

// Función de utilidad para normalizar texto (mejorada para español)
function normalizeText(text) {
    if (!text) return '';
    
    return text.toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remover acentos
        .replace(/ñ/g, 'n') // Conservar ñ
        .replace(/[^\w\sñáéíóúü]/gi, ' ') // Conservar letras españolas
        .replace(/\s+/g, ' ') // Normalizar espacios
        .trim();
}