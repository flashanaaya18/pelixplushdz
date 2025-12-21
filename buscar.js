document.addEventListener('DOMContentLoaded', () => {
    if (window.peliculas && window.peliculas.length > 0) {
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

    console.log("Iniciando página de búsqueda latino...");

    const searchInput = document.getElementById('search-page-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const resultsContainer = document.getElementById('movies-results-container');
    const resultsGrid = document.getElementById('results-grid');
    const placeholder = document.getElementById('search-placeholder');
    const loader = document.getElementById('loader');
    const genreFilter = document.getElementById('genre-filter');
    const languageFilter = document.getElementById('language-filter');
    const sortBy = document.getElementById('sort-by');
    const resultsCount = document.getElementById('results-count');
    const externalSearchContainer = document.getElementById('external-search-container');
    const externalSearchTerm = document.getElementById('external-search-term');
    const countdownElement = document.getElementById('countdown');

    let debounceTimer;
    let redirectCountdown = null;
    let currentSearchTerm = '';

    // 1. Populate Genre Filter con géneros latinos
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

            // Cancelar redirección automática si el usuario sigue escribiendo
            if (redirectCountdown) {
                clearInterval(redirectCountdown);
                redirectCountdown = null;
                if (externalSearchContainer) externalSearchContainer.style.display = 'none';
            }

            if (!val) {
                clearResults();
                return;
            }

            loader.style.display = 'block';
            placeholder.style.display = 'none';
            resultsContainer.style.display = 'none';
            
            if (externalSearchContainer) {
                externalSearchContainer.style.display = 'none';
            }

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
    if (languageFilter) languageFilter.addEventListener('change', performSearch);
    if (sortBy) sortBy.addEventListener('change', performSearch);

    // --- Helper Functions ---

    function populateGenreFilter() {
        if (!genreFilter) return;
        const genres = new Set();
        
        // Géneros comunes en contenido latino
        const latinoGenres = [
            'Cine Mexicano', 'Telenovela', 'Comedia Mexicana', 'Drama Latino',
            'Acción Latino', 'Cine Argentino', 'Cine Colombiano', 'Cine Chileno',
            'Series Latino', 'Reality Latino', 'Documental Latino', 'Infantil Latino',
            'Animación Latino', 'Musical Latino', 'Romance Latino', 'Terror Latino'
        ];
        
        // Añadir géneros de las películas
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

        // Combinar géneros
        latinoGenres.forEach(genre => genres.add(genre));
        
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
                    <i class="fas fa-globe-americas latino-icon"></i> Contenido Latino
                </h2>
                <p class="no-results-subtitle">Busca películas y series en español latino mexicano</p>
                <div style="margin-top: 30px; color: #666; max-width: 500px; margin-left: auto; margin-right: auto;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 20px;">
                        <div style="background: rgba(0, 91, 187, 0.1); padding: 15px; border-radius: 10px;">
                            <i class="fas fa-film" style="color: #005bbb; font-size: 1.5rem; margin-bottom: 10px;"></i>
                            <p style="font-size: 0.9rem; margin: 0;">Cine Mexicano</p>
                        </div>
                        <div style="background: rgba(0, 91, 187, 0.1); padding: 15px; border-radius: 10px;">
                            <i class="fas fa-tv" style="color: #005bbb; font-size: 1.5rem; margin-bottom: 10px;"></i>
                            <p style="font-size: 0.9rem; margin: 0;">Series Latino</p>
                        </div>
                        <div style="background: rgba(0, 91, 187, 0.1); padding: 15px; border-radius: 10px;">
                            <i class="fas fa-microphone" style="color: #005bbb; font-size: 1.5rem; margin-bottom: 10px;"></i>
                            <p style="font-size: 0.9rem; margin: 0;">Doblaje Latino</p>
                        </div>
                    </div>
                </div>
            `;
        }
        if (loader) loader.style.display = 'none';
        if (resultsCount) resultsCount.textContent = '';
        
        // Ocultar contenedor externo
        if (externalSearchContainer) {
            externalSearchContainer.style.display = 'none';
        }
        
        // Cancelar redirección si existe
        if (redirectCountdown) {
            clearInterval(redirectCountdown);
            redirectCountdown = null;
        }
    }

    function performSearch() {
        const query = searchInput.value.toLowerCase().trim();
        const selectedGenre = genreFilter ? genreFilter.value : 'all';
        const selectedLanguage = languageFilter ? languageFilter.value : 'latino';
        const sortCriteria = sortBy ? sortBy.value : 'popularity';

        currentSearchTerm = query;

        if (!query && selectedGenre === 'all') {
            clearResults();
            return;
        }

        // Mostrar loader con mensaje latino
        if (loader) {
            loader.style.display = 'block';
            loader.innerHTML = `
                <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: #00aaff;"></i>
                <p style="margin-top: 15px; color: #00aaff;">
                    <i class="fas fa-globe-americas"></i> Buscando contenido latino...
                </p>
            `;
        }
        
        if (resultsContainer) resultsContainer.style.display = 'none';
        if (placeholder) placeholder.style.display = 'none';
        if (externalSearchContainer) externalSearchContainer.style.display = 'none';

        // Filtrar resultados con prioridad latino
        let results = window.peliculas.filter(item => {
            // Búsqueda de texto
            const title = normalizeText(item.titulo);
            const director = normalizeText(item.director || '');
            const actors = normalizeText(item.reparto || '');
            const country = normalizeText(item.pais || '');
            const language = normalizeText(item.idioma || '');
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

            // Filtro de idioma (PRIORIDAD LATINO)
            let matchesLanguage = true;
            if (selectedLanguage !== 'all') {
                // Verificar si tiene idioma específico
                const itemLanguage = language.toLowerCase();
                const itemCountry = country.toLowerCase();
                
                switch(selectedLanguage) {
                    case 'latino':
                        // Priorizar contenido latinoamericano
                        matchesLanguage = itemLanguage.includes('latino') || 
                                        itemLanguage.includes('mexic') ||
                                        itemCountry.includes('méxico') ||
                                        itemCountry.includes('mexic') ||
                                        itemCountry.includes('argentina') ||
                                        itemCountry.includes('colombia') ||
                                        itemCountry.includes('chile') ||
                                        itemCountry.includes('perú') ||
                                        itemCountry.includes('venezuela');
                        break;
                    case 'mexico':
                        matchesLanguage = itemLanguage.includes('mexic') || 
                                        itemCountry.includes('méxico') ||
                                        itemCountry.includes('mexic');
                        break;
                    case 'espanol':
                        matchesLanguage = itemLanguage.includes('español') || 
                                        itemLanguage.includes('esp');
                        break;
                    case 'subtitulado':
                        matchesLanguage = itemLanguage.includes('subt') || 
                                        itemLanguage.includes('sub');
                        break;
                }
                
                // Si no hay datos de idioma, asumir que es latino
                if (!itemLanguage && !itemCountry && selectedLanguage === 'latino') {
                    matchesLanguage = true;
                }
            }

            return matchesText && matchesGenre && matchesLanguage;
        });

        // Ordenar resultados (priorizar contenido latino)
        sortResults(results, sortCriteria, selectedLanguage);

        // Renderizar resultados
        displayResults(results, query, selectedLanguage);
        
        if (loader) loader.style.display = 'none';
    }

    function sortResults(results, criteria, language) {
        switch (criteria) {
            case 'popularity':
                // Priorizar contenido latino en popularidad
                results.sort((a, b) => {
                    // Dar prioridad a contenido mexicano/latino
                    const priorityA = getLatinoPriority(a, language);
                    const priorityB = getLatinoPriority(b, language);
                    
                    if (priorityB !== priorityA) return priorityB - priorityA;
                    
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
    
    function getLatinoPriority(item, language) {
        let priority = 0;
        const itemLanguage = (item.idioma || '').toLowerCase();
        const itemCountry = (item.pais || '').toLowerCase();
        
        if (language === 'latino') {
            // Prioridad máxima para contenido mexicano
            if (itemCountry.includes('méxico') || itemCountry.includes('mexic')) {
                priority += 100;
            }
            // Prioridad alta para otros países latinos
            if (itemCountry.includes('argentina') || itemCountry.includes('colombia') || 
                itemCountry.includes('chile') || itemCountry.includes('perú')) {
                priority += 50;
            }
            // Prioridad media para contenido con idioma latino
            if (itemLanguage.includes('latino') || itemLanguage.includes('mexic')) {
                priority += 30;
            }
        }
        
        return priority;
    }

    function displayResults(results, query, language) {
        if (!resultsGrid) return;
        resultsGrid.innerHTML = '';

        // Cancelar cualquier redirección previa
        if (redirectCountdown) {
            clearInterval(redirectCountdown);
            redirectCountdown = null;
        }

        if (results.length === 0 && query) {
            resultsContainer.style.display = 'none';
            loader.style.display = 'none';
            
            // Mostrar mensaje de no resultados en latino
            placeholder.style.display = 'block';
            placeholder.innerHTML = `
                <div class="no-results-container">
                    <i class="fas fa-globe-americas" style="font-size: 3rem; color: #005bbb; margin-bottom: 20px;"></i>
                    <h2 class="no-results-title">No encontramos contenido latino</h2>
                    <p class="no-results-subtitle">No encontramos "<span class="search-highlight">${query}</span>" en nuestro catálogo latino.</p>
                    
                    <div class="loading-latino">
                        <i class="fas fa-search"></i> Buscando en fuentes latinoamericanas...
                    </div>
                </div>
            `;
            
            // Configurar búsqueda externa LATINO
            setupExternalSearch(query, language);
            
            return;
        }

        if (results.length > 0) {
            placeholder.style.display = 'none';
            resultsContainer.style.display = 'block';
            
            if (resultsCount) {
                const latinoCount = results.filter(item => 
                    (item.idioma || '').toLowerCase().includes('latino') || 
                    (item.pais || '').toLowerCase().includes('méxico')
                ).length;
                
                resultsCount.textContent = `${results.length} ${results.length === 1 ? 'resultado' : 'resultados'} (${latinoCount} latino)`;
            }
            
            if (externalSearchContainer) {
                externalSearchContainer.style.display = 'none';
            }

            // Mostrar hasta 50 resultados
            const displayResults = results.slice(0, 50);
            
            displayResults.forEach(movie => {
                if (window.createMovieCard) {
                    // Añadir badge latino si corresponde
                    const isLatino = (movie.idioma || '').toLowerCase().includes('latino') || 
                                    (movie.pais || '').toLowerCase().includes('méxico');
                    
                    const card = window.createMovieCard(movie, true, query);
                    
                    // Añadir badge latino si no lo tiene
                    if (isLatino && !card.querySelector('.latino-badge')) {
                        const badge = document.createElement('span');
                        badge.className = 'latino-badge';
                        badge.textContent = 'LATINO';
                        badge.style.cssText = `
                            position: absolute;
                            top: 10px;
                            right: 10px;
                            background: #005bbb;
                            color: white;
                            padding: 3px 8px;
                            border-radius: 10px;
                            font-size: 0.7rem;
                            font-weight: bold;
                            z-index: 10;
                        `;
                        card.style.position = 'relative';
                        card.appendChild(badge);
                    }
                    
                    resultsGrid.appendChild(card);
                } else {
                    // Fallback básico con badge latino
                    const isLatino = (movie.idioma || '').toLowerCase().includes('latino') || 
                                    (movie.pais || '').toLowerCase().includes('méxico');
                    
                    const card = document.createElement('div');
                    card.className = 'movie-card';
                    card.style.position = 'relative';
                    
                    card.innerHTML = `
                        <img src="${movie.poster || 'https://via.placeholder.com/180x270/005bbb/fff?text=Latino'}" 
                             alt="${movie.titulo}" 
                             style="width:100%; border-radius:8px; aspect-ratio: 2/3; object-fit: cover;">
                        <h3 style="margin-top: 10px; font-size: 0.9rem; color: #fff;">${movie.titulo}</h3>
                        ${isLatino ? '<span class="latino-badge" style="position: absolute; top: 10px; right: 10px; background: #005bbb; color: white; padding: 3px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: bold;">LATINO</span>' : ''}
                    `;
                    
                    card.onclick = () => {
                        window.location.href = `detalles.html?id=${movie.id}`;
                    };
                    
                    resultsGrid.appendChild(card);
                }
            });
        }
    }

    function setupExternalSearch(query, language) {
        if (!externalSearchContainer || !externalSearchTerm) return;
        
        // Actualizar término de búsqueda
        externalSearchTerm.textContent = `"${query}"`;
        externalSearchContainer.style.display = 'block';
        
        // Configurar botones para búsqueda latina
        const searchLatinoBtn = document.getElementById('search-latino-btn');
        const searchMexicoBtn = document.getElementById('search-mexico-btn');
        
        if (searchLatinoBtn) {
            searchLatinoBtn.onclick = () => {
                redirectToLatinoSearch(query, 'latino');
            };
        }
        
        if (searchMexicoBtn) {
            searchMexicoBtn.onclick = () => {
                redirectToLatinoSearch(query, 'mexico');
            };
        }
        
        // Iniciar cuenta regresiva para redirección automática
        startAutoRedirect(query, language);
    }

    function startAutoRedirect(query, language) {
        if (!countdownElement) return;
        
        let countdown = 5;
        countdownElement.textContent = countdown;
        
        redirectCountdown = setInterval(() => {
            countdown--;
            if (countdownElement) {
                countdownElement.textContent = countdown;
            }
            
            if (countdown <= 0) {
                clearInterval(redirectCountdown);
                redirectToLatinoSearch(query, language); // Redirigir automáticamente
            }
        }, 1000);
    }

    function redirectToLatinoSearch(query, language) {
        // Limpiar la cuenta regresiva
        if (redirectCountdown) {
            clearInterval(redirectCountdown);
            redirectCountdown = null;
        }
        
        // Codificar query para URL con términos latinos
        const enhancedQuery = enhanceLatinoSearch(query, language);
        const encodedQuery = encodeURIComponent(enhancedQuery);
        
        // Redirigir a la página de detalles con parámetros latinos
        window.location.href = `detalles.html?search=${encodedQuery}&lang=${language}&source=latino`;
    }

    function enhanceLatinoSearch(query, language) {
        let enhancedQuery = query;
        
        // Añadir términos específicos según el idioma
        switch(language) {
            case 'latino':
                enhancedQuery = `${query} español latino online`;
                break;
            case 'mexico':
                enhancedQuery = `${query} mexicano español latino`;
                break;
            case 'espanol':
                enhancedQuery = `${query} español castellano`;
                break;
            default:
                enhancedQuery = `${query} español latino`;
        }
        
        // Añadir términos comunes para búsqueda de películas latinas
        const latinoTerms = [
            'latino',
            'español latino',
            'doblado latino',
            'audio latino',
            'méxico',
            'mexicano',
            'cine mexicano',
            'película latina',
            'serie latina'
        ];
        
        // Ya incluimos los términos principales, no duplicar
        return enhancedQuery;
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