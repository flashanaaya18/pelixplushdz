// Función principal que se ejecuta después de cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    // --- SISTEMA DE DEDUPLICACIÓN INMEDIATA ---
    // Este bloque se asegura de que no haya contenido duplicado en la lista 'peliculas'.
    if (typeof peliculas !== 'undefined' && Array.isArray(peliculas)) {
        const originalCount = peliculas.length;
        const seenIds = new Set();
        const uniquePeliculas = [];

        for (const p of peliculas) {
            // Ensure each movie has an ID. If it doesn't, generate one.
            if (!p.id) {
                const safeTitle = (p.titulo || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                p.id = `${safeTitle}-${p.año}`;
            }
            // Si el ID no se ha visto antes, se añade a la lista de contenido único.
            if (!seenIds.has(p.id)) {
                seenIds.add(p.id);
                uniquePeliculas.push(p);
            }
        }

        // Replace the original list with the de-duplicated list.
        window.peliculas = uniquePeliculas;

        const removedCount = originalCount - uniquePeliculas.length;
        if (removedCount > 0) {
            console.log(`Se eliminaron ${removedCount} elementos duplicados. Contenido único: ${uniquePeliculas.length}.`);
        }
    }

    // --- SISTEMA AVANZADO DE GESTIÓN DE DATOS (LocalStorage Wrapper) ---
    const dataManager = {
        DATA_KEY: 'peliXxUserData',
        CURRENT_VERSION: 1.1,

        _data: {},

        load() {
            try {
                const rawData = localStorage.getItem(this.DATA_KEY);
                if (rawData) {
                    this._data = JSON.parse(rawData);
                    if (!this._data.version || this._data.version < this.CURRENT_VERSION) {
                        console.warn("Data migration required.");
                        this._migrate(this._data);
                    }
                } else {
                    this._data = this._getDefaults();
                }
            } catch (error) {
                console.error("Error loading data from localStorage, using defaults.", error);
                this._data = this._getDefaults();
                this._save(); // Ensure defaults are saved to avoid future errors
            }
        },

        _save() {
            if (!this._data) return; // Prevent saving if data is not initialized
            try {
                localStorage.setItem(this.DATA_KEY, JSON.stringify(this._data));
            } catch (error) {
                console.error("Error al guardar datos en localStorage:", error);
            }
        },

        _getDefaults() {
            console.log("Initializing default data.");
            return {
                version: this.CURRENT_VERSION,
                favorites: [],
                continueWatching: {},
                viewHistory: [],
                userRatings: {},
                movieViewCounts: {},
                recentSearches: [],
                appVersion: null,
                reportedItems: [], // Asegurar que reportedItems siempre exista
                notifications: [] // NUEVO: Para notificaciones de "Próximamente"
            };
        },

        _migrate(oldData) {
            console.warn(`Migrating data from version ${oldData.version || 'ancient'} to ${this.CURRENT_VERSION}`);
            oldData.version = this.CURRENT_VERSION;
            this._data = { ...this._getDefaults(), ...oldData };
            this._save();
            console.log("Migración completada.");
            alert("Data migration complete. Please refresh the page.");
        },

        // --- MÉTODOS PÚBLICOS ---
        // Se añade una guarda para devolver un valor por defecto si _data es null.
        getFavorites: function() { return this._data?.favorites || []; },
        saveFavorites: function(favs) { this._data.favorites = favs; this._save(); },

        getContinueWatching: function() { return this._data?.continueWatching || {}; },
        saveContinueWatching: function(items) { this._data.continueWatching = items; this._save(); },
        
        getViewHistory: function() { return this._data?.viewHistory || []; },
        saveViewHistory: function(history) { this._data.viewHistory = history; this._save(); },

        getUserRatings: function() { return this._data?.userRatings || {}; },
        saveUserRatings: function(ratings) { this._data.userRatings = ratings; this._save(); },

        getViewCounts: function() { return this._data?.movieViewCounts || {}; },
        saveViewCounts: function(counts) { this._data.movieViewCounts = counts; this._save(); },

        getRecentSearches: function() { return this._data?.recentSearches || []; },
        saveRecentSearches: function(searches) { this._data.recentSearches = searches; this._save(); },

        getAppVersion: function() { return this._data.appVersion; },
        setAppVersion: function(version) { this._data.appVersion = version; this._save(); },

        getReportedItems: function() { return this._data?.reportedItems || []; },
        addReportedItem: function(itemId) { if (!this._data.reportedItems.includes(itemId)) { this._data.reportedItems.push(itemId); } this._save(); },

        // --- NUEVO: Métodos para notificaciones ---
        getNotifications: function() { return this._data?.notifications || []; },
        saveNotifications: function(notifications) { this._data.notifications = notifications; this._save(); }
    };

    // Load data immediately after defining the object.
    dataManager.load();

    // --- Exponer dataManager globalmente ---
    window.dataManager = dataManager;

    // --- Variables y Elementos del DOM ---
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const sideMenu = document.getElementById('side-menu');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const liveSearchResultsContainer = document.getElementById('live-search-results');
    const continueWatchingGrid = document.getElementById('continue-watching-grid');
    const reportedItems = new Set(dataManager.getReportedItems()); // Cargar reportes al inicio
    const proximamenteSection = document.getElementById('proximamente-section');
    const recomendacionesSection = document.getElementById('recomendaciones-section');
    const recomendacionesGrid = document.getElementById('recomendaciones-grid');
    const noRecomendacionesMessage = document.getElementById('no-recomendaciones');
    let mostViewedIds = [];

    // --- Hamburger Menu Logic ---
    if (hamburgerBtn && sideMenu) {
        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sideMenu.classList.toggle('open');
            hamburgerBtn.classList.toggle('active');
        });
    }

    // Close the side menu when clicking outside
    document.addEventListener('click', (e) => {
        if (sideMenu && sideMenu.classList.contains('open')) {
            const isMenuButton = e.target.closest('#hamburger-btn');
            if (!sideMenu.contains(e.target) && !isMenuButton) {
                sideMenu.classList.remove('open');
                hamburgerBtn.classList.remove('active');
            }
        }

        // Close mobile search
        const searchForm = document.getElementById('search-form');
        if (searchForm && searchForm.classList.contains('mobile-active')) {
            if (!searchForm.contains(e.target) && !e.target.closest('.bottom-nav-link[title="Buscar"]')) {
                searchForm.classList.remove('mobile-active');
            }
        }

        // Cierra resultados de búsqueda en vivo
        if (liveSearchResultsContainer && searchForm && !searchForm.contains(e.target)) {
            liveSearchResultsContainer.style.display = 'none';
        }
    });

    // Close the side menu when clicking a link
    if (sideMenu && hamburgerBtn) {
        sideMenu.addEventListener('click', (e) => {
            if (e.target.matches('.nav-link')) {
                sideMenu.classList.remove('open');
                if (hamburgerBtn) {
                    hamburgerBtn.classList.remove('active');
                }
            }
        });
    }

    // --- Submenu Logic ---
    const submenuToggles = document.querySelectorAll('.submenu-toggle');
    submenuToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const submenu = toggle.closest('.nav-submenu');
            submenu.classList.toggle('open');
        });
    });

    // --- Favorites System ---
    const loadFavorites = () => {
        const favoriteIds = dataManager.getFavorites();
        peliculas.forEach((p) => {
            if (!p.id) {
                const safeTitle = (p.titulo || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                p.id = `${safeTitle}-${p.año}`;
            }
            p.favorito = favoriteIds.includes(p.id);
        });
    };
    
    const saveFavorites = () => {
        const favoriteIds = peliculas.filter(p => p.favorito).map(p => p.id);
        dataManager.saveFavorites(favoriteIds);
    };

    // --- Section Configuration ---
    const secciones = {
        'favoritos': 'Mis Favoritos',
        'lanzamientos-recientes': 'Lanzamientos Recientes',
        'aventura': 'Aventura',
        'accion': 'Acción',
        'drama': 'Drama',
        'terror': 'Terror',
        'documental': 'Documental',
        'tendencias': '🔥 Tendencias de la Semana',
        'recientemente-añadido': '✨ Añadido Recientemente',
        'anime': 'Anime',
        'series': 'Series Populares',
        'todo-lo-nuevo-2025': 'Todo lo Nuevo 2025',
        'proximamente': 'Próximamente',
        'todos': 'Todo el Contenido'
    };

    // Group movies by category
    const peliculasPorCategoria = peliculas.reduce((acc, pelicula) => {
        // Lógica para agrupar por categoría original
        const categorias = Array.isArray(pelicula.categoria) ? pelicula.categoria : [pelicula.categoria];
        categorias.forEach(cat => {
            if (cat) {
                (acc[cat] = acc[cat] || []).push(pelicula);
            }
        });

        // Lógica para agrupar todo el contenido de 2025 en su propia sección
        if (pelicula.año === 2025) {
            (acc['todo-lo-nuevo-2025'] = acc['todo-lo-nuevo-2025'] || []).push(pelicula);
        }
        return acc;
    }, {});

    // --- Advanced Search Logic ---
    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const normalizeText = (text) => {
        if (!text) return '';
        return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    window.normalizeText = normalizeText;

    const highlightMatch = (text, query) => {
        if (!query || !text) return text || '';
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    };

    const renderLiveResults = (results, query) => {
        if (!liveSearchResultsContainer) return;

        liveSearchResultsContainer.innerHTML = '';

        if (results.length === 0) {
            liveSearchResultsContainer.style.display = 'none';
            return;
        }

        results.slice(0, 7).forEach(pelicula => {
            const item = document.createElement('div');
            item.className = 'live-search-item';
            item.dataset.peliculaId = pelicula.id;
            item.innerHTML = `
                <img src="${pelicula.poster}" alt="" onerror="this.src='https://via.placeholder.com/40x60/333333/ffffff?text=No+Image'">
            `;
            item.querySelector('img').alt = pelicula.titulo;

            const titleDiv = document.createElement('div');
            titleDiv.className = 'live-search-item-title';
            titleDiv.innerHTML = `<span>${highlightMatch(pelicula.titulo, query)}</span><span class="live-search-item-year">(${pelicula.año})</span>`;
            
            item.appendChild(titleDiv);

            item.addEventListener('click', () => {
                const peliculaData = peliculas.find(p => p.id === pelicula.id);
                if (peliculaData && peliculaData.id) { // Asegurarse de que el ID existe
                    openModalWithMovie(peliculaData);
                    liveSearchResultsContainer.style.display = 'none';
                    if (searchInput) searchInput.value = '';
                }
            });
            liveSearchResultsContainer.appendChild(item);
        });

        liveSearchResultsContainer.style.display = 'block';
    };

    const saveSearchTerm = (term) => {
        if (!term) return;
        let recentSearches = dataManager.getRecentSearches();
        recentSearches = recentSearches.filter(t => t.toLowerCase() !== term.toLowerCase());
        recentSearches.unshift(term);
        recentSearches = recentSearches.slice(0, 5);
        dataManager.saveRecentSearches(recentSearches);
    };

    function toggleMainContent(show) {
        const mainSections = document.querySelectorAll('.movie-section:not(#live-search-container)');
        const heroSection = document.getElementById('hero-section');
        mainSections.forEach(section => {
            section.style.display = show ? 'block' : 'none';
        });
        if (heroSection) {
            heroSection.style.display = show ? 'flex' : 'none';
        }
    };

    function handleSearch(query) {
        const normalizedQuery = normalizeText(query);
        const searchContainer = document.getElementById('live-search-container');
        const searchGrid = document.getElementById('live-search-grid');
        const searchTitle = document.getElementById('live-search-title');

        if (!searchContainer || !searchGrid || !searchTitle) return;

        if (normalizedQuery.length > 0) {
            const searchWords = normalizedQuery.split(' ').filter(w => w.length > 0);

            const filteredMovies = peliculas.map(p => {
                const titulo = normalizeText(p.titulo);
                const director = normalizeText(p.director);
                const reparto = p.reparto ? p.reparto.map(actor => normalizeText(actor)).join(' ') : '';
                const año = p.año ? p.año.toString() : '';
                const descripcion = normalizeText(p.descripcion || '');
                const genero = normalizeText(p.genero || '');

                const allWordsMatch = searchWords.every(word => 
                    titulo.includes(word) || 
                    director.includes(word) || 
                    reparto.includes(word) || 
                    año.includes(word) ||
                    descripcion.includes(word) ||
                    genero.includes(word)
                );

                if (!allWordsMatch) return null;

                let score = 0;
                if (titulo.startsWith(normalizedQuery)) score = 10;
                else if (titulo.includes(normalizedQuery)) score = 8;
                else if (director.includes(normalizedQuery)) score = 6;
                else if (reparto.includes(normalizedQuery)) score = 5;
                else if (genero.includes(normalizedQuery)) score = 4;
                else if (año.includes(normalizedQuery)) score = 3;
                else if (descripcion.includes(normalizedQuery)) score = 2;

                if (titulo === normalizedQuery) score += 5;

                if (score > 0) {
                    return { ...p, score };
                }
                return null;
            }).filter(Boolean);

            toggleMainContent(false);
            searchContainer.style.display = 'block';
            searchGrid.innerHTML = '';

            const sortedMovies = filteredMovies.sort((a, b) => b.score - a.score);
            
            if (sortedMovies.length > 0) {
                searchTitle.textContent = `Resultados para "${query}"`;
                sortedMovies.forEach(pelicula => {
                    searchGrid.appendChild(createMovieCard(pelicula, true, normalizedQuery));
                });
            } else {
                // --- MEJORA: Mensaje amigable y registro de solicitud ---
                searchTitle.innerHTML = `No encontramos "<span class="highlight">${query}</span>", ¡pero tomaremos nota para añadirlo pronto!`;
                
                // Enviar la solicitud al servidor
                fetch('/solicitud', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ query: query }),
                })
                .then(response => response.json())
                .then(data => console.log('Respuesta del servidor a la solicitud:', data))
                .catch(error => console.error('Error al enviar la solicitud:', error));
            }
        } else {
            toggleMainContent(true);
            searchContainer.style.display = 'none';
        }
    };

    // --- Category Search ---
    const renderCategorySuggestions = () => {
        if (!liveSearchResultsContainer) return;

        const allCategories = [...new Set(peliculas.map(p => p.categoria).filter(Boolean))];
        
        const categoryMap = {
            'todos': { name: 'Todo el Contenido', icon: '🎬' },
            'lanzamientos-recientes': { name: 'Lanzamientos', icon: '🚀' },
            'accion': { name: 'Acción', icon: '💥' },
            'aventura': { name: 'Aventura', icon: '🧭' },
            'terror': { name: 'Terror', icon: '👻' },
            'series': { name: 'Series', icon: '📺' },
            'anime': { name: 'Anime', icon: '🎌' },
            'documental': { name: 'Documental', icon: '🌍' },
            'todo-lo-nuevo-2025': { name: 'Todo lo Nuevo 2025', icon: '🆕' }
        };

        liveSearchResultsContainer.innerHTML = '<div class="live-search-header">Explorar Categorías</div>';

        const categoriesToShow = [{ id: 'todos', name: 'Todo el Contenido', icon: '🎬' }];
        
        allCategories.forEach(catId => {
            if (catId !== 'todos') {
                categoriesToShow.push({
                    id: catId,
                    name: categoryMap[catId]?.name || catId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    icon: categoryMap[catId]?.icon || '📂'
                });
            }
        });

        categoriesToShow.forEach(category => {
            const item = document.createElement('div');
            item.className = 'live-search-item category-suggestion';
            item.dataset.category = category.id;
            item.innerHTML = `
                <span class="category-icon">${category.icon}</span>
                <div class="live-search-item-title"><span>${category.name}</span></div>
            `;
            item.addEventListener('click', () => {
                filterMainGridByCategory(category.id, category.name, category.icon);
                liveSearchResultsContainer.style.display = 'none';
                if (searchInput) searchInput.value = '';
            });
            liveSearchResultsContainer.appendChild(item);
        });

        liveSearchResultsContainer.style.display = 'grid';
    };

    const renderActiveFilter = (categoryName, categoryIcon) => {
        const container = document.getElementById('active-filter-container');
        if (!container) return;

        if (!categoryName) {
            container.style.display = 'none';
            return;
        }

        container.innerHTML = `
            <div class="active-filter-tag">
                <span class="filter-icon">${categoryIcon}</span>
                <span>Mostrando: ${categoryName}</span>
                <button class="clear-filter-btn" title="Quitar filtro">&times;</button>
            </div>
        `;
        container.style.display = 'flex';

        container.querySelector('.clear-filter-btn').addEventListener('click', () => {
            filterMainGridByCategory('todos');
        });
    };

    const filterMainGridByCategory = (category, categoryName = null, categoryIcon = '🎬') => {
        const mainGrid = document.getElementById('main-content-grid');
        if (!mainGrid) return;

        mainGrid.innerHTML = '';

        if (category === 'todos') {
            renderMainGrid();
            renderActiveFilter(null);
        } else {
            const moviesToRender = peliculas.filter(p => p.categoria === category);
            if (moviesToRender.length === 0) {
                mainGrid.innerHTML = `<p class="no-favorites-message">No hay contenido en esta categoría.</p>`;
            } else {
                moviesToRender.forEach(pelicula => {
                    const tarjeta = createMovieCard(pelicula);
                    mainGrid.appendChild(tarjeta);
                });
            }
            renderActiveFilter(categoryName, categoryIcon);
        }
    };

    // --- Search Bar Events ---
    if (searchButton && searchInput) {
        searchButton.addEventListener('click', (e) => {
            if (searchInput.value.trim() === '') {
                e.preventDefault();
            }
        });
    }

    if (searchInput && searchForm) {
        searchInput.addEventListener('input', debounce((e) => {
            const query = e.target.value.trim();
            if (query) {
                handleSearch(query);
            } else {
                renderCategorySuggestions();
            }
        }, 300));

        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = searchInput.value.trim();
            if (query.length > 0) {
                saveSearchTerm(query);
                handleSearch(query);
            }
        });

        searchInput.addEventListener('focus', () => {
            if (!searchInput.value) {
                renderCategorySuggestions();
            }
        });
    }

    // --- Function to create movie cards ---
    window.createMovieCard = (pelicula, showDescription = true, highlightQuery = '') => {
        const tarjeta = document.createElement('div');
        tarjeta.className = 'movie-card';
        tarjeta.dataset.movieId = pelicula.id;

        // --- CORRECCIÓN: Aplicar la clase 'is-broken' al crear la tarjeta ---
        if (pelicula.esta_roto || reportedItems.has(pelicula.id)) {
            tarjeta.classList.add('is-broken');
        }

        // Enlace que envuelve toda la tarjeta
        const link = document.createElement('a');
        link.href = `detalle.html?id=${pelicula.id}`;
    
        // Generar etiquetas
        const tipoTag = `<div class="card-tag tag-tipo tag-${pelicula.tipo}">${pelicula.tipo.toUpperCase()}</div>`;
        const edadTag = pelicula.clasificacion_edad ? `<div class="card-tag tag-edad ${pelicula.clasificacion_edad.includes('+18') ? 'tag-fire' : ''}">${pelicula.clasificacion_edad}</div>` : '';
        const nuevoTag = pelicula.es_nuevo ? `<div class="card-tag tag-nuevo">NUEVO</div>` : '';
        const recienteTag = pelicula.es_reciente ? `<div class="card-tag tag-reciente">RECIENTE</div>` : '';
        const mostViewedTag = mostViewedIds.includes(pelicula.id) ? `<div class="card-tag tag-most-viewed">🔥 MÁS VISTO</div>` : '';
        const plataformaTag = pelicula.plataforma ? `<div class="card-tag tag-plataforma tag-${pelicula.plataforma.toLowerCase().replace(/[^a-z0-9]/g, '-')}">${pelicula.plataforma}</div>` : '';
        const nuevaTemporadaTag = pelicula.estado_temporada === 'nueva' ? `<div class="card-tag tag-nueva-temporada">NUEVA TEMPORADA</div>` : '';
        const prontoTemporadaTag = pelicula.estado_temporada === 'pronto' ? `<div class="card-tag tag-pronto-temporada">PRONTO NUEVA TEMP.</div>` : '';

        link.innerHTML = `
            ${plataformaTag}${nuevoTag}${recienteTag}${mostViewedTag}${edadTag}${tipoTag}${nuevaTemporadaTag}${prontoTemporadaTag}
            <img src="${pelicula.poster}" alt="Póster de ${pelicula.titulo}" onerror="this.src='https://via.placeholder.com/180x270/333333/ffffff?text=No+Image'">
            <div class="movie-card-info">
                <h3>${highlightMatch(pelicula.titulo, highlightQuery)}</h3>
            </div>
        `;
        tarjeta.appendChild(link);

        // Evento para favoritos
        const favoriteIcon = tarjeta.querySelector('.favorite-icon');
        if (favoriteIcon) {
            favoriteIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                pelicula.favorito = !pelicula.favorito;
                favoriteIcon.classList.toggle('favorited', pelicula.favorito);
                saveFavorites();
                renderFavorites();
            });
        }

        return tarjeta;
    };

    // --- Functions for "Continue Watching" ---
    const removeFromContinueWatching = (movieId) => {
        let items = dataManager.getContinueWatching();
        if (items[movieId]) {
            delete items[movieId];
            dataManager.saveContinueWatching(items);
            loadContinueWatching();
        }
    };

    const clearAllContinueWatching = () => {
        dataManager.saveContinueWatching({});
        loadContinueWatching();
    };

    const createContinueWatchingCard = (item) => {
        const pelicula = peliculas.find(p => p.id === item.id);
        if (!pelicula) return null;

        const progressPercent = item.duration ? (item.currentTime / item.duration) * 100 : 50;
        
        const tarjeta = document.createElement('div');
        tarjeta.className = 'movie-card continue-watching-card';

        let title = pelicula.titulo;
        if (item.type === 'serie' && item.season && item.episode) {
            title += ` <span class="episode-info">(T${item.season} E${item.episode})</span>`;
        }

        tarjeta.innerHTML = `
            <button class="remove-continue-watching" title="Quitar de la lista" data-movie-id="${pelicula.id}">
                &times;
            </button>
            <img src="${pelicula.poster}" alt="Póster de ${pelicula.titulo}" onerror="this.src='https://via.placeholder.com/180x270/333333/ffffff?text=No+Image'">
            <div class="movie-info">
                <h3>${title}</h3>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${progressPercent.toFixed(2)}%;"></div>
            </div>
        `;

        tarjeta.addEventListener('click', () => {
            if (item.currentTime > 0) {
                sessionStorage.setItem('startTime', item.currentTime);
            }
            openModalWithMovie(pelicula);
            setTimeout(() => sessionStorage.removeItem('startTime'), 500);
        });

        const removeBtn = tarjeta.querySelector('.remove-continue-watching');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFromContinueWatching(pelicula.id);
        });

        return tarjeta;
    };

    function loadContinueWatching() {
        const continueWatchingSection = document.getElementById('continue-watching-section');
        if (!continueWatchingSection || !continueWatchingGrid) return;

        let items = dataManager.getContinueWatching();
        const sortedItems = Object.values(items).sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched));

        continueWatchingGrid.innerHTML = '';
        let visibleItems = 0;

        sortedItems.forEach(item => {
            if (item.duration) {
                const progress = item.currentTime / item.duration;
                if (progress > 0.95 || item.currentTime < 15) {
                    return;
                }
            }
            const card = createContinueWatchingCard(item);
            if (card) {
                continueWatchingGrid.appendChild(card);
                visibleItems++;
            }
        });

        continueWatchingSection.style.display = visibleItems > 0 ? 'block' : 'none';

        const titleContainer = continueWatchingSection.querySelector('.section-title-container');
        const oldClearBtn = titleContainer.querySelector('.clear-all-btn');
        if (oldClearBtn) oldClearBtn.remove();

        if (visibleItems > 0) {
            const clearAllBtn = document.createElement('button');
            clearAllBtn.className = 'clear-all-btn';
            clearAllBtn.textContent = 'Limpiar todo';
            clearAllBtn.title = 'Eliminar todo el historial de "Seguir Viendo"';
            clearAllBtn.addEventListener('click', clearAllContinueWatching);
            titleContainer.appendChild(clearAllBtn);
        }
    };

    // --- Section Rendering ---
    const renderFavorites = () => {
        const contenedor = document.getElementById('favoritos');
        if (!contenedor) return;

        contenedor.innerHTML = '';

        const tituloContainer = document.createElement('div');
        tituloContainer.className = 'section-title-container';
        tituloContainer.innerHTML = `<h2 class="section-title">${secciones['favoritos']}</h2>`;
        contenedor.appendChild(tituloContainer);

        const favoriteMovies = peliculas.filter(p => p.favorito);

        if (favoriteMovies.length === 0) {
            contenedor.innerHTML = `
                <div class="no-favorites-message">
                    <h3>¡Aún no tienes favoritos!</h3>
                    <p>Haz clic en el corazón de cualquier película para agregarla a tus favoritos.</p>
                </div>
            `;
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'movie-grid';

        favoriteMovies.forEach(pelicula => {
            const tarjeta = createMovieCard(pelicula, false);
            grid.appendChild(tarjeta);
        });
        contenedor.appendChild(grid);
    };

    const renderSecciones = () => {
        for (const idSeccion in secciones) {
            const contenedor = document.getElementById(idSeccion);
            if (idSeccion === 'favoritos') continue;

            if (contenedor && peliculasPorCategoria[idSeccion]) {
                const peliculasDeSeccion = peliculasPorCategoria[idSeccion];
                
                contenedor.innerHTML = '';

                const tituloContainer = document.createElement('div');
                tituloContainer.className = 'section-title-container';
     
                const tituloSeccion = document.createElement('h2');
                tituloSeccion.className = 'section-title';
                tituloSeccion.textContent = secciones[idSeccion];
                tituloContainer.appendChild(tituloSeccion);

                const seccionesConVerMas = ['lanzamientos-recientes', 'accion', 'aventura', 'series', 'terror', 'anime', 'todos', 'documental', 'proximamente', 'drama', 'todo-lo-nuevo-2025'];
                if (seccionesConVerMas.includes(idSeccion) && peliculasDeSeccion.length > 0) {
                    const verMasLink = document.createElement('a');
                    verMasLink.href = `${idSeccion.replace('-recientes', '')}.html`;
                    verMasLink.className = 'ver-mas-link';
                    verMasLink.textContent = 'Ver más ›';
                    tituloContainer.appendChild(verMasLink);
                }
                
                contenedor.appendChild(tituloContainer);

                const esSeccionTodos = idSeccion === 'todos';
                const gridContainer = document.createElement('div');
                gridContainer.className = esSeccionTodos ? 'movie-grid-full' : 'carrusel-contenedor';

                if (!esSeccionTodos) {
                    if (window.innerWidth > 768 && peliculasDeSeccion.length > 4) {
                        const flechaIzquierda = document.createElement('button');
                        flechaIzquierda.className = 'carrusel-flecha izquierda';
                        flechaIzquierda.innerHTML = '&#10094;';
                        flechaIzquierda.setAttribute('aria-label', 'Anterior');
                        gridContainer.appendChild(flechaIzquierda);

                        const flechaDerecha = document.createElement('button');
                        flechaDerecha.className = 'carrusel-flecha derecha';
                        flechaDerecha.innerHTML = '&#10095;';
                        flechaDerecha.setAttribute('aria-label', 'Siguiente');
                        gridContainer.appendChild(flechaDerecha);
                    }
                }

                const grid = document.createElement('div');
                grid.className = 'movie-grid';

                peliculasDeSeccion.forEach((pelicula) => {
                    const tarjeta = createMovieCard(pelicula);
                    grid.appendChild(tarjeta);
                });
                gridContainer.appendChild(grid);

                contenedor.appendChild(gridContainer);

                // Eventos para flechas de navegación
                const flechaIzquierda = gridContainer.querySelector('.carrusel-flecha.izquierda');
                const flechaDerecha = gridContainer.querySelector('.carrusel-flecha.derecha');

                if (flechaIzquierda && flechaDerecha) {
                    const scrollAmount = grid.clientWidth * 0.8;
                    
                    flechaIzquierda.addEventListener('click', () => {
                        grid.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
                    });
                    
                    flechaDerecha.addEventListener('click', () => {
                        grid.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                    });
                }
            }
        }
    };

    const renderProximamenteSection = (proximamenteData) => {
        if (!proximamenteSection) return;

        proximamenteSection.innerHTML = '';

        const titleContainer = document.createElement('div');
        titleContainer.className = 'section-title-container';
        titleContainer.innerHTML = `<h2 class="section-title">${secciones['proximamente']}</h2>`;

        if (proximamenteData && proximamenteData.length > 0) {
            const verMasLink = document.createElement('a');
            verMasLink.href = 'proximamente.html';
            verMasLink.className = 'ver-mas-link';
            verMasLink.textContent = 'Ver más ›';
            titleContainer.appendChild(verMasLink);
        }

        proximamenteSection.appendChild(titleContainer);

        if (!proximamenteData || proximamenteData.length === 0) {
            proximamenteSection.innerHTML += `
                <div class="no-favorites-message">
                    <h3>¡No hay contenido en 'Próximamente'!</h3>
                    <p>Vuelve pronto para ver lo que tenemos preparado.</p>
                </div>
            `;
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'movie-grid';

        proximamenteData.forEach(item => {
            const tarjeta = document.createElement('div');
            tarjeta.className = 'movie-card';
            const tipo = item.tipo || 'pelicula';
            const tipoTag = `<div class="card-tag tag-tipo tag-${tipo}">${tipo.toUpperCase()}</div>`;

            tarjeta.innerHTML = `
                ${tipoTag}
                <img src="${item.poster}" alt="Póster de ${item.titulo}" onerror="this.src='https://via.placeholder.com/180x270/333333/ffffff?text=No+Image'">
                <div class="movie-info"><h3>${item.titulo}</h3><p>Próximamente...</p></div>`;
            grid.appendChild(tarjeta);
        });

        proximamenteSection.appendChild(grid);
        proximamenteSection.style.display = 'block';
    };

    function renderTrendingSection() {
        const trendingSection = document.getElementById('tendencias');
        if (!trendingSection) return;

        trendingSection.innerHTML = '';

        const titleContainer = document.createElement('div');
        titleContainer.className = 'section-title-container';
        titleContainer.innerHTML = `<h2 class="section-title">${secciones['tendencias']}</h2>`;
        trendingSection.appendChild(titleContainer);

        const viewCounts = dataManager.getViewCounts();
        const sortedTrendingMovies = peliculas
            .map(p => ({ ...p, views: viewCounts[p.id] || 0 }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 5);

        if (sortedTrendingMovies.length === 0) {
            trendingSection.innerHTML = `
                <div class="no-favorites-message">
                    <h3>¡Aún no hay tendencias!</h3>
                    <p>Abre algunas películas para que empiecen a aparecer aquí.</p>
                </div>
            `;
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'movie-grid-full';

        sortedTrendingMovies.forEach(pelicula => {
            const tarjeta = createMovieCard(pelicula);
            grid.appendChild(tarjeta);
        });
        trendingSection.appendChild(grid);
        trendingSection.style.display = 'block';
    };

    // --- NEW: Logic for "You Might Like" section ---
    const renderRecomendaciones = () => {
        if (!recomendacionesSection || !recomendacionesGrid || !noRecomendacionesMessage) return;

        const viewHistory = dataManager.getViewHistory();
        if (viewHistory.length === 0) {
            recomendacionesSection.style.display = 'none';
            return;
        }

        // Tomar la última película vista para basar la recomendación
        const lastViewedId = viewHistory[0].id;
        const lastViewedMovie = peliculas.find(p => p.id === lastViewedId);

        if (!lastViewedMovie || !lastViewedMovie.categoria) {
            recomendacionesSection.style.display = 'none';
            return;
        }

        // Encontrar otras películas de la misma categoría, excluyendo las ya vistas
        const historyIds = new Set(viewHistory.map(item => item.id));
        const recommendedMovies = peliculas.filter(p =>
            p.categoria === lastViewedMovie.categoria && !historyIds.has(p.id)
        ).sort(() => 0.5 - Math.random()).slice(0, 10); // Mezclar y tomar 10

        if (recommendedMovies.length > 0) {
            recomendacionesGrid.innerHTML = '';
            recommendedMovies.forEach(pelicula => {
                recomendacionesGrid.appendChild(createMovieCard(pelicula));
            });
            recomendacionesSection.style.display = 'block';
            noRecomendacionesMessage.style.display = 'none';
        } else {
            recomendacionesSection.style.display = 'none';
        }
    };

    function renderRecentlyAddedSection() {
        const recentlyAddedSection = document.getElementById('recientemente-añadido');
        if (!recentlyAddedSection) return;

        recentlyAddedSection.innerHTML = '';

        const titleContainer = document.createElement('div');
        titleContainer.className = 'section-title-container';
        titleContainer.innerHTML = `<h2 class="section-title">${secciones['recientemente-añadido']}</h2>`;
        recentlyAddedSection.appendChild(titleContainer);

        const sortedRecentlyAdded = [...peliculas]
            .sort((a, b) => {
                const dateA = a.addedDate ? new Date(a.addedDate) : new Date(a.año, 0, 1);
                const dateB = b.addedDate ? new Date(b.addedDate) : new Date(b.año, 0, 1);
                return dateB - dateA;
            })
            .slice(0, 5);

        const grid = document.createElement('div');
        grid.className = 'movie-grid-full';
        sortedRecentlyAdded.forEach(pelicula => grid.appendChild(createMovieCard(pelicula)));
        recentlyAddedSection.appendChild(grid);
        recentlyAddedSection.style.display = 'block';
    };

    // --- NUEVO: Lógica para la sección "Historial de Vistas" ---
    const renderViewHistory = () => {
        const viewHistorySection = document.getElementById('view-history-section');
        const viewHistoryGrid = document.getElementById('view-history-grid');
        if (!viewHistorySection || !viewHistoryGrid) return;

        const history = dataManager.getViewHistory();

        viewHistoryGrid.innerHTML = '';
        if (history.length === 0) {
            viewHistorySection.style.display = 'none';
            return;
        }

        // Mostrar la sección
        viewHistorySection.style.display = 'block';

        // Limpiar y añadir el título y el botón de limpiar
        const titleContainer = viewHistorySection.querySelector('.section-title-container');
        let clearHistoryBtn = titleContainer.querySelector('.clear-all-btn');
        if (clearHistoryBtn) clearHistoryBtn.remove(); // Eliminar el botón existente si lo hay

        clearHistoryBtn = document.createElement('button');
        clearHistoryBtn.className = 'clear-all-btn';
        clearHistoryBtn.textContent = 'Limpiar historial';
        clearHistoryBtn.title = 'Eliminar todo el historial de vistas';
        clearHistoryBtn.addEventListener('click', () => {
            dataManager.saveViewHistory([]); // Limpiar el historial
            renderViewHistory(); // Volver a renderizar la sección
        });
        titleContainer.appendChild(clearHistoryBtn);

        // Renderizar las tarjetas de películas del historial
        history.forEach(item => {
            const pelicula = peliculas.find(p => p.id === item.id);
            if (pelicula) {
                const card = createMovieCard(pelicula);
                viewHistoryGrid.appendChild(card);
            }
        });
    };


    // --- Hero Section Logic ---
    const setupHeroSection = () => {
        const heroContainer = document.getElementById('hero-section');
        if (!heroContainer) return;

        const slideContainer = document.createElement('div');
        slideContainer.className = 'hero-section-inner';
    
        const heroMoviesSource = peliculasPorCategoria['lanzamientos-recientes'] || peliculasPorCategoria['tendencias'] || [];
        const heroMovies = heroMoviesSource.sort(() => 0.5 - Math.random()).slice(0, 5);
    
        if (heroMovies.length === 0) {
            heroContainer.style.display = 'none';
            return;
        }
    
        let currentHeroIndex = 0;
        let heroInterval;
    
        const indicatorsContainer = heroContainer.querySelector('.hero-indicators');
        if (indicatorsContainer) {
            indicatorsContainer.innerHTML = heroMovies.map((_, index) => 
                `<button class="indicator-dot" data-index="${index}"></button>`
            ).join('');
        }
    
        const renderHeroSlide = (index) => {
            const heroMovie = heroMovies[index];
            if (!heroMovie) return;

            heroContainer.style.backgroundImage = `url('${heroMovie.poster || 'https://via.placeholder.com/1200x500/0d1117/8b949e?text=No+Image'}')`;

            slideContainer.innerHTML = `
            <div class="hero-content">
                <h1 class="hero-title">${heroMovie.titulo}</h1>
                <p class="hero-description">${heroMovie.descripcion}</p>
                <div class="hero-details">
                    <span>${heroMovie.año}</span>
                    ${heroMovie.duracion ? `<span>${heroMovie.duracion}</span>` : ''}
                    ${heroMovie.calificacion ? `<span class="hero-rating">★ ${heroMovie.calificacion.toFixed(1)}</span>` : ''}
                    ${heroMovie.calidad ? `<span class="quality-badge">${heroMovie.calidad}</span>` : ''}
                </div>
                <button class="hero-button" data-pelicula-id="${heroMovie.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16M6.271 5.055a.5.5 0 0 1 .52.038l3.5 2.5a.5.5 0 0 1 0 .814l-3.5 2.5A.5.5 0 0 1 6 10.5v-5a.5.5 0 0 1 .271-.445"/></svg>
                    Ver Ahora
                </button>
            </div>
            `;
    
            slideContainer.querySelector('.hero-button').addEventListener('click', () => openModalWithMovie(heroMovie));
    
            if (indicatorsContainer) {
                indicatorsContainer.querySelectorAll('.indicator-dot').forEach((dot, i) => {
                    dot.classList.toggle('active', i === index);
                });
            }
        };
    
        const nextSlide = () => {
            currentHeroIndex = (currentHeroIndex + 1) % heroMovies.length;
            renderHeroSlide(currentHeroIndex);
        };
    
        const startAutoplay = () => {
            clearInterval(heroInterval);
            heroInterval = setInterval(nextSlide, 8000);
        };
    
        const nextBtn = heroContainer.querySelector('.next');
        const prevBtn = heroContainer.querySelector('.prev');
        
        if (nextBtn) nextBtn.addEventListener('click', () => { nextSlide(); startAutoplay(); });
        if (prevBtn) prevBtn.addEventListener('click', () => { 
            currentHeroIndex = (currentHeroIndex - 1 + heroMovies.length) % heroMovies.length;
            renderHeroSlide(currentHeroIndex);
            startAutoplay();
        });
    
        if (indicatorsContainer) {
            indicatorsContainer.querySelectorAll('.indicator-dot').forEach(dot => {
                dot.addEventListener('click', (e) => {
                    currentHeroIndex = parseInt(e.target.dataset.index);
                    renderHeroSlide(currentHeroIndex);
                    startAutoplay();
                });
            });
        }
    
        heroContainer.prepend(slideContainer);
        renderHeroSlide(0);
        startAutoplay();
    };

    function renderMainGrid() {
        const mainGrid = document.getElementById('main-content-grid');
        if (!mainGrid) return;

        mainGrid.innerHTML = '';

        peliculas.forEach(pelicula => {
            const tarjeta = createMovieCard(pelicula);
            mainGrid.appendChild(tarjeta);
        });
    };

    // --- Modal Logic ---
    const modal = document.getElementById('movie-modal');
    const closeModalButton = document.querySelector('.close-button');

    let saveProgressInterval;

    const updateProgress = (pelicula, currentTime, duration, seasonNum = null, episodeNum = null) => {
        if (!pelicula || !pelicula.id || !currentTime || currentTime < 5) return;
        
        let allProgress = dataManager.getContinueWatching();
        allProgress[pelicula.id] = {
            id: pelicula.id, 
            type: pelicula.tipo, 
            currentTime: Math.round(currentTime), 
            duration: Math.round(duration),
            lastWatched: new Date().toISOString(),
            ...(pelicula.tipo === 'serie' && { season: seasonNum, episode: episodeNum })
        };
        dataManager.saveContinueWatching(allProgress);
    };

    const saveProgressOnClose = (pelicula) => {
        if (!pelicula) return;

        const videoPlayer = document.getElementById('modal-video');
        if (videoPlayer && videoPlayer.style.display === 'block' && videoPlayer.src) {
            updateProgress(pelicula, videoPlayer.currentTime, videoPlayer.duration, modal.currentSeason, modal.currentEpisode);
        }
    };

    const startSavingProgress = (pelicula, seasonNum = null, episodeNum = null) => {
        clearInterval(saveProgressInterval);

        saveProgressInterval = setInterval(() => {
            const videoPlayer = document.getElementById('modal-video');
            if (!videoPlayer || videoPlayer.paused || videoPlayer.ended || !videoPlayer.duration) return;
            updateProgress(pelicula, videoPlayer.currentTime, videoPlayer.duration, seasonNum, episodeNum);
        }, 15000);

        const videoPlayer = document.getElementById('modal-video');
        if (videoPlayer) {
            videoPlayer.onpause = () => {
                if (videoPlayer.currentTime > 0 && !videoPlayer.ended) {
                    updateProgress(pelicula, videoPlayer.currentTime, videoPlayer.duration, seasonNum, episodeNum);
                }
            };
        }
    };

    const closeModal = () => {
        if (!modal) return;

        const posterImage = document.getElementById('modal-poster');
        const videoPlayer = document.getElementById('modal-video');
        const teraboxContainer = document.getElementById('terabox-container');

        clearInterval(saveProgressInterval);
        modal.style.removeProperty('--modal-bg');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';

        if (videoPlayer) {
            videoPlayer.pause();
            videoPlayer.currentTime = 0;
            videoPlayer.src = '';
            videoPlayer.style.display = 'none';
        }
        
        if (teraboxContainer) {
            teraboxContainer.innerHTML = '';
            teraboxContainer.style.display = 'none';
        }
        
        if (posterImage) {
            posterImage.style.display = 'none';
        }

        saveProgressOnClose(modal.peliculaData);
        loadContinueWatching();
    };

    const setPlayerSource = (sourceUrl, tipo = 'iframe') => {
        const posterImage = document.getElementById('modal-poster');
        const videoPlayer = document.getElementById('modal-video');
        const teraboxContainer = document.getElementById('terabox-container');

        if (posterImage) posterImage.style.display = 'none';
        if (videoPlayer) videoPlayer.style.display = 'none';
        if (teraboxContainer) teraboxContainer.style.display = 'none';

        if (!sourceUrl) {
            if (posterImage) posterImage.style.display = 'block';
            return;
        }

        modal.playerHasBeenSet = true;

        const startTime = sessionStorage.getItem('startTime');
        let finalUrl = sourceUrl;

        if (startTime && parseFloat(startTime) > 0) {
            const timeInSeconds = Math.round(parseFloat(startTime));
            finalUrl += (sourceUrl.includes('?') ? '&' : '?') + `t=${timeInSeconds}`;
        }

        if (tipo === 'video' && videoPlayer) {
            modal.currentSeason = null;
            modal.currentEpisode = null;
            videoPlayer.src = finalUrl;
            videoPlayer.load();
            
            const startTime = sessionStorage.getItem('startTime');
            if (startTime) {
                videoPlayer.currentTime = parseFloat(startTime);
                sessionStorage.removeItem('startTime');
            }

            videoPlayer.style.display = 'block';
            videoPlayer.play().catch(e => {
                console.log('Autoplay bloqueado:', e);
            });

            startSavingProgress(modal.peliculaData, null, null);
        } else if (teraboxContainer) {
            teraboxContainer.innerHTML = `
                <div class="terabox-loading">Cargando reproductor...</div>
                <iframe 
                    src="${finalUrl}" 
                    width="100%" 
                    height="100%" 
                    frameborder="0" 
                    scrolling="no" 
                    allowfullscreen
                    allow="autoplay; encrypted-media"
                    onload="this.previousElementSibling.style.display='none';"
                ></iframe>
            `;
            teraboxContainer.style.display = 'block';
        }
    };

    const getFlagForLanguage = (idioma) => {
        if (!idioma) return '🌐';
        const lang = idioma.toLowerCase();

        if (lang.includes('español') || lang.includes('castellano')) return '🇪🇸';
        if (lang.includes('latino') || lang.includes('mexico')) return '🇲🇽';
        if (lang.includes('subtitulado')) return '🇺🇸';
        return '🌐';
    };

    const getSourceType = (url) => {
        if (!url) return 'iframe';
        const videoExtensions = ['.mp4', '.webm', '.m3u8'];
        const urlExtension = new URL(url, window.location.href).pathname.toLowerCase();
        return videoExtensions.some(ext => urlExtension.endsWith(ext)) ? 'video' : 'iframe';
    };
    

    const openModalWithMovie = (peliculaData) => {
        if (!peliculaData || !modal) return;

        modal.playerHasBeenSet = false;

        // Actualizar contador de vistas
        const viewCounts = dataManager.getViewCounts();
        viewCounts[peliculaData.id] = (viewCounts[peliculaData.id] || 0) + 1;
        dataManager.saveViewCounts(viewCounts);

        modal.currentSeason = null;
        modal.currentEpisode = null;
        modal.peliculaData = peliculaData;

        const posterImage = document.getElementById('modal-poster');
        const videoPlayer = document.getElementById('modal-video');
        const teraboxContainer = document.getElementById('terabox-container');
        const sourceButtonsContainer = document.getElementById('modal-source-buttons');
        const seasonsContainer = document.getElementById('modal-seasons-container');

        if (!posterImage || !videoPlayer || !teraboxContainer || !sourceButtonsContainer) {
            console.error('Elementos del modal no encontrados');
            return;
        }

        // Llenar información básica
        modal.dataset.currentMovieId = peliculaData.id;
        document.getElementById('modal-title').textContent = peliculaData.titulo;
        document.getElementById('modal-description').textContent = peliculaData.descripcion || 'Descripción no disponible';

        // Detalles de la película
        const detailsContainer = document.getElementById('modal-details');
        if (detailsContainer) {
            detailsContainer.innerHTML = '';
            const details = [
                { icon: '📅', text: peliculaData.año || 'N/A' },
                { icon: '⏱️', text: peliculaData.duracion || 'N/A' },
                { icon: '🎬', text: peliculaData.director || 'N/A' }
            ];
            details.forEach(detail => {
                const span = document.createElement('span');
                span.innerHTML = `${detail.icon} `;
                span.appendChild(document.createTextNode(detail.text));
                detailsContainer.appendChild(span);
            });
            if (peliculaData.calidad) {
                const qualitySpan = document.createElement('span');
                qualitySpan.className = 'quality-badge';
                qualitySpan.textContent = peliculaData.calidad;
                detailsContainer.appendChild(qualitySpan);
            }
        }

        // Reparto
        const castContainer = document.getElementById('modal-cast');
        if (castContainer) {
            castContainer.innerHTML = '';
            // Filtrar para asegurarse de que no haya solo cadenas vacías
            const validReparto = peliculaData.reparto && peliculaData.reparto.filter(actor => actor && typeof actor === 'string' && actor.trim() !== '');

            if (validReparto && validReparto.length > 0) {
                const castTitle = document.createElement('strong');
                castTitle.textContent = 'Reparto: ';
                castContainer.appendChild(castTitle);
                const castText = document.createTextNode(validReparto.join(', '));
                castContainer.appendChild(castText);
            } else {
                castContainer.style.display = 'none'; // Ocultar si no hay reparto
            }
        }

        // Lógica para Películas vs Series
        if (peliculaData.tipo === 'serie' && peliculaData.temporadas) {
            sourceButtonsContainer.style.display = 'none';

            // --- CORRECCIÓN: Evitar que este código se ejecute en detalle.html ---
            // La página de detalle tiene su propio sistema de acordeón.
            // Si el elemento 'seasons-container' no está en el modal, no continuamos.
            if (!seasonsContainer.closest('.modal-content')) return;

            seasonsContainer.style.display = 'block';
            seasonsContainer.innerHTML = '';

            const seasonTabs = document.createElement('div');
            seasonTabs.className = 'season-tabs';
            seasonsContainer.appendChild(seasonTabs);

            const episodesList = document.createElement('div');
            episodesList.className = 'episodes-list';
            seasonsContainer.appendChild(episodesList);

            peliculaData.temporadas.forEach((season, index) => {
                const tab = document.createElement('button');
                tab.className = 'season-tab';
                tab.textContent = `Temporada ${season.temporada}`;
                tab.dataset.seasonIndex = index;
                if (index === 0) tab.classList.add('active');
                seasonTabs.appendChild(tab);
            });

            const renderEpisodes = (seasonIndex) => {
                episodesList.innerHTML = '';
                episodesList.className = 'episodes-grid'; // CORRECCIÓN: Cambiar a clase de grid
                const season = peliculaData.temporadas[seasonIndex];
                if (!season || !season.episodios) {
                    episodesList.innerHTML = '<p class="no-sources-message">No hay episodios en esta temporada.</p>';
                    return;
                }

                season.episodios.forEach((episode, episodeIndex) => {
                    const episodeButton = document.createElement('a'); // Usar 'a' para los botones
                    episodeButton.className = 'episode-btn';
                    episodeButton.textContent = `E${episode.episodio || episodeIndex + 1}`; // Mostrar "E1", "E2", etc.
                    
                    episodeButton.onclick = () => {
                        setPlayerSource(episode.url, 'iframe');
                        // CORRECCIÓN: Asegurarse de que solo un botón esté activo
                        document.querySelectorAll('.episode-btn, .source-btn').forEach(btn => btn.classList.remove('active'));
                        episodeButton.classList.add('active');
                        modal.currentSeason = parseInt(season.temporada);
                        modal.currentEpisode = episode.episodio;
                    };
                    episodesList.appendChild(episodeButton);
                });
            };

            seasonTabs.addEventListener('click', (e) => {
                if (e.target.matches('.season-tab')) {
                    seasonTabs.querySelectorAll('.season-tab').forEach(tab => tab.classList.remove('active'));
                    e.target.classList.add('active');
                    renderEpisodes(parseInt(e.target.dataset.seasonIndex));
                }
            });

            if (peliculaData.temporadas.length > 0) {
                renderEpisodes(0);
                if (peliculaData.temporadas[0].episodios && peliculaData.temporadas[0].episodios.length > 0) {
                    setPlayerSource(peliculaData.temporadas[0].episodios[0].url, 'iframe');
                    modal.currentSeason = parseInt(peliculaData.temporadas[0].temporada);
                    modal.currentEpisode = peliculaData.temporadas[0].episodios[0].episodio;
                    setTimeout(() => episodesList.querySelector('.episode-btn')?.classList.add('active'), 100);
                }
            }
        } else {
            seasonsContainer.style.display = 'none';
            sourceButtonsContainer.style.display = 'flex';
            sourceButtonsContainer.innerHTML = '';
            const fuentes = peliculaData.fuentes || [];

            if (fuentes.length > 0) {
                fuentes.forEach((fuente, index) => {
                    const button = document.createElement('button');
                    button.className = 'source-btn with-flag';
                    button.innerHTML = `<span class="flag-icon">${getFlagForLanguage(fuente.idioma)}</span> ${fuente.idioma || 'Desconocido'} <span class="quality-tag">${fuente.calidad || 'HD'}</span>`;
                    const idiomaClass = `btn-${(fuente.idioma || 'desconocido').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                    button.classList.add(idiomaClass);
                    button.dataset.url = fuente.url;
                    if (index === 0) button.classList.add('active');
    
                    button.addEventListener('click', () => {
                        const sourceType = getSourceType(fuente.url);
                        setPlayerSource(fuente.url, sourceType);
                        sourceButtonsContainer.querySelectorAll('.source-btn').forEach(btn => btn.classList.remove('active'));
                        modal.currentSeason = null;
                        modal.currentEpisode = null;
                        button.classList.add('active');
                    });
                    sourceButtonsContainer.appendChild(button);
                });
                const firstSourceType = getSourceType(fuentes[0].url);
                setPlayerSource(fuentes[0].url, firstSourceType);
            } else {
                setPlayerSource(null);
                sourceButtonsContainer.innerHTML = '<p class="no-sources-message">No hay fuentes de video disponibles para esta película.</p>';
            }
        }

        // Calificaciones
        const ratingAvg = document.getElementById('modal-rating-avg');
        const ratingVotes = document.getElementById('rating-votes');
        if (ratingAvg) ratingAvg.textContent = peliculaData.calificacion ? peliculaData.calificacion.toFixed(1) : 'Sin calificar';
        if (ratingVotes) ratingVotes.textContent = peliculaData.votos ? `${peliculaData.votos.toLocaleString()} votos` : '0 votos';

        // Sistema de calificación del usuario
        const userRatingStarsContainer = document.getElementById('user-rating-stars');
        if (userRatingStarsContainer) {
            userRatingStarsContainer.innerHTML = '';
            const userRatings = dataManager.getUserRatings();
            const savedUserRating = userRatings[peliculaData.id];

            for (let i = 1; i <= 5; i++) {
                const star = document.createElement('span');
                star.className = 'star';
                star.textContent = '★';
                star.dataset.value = i;
                if (savedUserRating && i <= savedUserRating) {
                    star.classList.add('selected');
                }
                userRatingStarsContainer.appendChild(star);
            }
        }

        // Recomendaciones
        const recommendationsGrid = document.getElementById('recommendations-grid');
        if (recommendationsGrid) {
            recommendationsGrid.innerHTML = '';
            const recommendations = peliculas.filter(p =>
                p.categoria === peliculaData.categoria && p.id !== peliculaData.id
            );

            const shuffled = recommendations.sort(() => 0.5 - Math.random());
            const selectedRecommendations = shuffled.slice(0, 6);

            if (selectedRecommendations.length > 0) {
                selectedRecommendations.forEach(rec => {
                    const recCard = document.createElement('div');
                    recCard.className = 'recommended-movie';
                    recCard.dataset.peliculaId = rec.id;
                    recCard.innerHTML = `
                        <img src="${rec.poster}" alt="Póster de ${rec.titulo}" onerror="this.src='https://via.placeholder.com/150x200/333333/ffffff?text=No+Image'">
                    `;
                    recCard.addEventListener('click', () => {
                        openModalWithMovie(rec);
                    });
                    recommendationsGrid.appendChild(recCard);
                });
            } else {
                recommendationsGrid.innerHTML = '<p class="no-recommendations">No hay recomendaciones disponibles.</p>';
            }
        }

        // Pestañas del modal
        const modalTabsContainer = modal.querySelector('.modal-tabs');
        const tabButtons = modalTabsContainer?.querySelectorAll('.modal-tab-button');
        const tabContents = modal.querySelectorAll('.modal-tab-content');

        const switchTab = (tabId) => {
            tabContents.forEach(content => {
                content.style.display = content.id === tabId ? 'block' : 'none';
            });
            tabButtons?.forEach(button => {
                button.classList.toggle('active', button.dataset.tab === tabId);
            });
        };

        tabButtons?.forEach(button => {
            button.addEventListener('click', () => {
                switchTab(button.dataset.tab);
            });
        });

        switchTab('description-tab');

        // Mostrar modal
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';

        // Guardar en historial
        const viewHistory = dataManager.getViewHistory();
        const existingIndex = viewHistory.findIndex(item => item.id === peliculaData.id);
        
        if (existingIndex !== -1) {
            viewHistory.splice(existingIndex, 1);
        }
        
        viewHistory.unshift({
            id: peliculaData.id,
            titulo: peliculaData.titulo,
            poster: peliculaData.poster,
            timestamp: Date.now()
        });
        
        dataManager.saveViewHistory(viewHistory.slice(0, 20));
    };

    // --- Global Event Listeners ---
    if (closeModalButton) {
        closeModalButton.addEventListener('click', closeModal);
    }
    
    if (modal) {
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'block') {
                closeModal();
            }
        });
    }

    // --- Function to calculate most viewed ---
    const calculateMostViewed = () => {
        const viewCounts = dataManager.getViewCounts();
        mostViewedIds = Object.entries(viewCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([id]) => id);
    };

    // --- Funciones de utilidad ---
    window.handleImageError = function (img) {
        img.src = 'https://via.placeholder.com/300x450/333333/ffffff?text=Imagen+No+Disponible';
        img.alt = 'Imagen no disponible';
    };

    function renderProximamente() {
        // Load the JSON for upcoming releases directly.
        fetch('proximamente.json')
            .then(response => response.json())
            .then(proximamenteData => {
                if (proximamenteData && proximamenteData.length > 0) {
                    renderProximamenteSection(proximamenteData);
                }
            })
            .catch(error => {
                console.log("No se encontraron datos de 'Próximamente' o hubo un error al cargarlos.", error);
            });
    };

    // --- Initialization ---
    function init() {
        calculateMostViewed();
        setupHeroSection();
        loadFavorites();
        renderSecciones();
        renderTrendingSection();
        renderRecentlyAddedSection();
        loadContinueWatching();
        renderViewHistory(); // NUEVO: Cargar historial de vistas
        renderRecomendaciones();
        renderProximamente(); // Carga la sección en index.html
        checkForReleasedNotifications(); // NUEVO: Comprobar notificaciones al iniciar

        // Comprobar si debe abrir un modal al cargar la página
        const reportButton = document.querySelector('#movie-modal .report-button');

        if (reportButton) {
            reportButton.addEventListener('click', () => {
                const modalElement = document.getElementById('movie-modal');
                const movieId = modalElement.dataset.currentMovieId;
                if (!movieId) return;

                // 1. Añadir a la lista de reportados y guardar en localStorage
                dataManager.addReportedItem(movieId);
                reportedItems.add(movieId); // Actualizar el Set en memoria

                // 2. Marcar la tarjeta visualmente en la página actual
                document.querySelectorAll(`.movie-card[data-movie-id='${movieId}']`).forEach(card => {
                    card.classList.add('is-broken');
                });

                // 3. (Opcional) Enviar el reporte al servidor (si tienes un endpoint)
                // Esta parte ya está en tu código del modal, aquí solo se confirma la lógica.

                closeModal();
                alert('¡Gracias! El contenido ha sido reportado y será revisado por un administrador.');
            });
        }

        const modalToOpen = sessionStorage.getItem('openModal');
        if (modalToOpen) {
            const peliculaData = peliculas.find(p => p.id === modalToOpen);
            if (peliculaData) {
                openModalWithMovie(peliculaData);
            }
            sessionStorage.removeItem('openModal');
        }

        // Inicializar navegación inferior en móviles
        if (window.innerWidth <= 768) {
            const bottomNav = document.querySelector('.bottom-nav');
            if (bottomNav) {
                bottomNav.style.display = 'flex';
            }
        }

        console.log('peliXx inicializado correctamente');
    };

    // Execute initialization
    init();

    // Manejar cambios de tamaño de ventana
    window.addEventListener('resize', () => {
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) {
            bottomNav.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
        }
        renderSecciones();
    });

    // --- NUEVO: Lógica para Notificaciones de Estrenos ---
    const checkForReleasedNotifications = () => {
        const notifications = dataManager.getNotifications();
        if (notifications.length === 0) return;

        const releasedMovies = notifications.filter(notif => 
            peliculas.some(p => p.id === notif.id)
        );

        if (releasedMovies.length > 0) {
            releasedMovies.forEach(movie => {
                showReleaseToast(movie);
            });

            // Limpiar las notificaciones que ya se mostraron
            const remainingNotifications = notifications.filter(notif => 
                !releasedMovies.some(released => released.id === notif.id)
            );
            dataManager.saveNotifications(remainingNotifications);
        }
    };

    const showReleaseToast = (movie) => {
        const toast = document.createElement('div');
        toast.className = 'update-toast';
        toast.innerHTML = `
            <div class="toast-header">
                <h3>¡Ya disponible!</h3>
                <button class="close-toast-btn">&times;</button>
            </div>
            <div class="toast-body">
                La película "${movie.titulo}" que esperabas ya está en nuestro catálogo. ¡No te la pierdas!
            </div>
        `;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 100); // Pequeño delay para la animación
        toast.querySelector('.close-toast-btn').onclick = () => toast.remove();
        setTimeout(() => toast.remove(), 8000); // Se cierra automáticamente después de 8 segundos
    };

    // --- LOGIC FOR THE DETAILS PAGE (detalles.html) ---
    // Este bloque se ejecuta solo si la URL corresponde a la página de detalles.
    if (window.location.pathname.includes('detalles.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const peliculaId = urlParams.get('id');

        // Asegurarse de que el array 'peliculas' está disponible
        if (peliculaId && typeof peliculas !== 'undefined') {
            const pelicula = peliculas.find(p => p.id === peliculaId);

            if (pelicula) {
                // --- 1. Rellenar Información General de la Película ---
                document.title = `${pelicula.titulo} - PelixPlus`;
                document.querySelector('.detail-info-title').textContent = pelicula.titulo;
                document.querySelector('.detail-info-description').textContent = pelicula.descripcion;
                document.querySelector('.detail-backdrop').style.backgroundImage = `url('${pelicula.poster}')`;
                
                // Rellenar géneros
                const genresContainer = document.querySelector('.genres-pills');
                genresContainer.innerHTML = '';
                if (Array.isArray(pelicula.genero)) {
                    pelicula.genero.forEach(g => {
                        const pill = document.createElement('span');
                        pill.className = 'genre-pill';
                        pill.textContent = g;
                        genresContainer.appendChild(pill);
                    });
                }

                // --- CORRECCIÓN: Mover la lógica de metadatos e idioma aquí para que se ejecute siempre ---
                // Rellenar meta-información (año, duración, etc.)
                const metaContainer = document.querySelector('.detail-info-meta');
                if (metaContainer) {
                    metaContainer.innerHTML = `
                        <span class="rating-badge"><i class="fas fa-star"></i> ${pelicula.calificacion || 'N/A'}</span>
                        <span><i class="fas fa-calendar-alt"></i> ${pelicula.año || 'N/A'}</span>
                        <span><i class="fas fa-clock"></i> ${pelicula.duracion || 'N/A'}</span>
                        <span id="detail-language" style="display: none;"><i class="fas fa-globe"></i></span>
                        <span><i class="fas fa-film"></i> ${pelicula.tipo ? pelicula.tipo.charAt(0).toUpperCase() + pelicula.tipo.slice(1) : 'N/A'}</span>
                    `;
                }

                // Rellenar el idioma principal
                const languageSpan = document.getElementById('detail-language');
                if (languageSpan && pelicula.idioma) {
                    languageSpan.innerHTML = `<i class="fas fa-globe"></i> ${pelicula.idioma}`;
                    languageSpan.style.display = 'inline-flex'; // Mostrar el span
                }

                // --- MEJORA: Generar botones de "Ver Online" basados en las fuentes ---
                const sourceButtonsContainer = document.getElementById('video-source-buttons');
                const videoIframe = document.querySelector('.detail-poster-container iframe');

                if (sourceButtonsContainer && videoIframe && pelicula.fuentes && pelicula.fuentes.length > 0) {
                    sourceButtonsContainer.innerHTML = ''; // Limpiar botones de ejemplo
                    videoIframe.parentElement.style.display = 'block'; // Asegurarse de que el reproductor sea visible

                    pelicula.fuentes.forEach((fuente, index) => {
                        const button = document.createElement('button');
                        button.className = 'source-btn';
                        // Texto del botón: "Latino (HD)", "Subtitulado (1080p)", etc.
                        button.textContent = `${fuente.idioma || 'Opción'} ${fuente.calidad ? `(${fuente.calidad})` : ''}`;
                        button.dataset.url = fuente.url;

                        if (index === 0) {
                            button.classList.add('active');
                            videoIframe.src = fuente.url; // Cargar la primera fuente por defecto
                        }

                        button.addEventListener('click', () => {
                            videoIframe.src = fuente.url;
                            sourceButtonsContainer.querySelectorAll('.source-btn').forEach(btn => btn.classList.remove('active'));
                            button.classList.add('active');
                        });

                        sourceButtonsContainer.appendChild(button);
                    });
                }

                // --- 2. Rellenar Enlaces de Descarga ---
                const downloadSection = document.querySelector('.download-section');
                const downloadContainer = document.getElementById('download-links-container');
                const downloadTemplate = document.getElementById('download-link-template');

                // Verificar si hay datos y elementos necesarios
                if (downloadSection && downloadContainer && downloadTemplate && pelicula.descargas && pelicula.descargas.length > 0) {
                    downloadSection.style.display = 'block'; // Asegurarse de que la sección sea visible
                    downloadContainer.innerHTML = ''; // Limpiar cualquier contenido de ejemplo

                    pelicula.descargas.forEach(descarga => {
                        const clone = downloadTemplate.content.cloneNode(true);
                        const item = clone.querySelector('.download-link-item');
                        
                        // Rellenar la información de calidad, idioma y formato
                        item.querySelector('.download-quality').textContent = `${descarga.calidad || ''} • ${descarga.idioma || ''} • ${descarga.formato || ''}`;
                        
                        // Rellenar los metadatos (servidor y tamaño)
                        item.querySelector('.download-meta').innerHTML = `
                            <span><i class="fas fa-server"></i> ${descarga.servidor || 'N/A'}</span>
                            <span><i class="fas fa-file-archive"></i> ${descarga.tamaño || 'N/A'}</span>
                        `;
                        
                        // Configurar el botón de descarga
                        const downloadButton = item.querySelector('.download-button');
                        downloadButton.href = descarga.url;
                        downloadButton.innerHTML = `<i class="fas fa-download"></i> <span>Descargar</span>`;
                        
                        downloadContainer.appendChild(clone);
                    });
                } else if (downloadSection) {
                    downloadSection.style.display = 'none'; // Ocultar la sección si no hay descargas
                }
            }
        }
    }
});