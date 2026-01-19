document.addEventListener('DOMContentLoaded', function () {
    // Inicialización robusta: Si ya hay datos, iniciar. Si no, esperar evento o timeout.
    if (window.peliculas && window.peliculas.length > 0) {
        initializeSearchPage();
    } else {
        document.addEventListener('app-ready', initializeSearchPage);
        // Fallback de seguridad por si el evento app-ready ya pasó o falló
        setTimeout(() => { if (!window.searchPageInitialized) initializeSearchPage(); }, 1000);
    }
});

function initializeSearchPage() {
    if (window.searchPageInitialized) return; // Evitar doble inicialización
    window.searchPageInitialized = true;
    console.log("Página de búsqueda inicializada.");

    const searchInput = document.getElementById('search-page-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const resultsGrid = document.getElementById('results-grid');
    const resultsContainer = document.getElementById('movies-results-container');
    const placeholder = document.getElementById('search-placeholder');
    const loader = document.getElementById('loader');
    const resultsCount = document.getElementById('results-count');
    const genreFilter = document.getElementById('genre-filter');
    const typeFilter = document.getElementById('type-filter');
    const sortBy = document.getElementById('sort-by');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const paginationContainer = document.getElementById('pagination-container');

    // State Management
    let currentPage = 1;
    let currentQuery = '';
    let totalPages = 1;
    let isSearching = false;

    if (!searchInput || !resultsGrid || !resultsContainer || !placeholder || !loader) {
        console.error("Faltan elementos esenciales en la página de búsqueda.");
        return;
    }

    // Fallback para normalizeText si script.js no cargó bien
    if (!window.normalizeText) {
        window.normalizeText = (text) => {
            if (!text) return '';
            return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        };
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

    // --- TMDB API Integration ---
    const searchTMDB = async (query, page = 1, type = 'multi') => {
        const apiKey = window.tmdbConfig.apiKey;
        const baseUrl = 'https://api.themoviedb.org/3';
        const endpoint = type === 'multi' ? '/search/multi' : `/search/${type}`;
        
        const url = `${baseUrl}${endpoint}?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=es-ES&page=${page}&include_adult=false`;

        // Cache System
        const cacheKey = `search_${type}_${query}_${page}`;
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
            const parsed = JSON.parse(cachedData);
            // Simple cache expiry (1 hour)
            if (Date.now() - parsed.timestamp < 3600000) {
                return parsed.data;
            }
        }

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Error en TMDB API');
            const data = await response.json();
            
            // Save to cache
            localStorage.setItem(cacheKey, JSON.stringify({
                timestamp: Date.now(),
                data: data
            }));
            
            return data;
        } catch (error) {
            console.error("Search Error:", error);
            return null;
        }
    };

    // --- Availability Logic ---
    const checkAvailability = (tmdbItem) => {
        // Normalizamos el título de TMDB
        const tmdbTitle = window.normalizeText(tmdbItem.title || tmdbItem.name || '');
        
        // Buscamos en el catálogo local (window.peliculas)
        // Asumimos que window.peliculas está cargado desde script.js
        const localCatalog = window.peliculas || [];
        
        // Retornamos el objeto completo encontrado en lugar de solo true/false
        return localCatalog.find(localItem => {
            const localTitle = window.normalizeText(localItem.titulo);
            // Comparación estricta de título normalizado
            // Idealmente compararíamos IDs si window.peliculas tuviera tmdb_id
            return localTitle === tmdbTitle;
        });
    };

    const renderCard = (item) => {
        // Detectar si es un item local o de TMDB
        const isLocal = item.hasOwnProperty('titulo') && !item.hasOwnProperty('media_type');
        
        let localItem = null;
        let isAvailable = false;

        if (isLocal) {
            localItem = item;
            isAvailable = true;
        } else {
            localItem = checkAvailability(item);
            isAvailable = !!localItem;
        }
        
        const posterPath = isLocal 
            ? (item.poster || 'https://via.placeholder.com/500x750?text=No+Image')
            : (item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image');
        
        const title = isLocal ? item.titulo : (item.title || item.name);
        const date = isLocal ? (item.año || 'N/A') : (item.release_date || item.first_air_date || 'N/A');
        const year = date ? date.toString().split('-')[0] : 'N/A';
        
        let type = 'Película';
        if (isLocal) {
            type = (item.tipo === 'serie' || item.tipo === 'tv') ? 'Serie' : 'Película';
        } else {
            type = item.media_type === 'tv' ? 'Serie' : 'Película';
        }

        const card = document.createElement('div');
        card.className = 'movie-card'; // Reutilizamos estilos existentes
        card.style.position = 'relative';

        // Badge de Disponibilidad
        const badgeClass = isAvailable ? 'badge-available' : 'badge-unavailable';
        const badgeText = isAvailable ? 'DISPONIBLE' : 'NO DISPONIBLE';
        
        let html = `
            <div class="card-head">
                <img src="${posterPath}" alt="${title}" class="card-img" loading="lazy">
                <div class="availability-badge ${badgeClass}">${badgeText}</div>
            </div>
            <div class="card-body">
                <h3 class="card-title">${title}</h3>
                <div class="card-info">
                    <span class="year">${year}</span>
                    <span class="type">${type}</span>
                </div>
            </div>
        `;

        // Acciones según disponibilidad
        if (isAvailable) {
            // Si está disponible, hacemos que toda la carta sea un enlace (comportamiento normal)
            // Usamos los datos del item LOCAL encontrado para generar el ID correcto (titulo-año)
            let localId = localItem.id;
            if (!localId) {
                const slug = window.normalizeText(localItem.titulo).replace(/\s+/g, '-');
                const itemYear = localItem.año || localItem.year || '';
                localId = itemYear ? `${slug}-${itemYear}` : slug;
            }
            
            card.innerHTML = `<a href="detalles.html?id=${localId}" style="text-decoration:none; color:inherit;">${html}</a>`;
        } else {
            // Si no está disponible, añadimos botón de solicitud
            html += `<button class="request-btn" onclick="window.openRequestModal('${item.id}', '${title.replace(/'/g, "\\'")}', '${item.media_type}')">
                        <i class="fas fa-bell"></i> SOLICITAR
                     </button>`;
            card.innerHTML = html;
        }

        return card;
    };

    const performSearch = async (isLoadMore = false) => {
        const query = searchInput.value.trim();
        const selectedType = typeFilter.value;
        // const selectedGenre = genreFilter.value; // TMDB filtering by genre requires extra logic mapping IDs

        if (!isLoadMore) {
            currentPage = 1;
            resultsGrid.innerHTML = '';
            currentQuery = query;
        }

        placeholder.style.display = 'none';
        resultsContainer.style.display = 'block';
        loader.style.display = 'block';
        
        let results = [];
        let totalResults = 0;

        if (query) {
            // --- MODO BÚSQUEDA TMDB ---
            isSearching = true;
            const data = await searchTMDB(query, currentPage, selectedType);
            if (data && data.results) {
                results = data.results;
                totalPages = data.total_pages;
                totalResults = data.total_results;
            }
        } else {
            // --- MODO CATÁLOGO LOCAL ---
            isSearching = false;
            let filtered = window.peliculas || [];

            // Filtro Tipo
            if (selectedType !== 'multi') {
                const typeMap = { 'movie': 'pelicula', 'tv': 'serie' };
                filtered = filtered.filter(p => p.tipo === typeMap[selectedType]);
            }

            // Filtro Género
            const selectedGenre = genreFilter.value;
            if (selectedGenre !== 'all') {
                filtered = filtered.filter(p => {
                    if (!p.genero) return false;
                    const genres = Array.isArray(p.genero) ? p.genero : [p.genero];
                    return genres.some(g => g.toLowerCase() === selectedGenre);
                });
            }

            // Ordenamiento
            const selectedSort = sortBy.value;
            if (selectedSort === 'popularity') {
                filtered.sort((a, b) => (b.popularidad || 0) - (a.popularidad || 0));
            } else if (selectedSort === 'release_date_desc') {
                filtered.sort((a, b) => {
                    const dateA = a.addedDate ? new Date(a.addedDate) : new Date(a.año, 0, 1);
                    const dateB = b.addedDate ? new Date(b.addedDate) : new Date(b.año, 0, 1);
                    return dateB - dateA;
                });
            } else if (selectedSort === 'rating_desc') {
                filtered.sort((a, b) => (b.calificacion || 0) - (a.calificacion || 0));
            } else if (selectedSort === 'title_asc') {
                filtered.sort((a, b) => (a.titulo || '').localeCompare(b.titulo || ''));
            }

            totalResults = filtered.length;
            totalPages = Math.ceil(totalResults / 20); // 20 items por página
            
            const start = (currentPage - 1) * 20;
            const end = start + 20;
            results = filtered.slice(start, end);
        }

        loader.style.display = 'none';
        isSearching = false;

        if (resultsCount) {
            resultsCount.textContent = `${totalResults} resultados encontrados`;
        }

        if (results.length === 0 && currentPage === 1) {
            resultsGrid.innerHTML = `<div class="no-results-container">
                <h2 class="no-results-title">Sin resultados</h2>
                <p class="no-results-subtitle">No encontramos nada que coincida con tu búsqueda.</p>
            </div>`; 
            paginationContainer.style.display = 'none';
        } else {
            results.forEach(item => {
                // Filter out people, only show movie and tv
                if (item.media_type === 'person') return;
                
                // If searching specific type, TMDB returns that type, but if 'multi', we check media_type
                if (selectedType !== 'multi' && selectedType !== item.media_type && item.media_type) return;

                resultsGrid.appendChild(renderCard(item));
            });

            // Handle Pagination Button
            if (currentPage < totalPages) {
                paginationContainer.style.display = 'block';
            } else {
                paginationContainer.style.display = 'none';
            }
        }
    };

    searchInput.addEventListener('input', debounce(() => performSearch(false), 500));
    typeFilter.addEventListener('change', () => performSearch(false));
    genreFilter.addEventListener('change', () => performSearch(false));
    sortBy.addEventListener('change', () => performSearch(false));

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            if (!isSearching && currentPage < totalPages) {
                currentPage++;
                performSearch(true);
            }
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchInput.focus();
            performSearch(false);
        });
    }

    // Cargar catálogo inicial
    performSearch(false);

    // --- Request System Logic ---
    const requestModal = document.getElementById('request-modal');
    const closeRequestModalBtn = document.getElementById('close-request-modal');
    const requestForm = document.getElementById('request-form');

    window.openRequestModal = (id, title, type) => {
        document.getElementById('req-tmdb-id').value = id;
        document.getElementById('req-title').value = title;
        document.getElementById('req-type').value = type;
        document.getElementById('req-title-display').value = title;
        
        if (requestModal) {
            requestModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    };

    if (closeRequestModalBtn) {
        closeRequestModalBtn.addEventListener('click', () => {
            requestModal.style.display = 'none';
            document.body.style.overflow = '';
        });
    }

    if (requestForm) {
        requestForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Rate Limiting
            const today = new Date().toDateString();
            let requests = JSON.parse(localStorage.getItem('user_requests') || '[]');
            const todayRequests = requests.filter(r => new Date(r.date).toDateString() === today);
            
            if (todayRequests.length >= 5) {
                alert('Has alcanzado el límite de 5 solicitudes diarias.');
                return;
            }

            const newRequest = {
                id: document.getElementById('req-tmdb-id').value,
                title: document.getElementById('req-title').value,
                type: document.getElementById('req-type').value,
                email: document.getElementById('req-email').value,
                message: document.getElementById('req-message').value,
                date: new Date().toISOString()
            };

            requests.push(newRequest);
            localStorage.setItem('user_requests', JSON.stringify(requests));

            // Visual Confirmation
            alert('¡Solicitud enviada con éxito! Te notificaremos cuando esté disponible.');
            requestModal.style.display = 'none';
            document.body.style.overflow = '';
            requestForm.reset();
        });
    }
}