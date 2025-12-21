// --- Credenciales de la API de TMDB ---
const TMDB_API_KEY = '9869fab7c867e72214c8628c6029ec74';
const TMDB_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI5ODY5ZmFiN2M4NjdlNzIyMTRjODYyOGM2MDI5ZWM3NCIsIm5iZiI6MTc1OTI2NzMzMi43MDg5OTk5LCJzdWIiOiI2OGRjNGEwNDE1NWQwOWZjZGQyZGY0MTMiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0._sxkF_bWFZtZOQU_8GcEa4x7TawgM_CB9zA43VzSiAY';

// Variable global para almacenar todas las películas combinadas
window.peliculasCompletas = [];

// Función para cargar archivos de películas dinámicamente
function cargarArchivosPeliculas() {
    return new Promise((resolve, reject) => {
        console.log("Iniciando carga de archivos de películas...");

        // Lista de archivos a cargar
        const archivos = ['peliculas/peliculas.js', 'peliculas/peliculas1.js', 'peliculas/peliculas2.js'];
        let archivosCargados = 0;
        const todasPeliculas = [];

        archivos.forEach(archivo => {
            const script = document.createElement('script');
            script.src = archivo;
            script.async = false; // Importante: cargar en orden

            script.onload = () => {
                console.log(`${archivo} cargado exitosamente`);
                archivosCargados++;

                // Verificar si el archivo creó una variable global
                if (archivo.includes('peliculas.js') && typeof peliculas !== 'undefined') {
                    console.log(`Encontradas ${peliculas.length} películas en peliculas.js`);
                    todasPeliculas.push(...peliculas);
                } else if (archivo.includes('peliculas1.js') && typeof peliculas1 !== 'undefined') {
                    console.log(`Encontradas ${peliculas1.length} películas en peliculas1.js`);
                    todasPeliculas.push(...peliculas1);
                } else if (archivo.includes('peliculas2.js') && typeof peliculas2 !== 'undefined') {
                    console.log(`Encontradas ${peliculas2.length} películas en peliculas2.js`);
                    todasPeliculas.push(...peliculas2);
                }

                if (archivosCargados === archivos.length) {
                    console.log(`Total películas crudas: ${todasPeliculas.length}`);
                    resolve(todasPeliculas);
                }
            };

            script.onerror = (error) => {
                console.error(`Error al cargar ${archivo}:`, error);
                archivosCargados++;
                if (archivosCargados === archivos.length) {
                    resolve(todasPeliculas);
                }
            };

            document.head.appendChild(script);
        });
    });
}

// Función para procesar y deduplicar películas
function procesarPeliculas(todasPeliculas) {
    console.log(`Total de películas cargadas: ${todasPeliculas.length}`);

    if (todasPeliculas.length === 0) {
        console.warn("No se cargaron películas. Verifica los archivos peliculas.js y peliculas1.js");
        return [];
    }

    // Sistema de deduplicación avanzado
    const seenIds = new Set();
    const seenTitles = new Set();
    const uniquePeliculas = [];
    const duplicates = [];

    for (const p of todasPeliculas) {
        // Saltar películas vacías o sin título
        if (!p || !p.titulo || p.titulo.trim() === '') {
            console.warn("Película sin título encontrada, omitiendo:", p);
            continue;
        }

        // Asegurar que cada película tenga un ID único
        if (!p.id) {
            const safeTitle = (p.titulo || '').toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            p.id = `${safeTitle}-${p.año || '0000'}`;
        }

        // Normalizar propiedades de forma segura
        if (p.genero && !p.categoria) {
            const tempGen = Array.isArray(p.genero) ? p.genero.join(', ') : p.genero;
            p.categoria = tempGen.toLowerCase();
        }
        if (p.sinopsis && !p.descripcion) {
            p.descripcion = p.sinopsis;
        }
        if (p.actores && !p.reparto) {
            p.reparto = p.actores;
        }
        if (p.rating !== undefined && p.calificacion === undefined) {
            p.calificacion = p.rating;
        }

        // Asegurar categoría por defecto si no existe
        if (!p.categoria) {
            p.categoria = 'drama';
        }

        // Asegurar tipo por defecto
        if (!p.tipo) {
            p.tipo = 'pelicula';
        }

        // Crear clave única para comparación (limpiar espacios y normalizar)
        const cleanTitle = (p.titulo || '').trim().toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const titleKey = `${cleanTitle}-${p.año || '0000'}`;

        // Verificar duplicados por ID o título+año
        if (!seenIds.has(p.id) && !seenTitles.has(titleKey)) {
            seenIds.add(p.id);
            seenTitles.add(titleKey);
            uniquePeliculas.push(p);
        } else {
            duplicates.push({
                id: p.id,
                titulo: p.titulo,
                año: p.año,
                origen: p.origen || 'desconocido'
            });
        }
    }

    if (duplicates.length > 0) {
        console.log(`Se eliminaron ${duplicates.length} elementos duplicados:`, duplicates);
    }

    console.log(`Películas únicas procesadas: ${uniquePeliculas.length}`);

    return uniquePeliculas;
}

// --- FUNCIONES GLOBALES DE UTILIDAD ---

// Función para mostrar notificaciones Toast
window.showNotification = (message, type = 'info') => {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-triangle';
    if (type === 'warning') icon = 'exclamation-circle';

    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);

    // Animación de entrada
    setTimeout(() => toast.classList.add('visible'), 10);

    // Auto eliminar
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

// Función para normalizar texto (eliminar acentos y convertir a minúsculas)
window.normalizeText = (text) => {
    if (!text) return '';
    return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// Función para mostrar el loader de página antes de redirigir
window.showPageLoader = (targetUrl) => {
    const loader = document.getElementById('page-loader');
    if (loader) {
        loader.classList.add('active');
    }
    setTimeout(() => {
        window.location.href = targetUrl;
    }, 400); // Pequeño delay para que se vea la animación
};

// Función para unificar todo el contenido de los diferentes archivos
window.unificarContenidoGlobal = () => {
    const contenidoPeliculas = (typeof peliculas !== 'undefined' && Array.isArray(peliculas)) ? peliculas : []; const contenidoPeliculas1 = (typeof peliculas1 !== 'undefined' && Array.isArray(peliculas1)) ? peliculas1 : []; const contenidoPeliculas2 = (typeof peliculas2 !== 'undefined' && Array.isArray(peliculas2)) ? peliculas2 : [];
    const todoElContenido = [...contenidoPeliculas, ...contenidoPeliculas1, ...contenidoPeliculas2];

    const seenIds = new Set();
    // Deduplicar por si acaso
    const uniqueContent = todoElContenido.filter(p => {
        if (!p || !p.id || seenIds.has(p.id)) {
            return false;
        }
        seenIds.add(p.id);
        return true;
    });
    return uniqueContent;
};

// --- NUEVO: Aplicar configuraciones globales visuales ---
function applyGlobalSettings() {
    // Tamaño de subtítulos
    const subSize = localStorage.getItem('settings_subtitle_size') || '100%';
    document.documentElement.style.setProperty('--subtitle-size', subSize);

    // Mostrar Calificaciones (si es false, ocultar)
    const showRatings = localStorage.getItem('settings_show_ratings') !== 'false';
    if (!showRatings) document.body.classList.add('hide-ratings');

    // Modo Compacto
    const compactMode = localStorage.getItem('settings_compact_mode') === 'true';
    if (compactMode) document.body.classList.add('compact-mode');
}

// --- LÓGICA DEL SELECTOR DE PAÍS OBLIGATORIO ---
function setupCountrySelector() {
    const modal = document.getElementById('country-selector-modal');
    if (!modal) return;

    const countryItems = document.querySelectorAll('.country-item');
    const savedCountry = localStorage.getItem('user_country');

    // Si ya hay un país guardado, no hacemos nada.
    if (savedCountry) {
        modal.style.display = 'none';
        return;
    }

    // Si no hay país, mostramos el modal.
    modal.classList.add('visible');
    document.body.style.overflow = 'hidden'; // Bloquear scroll

    countryItems.forEach(item => {
        item.addEventListener('click', () => {
            const countryCode = item.dataset.country;
            
            // Guardar permanentemente
            localStorage.setItem('user_country', countryCode);

            // También lo guardamos en la configuración de la app para que sea consistente
            localStorage.setItem('settings_country', countryCode);

            // Ocultar el modal y recargar la página para aplicar cambios
            modal.style.opacity = '0';
            modal.style.transition = 'opacity 0.3s ease';
            
            setTimeout(() => window.location.reload(), 300);
        });
    });
}

// Función principal que se ejecuta después de cargar el DOM
document.addEventListener('DOMContentLoaded', async () => {
    // Ocultar loader si está activo (por si venimos de atrás o carga lenta)
    const pageLoader = document.getElementById('page-loader');
    if (pageLoader) {
        pageLoader.classList.remove('active');
    }

    // Aplicar ajustes visuales inmediatamente
    applyGlobalSettings();

    // NUEVO: Configurar y verificar el selector de país obligatorio
    setupCountrySelector();

    console.log("=== INICIANDO CARGA DE PELÍCULAS ===");

    try {
        // Cargar todos los archivos de películas
        const todasPeliculas = await cargarArchivosPeliculas();

        if (todasPeliculas.length === 0) {
            console.warn("No se cargaron películas. Usando array vacío.");
            window.peliculas = [];
        } else {
            // Procesar y deduplicar
            window.peliculas = procesarPeliculas(todasPeliculas);
            console.log(`✅ Total de películas disponibles: ${window.peliculas.length}`);
        }
    } catch (error) {
        console.error("❌ Error al cargar archivos de películas:", error);
        window.peliculas = [];
    }

    // Si no hay películas, mostrar mensaje
    if (!window.peliculas || window.peliculas.length === 0) {
        console.error("❌ NO SE CARGARON PELÍCULAS.");

        // Crear array vacío para evitar errores
        window.peliculas = [];

        // Mostrar mensaje al usuario si hay un contenedor
        const mainContainer = document.getElementById('main-content-sections');
        if (mainContainer) {
            mainContainer.innerHTML = `
                <div class="error-message">
                    <h3>⚠️ No se pudieron cargar las películas</h3>
                    <p>Verifica que los archivos peliculas.js y peliculas1.js existan y tengan datos válidos.</p>
                </div>
            `;
        }

        return;
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
                this._save();
            }
        },

        _save() {
            if (!this._data) return;
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
                reportedItems: [],
                notifications: []
            };
        },

        _migrate(oldData) {
            console.warn(`Migrating data from version ${oldData.version || 'ancient'} to ${this.CURRENT_VERSION}`);
            oldData.version = this.CURRENT_VERSION;
            this._data = { ...this._getDefaults(), ...oldData };
            this._save();
            console.log("Migración completada.");
        },

        getFavorites: function () { return this._data?.favorites || []; },
        saveFavorites: function (favs) { this._data.favorites = favs; this._save(); },
        getContinueWatching: function () { return this._data?.continueWatching || {}; },
        saveContinueWatching: function (items) { this._data.continueWatching = items; this._save(); },
        getViewHistory: function () { return this._data?.viewHistory || []; },
        saveViewHistory: function (history) { this._data.viewHistory = history; this._save(); },
        getUserRatings: function () { return this._data?.userRatings || {}; },
        saveUserRatings: function (ratings) { this._data.userRatings = ratings; this._save(); },
        getViewCounts: function () { return this._data?.movieViewCounts || {}; },
        saveViewCounts: function (counts) { this._data.movieViewCounts = counts; this._save(); },
        getRecentSearches: function () { return this._data?.recentSearches || []; },
        saveRecentSearches: function (searches) { this._data.recentSearches = searches; this._save(); },
        getAppVersion: function () { return this._data.appVersion; },
        setAppVersion: function (version) { this._data.appVersion = version; this._save(); },
        getReportedItems: function () { return this._data?.reportedItems || []; },
        addReportedItem: function (itemId) {
            if (!this._data.reportedItems.includes(itemId)) {
                this._data.reportedItems.push(itemId);
            }
            this._save();
        },
        getNotifications: function () { return this._data?.notifications || []; },
        saveNotifications: function (notifications) { this._data.notifications = notifications; this._save(); }
    };

    dataManager.load();
    window.dataManager = dataManager;

    // --- Variables y Elementos del DOM ---
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const sideMenu = document.getElementById('side-menu');

    // Aplicar fondo global al menú lateral (para que salga en todas las páginas)
    if (sideMenu) {
        sideMenu.style.backgroundImage = "linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.95)), url('https://imgs.search.brave.com/gItV65AZpNINdoMPT7FycrI2KsNe7xYd0_sHJaCW4Zw/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93YWxs/cGFwZXIuZm9yZnVu/LmNvbS9mZXRjaC9l/Yy9lYzc3NGMxMDhk/NDFiMjk0YWQ1M2Fk/YjQwZjhiZGExNi5q/cGVn')";
        sideMenu.style.backgroundSize = "cover";
        sideMenu.style.backgroundPosition = "center";
    }

    const searchForm = document.getElementById('search-form');
    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('search-input');
    const liveSearchResultsContainer = document.getElementById('live-search-results');
    const continueWatchingGrid = document.getElementById('continue-watching-grid');
    const reportedItems = new Set(dataManager.getReportedItems());
    const proximamenteSection = document.getElementById('proximamente-section');
    const recomendacionesSection = document.getElementById('recomendaciones-section');
    const recomendacionesGrid = document.getElementById('recomendaciones-grid');
    const noRecomendacionesMessage = document.getElementById('no-recomendaciones');
    let mostViewedIds = [];

    // --- Variables Globales para el Héroe ---
    let heroMovies = [];
    let currentHeroIndex = 0;
    let heroInterval;

    // --- Hamburger Menu Logic ---
    if (hamburgerBtn && sideMenu) {
        const closeSideMenuBtn = document.getElementById('close-side-menu-btn');
        const toggleMenu = (e) => {
            e.stopPropagation();
            sideMenu.classList.toggle('open');
            hamburgerBtn.classList.toggle('active');
        };
        hamburgerBtn.addEventListener('click', toggleMenu);
        if (closeSideMenuBtn) closeSideMenuBtn.addEventListener('click', toggleMenu);
    }

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
    document.addEventListener('click', function (e) {
        const toggle = e.target.closest('.submenu-toggle');
        if (toggle) {
            e.preventDefault();
            const submenu = toggle.closest('.nav-submenu');
            if (submenu) {
                submenu.classList.toggle('open');
            }
        }
    });

    // --- Favorites System ---
    const loadFavorites = () => {
        const favoriteIds = dataManager.getFavorites();
        window.peliculas.forEach((p) => {
            if (!p.id) {
                const safeTitle = (p.titulo || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                p.id = `${safeTitle}-${p.año}`;
            }
            p.favorito = favoriteIds.includes(p.id);
        });
    };

    const saveFavorites = () => {
        const favoriteIds = window.peliculas.filter(p => p.favorito).map(p => p.id);
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
        'comedia': 'Comedia',
        'documental': 'Documental',
        'tendencias': '🔥 Tendencias de la Semana',
        'recientemente-añadido': '✨ Añadido Recientemente',
        'series': '📺 Series Populares',
        'todo-lo-nuevo-2025': '🆕 Todo lo Nuevo 2025',
        'proximamente': '⏳ Próximamente',
        'todos': '📂 Todo el Contenido',
        'populares': '⭐ Populares',
        'anime': '🎌 Anime',
        'ninos': '🧒 Niños'
    };

    // Group movies by category
    const peliculasPorCategoria = window.peliculas.reduce((acc, pelicula) => {
        // Usar un Set temporal para rastrear qué categorías ya se han asignado a esta película
        const assignedCategories = new Set();

        const addIfUnique = (cat) => {
            if (!cat) return;
            const normalized = window.normalizeText(cat);
            if (normalized && !assignedCategories.has(normalized)) {
                (acc[normalized] = acc[normalized] || []).push(pelicula);
                assignedCategories.add(normalized);
            }
        };

        // 1. Categorías asignadas explícitamente
        const categorias = Array.isArray(pelicula.categoria) ? pelicula.categoria : [pelicula.categoria];
        categorias.forEach(addIfUnique);

        // 2. Casos especiales por metadatos (tipo, año)
        if (pelicula.año === 2025 || pelicula.año === '2025') {
            addIfUnique('todo-lo-nuevo-2025');
        }

        if (pelicula.tipo === 'serie') {
            addIfUnique('series');
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
                const peliculaData = window.peliculas.find(p => p.id === pelicula.id);
                if (peliculaData && peliculaData.id) {
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

            const filteredMovies = window.peliculas.map(p => {
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
                searchTitle.innerHTML = `No encontramos "<span class="highlight">${query}</span>" localmente. Iniciando <span id="ultra-search-status" class="ultra-search-badge">Ultra Búsqueda TMDB...</span>`;
                // Activar Ultra Búsqueda
                ultraSearchTMDB(query);
            }
        } else {
            toggleMainContent(true);
            searchContainer.style.display = 'none';
        }
    };

    // --- NUEVO: Función Ultra Búsqueda TMDB ---
    async function ultraSearchTMDB(query) {
        const searchGrid = document.getElementById('live-search-grid');
        const searchTitle = document.getElementById('live-search-title');

        if (!TMDB_API_KEY || !searchGrid) return;

        try {
            const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&language=es-ES&query=${encodeURIComponent(query)}&page=1&include_adult=false`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                // Limpiar el grid antes de mostrar resultados de TMDB
                searchGrid.innerHTML = '';
                searchTitle.innerHTML = `Resultados de Ultra Búsqueda para "<span>${query}</span>"`;

                data.results.forEach(item => {
                    // Solo películas y series
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
                        esTmdb: true // Bandera para identificar que es de la API
                    };

                    const card = createMovieCard(movieData);
                    // Sobrescribir el evento click para TMDB
                    card.addEventListener('click', (e) => {
                        if (!e.target.closest('.card-favorite-btn')) {
                            window.location.href = `detalles.html?tmdb=${item.id}&type=${item.media_type}`;
                        }
                    }, { capture: true });

                    searchGrid.appendChild(card);
                });
            } else {
                searchTitle.innerHTML = `No encontramos "<span class="highlight">${query}</span>" ni en Ultra Búsqueda. ¡Prueba otro título!`;
            }
        } catch (error) {
            console.error("Error en Ultra Búsqueda:", error);
            searchTitle.innerHTML = `Error al conectar con Ultra Búsqueda. Intenta de nuevo.`;
        }
    }


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
            const moviesToRender = window.peliculas.filter(p => {
                if (Array.isArray(p.categoria)) {
                    return p.categoria.includes(category);
                }
                return p.categoria === category;
            });

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
                if (liveSearchResultsContainer) liveSearchResultsContainer.style.display = 'none';
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
                if (liveSearchResultsContainer) liveSearchResultsContainer.style.display = 'none';
            }
        });
    }

    // --- Function to create movie cards ---
    window.createMovieCard = (pelicula, showDescription = true, highlightQuery = '') => {
        const tarjeta = document.createElement('a');
        tarjeta.className = 'movie-card';
        tarjeta.dataset.movieId = pelicula.id;
        tarjeta.href = `detalles.html?id=${encodeURIComponent(pelicula.id)}`;

        if (pelicula.esta_roto || reportedItems.has(pelicula.id)) {
            tarjeta.classList.add('is-broken');
        }

        const tipoTag = `<div class="card-tag tag-tipo tag-${pelicula.tipo || 'pelicula'}">${(pelicula.tipo || 'pelicula').toUpperCase()}</div>`;
        const edadTag = pelicula.clasificacion_edad ? `<div class="card-tag tag-edad ${pelicula.clasificacion_edad.includes('+18') ? 'tag-fire' : ''}">${pelicula.clasificacion_edad}</div>` : '';
        const nuevoTag = pelicula.es_nuevo ? `<div class="card-tag tag-nuevo">NUEVO</div>` : '';
        const recienteTag = pelicula.es_reciente ? `<div class="card-tag tag-reciente">RECIENTE</div>` : '';
        const mostViewedTag = mostViewedIds.includes(pelicula.id) ? `<div class="card-tag tag-most-viewed">🔥 MÁS VISTO</div>` : '';
        const plataformaTag = pelicula.plataforma ? `<div class="card-tag tag-plataforma tag-${pelicula.plataforma.toLowerCase().replace(/[^a-z0-9]/g, '-')}">${pelicula.plataforma}</div>` : '';
        const nuevaTemporadaTag = pelicula.estado_temporada === 'nueva' ? `<div class="card-tag tag-nueva-temporada">NUEVA TEMPORADA</div>` : '';
        const prontoTemporadaTag = pelicula.estado_temporada === 'pronto' ? `<div class="card-tag tag-pronto-temporada">PRONTO NUEVA TEMP.</div>` : '';

        const isFavorited = dataManager.getFavorites().includes(pelicula.id);
        const favoriteButton = `
            <button class="card-favorite-btn ${isFavorited ? 'favorited' : ''}" data-movie-id="${pelicula.id}" title="Añadir a Favoritos">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            </button>
        `;

        // Añadir estado de carga inicial
        tarjeta.classList.add('loading');

        tarjeta.innerHTML = `
            ${plataformaTag}${nuevoTag}${recienteTag}${mostViewedTag}${edadTag}${tipoTag}${nuevaTemporadaTag}${prontoTemporadaTag}
            <img src="${pelicula.poster || 'https://via.placeholder.com/180x270/333333/ffffff?text=No+Image'}" 
                 alt="Póster de ${pelicula.titulo}" 
                 loading="lazy" 
                 decoding="async" 
                 onerror="this.src='https://via.placeholder.com/180x270/333333/ffffff?text=No+Image'; this.onerror=null; this.parentElement.classList.remove('loading');"
                 onload="this.parentElement.classList.remove('loading')"
                 class="movie-poster">
            <div class="movie-card-info" title="${pelicula.titulo.trim()}">
                <h3>${highlightMatch(pelicula.titulo, highlightQuery)}</h3>
            </div>
            ${favoriteButton}
        `;

        // Hacer clic en la tarjeta abre los detalles con el loader
        tarjeta.addEventListener('click', (e) => {
            // El botón de favoritos tiene su propio listener con stopPropagation,
            // por lo que este código no se ejecuta si se hace clic en el corazón.
            e.preventDefault();
            window.showPageLoader(tarjeta.href);
        });

        const favBtn = tarjeta.querySelector('.card-favorite-btn');
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const movieId = pelicula.id;
            const movieTitle = pelicula.titulo;
            let favorites = dataManager.getFavorites();

            // NUEVO: Verificar si es de TMDB y si ya existe localmente
            if (pelicula.esTmdb) {
                const localMatch = window.peliculas.find(p => !p.esTmdb &&
                    (window.normalizeText(p.titulo) === window.normalizeText(movieTitle)));
                if (localMatch) {
                    window.showNotification(`¡Esta película ya existe en nuestra biblioteca!`, 'info');
                    // No detenemos el proceso de favoritos, solo avisamos
                }
            }

            if (favorites.includes(movieId)) {
                favorites = favorites.filter(id => id !== movieId);
                favBtn.classList.remove('favorited');
                window.showNotification(`Eliminado de favoritos: ${movieTitle}`, 'info');
            } else {
                favorites.push(movieId);
                favBtn.classList.add('favorited');
                window.showNotification(`¡Añadido a favoritos! ${movieTitle}`, 'success');
            }
            dataManager.saveFavorites(favorites);
        });

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
        const pelicula = window.peliculas.find(p => p.id === item.id);
        if (!pelicula) {
            console.warn('⚠️ Película no encontrada para item:', item.id);
            return null;
        }

        // Calcular progreso: si no hay duración, mostrar 10% como indicador de "viendo"
        const progressPercent = item.duration && item.currentTime
            ? (item.currentTime / item.duration) * 100
            : 10;

        const tarjeta = document.createElement('a');
        tarjeta.className = 'movie-card continue-watching-card';
        tarjeta.href = `detalles.html?id=${encodeURIComponent(pelicula.id)}`;

        let title = pelicula.titulo;
        if (item.type === 'serie' && item.season && item.episode) {
            title += ` <span class="episode-info">(T${item.season} E${item.episode})</span>`;
        }

        tarjeta.classList.add('loading');

        tarjeta.innerHTML = `
            <button class="remove-continue-watching" title="Quitar de la lista" data-movie-id="${pelicula.id}">
                &times;
            </button>
            <img src="${pelicula.poster || 'https://via.placeholder.com/180x270/333333/ffffff?text=No+Image'}" 
                 alt="Póster de ${pelicula.titulo}" 
                 loading="lazy" 
                 decoding="async" 
                 onerror="this.src='https://via.placeholder.com/180x270/333333/ffffff?text=No+Image'; this.parentElement.classList.remove('loading');"
                 onload="this.parentElement.classList.remove('loading')">
            <div class="movie-info">
                <h3>${title}</h3>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${progressPercent.toFixed(2)}%;"></div>
            </div>
        `;

        // Hacer clic en la tarjeta redirige a detalles.html usando el loader
        tarjeta.addEventListener('click', (e) => {
            // No redirigir si se hace clic en el botón de eliminar
            // (el botón de eliminar tiene su propio listener con stopPropagation)
            e.preventDefault();
            window.showPageLoader(tarjeta.href);
        });

        const removeBtn = tarjeta.querySelector('.remove-continue-watching');
        removeBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevenir la navegación del enlace <a>
            e.stopPropagation();
            removeFromContinueWatching(pelicula.id);
        });

        return tarjeta;
    };

    function loadContinueWatching() {
        const continueWatchingSection = document.getElementById('continue-watching-section');
        if (!continueWatchingSection || !continueWatchingGrid) return;

        // NUEVO: Verificar si la sección debe mostrarse
        if (localStorage.getItem('settings_show_continue_watching') === 'false') {
            continueWatchingSection.style.display = 'none';
            return;
        }

        let items = dataManager.getContinueWatching();
        console.log('📺 Cargando "Seguir Viendo":', items);

        const sortedItems = Object.values(items).sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched));

        continueWatchingGrid.innerHTML = '';
        let visibleItems = 0;

        sortedItems.forEach(item => {
            // Solo filtrar si está casi completado (>95%)
            // Permitir todo lo demás, incluso sin duración
            if (item.duration && item.currentTime) {
                const progress = item.currentTime / item.duration;
                if (progress > 0.95) {
                    console.log('⏭️ Omitiendo (completado):', item.id, `${(progress * 100).toFixed(1)}%`);
                    return;
                }
            }

            const card = createContinueWatchingCard(item);
            if (card) {
                continueWatchingGrid.appendChild(card);
                visibleItems++;
                console.log('✅ Agregado a "Seguir Viendo":', item.id);
            }
        });

        console.log(`📊 Total items visibles en "Seguir Viendo": ${visibleItems}`);
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

        const favoriteMovies = window.peliculas.filter(p => p.favorito);

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
        console.log("Renderizando secciones...");

        for (const idSeccion in secciones) {
            const contenedor = document.getElementById(idSeccion);
            if (!contenedor) {
                console.log(`No se encontró contenedor para sección: ${idSeccion}`);
                continue;
            }

            // CORRECCIÓN: Tratar 'recientemente-añadido' de forma especial para que no desaparezca.
            // Se renderizará con su propia lógica fuera de este bucle.
            if (idSeccion === 'favoritos' || idSeccion === 'recientemente-añadido') {
                continue;
            }

            const peliculasDeSeccion = peliculasPorCategoria[idSeccion];

            if (!peliculasDeSeccion || peliculasDeSeccion.length === 0) {
                console.log(`No hay películas para la sección: ${idSeccion}`);
                contenedor.style.display = 'none';
                continue;
            }

            console.log(`Renderizando sección ${idSeccion} con ${peliculasDeSeccion.length} películas`);

            contenedor.innerHTML = '';

            const tituloContainer = document.createElement('div');
            tituloContainer.className = 'section-title-container';

            const tituloSeccion = document.createElement('h2');
            tituloSeccion.className = 'section-title';
            tituloSeccion.innerHTML = secciones[idSeccion];
            tituloContainer.appendChild(tituloSeccion);

            const seccionesConVerMas = ['lanzamientos-recientes', 'accion', 'aventura', 'series', 'terror', 'anime', 'todos', 'documental', 'proximamente', 'drama', 'todo-lo-nuevo-2025', 'comedia', 'populares', 'ninos'];
            if (seccionesConVerMas.includes(idSeccion) && peliculasDeSeccion.length > 0) {
                const verMasLink = document.createElement('a');
                let href = `${idSeccion.replace('-recientes', '').replace('recientemente-añadido', 'todos')}.html`;

                // Redirigir anime a la página de anime.html
                if (idSeccion === 'anime') href = 'anime.html';

                verMasLink.href = href;
                verMasLink.className = 'ver-mas-link';
                verMasLink.textContent = 'Ver más ›';
                verMasLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.showPageLoader(href);
                });
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

            contenedor.style.display = 'block';
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
                <img src="${item.poster || 'https://via.placeholder.com/180x270/333333/ffffff?text=No+Image'}" alt="Póster de ${item.titulo}" loading="lazy" decoding="async" onerror="this.src='https://via.placeholder.com/180x270/333333/ffffff?text=No+Image'">
                <div class="movie-info"><h3>${item.titulo}</h3><p>Próximamente...</p></div>`;
            grid.appendChild(tarjeta);
        });

        proximamenteSection.appendChild(grid);
        proximamenteSection.style.display = 'block';
    };

    function renderTrendingSection() {
        const trendingSection = document.getElementById('tendencias');
        if (!trendingSection) return;

        // NUEVO: Verificar si la sección debe mostrarse
        if (localStorage.getItem('settings_show_trending') === 'false') {
            trendingSection.style.display = 'none';
            return;
        }

        trendingSection.innerHTML = '';

        const titleContainer = document.createElement('div');
        titleContainer.className = 'section-title-container';
        titleContainer.innerHTML = `<h2 class="section-title">${secciones['tendencias']}</h2>`;
        trendingSection.appendChild(titleContainer);

        const viewCounts = dataManager.getViewCounts();
        const sortedTrendingMovies = window.peliculas
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

        // NUEVO: Verificar si la sección debe mostrarse
        if (localStorage.getItem('settings_show_recommendations') === 'false') {
            recomendacionesSection.style.display = 'none';
            return;
        }

        const viewHistory = dataManager.getViewHistory();
        if (viewHistory.length === 0) {
            recomendacionesSection.style.display = 'none';
            return;
        }

        const lastViewedId = viewHistory[0].id;
        const lastViewedMovie = window.peliculas.find(p => p.id === lastViewedId);

        if (!lastViewedMovie || !lastViewedMovie.categoria) {
            recomendacionesSection.style.display = 'none';
            return;
        }

        const historyIds = new Set(viewHistory.map(item => item.id));
        const recommendedMovies = window.peliculas.filter(p =>
            p.categoria === lastViewedMovie.categoria && !historyIds.has(p.id)
        ).sort(() => 0.5 - Math.random()).slice(0, 10);

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

        // NUEVO: Verificar si la sección debe mostrarse
        if (localStorage.getItem('settings_show_recently_added') === 'false') {
            recentlyAddedSection.style.display = 'none';
            return;
        }

        // Intentar usar el grid definido en HTML para mantener el encabezado y estilos
        let grid = document.getElementById('recientemente-añadido-grid');

        if (grid) {
            grid.innerHTML = '';
        } else {
            // Fallback: reconstruir si no existe el grid (compatibilidad)
            recentlyAddedSection.innerHTML = '';
            const titleContainer = document.createElement('div');
            titleContainer.className = 'section-title-container';
            titleContainer.innerHTML = `
                <h2 class="section-title">${secciones['recientemente-añadido']}</h2>
                <a href="todos.html" class="view-all-link">Ver todo</a>
            `;
            recentlyAddedSection.appendChild(titleContainer);

            grid = document.createElement('div');
            grid.className = 'movie-grid';
            grid.id = 'recientemente-añadido-grid';
            recentlyAddedSection.appendChild(grid);
        }

        // Ordenar: Prioridad fecha añadida -> Año -> Orden en array (últimos agregados)
        const sortedRecentlyAdded = window.peliculas
            .map((p, index) => ({ ...p, _originalIndex: index }))
            .sort((a, b) => {
                if (a.addedDate && b.addedDate) return new Date(b.addedDate) - new Date(a.addedDate);
                if (a.addedDate) return -1;
                if (b.addedDate) return 1;
                if ((b.año || 0) !== (a.año || 0)) return (b.año || 0) - (a.año || 0);
                return b._originalIndex - a._originalIndex;
            })
            .slice(0, 5);

        if (sortedRecentlyAdded.length === 0) {
            recentlyAddedSection.style.display = 'none';
            return;
        }

        sortedRecentlyAdded.forEach(pelicula => {
            grid.appendChild(createMovieCard(pelicula));
        });

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

        viewHistorySection.style.display = 'block';

        const titleContainer = viewHistorySection.querySelector('.section-title-container');
        let clearHistoryBtn = titleContainer.querySelector('.clear-all-btn');
        if (clearHistoryBtn) clearHistoryBtn.remove();

        clearHistoryBtn = document.createElement('button');
        clearHistoryBtn.className = 'clear-all-btn';
        clearHistoryBtn.textContent = 'Limpiar historial';
        clearHistoryBtn.title = 'Eliminar todo el historial de vistas';
        clearHistoryBtn.addEventListener('click', () => {
            dataManager.saveViewHistory([]);
            renderViewHistory();
        });
        titleContainer.appendChild(clearHistoryBtn);

        history.forEach(item => {
            const pelicula = window.peliculas.find(p => p.id === item.id);
            if (pelicula) {
                const card = createMovieCard(pelicula);
                viewHistoryGrid.appendChild(card);
            }
        });
    };

    // --- NUEVO: Cargar y renderizar las mejores películas desde TMDB ---
    async function fetchAndRenderTopRatedMovies() {
        const container = document.getElementById('mejores-peliculas-section');
        const grid = document.getElementById('mejores-peliculas-grid');

        if (!container || !grid) {
            console.warn('Contenedor para "Mejores Películas" no encontrado.');
            return;
        }

        // Mostrar un loader simple mientras carga
        grid.innerHTML = '<div class="loader-bar" style="margin: 2rem auto; animation: none; background: var(--primary);"></div>';

        try {
            const url = `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}&language=es-ES&page=1`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error de red: ${response.status}`);
            }
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                grid.innerHTML = ''; // Limpiar el loader
                
                const carruselContenedor = grid.parentElement;
                if (carruselContenedor && !carruselContenedor.querySelector('.carrusel-flecha')) {
                    carruselContenedor.insertAdjacentHTML('afterbegin', `
                        <button class="carrusel-flecha izquierda" aria-label="Anterior">&#10094;</button>
                        <button class="carrusel-flecha derecha" aria-label="Siguiente">&#10095;</button>
                    `);
                    
                    const flechaIzquierda = carruselContenedor.querySelector('.izquierda');
                    const flechaDerecha = carruselContenedor.querySelector('.derecha');
                    
                    flechaIzquierda.addEventListener('click', () => grid.scrollBy({ left: -grid.clientWidth * 0.8, behavior: 'smooth' }));
                    flechaDerecha.addEventListener('click', () => grid.scrollBy({ left: grid.clientWidth * 0.8, behavior: 'smooth' }));
                }

                data.results.slice(0, 20).forEach(item => { // Limitar a 20 para el carrusel
                    const peliculaData = {
                        id: `tmdb-${item.id}`,
                        tmdbId: item.id,
                        tipo: 'pelicula',
                        titulo: item.title,
                        descripcion: item.overview,
                        poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://via.placeholder.com/180x270/333333/ffffff?text=No+Image',
                        año: (item.release_date || '').split('-')[0] || 'N/A',
                        calificacion: item.vote_average,
                        esTmdb: true
                    };

                    const card = createMovieCard(peliculaData);
                    card.href = `detalles.html?tmdb=${item.id}&type=movie`; // Sobrescribir el href para que apunte a TMDB
                    grid.appendChild(card);
                });
                container.style.display = 'block';
            } else {
                container.style.display = 'none';
            }
        } catch (error) {
            console.error('Error al cargar las mejores películas:', error);
            container.style.display = 'none';
        }
    }

    // --- Hero Section Logic ---
    const setupHeroSection = () => {
        const heroContainer = document.getElementById('hero-section');
        if (!heroContainer) return;

        const slideContainer = document.createElement('div');
        slideContainer.className = 'hero-section-inner';

        const heroMoviesSource = peliculasPorCategoria['lanzamientos-recientes'] || peliculasPorCategoria['tendencias'] || [];
        heroMovies = heroMoviesSource.sort(() => 0.5 - Math.random()).slice(0, 5);

        if (heroMovies.length === 0) {
            heroContainer.style.display = 'none';
            return;
        }

        currentHeroIndex = 0;

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
                <p class="hero-description">${heroMovie.descripcion || 'Descripción no disponible'}</p>
                <div class="hero-details">
                    <span>${heroMovie.año || 'N/A'}</span>
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

            slideContainer.querySelector('.hero-button').addEventListener('click', () => {
                window.showPageLoader(`detalles.html?id=${encodeURIComponent(heroMovie.id)}`);
            });

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
            heroInterval = setInterval(nextSlide, 5000);
        };

        // Agregar el contenedor de diapositivas al héroe
        heroContainer.appendChild(slideContainer);

        // Renderizar la primera diapositiva
        renderHeroSlide(currentHeroIndex);
        startAutoplay();

        // Añadir event listeners para controles
        const heroNextBtn = heroContainer.querySelector('.next');
        const heroPrevBtn = heroContainer.querySelector('.prev');

        if (heroNextBtn) {
            heroNextBtn.addEventListener('click', () => {
                nextSlide();
                startAutoplay();
            });
        }

        if (heroPrevBtn) {
            heroPrevBtn.addEventListener('click', () => {
                currentHeroIndex = (currentHeroIndex - 1 + heroMovies.length) % heroMovies.length;
                renderHeroSlide(currentHeroIndex);
                startAutoplay();
            });
        }

        if (indicatorsContainer) {
            indicatorsContainer.addEventListener('click', (e) => {
                if (e.target.matches('.indicator-dot')) {
                    currentHeroIndex = parseInt(e.target.dataset.index);
                    renderHeroSlide(currentHeroIndex);
                    startAutoplay();
                }
            });
        }
    };

    function renderMainGrid() {
        const mainGrid = document.getElementById('main-content-grid');
        if (!mainGrid) return;

        mainGrid.innerHTML = '';

        window.peliculas.forEach(pelicula => {
            const tarjeta = createMovieCard(pelicula);
            mainGrid.appendChild(tarjeta);
        });
    }

    // --- Modal Logic ---
    const modal = document.getElementById('movie-modal');
    const closeModalButton = document.querySelector('.close-button');

    const closeModal = () => {
        if (!modal) return;

        const posterImage = document.getElementById('modal-poster');
        const videoPlayer = document.getElementById('modal-video');
        const teraboxContainer = document.getElementById('terabox-container');

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

            videoPlayer.addEventListener('loadedmetadata', () => {
                const startTime = sessionStorage.getItem('startTime');
                if (startTime) {
                    videoPlayer.currentTime = parseFloat(startTime);
                    sessionStorage.removeItem('startTime');
                }
            });

            videoPlayer.style.display = 'block';
            videoPlayer.play().catch(e => {
                console.log('Autoplay bloqueado:', e);
            });
        } else if (teraboxContainer) {
            teraboxContainer.innerHTML = `
                <iframe 
                    src="${finalUrl}" 
                    width="100%" 
                    height="100%" 
                    frameborder="0" 
                    scrolling="no" 
                    allowfullscreen
                    allow="autoplay; encrypted-media"
                    sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
                ></iframe>
            `;
            teraboxContainer.style.display = 'block';
        }
    };

    const getFlagForLanguage = (idioma) => {
        if (!idioma) return '🌐';
        const lang = idioma.toLowerCase();

        if (lang.includes('español') || lang.includes('castellano')) return `<img src="español.png" alt="Bandera de España" class="flag-img">`;
        if (lang.includes('latino') || lang.includes('mexico')) return `<img src="latino.png" alt="Bandera de México" class="flag-img">`;
        if (lang.includes('subtitulado')) return `<img src="subtitulado.png" alt="Bandera de USA" class="flag-img">`;
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

        modal.dataset.currentMovieId = peliculaData.id;
        document.getElementById('modal-title').textContent = peliculaData.titulo;
        document.getElementById('modal-description').textContent = peliculaData.descripcion || 'Descripción no disponible';

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

        const castContainer = document.getElementById('modal-cast');
        if (castContainer) {
            castContainer.innerHTML = '';
            const validReparto = peliculaData.reparto && peliculaData.reparto.filter(actor => actor && typeof actor === 'string' && actor.trim() !== '');

            if (validReparto && validReparto.length > 0) {
                const castTitle = document.createElement('strong');
                castTitle.textContent = 'Reparto: ';
                castContainer.appendChild(castTitle);
                const castText = document.createTextNode(validReparto.join(', '));
                castContainer.appendChild(castText);
            } else {
                castContainer.style.display = 'none';
            }
        }

        if (peliculaData.tipo === 'serie' && peliculaData.temporadas) {
            sourceButtonsContainer.style.display = 'none';

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
                episodesList.className = 'episodes-grid';
                const season = peliculaData.temporadas[seasonIndex];
                if (!season || !season.episodios) {
                    episodesList.innerHTML = '<p class="no-sources-message">No hay episodios en esta temporada.</p>';
                    return;
                }

                season.episodios.forEach((episode, episodeIndex) => {
                    const episodeButton = document.createElement('a');
                    episodeButton.className = 'episode-btn';
                    episodeButton.textContent = `E${episode.episodio || episodeIndex + 1}`;

                    episodeButton.onclick = (e) => {
                        e.preventDefault();
                        setPlayerSource(episode.url, 'iframe');
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

                    button.addEventListener('click', (e) => {
                        e.preventDefault();
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

        const ratingAvg = document.getElementById('modal-rating-avg');
        const ratingVotes = document.getElementById('rating-votes');
        if (ratingAvg) ratingAvg.textContent = peliculaData.calificacion ? peliculaData.calificacion.toFixed(1) : 'Sin calificar';
        if (ratingVotes) ratingVotes.textContent = peliculaData.votos ? `${peliculaData.votos.toLocaleString()} votos` : '0 votos';

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
                star.addEventListener('click', () => {
                    const rating = parseInt(star.dataset.value);
                    const currentUserRatings = dataManager.getUserRatings();
                    currentUserRatings[peliculaData.id] = rating;
                    dataManager.saveUserRatings(currentUserRatings);

                    userRatingStarsContainer.querySelectorAll('.star').forEach(s => {
                        s.classList.toggle('selected', parseInt(s.dataset.value) <= rating);
                    });
                    alert(`Has calificado "${peliculaData.titulo}" con ${rating} estrellas.`);
                });
                userRatingStarsContainer.appendChild(star);
            }
        }

        const recommendationsGrid = document.getElementById('recommendations-grid');
        if (recommendationsGrid) {
            recommendationsGrid.innerHTML = '';
            const recommendations = window.peliculas.filter(p =>
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
                        <img src="${rec.poster || 'https://via.placeholder.com/150x200/333333/ffffff?text=No+Image'}" alt="Póster de ${rec.titulo}" loading="lazy" decoding="async" onerror="this.src='https://via.placeholder.com/150x200/333333/ffffff?text=No+Image'">
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

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';

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
            if (sideMenu && sideMenu.classList.contains('open') && !sideMenu.contains(e.target) && e.target !== hamburgerBtn && !hamburgerBtn.contains(e.target)) {
                sideMenu.classList.remove('open');
                hamburgerBtn.classList.remove('active');
            }
            if (liveSearchResultsContainer && liveSearchResultsContainer.style.display !== 'none' && !searchForm.contains(e.target)) {
                liveSearchResultsContainer.style.display = 'none';
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

    // --- NUEVO: Lógica para Notificaciones de Estrenos ---
    const checkForReleasedNotifications = () => {
        const notifications = dataManager.getNotifications();
        if (notifications.length === 0) return;

        const releasedMovies = notifications.filter(notif =>
            window.peliculas.some(p => p.id === notif.id)
        );

        if (releasedMovies.length > 0) {
            releasedMovies.forEach(movie => {
                showReleaseToast(movie);
            });

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

        setTimeout(() => toast.classList.add('show'), 100);
        toast.querySelector('.close-toast-btn').onclick = () => toast.remove();
        setTimeout(() => toast.remove(), 8000);
    };

    // --- SOPORTE PARA TV (VIDAA / ANDROID TV / WEBOS) ---
    // Permite navegar usando las flechas del control remoto
    const setupTVRemoteSupport = () => {
        // Estilos para resaltar dónde está el foco en la TV
        const style = document.createElement('style');
        style.innerHTML = `
            body.tv-mode :focus { outline: 4px solid var(--primary) !important; outline-offset: 2px; z-index: 100; }
            body.tv-mode .movie-card:focus { transform: scale(1.1); box-shadow: 0 0 20px rgba(229, 9, 20, 0.8); }
            body.tv-mode .nav-item:focus { color: var(--primary); transform: scale(1.2); }
        `;
        document.head.appendChild(style);

        // Detectar si se usan teclas de flecha para activar el "Modo TV"
        document.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                document.body.classList.add('tv-mode');
            }
        });

        document.addEventListener('keydown', (e) => {
            const navKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            if (!navKeys.includes(e.key)) return;

            e.preventDefault();

            // Elementos interactivos
            const selector = 'a[href], button:not([disabled]), input:not([disabled]), .movie-card, .episode-btn, .source-btn, .season-tab, .nav-item';
            const focusable = Array.from(document.querySelectorAll(selector))
                .filter(el => el.offsetParent !== null && !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none');

            const current = document.activeElement;
            
            // Si nada tiene foco, enfocar el primero
            if (!focusable.includes(current)) {
                if (focusable.length > 0) focusable[0].focus();
                return;
            }

            const currentRect = current.getBoundingClientRect();
            const currentCenter = { x: currentRect.left + currentRect.width / 2, y: currentRect.top + currentRect.height / 2 };

            let closest = null;
            let minDistance = Infinity;

            focusable.forEach(el => {
                if (el === current) return;
                const rect = el.getBoundingClientRect();
                const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

                // Calcular ángulo para determinar si el elemento está en la dirección correcta
                const angle = Math.atan2(center.y - currentCenter.y, center.x - currentCenter.x) * 180 / Math.PI;
                let isValid = false;

                if (e.key === 'ArrowRight') isValid = (angle > -45 && angle < 45);
                else if (e.key === 'ArrowLeft') isValid = (angle > 135 || angle < -135);
                else if (e.key === 'ArrowDown') isValid = (angle > 45 && angle < 135);
                else if (e.key === 'ArrowUp') isValid = (angle > -135 && angle < -45);

                if (isValid) {
                    const dist = Math.hypot(center.x - currentCenter.x, center.y - currentCenter.y);
                    if (dist < minDistance) {
                        minDistance = dist;
                        closest = el;
                    }
                }
            });

            if (closest) {
                closest.focus();
                closest.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });

        // Manejar botón "Atrás" del control remoto
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'GoBack') {
                if (document.getElementById('movie-modal').style.display === 'block') {
                    e.preventDefault();
                    closeModal();
                } else if (document.getElementById('side-menu').classList.contains('active')) {
                    e.preventDefault();
                    document.getElementById('hamburger-btn').click();
                }
            }
            // Simular clic en Enter para tarjetas
            if (e.key === 'Enter' && document.activeElement.classList.contains('movie-card')) {
                document.activeElement.click();
            }
        });
    };
    setupTVRemoteSupport();

    // --- Initialization ---
    function init() {
        if (typeof window.peliculas === 'undefined' || !Array.isArray(window.peliculas)) {
            console.warn("El array 'peliculas' aún no está listo. Reintentando inicialización...");
            setTimeout(init, 100);
            return;
        }

        if (window.peliculas.length === 0) {
            console.error("❌ NO HAY PELÍCULAS CARGADAS");

            // Mostrar mensaje de error
            const mainContainer = document.getElementById('main-content-sections');
            if (mainContainer) {
                mainContainer.innerHTML = `
                    <div class="error-message">
                        <h3>⚠️ No se pudieron cargar las películas</h3>
                        <p>Verifica que los archivos de películas existan y tengan datos válidos.</p>
                    </div>
                `;
            }
            return;
        }

        console.log("✅ Inicializando con", window.peliculas.length, "películas");

        if (document.getElementById('main-content-sections')) {
            calculateMostViewed();
            loadFavorites();
            renderSecciones();
            renderTrendingSection();
            renderRecentlyAddedSection();
            loadContinueWatching();
            // CORRECCIÓN: Llamar a renderFavorites aquí para asegurar que se muestre
            renderFavorites();
            renderViewHistory();
            renderRecomendaciones();
            fetchAndRenderTopRatedMovies();
            setupHeroSection();
        }

        checkForReleasedNotifications();

        const reportButton = document.querySelector('#movie-modal .report-button');
        if (reportButton) {
            reportButton.addEventListener('click', () => {
                const modalElement = document.getElementById('movie-modal');
                const movieId = modalElement.dataset.currentMovieId;
                if (!movieId) return;

                dataManager.addReportedItem(movieId);
                reportedItems.add(movieId);

                document.querySelectorAll(`.movie-card[data-movie-id='${movieId}']`).forEach(card => {
                    card.classList.add('is-broken');
                });

                closeModal();
                alert('¡Gracias! El contenido ha sido reportado y será revisado por un administrador.');
            });
        }

        const modalToOpen = sessionStorage.getItem('openModal');
        if (modalToOpen) {
            const peliculaData = window.peliculas.find(p => p.id === modalToOpen);
            if (peliculaData) {
                openModalWithMovie(peliculaData);
            }
            sessionStorage.removeItem('openModal');
        }

        console.log('✅ peliXx inicializado correctamente');
        console.log(`✅ Total de películas cargadas: ${window.peliculas.length}`);

        // --- NUEVO: Notificar a otros scripts que la inicialización ha terminado ---
        // Esto es crucial para que scripts como lanzamientos.js o favoritos.js
        // no intenten acceder a dataManager antes de que esté listo.
        console.log("🚀 Despachando evento 'app-ready'");
        document.dispatchEvent(new CustomEvent('app-ready'));
    };

    // Execute initialization after a small delay to ensure peliculas is loaded
    setTimeout(init, 300);

    // Manejar cambios de tamaño de ventana
    window.addEventListener('resize', () => {
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) {
            bottomNav.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
        }
        renderSecciones();
    });
});