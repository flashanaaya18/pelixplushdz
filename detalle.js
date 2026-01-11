
// Seleccionamos los elementos que acabamos de añadir en el HTML
const episodeNavControls = document.getElementById('episode-navigation-controls');
const prevEpisodeBtn = document.getElementById('prev-episode-btn');
const nextEpisodeBtn = document.getElementById('next-episode-btn');
const currentEpisodeInfo = document.getElementById('current-episode-info');

// Variables para guardar el estado actual
let currentSeriesData = null;
let currentEpisodeIdentifier = { season: -1, episode: -1 };

/**
 * Muestra los controles de navegación de episodios.
 * Se debe llamar cuando se carga una página de una serie.
 * @param {object} seriesData - El objeto completo de la serie.
 */
function showEpisodeNavigation(seriesData) {
    currentSeriesData = seriesData;
    if (episodeNavControls) {
        episodeNavControls.style.display = 'flex';
    }
}

/**
 * Oculta los controles de navegación.
 * Se debe llamar si lo que se carga no es una serie.
 */
function hideEpisodeNavigation() {
    currentSeriesData = null;
    if (episodeNavControls) {
        episodeNavControls.style.display = 'none';
    }
}

/**
 * Actualiza el estado de los botones de navegación (activado/desactivado)
 * y la información del episodio actual.
 * @param {number} seasonNumber - El número de la temporada actual (ej: 1).
 * @param {number} episodeNumber - El número del episodio actual (ej: 1).
 */
function updateEpisodeNavigationState(seasonNumber, episodeNumber) {
    if (!currentSeriesData || !currentSeriesData.temporadas) return;

    currentEpisodeIdentifier = { season: seasonNumber, episode: episodeNumber };

    // Actualiza el texto del episodio actual
    if (currentEpisodeInfo) {
        currentEpisodeInfo.textContent = `S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`;
    }

    const { prev, next } = findAdjacentEpisodes(seasonNumber, episodeNumber);

    // Habilita o deshabilita los botones
    if (prevEpisodeBtn) {
        prevEpisodeBtn.disabled = !prev;
        if (prev) {
            prevEpisodeBtn.onclick = () => loadEpisode(prev.season, prev.episode);
        }
    }
    if (nextEpisodeBtn) {
        nextEpisodeBtn.disabled = !next;
        if (next) {
            nextEpisodeBtn.onclick = () => loadEpisode(next.season, next.episode);
        }
    }
}

/**
 * Encuentra el episodio anterior y el siguiente basándose en el actual.
 * @param {number} seasonNumber - Número de la temporada actual.
 * @param {number} episodeNumber - Número del episodio actual.
 * @returns {{prev: object|null, next: object|null}}
 */
function findAdjacentEpisodes(seasonNumber, episodeNumber) {
    if (!currentSeriesData || !currentSeriesData.temporadas) return { prev: null, next: null };

    // Aseguramos que las temporadas y episodios estén ordenados
    const seasons = currentSeriesData.temporadas.sort((a, b) => (a.temporada || a.season) - (b.temporada || b.season));
    seasons.forEach(s => s.episodios.sort((a, b) => a.episodio - b.episodio));

    const currentSeasonIndex = seasons.findIndex(s => (s.temporada || s.season) === seasonNumber);
    if (currentSeasonIndex === -1) return { prev: null, next: null };

    const currentSeason = seasons[currentSeasonIndex];
    const currentEpisodeIndex = currentSeason.episodios.findIndex(e => e.episodio === episodeNumber);
    if (currentEpisodeIndex === -1) return { prev: null, next: null };

    let prev = null;
    let next = null;

    // 1. Buscar episodio ANTERIOR
    if (currentEpisodeIndex > 0) {
        // Hay un episodio anterior en la misma temporada
        const prevEpisode = currentSeason.episodios[currentEpisodeIndex - 1];
        prev = { season: seasonNumber, episode: prevEpisode.episodio };
    } else if (currentSeasonIndex > 0) {
        // Es el primer episodio, buscamos el último episodio de la temporada anterior
        const prevSeason = seasons[currentSeasonIndex - 1];
        if (prevSeason.episodios.length > 0) {
            const lastEpisodeOfPrevSeason = prevSeason.episodios[prevSeason.episodios.length - 1];
            prev = { season: prevSeason.temporada || prevSeason.season, episode: lastEpisodeOfPrevSeason.episodio };
        }
    }

    // 2. Buscar episodio SIGUIENTE
    if (currentEpisodeIndex < currentSeason.episodios.length - 1) {
        // Hay un episodio siguiente en la misma temporada
        const nextEpisode = currentSeason.episodios[currentEpisodeIndex + 1];
        next = { season: seasonNumber, episode: nextEpisode.episodio };
    } else if (currentSeasonIndex < seasons.length - 1) {
        // Es el último episodio, buscamos el primer episodio de la siguiente temporada
        const nextSeason = seasons[currentSeasonIndex + 1];
        if (nextSeason.episodios.length > 0) {
            const firstEpisodeOfNextSeason = nextSeason.episodios[0];
            next = { season: nextSeason.temporada || nextSeason.season, episode: firstEpisodeOfNextSeason.episodio };
        }
    }

    return { prev, next };
}

/**
 * Carga un nuevo episodio.
 * @param {number} seasonNumber - Número de la temporada a cargar.
 * @param {number} episodeNumber - Número del episodio a cargar.
 */
function loadEpisode(seasonNumber, episodeNumber) {
    // CORRECCIÓN: Se busca la tarjeta del episodio y se simula un clic para reutilizar la lógica existente.
    const episodeCard = document.querySelector(`.episode-card[data-season="${seasonNumber}"][data-episode="${episodeNumber}"]`);

    if (episodeCard) {
        // Simular el clic en la tarjeta del episodio
        episodeCard.click();

        // Adicionalmente, nos aseguramos de que la tarjeta activa sea visible en el carrusel
        // usando un pequeño retraso para dar tiempo a que se renderice.
        setTimeout(() => episodeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }), 100);
    } else {
        console.error(`No se encontró la tarjeta para el episodio S${seasonNumber}E${episodeNumber}.`);
    }
}

// --- NUEVO: Lógica para reportar contenido ---
async function reportContent(movieId, movieTitle) {
    if (!movieId || !movieTitle) {
        alert('No se puede reportar: falta información del contenido.');
        return;
    }

    const report = {
        id: movieId,
        titulo: movieTitle,
        fecha: new Date().toISOString()
    };

    try {
        // Esta es una simulación de cómo se enviaría el reporte.
        // En un entorno real, aquí harías una llamada a tu backend (API).
        // Por ahora, lo guardaremos en un archivo `reports.json` si es posible,
        // o mostraremos una alerta de éxito.
        console.log("Reporte enviado (simulación):", report);
        alert(`Gracias por tu ayuda. Se ha enviado un reporte para "${movieTitle}". Lo revisaremos pronto.`);
        // Aquí iría la lógica para enviar el reporte al servidor.
    } catch (error) {
        console.error('Error al enviar el reporte:', error);
        alert('Hubo un error al enviar tu reporte. Por favor, inténtalo más tarde.');
    }
}

/**
 * Configura el botón de "volver" para que apunte a la página anterior
 * o a la página de inicio como fallback.
 */
function setupBackButton() {
    const backButton = document.getElementById('back-to-home-btn'); // Ahora es un <button>
    if (backButton) {
        backButton.addEventListener('click', () => {
            // Si el usuario vino de otra página dentro de nuestro sitio, vuelve atrás.
            if (document.referrer && new URL(document.referrer).hostname === window.location.hostname) {
                window.history.back();
            } else { // Si no, lo enviamos al inicio.
                window.location.href = 'index.html';
            }
        });
    }
}

async function initDetalle() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const movieId = urlParams.get('id');
        const tmdbId = urlParams.get('tmdb');
        const tmdbType = urlParams.get('type') || 'movie';

        let movie = null;
        const allMovies = window.peliculas || [];

        if (movieId) {
            // Carga local
            movie = allMovies.find(m => String(m.id) === String(movieId));
        } else if (tmdbId) {
            // Carga desde TMDB (Ultra Búsqueda)
            movie = await fetchTMDBMovieDetail(tmdbId, tmdbType);
            if (movie) {
                // Verificar si existe localmente por si acaso (para usar nuestras fuentes si las hay)
                const localMatch = allMovies.find(m => m.tmdbId == tmdbId || (m.extraId && m.extraId == tmdbId));
                if (localMatch) {
                    movie.fuentes = localMatch.fuentes;
                    movie.temporadas = localMatch.temporadas;
                }
            }
        }

        if (movie) {
            // Si es una película de TMDB y no tiene fuentes locales, intentar usar provider externo
            if (!movie.fuentes && !movie.temporadas && movie.esTmdb) {
                const fallbackUrl = movie.tipo === 'serie'
                    ? `https://vidsrc.to/embed/tv/${tmdbId}`
                    : `https://vidsrc.to/embed/movie/${tmdbId}`;

                movie.fuentes = [
                    {
                        idioma: 'Inglés/Sub',
                        calidad: 'HD',
                        url: fallbackUrl,
                        isExternal: true
                    }
                ];
            }

            const reportButton = document.getElementById('report-button');
            if (reportButton) {
                reportButton.dataset.movieId = movie.id;
                reportButton.addEventListener('click', () => reportContent(movie.id, movie.titulo));
            }

            // --- NUEVO: Lógica de Favoritos usando dataManager ---
            const favoriteBtn = document.getElementById('detail-favorite-btn');
            if (favoriteBtn && window.dataManager) {
                updateFavoriteButtonState(movie.id, favoriteBtn);
                favoriteBtn.addEventListener('click', () => toggleFavorite(movie.id, favoriteBtn));
            }

            // --- NUEVO: Incrementar contador de vistas ---
            if (window.dataManager) {
                let viewCounts = window.dataManager.getViewCounts();
                viewCounts[movie.id] = (viewCounts[movie.id] || 0) + 1;
                window.dataManager.saveViewCounts(viewCounts);

                // --- NUEVO: Agregar a "Seguir Viendo" automáticamente ---
                let continueWatching = window.dataManager.getContinueWatching();
                if (!continueWatching[movie.id]) {
                    continueWatching[movie.id] = {
                        id: movie.id,
                        type: movie.tipo || 'pelicula',
                        currentTime: 0,
                        duration: 0,
                        lastWatched: new Date().toISOString(),
                        isTmdb: movie.esTmdb || false
                    };
                    window.dataManager.saveContinueWatching(continueWatching);
                } else {
                    continueWatching[movie.id].lastWatched = new Date().toISOString();
                    window.dataManager.saveContinueWatching(continueWatching);
                }
            }

            displayMovieDetails(movie);
            setupTrailerButton(movie);
            setupShareButton(movie);
            setupStarRating(movie.id);
            updateCanonicalUrl(movie.id);
            setupReviews(movie.id); // Initialize reviews
            setupPlayerToolbar();
        } else {
            // No se encontró la película
            document.getElementById('detail-title').textContent = "Contenido No Encontrado";
            document.getElementById('detail-description').textContent = "Lo sentimos, no pudimos encontrar el contenido solicitado.";
        }
    } catch (error) {
        console.error("Error al cargar los datos de la película:", error);
        document.getElementById('detail-title').textContent = "Error al cargar";
        document.getElementById('detail-description').textContent = "No se pudieron cargar los datos. Por favor, intenta recargar la página.";
    }

    // Configurar el botón de volver después de cargar todo
    setupBackButton();
}

// --- NUEVO: Función para obtener detalles de TMDB ---
async function fetchTMDBMovieDetail(id, type) {
    const API_KEY = '9869fab7c867e72214c8628c6029ec74';
    const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${API_KEY}&language=es-ES&append_to_response=videos,credits`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data || data.success === false) return null;

        return {
            id: `tmdb-${data.id}`,
            tmdbId: data.id,
            titulo: data.title || data.name,
            descripcion: data.overview || "Sin descripción disponible.",
            poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : 'https://via.placeholder.com/300x450/333333/ffffff?text=No+Image',
            backdrop: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null,
            año: (data.release_date || data.first_air_date || '').split('-')[0] || 'N/A',
            duracion: data.runtime ? `${data.runtime} min` : (data.episode_run_time && data.episode_run_time[0] ? `${data.episode_run_time[0]} min` : 'N/A'),
            calificacion: data.vote_average,
            votos: data.vote_count,
            genero: data.genres ? data.genres.map(g => g.name).join(', ') : 'N/A',
            tipo: type === 'tv' ? 'serie' : 'pelicula',
            reparto: data.credits?.cast?.slice(0, 10).map(c => c.name) || [],
            trailer: data.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube')?.key,
            esTmdb: true
        };
    } catch (error) {
        console.error("Error fetching TMDB detail:", error);
        return null;
    }
}
/**
 * NUEVO: Actualiza la etiqueta canónica de la página.
 * @param {string} movieId - El ID de la película/serie.
 */
function updateCanonicalUrl(movieId) {
    const canonicalTag = document.querySelector('link[rel="canonical"]');
    if (canonicalTag) {
        canonicalTag.setAttribute('href', `https://pelixplus.netlify.app/detalles.html?id=${movieId}`);
    }
}



// CORRECCIÓN: Esperar al evento 'app-ready' de script.js para asegurar
// que todas las funciones y datos globales (como normalizeText) estén listos.
document.addEventListener('app-ready', () => {
    console.log("Evento 'app-ready' recibido en detalle.js. Inicializando...");
    initDetalle();
});

// --- NUEVO: Event listener para el botón de cerrar en modo cine ---
document.addEventListener('keydown', (e) => {
    // Si se presiona 'Escape' y el modo cine está activo, se desactiva.
    if (e.key === 'Escape' && document.body.classList.contains('theater-mode-active')) {
        document.body.classList.remove('theater-mode-active');
        const theaterModeBtn = document.getElementById('theater-mode-btn');
        if (theaterModeBtn) {
            const buttonText = theaterModeBtn.querySelector('span');
            if (buttonText) {
                buttonText.textContent = 'Modo Cine';
            }
            theaterModeBtn.title = 'Activar Modo Cine';
        }
    }
});

// --- NUEVO: Funciones para gestionar favoritos usando dataManager ---
function getFavorites() {
    return window.dataManager ? window.dataManager.getFavorites() : [];
}

function saveFavorites(favorites) {
    if (window.dataManager) {
        window.dataManager.saveFavorites(favorites);
        console.log('💾 Favoritos guardados:', favorites);
    }
}

function toggleFavorite(movieId, buttonElement) {
    if (!window.dataManager) {
        console.error('❌ dataManager no disponible');
        showToast('Error: No se pudo guardar en favoritos', 'error');
        return;
    }

    let favorites = getFavorites();
    const isFavorited = favorites.includes(movieId);

    if (isFavorited) {
        // Quitar de favoritos
        favorites = favorites.filter(id => id !== movieId);
        console.log('💔 Quitado de favoritos:', movieId);
        showToast('Quitado de favoritos', 'success');
    } else {
        // Agregar a favoritos
        favorites.push(movieId);
        console.log('❤️ Agregado a favoritos:', movieId);
        showToast('Agregado a favoritos', 'success');
    }

    saveFavorites(favorites);
    updateFavoriteButtonState(movieId, buttonElement);
}

function updateFavoriteButtonState(movieId, buttonElement) {
    if (!buttonElement) {
        console.warn('⚠️ Botón de favoritos no encontrado');
        return;
    }

    const isFavorited = getFavorites().includes(movieId);

    // Actualizar el ícono
    const icon = buttonElement.querySelector('i');
    if (icon) {
        if (isFavorited) {
            icon.classList.remove('far'); // Corazón vacío
            icon.classList.add('fas');    // Corazón lleno
        } else {
            icon.classList.remove('fas'); // Corazón lleno
            icon.classList.add('far');    // Corazón vacío
        }
    }

    // Actualizar clase del botón para estilos CSS
    buttonElement.classList.toggle('favorited', isFavorited);

    // Actualizar título del botón
    buttonElement.title = isFavorited ? "Quitar de Favoritos" : "Añadir a Favoritos";

    // Log para depuración
    console.log(`${isFavorited ? '❤️' : '🤍'} Estado de favorito actualizado:`, movieId, isFavorited);
}

/**
 * Muestra los detalles de una película o serie en la página.
 * @param {object} movie - El objeto de la película/serie a mostrar.
 */
function displayMovieDetails(movie) {
    document.title = `${movie.titulo} - pelixplus`;

    // Elementos del DOM
    const backdropContainer = document.getElementById('detail-backdrop');
    const posterImgEl = document.getElementById('detail-poster-img');
    const titleEl = document.getElementById('detail-title');
    const metaEl = document.getElementById('detail-meta');
    const genresEl = document.getElementById('detail-genres');
    const platformsEl = document.getElementById('detail-platforms'); // NUEVO: Contenedor de plataformas
    const descriptionEl = document.getElementById('detail-description');
    const castGridEl = document.getElementById('detail-cast');
    const playerContainer = document.getElementById('detail-poster-container');
    const seasonsContainer = document.getElementById('detail-seasons-container');
    const sourceButtonsContainer = document.getElementById('detail-source-buttons'); // Mantener esta línea

    // Resetear vistas principales
    playerContainer.innerHTML = '<p>Selecciona una fuente para reproducir.</p>';
    seasonsContainer.style.display = 'none';
    sourceButtonsContainer.innerHTML = '';

    // Rellenar la sección de la portada
    backdropContainer.style.backgroundImage = `url('${movie.backdrop_path || movie.poster}')`;
    posterImgEl.src = movie.poster;
    posterImgEl.alt = `Póster de ${movie.titulo}`;

    // Rellenar información básica
    titleEl.textContent = movie.titulo;
    descriptionEl.textContent = movie.descripcion || 'Descripción no disponible.';

    let metaHTML = `<span>${movie.año || 'N/A'}</span>`;
    if (movie.calificacion) {
        metaHTML += `<span><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg> ${movie.calificacion.toFixed(1)}</span>`;
    }
    // NUEVO: Añadir duración y director si existen
    if (movie.duracion) {
        metaHTML += `<span>${movie.duracion}</span>`;
    }
    if (movie.director) {
        metaHTML += `<span>Director: ${movie.director}</span>`;
    }
    metaEl.innerHTML = metaHTML;

    // --- NUEVO: Lógica mejorada para rellenar géneros con clases de color ---
    genresEl.innerHTML = '';
    if (Array.isArray(movie.genero)) {
        movie.genero.forEach(genre => {
            const genreSlug = normalizeText(genre).replace(/\s+/g, '-');
            const pill = document.createElement('span');
            // Usamos las clases de `estilos.css` para los colores
            pill.className = `card-tag tag-genero tag-${genreSlug}`;
            pill.textContent = genre;
            genresEl.appendChild(pill);
        });
    }

    // --- NUEVO: Lógica para rellenar plataformas con clases de color ---
    if (platformsEl) {
        platformsEl.innerHTML = '';
        const plataforma = movie.plataforma;
        if (plataforma) {
            // Normalizar el nombre de la plataforma para que coincida con la clase CSS
            const plataformaSlug = normalizeText(plataforma)
                .replace(/\+/g, '-') // Reemplaza '+' con '-'
                .replace(/[^a-z0-9-]/g, ''); // Limpia caracteres especiales

            const pill = document.createElement('span');
            pill.className = `card-tag tag-plataforma tag-${plataformaSlug}`;
            pill.textContent = plataforma;
            platformsEl.appendChild(pill);
            platformsEl.parentElement.style.display = 'block';
        } else {
            platformsEl.parentElement.style.display = 'none';
        }
    }

    // Lógica para películas
    if (movie.tipo === 'pelicula' && movie.fuentes) {
        hideEpisodeNavigation(); // Ocultamos los botones si es una película
        movie.fuentes.forEach((source, index) => {
            const button = document.createElement('button');
            const externalBadge = source.isExternal ? '<span class="external-source-badge">Externo</span>' : '';
            button.innerHTML = `<span class="flag-icon">${getFlagForLanguage(source.idioma)}</span> ${source.idioma || 'Desconocido'}${externalBadge}`;
            button.className = 'source-btn';
            button.dataset.idioma = (source.idioma || 'desconocido').toLowerCase();
            if (index === 0) { button.classList.add('active'); }

            button.onclick = () => {
                document.querySelectorAll('.source-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                playSource(source, movie.poster);
            };
            sourceButtonsContainer.appendChild(button);
        });
        // Reproducir la primera fuente por defecto
        if (movie.fuentes.length > 0) {
            const preferredLang = localStorage.getItem('settings_preferred_lang') || 'any';
            let buttonToClick = sourceButtonsContainer.querySelector('.source-btn'); // Fallback al primero

            if (preferredLang !== 'any') {
                const preferredButton = sourceButtonsContainer.querySelector(`.source-btn[data-idioma*="${preferredLang}"]`);
                if (preferredButton) {
                    buttonToClick = preferredButton;
                }
            }
            if (buttonToClick) {
                buttonToClick.click();
            }
        } else {
            // Si no hay fuentes para una película, mostrar el mensaje de "no video"
            playerContainer.innerHTML = `
                <div class="no-video-message">
                    <p>¡Ups! Parece que este contenido aún no tiene un video disponible.</p>
                    <p>Estamos trabajando para añadirlo. ¡Ten paciencia, pronto estará aquí!</p>
                </div>
            `;
        }

        // --- NUEVO: Lógica para la pestaña de Descargas ---
        const downloadTabButton = document.querySelector('[data-tab="download-tab"]');
        const downloadLinksContainer = document.getElementById('download-links-container'); // CORRECCIÓN: El ID en el HTML es 'download-links-container'

        if (downloadTabButton && downloadLinksContainer && Array.isArray(movie.descargas) && movie.descargas.length > 0) {
            downloadTabButton.style.display = 'flex'; // Mostrar la pestaña de descarga
            downloadLinksContainer.innerHTML = ''; // Limpiar contenedor

            movie.descargas.forEach((descarga, index) => {
                const downloadButton = document.createElement('a'); // Usamos un enlace para la descarga
                downloadButton.className = 'download-button';
                downloadButton.href = descarga.url; // El enlace apunta directamente a la URL de descarga
                downloadButton.target = '_blank'; // Abrir en una nueva pestaña como respaldo si la descarga no inicia
                const fileName = `${movie.titulo.trim()} (${descarga.calidad || 'HD'}).mp4`;
                downloadButton.setAttribute('download', fileName); // Atributo clave para forzar la descarga

                // Estructura interna del botón para un mejor estilo
                const infoDiv = document.createElement('div');
                infoDiv.className = 'download-info';

                const titleSpan = document.createElement('span');
                titleSpan.className = 'download-title';
                titleSpan.textContent = `Opción de Descarga ${index + 1}`;

                const metaSpan = document.createElement('span');
                metaSpan.className = 'download-meta';
                metaSpan.textContent = `${descarga.calidad || 'HD'} • ${descarga.idioma || 'Latino'} • Servidor: ${descarga.servidor || 'Directo'}`;

                infoDiv.appendChild(titleSpan);
                infoDiv.appendChild(metaSpan);
                downloadButton.appendChild(infoDiv);
                downloadButton.insertAdjacentHTML('beforeend', '<span class="download-icon">📥</span>');

                downloadLinksContainer.appendChild(downloadButton);
            });
        }
    }

    // Lógica para series
    if (movie.tipo === 'serie' && movie.temporadas) {
        showEpisodeNavigation(movie); // ¡CLAVE! Mostramos los botones si es una serie.
        displaySeasons(movie);
    }

    // --- NUEVO: Lógica mejorada para el reparto ---
    const castTab = document.querySelector('[data-tab="cast-tab"]'); // Botón de la pestaña
    const TMDB_API_KEY = '9869fab7c867e72214c8628c6029ec74'; // Tu clave de API

    // Función para obtener el reparto desde TMDB
    const fetchCast = async (movieId, mediaType) => {
        if (!movieId) return null;
        const url = `https://api.themoviedb.org/3/${mediaType}/${movieId}/credits?api_key=${TMDB_API_KEY}&language=es-ES`;
        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            const credits = await response.json();
            return credits.cast;
        } catch (error) {
            console.error("Error al obtener el reparto de TMDB:", error);
            return null;
        }
    };

    // Llenar la sección de reparto
    const populateCast = async () => {
        if (Array.isArray(movie.reparto) && movie.reparto.length > 0 && typeof movie.reparto[0] === 'object' && movie.reparto[0].profile_path) {
            finalCast = movie.reparto;
        } else {
            // 2. Si no, intentar obtenerlos desde TMDB.
            const castData = await fetchCast(movie.tmdb_id, movie.tipo);
            // 3. Como fallback, usar la lista de nombres si existe.
            finalCast = castData || (Array.isArray(movie.reparto) ? movie.reparto.map(name => ({ name: (typeof name === 'string' ? name : 'Desconocido'), profile_path: null })) : []);
        }

        if (finalCast.length > 0) {
            finalCast.slice(0, 12).forEach(actor => { // Limitar a 12 actores para no sobrecargar
                const actorCard = document.createElement('div');
                actorCard.className = 'cast-card';
                const actorImage = actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : `https://ui-avatars.com/api/?name=${actor.name.replace(/\s/g, "+")}&background=2a2e3c&color=fff&size=185`;
                actorCard.innerHTML = `
                    <img src="${actorImage}" alt="Foto de ${actor.name}" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${actor.name.replace(/\s/g, "+")}&background=2a2e3c&color=fff&size=185';">
                    <div class="cast-name">${actor.name}</div>
                    ${actor.character ? `<div class="cast-character">${actor.character}</div>` : ''}
                `;
                castGridEl.appendChild(actorCard);
            });
            castTab.style.display = 'flex';
        } else {
            castTab.style.display = 'none';
        }
    };

    if (castGridEl && castTab) {
        populateCast();
    } else {
        if (castTab) castTab.style.display = 'none';
    }

    // --- NUEVO: Rating Tiempo Real ---
    // 1. Mostrar lo que tengamos inmediatamente
    if (movie.calificacion) {
        updateRatingUI(movie.calificacion, movie.votos);
    }

    // 2. Si es contenido local (no viene de una búsqueda directa a TMDB reciente),
    // intentamos buscar el rating actualizado en segundo plano.
    const tmdbIdForRating = movie.tmdbId || movie.tmdb_id || movie.extraId || (movie.esTmdb ? movie.id.replace('tmdb-', '') : null);

    // Solo hacemos fetch si NO es un objeto ya traído fresco de TMDB (movie.esTmdb true implica fresco en este contexto específico de carga)
    // O si queremos asegurar 100% que sea real-time, lo hacemos siempre.
    // El usuario pidió "tiempo real". Para local movies es OBLIGATORIO. Para "esTmdb", ya es bastante fresco (segundos), 
    // pero si el usuario navega mucho tiempo, no cambia. Asumimos que "esTmdb" es suficientemente fresco.
    if (!movie.esTmdb && tmdbIdForRating) {
        fetchRealTimeRating(tmdbIdForRating, movie.tipo || 'movie');
    } else if (movie.esTmdb && movie.calificacion) {
        // Ya tenemos datos frescos
        updateRatingUI(movie.calificacion, movie.votos);
    }

    // Recomendaciones
    displayRecommendations(movie);

    // --- NUEVO: Inicializar la funcionalidad de las pestañas ---
    setupTabs();
}

/**
 * NUEVO: Configura el botón para ver el tráiler.
 * @param {object} movie - El objeto de la película/serie.
 */
function setupTrailerButton(movie) {
    const trailerBtn = document.getElementById('play-trailer-btn');
    const modal = document.getElementById('trailer-modal');
    const closeModalBtn = document.getElementById('close-trailer-modal');
    const trailerContainer = document.getElementById('trailer-player-container');

    if (!trailerBtn || !modal || !closeModalBtn || !trailerContainer) return;

    // Mostrar el botón solo si hay una clave de tráiler
    if (movie.trailer_key) {
        trailerBtn.style.display = 'flex';

        trailerBtn.onclick = () => {
            // Construir el iframe de YouTube
            trailerContainer.innerHTML = `<iframe src="https://www.youtube.com/embed/${movie.trailer_key}?autoplay=1&rel=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Evitar scroll del fondo
        };

        const closeModal = () => {
            modal.style.display = 'none';
            trailerContainer.innerHTML = ''; // Detener el video eliminando el iframe
            document.body.style.overflow = ''; // Restaurar scroll
        };

        closeModalBtn.onclick = closeModal;
        // Cerrar el modal si se hace clic fuera del contenido
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });
    } else {
        trailerBtn.style.display = 'none';
    }
}

/**
 * NUEVO: Configura el botón de compartir.
 * @param {object} movie - El objeto de la película/serie.
 */
function setupShareButton(movie) {
    const shareBtn = document.getElementById('share-btn');
    if (!shareBtn) return;

    shareBtn.addEventListener('click', async () => {
        const shareData = {
            title: movie.titulo,
            text: `Echa un vistazo a "${movie.titulo}" en pelixplus.`,
            url: window.location.href
        };

        // Usar la API nativa de compartir si está disponible
        if (navigator.share) {
            try {
                await navigator.share(shareData);
                console.log('Contenido compartido con éxito.');
            } catch (err) {
                console.error('Error al compartir:', err);
            }
        } else {
            // Fallback para navegadores de escritorio: copiar al portapapeles
            navigator.clipboard.writeText(window.location.href).then(() => {
                showToast('¡Enlace copiado al portapapeles!');
            }).catch(err => {
                console.error('No se pudo copiar el enlace:', err);
                showToast('Error al copiar el enlace', 'error');
            });
        }
    });
}

/**
 * NUEVO: Muestra una notificación "toast" en la pantalla.
 * @param {string} message - El mensaje a mostrar.
 * @param {'success'|'error'} type - El tipo de toast (para el estilo).
 * @param {number} duration - Cuánto tiempo se muestra el toast en milisegundos.
 */
function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Forzar la animación de entrada
    setTimeout(() => {
        toast.classList.add('visible');
    }, 10);

    // Ocultar y eliminar el toast después de la duración
    setTimeout(() => {
        toast.classList.remove('visible');
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
}

/**
 * NUEVO: Configura el sistema de calificación por estrellas.
 * @param {string} movieId - El ID de la película/serie.
 */
function setupStarRating(movieId) {
    const ratingContainer = document.getElementById('user-star-rating');
    if (!ratingContainer) return;

    const stars = ratingContainer.querySelectorAll('.star');
    const storageKey = 'user_ratings';

    // Cargar la calificación guardada
    const loadRating = () => {
        const ratings = JSON.parse(localStorage.getItem(storageKey)) || {};
        const savedRating = ratings[movieId];
        if (savedRating) {
            updateStars(savedRating);
        }
    };

    // Actualizar la apariencia de las estrellas
    const updateStars = (ratingValue) => {
        stars.forEach(star => {
            star.classList.toggle('selected', star.dataset.value <= ratingValue);
        });
    };

    // Guardar la calificación
    const saveRating = (ratingValue) => {
        let ratings = JSON.parse(localStorage.getItem(storageKey)) || {};
        ratings[movieId] = ratingValue;
        localStorage.setItem(storageKey, JSON.stringify(ratings));
        updateStars(ratingValue);
    };

    // Eventos de hover
    stars.forEach(star => {
        star.addEventListener('mouseover', () => {
            const hoverValue = star.dataset.value;
            stars.forEach(s => s.classList.toggle('hovered', s.dataset.value <= hoverValue));
        });

        star.addEventListener('mouseout', () => {
            stars.forEach(s => s.classList.remove('hovered'));
        });

        star.addEventListener('click', () => {
            saveRating(star.dataset.value);
        });
    });

    loadRating();
}

/**
 * Muestra las temporadas y episodios de una serie.
 * @param {object} movie - El objeto de la serie.
 */
function displaySeasons(movie) {
    const seriesContainer = document.getElementById('detail-seasons-container');
    const desktopViewContainer = document.getElementById('desktop-episodes-view');
    if (!seriesContainer || !desktopViewContainer) return;

    // Mostrar siempre el contenedor de episodios
    seriesContainer.style.display = 'block';
    desktopViewContainer.innerHTML = `
        <div class="season-selector-header">
            <h3>Episodios</h3>
            <select id="season-selector-dropdown" class="season-selector-dropdown"></select>
        </div>
        <div id="episodes-list-cards" class="episodes-list-cards"></div>
    `;

    const seasonSelector = document.getElementById('season-selector-dropdown');
    const episodesListContainer = document.getElementById('episodes-list-cards');

    // Ordenar temporadas por número de temporada
    const sortedSeasons = movie.temporadas.sort((a, b) => (a.season || a.temporada) - (b.season || b.temporada));

    // Llenar el selector de temporadas
    sortedSeasons.forEach(season => {
        const seasonNumber = season.season || season.temporada;
        const option = document.createElement('option');
        option.value = seasonNumber;
        option.textContent = `Temporada ${seasonNumber}`;
        seasonSelector.appendChild(option);
    });

    // Función para renderizar los episodios de una temporada seleccionada
    function renderEpisodesForSeason(seasonNumber) {
        episodesListContainer.innerHTML = '';
        const seasonData = sortedSeasons.find(s => (s.season || s.temporada) == seasonNumber);
        if (!seasonData || !seasonData.episodios) return;

        // Ordenar episodios
        const sortedEpisodes = seasonData.episodios.sort((a, b) => a.episodio - b.episodio);

        sortedEpisodes.forEach(episode => {
            const episodeCard = document.createElement('div');
            episodeCard.className = 'episode-item'; // Clase estándar
            episodeCard.dataset.season = seasonNumber;
            episodeCard.dataset.episode = episode.episodio;
            episodeCard.dataset.url = episode.url;

            episodeCard.innerHTML = `
                <i class="fas fa-play-circle"></i>
                <span>Episodio ${episode.episodio}: ${episode.titulo || 'Episodio ' + episode.episodio}</span>
            `;

            episodeCard.addEventListener('click', () => {
                // Remover clase activa de otras tarjetas
                document.querySelectorAll('.episode-item').forEach(card => card.classList.remove('active'));
                // Añadir clase activa a la tarjeta clickeada
                episodeCard.classList.add('active');

                // Reproducir el video
                playSource({ url: episode.url, type: 'terabox' }, movie.poster);
                playSource({ url: episode.url, type: 'terabox' }, movie.poster, seasonNumber, episode.episodio);

                // Actualizar navegación de episodios
                updateEpisodeNavigationState(parseInt(seasonNumber), parseInt(episode.episodio));

                // Configurar el botón de "Saltar Intro" para este episodio
                setupSkipIntro(episode);

                // Desplazar la vista al reproductor
                document.getElementById('player-tab')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });

            // Lógica para el final del video
            const videoElement = document.getElementById('detail-video');
            if (videoElement) setupEndOfEpisodeAction(videoElement, movie);

            episodesListContainer.appendChild(episodeCard);
        });
    }

    // Evento para cambiar de temporada
    seasonSelector.addEventListener('change', (e) => {
        renderEpisodesForSeason(e.target.value);
    });

    // Cargar la primera temporada por defecto
    if (sortedSeasons.length > 0) {
        let seasonToLoad = sortedSeasons[0].season || sortedSeasons[0].temporada;

        // Verificar si hay progreso guardado para reanudar
        if (window.dataManager) {
            const savedData = window.dataManager.getContinueWatching()[movie.id];
            if (savedData && savedData.season) {
                // Verificar que la temporada guardada existe
                const savedSeasonExists = sortedSeasons.some(s => (s.season || s.temporada) == savedData.season);
                if (savedSeasonExists) {
                    seasonToLoad = savedData.season;
                }
            }
        }

        seasonSelector.value = seasonToLoad;
        renderEpisodesForSeason(seasonToLoad);

        // Buscar el episodio guardado o el primero
        let episodeToClick = episodesListContainer.querySelector('.episode-item');
        if (window.dataManager && window.dataManager.getContinueWatching()[movie.id]) {
            const savedData = window.dataManager.getContinueWatching()[movie.id];
            if (savedData && savedData.season == seasonToLoad && savedData.episode) {
                const savedCard = episodesListContainer.querySelector(`.episode-item[data-episode="${savedData.episode}"]`);
                if (savedCard) episodeToClick = savedCard;
            }
        }

        if (episodeToClick) {
            episodeToClick.click();
        }
        else {
            // Si no hay episodios en la primera temporada, mostrar el mensaje de "no video"
            const playerContainer = document.getElementById('detail-poster-container');
            playerContainer.innerHTML = `
                <div class="no-video-message">
                    <p>¡Ups! Parece que este contenido aún no tiene un video disponible.</p>
                    <p>Estamos trabajando para añadirlo. ¡Ten paciencia, pronto estará aquí!</p>
                </div>
            `;
        }
    } else {
        // Si no hay temporadas en absoluto, mostrar el mensaje de "no video"
        const playerContainer = document.getElementById('detail-poster-container');
        playerContainer.innerHTML = `
            <div class="no-video-message">
                <p>¡Ups! Parece que este contenido aún no tiene un video disponible.</p>
                <p>Estamos trabajando para añadirlo. ¡Ten paciencia, pronto estará aquí!</p>
            </div>
        `;
    }
}

/**
 * Configura la acción a realizar cuando un episodio termina.
 * @param {HTMLVideoElement} videoElement - El elemento de video.
 * @param {object} movieData - Los datos de la serie.
 */
function setupEndOfEpisodeAction(videoElement, movieData) {
    const overlay = document.getElementById('next-episode-overlay');
    const nextBtn = document.getElementById('play-next-episode-btn');
    if (!videoElement || !overlay || !nextBtn) return;

    const hideOverlay = () => {
        if (overlay.classList.contains('visible')) {
            overlay.classList.remove('visible');
        }
    };
    videoElement.onended = () => {
        // CORRECCIÓN: Se busca el siguiente episodio usando la información actual.
        const { season, episode } = currentEpisodeIdentifier;
        const { next } = findAdjacentEpisodes(season, episode);

        if (next) { // CORRECCIÓN: La variable correcta es 'next', no 'episodeButton'
            overlay.classList.add('visible');
            nextBtn.onclick = () => {
                hideOverlay();
                loadEpisode(next.season, next.episode);
            };
        }
    };

    videoElement.onplay = hideOverlay;
    videoElement.onpause = hideOverlay;
}

/**
 * NUEVO: Configura el botón de "Saltar Intro" para un episodio.
 * @param {object} episodeData - Los datos del episodio, que deben incluir `intro_start` y `intro_end`.
 */
function setupSkipIntro(episodeData) {
    const videoElement = document.getElementById('detail-video');
    const autoSkipEnabled = localStorage.getItem('settings_auto_skip_intro') === 'true';
    const skipContainer = document.getElementById('skip-intro-container');
    const skipBtn = document.getElementById('skip-intro-btn');

    if (!videoElement || !skipContainer || !skipBtn || !episodeData.intro_start || !episodeData.intro_end) {
        if (skipContainer) {
            skipContainer.classList.remove('visible');
        }
        return;
    }

    const { intro_start, intro_end } = episodeData;

    const timeUpdateHandler = () => {
        const currentTime = videoElement.currentTime;
        // Mostrar el botón si el tiempo actual está dentro del rango de la intro
        if (currentTime >= intro_start && currentTime < intro_end) {
            if (autoSkipEnabled) {
                skipIntroAction(); // Saltar automáticamente
            } else {
                skipContainer.classList.add('visible'); // Mostrar botón
            }
        } else {
            skipContainer.classList.remove('visible');
        }
    };

    const skipIntroAction = () => {
        videoElement.currentTime = intro_end;
        skipContainer.classList.remove('visible');
    };

    // Limpiar listeners anteriores para evitar duplicados
    videoElement.removeEventListener('timeupdate', videoElement._timeUpdateHandler);
    skipBtn.removeEventListener('click', skipBtn._skipIntroAction);

    // Asignar los nuevos listeners
    videoElement.addEventListener('timeupdate', timeUpdateHandler);
    skipBtn.addEventListener('click', skipIntroAction);

    // Guardar referencia a los handlers para poder limpiarlos después
    videoElement._timeUpdateHandler = timeUpdateHandler;
    skipBtn._skipIntroAction = skipIntroAction;
}


function updateProgress(pelicula, currentTime, duration, seasonNum = null, episodeNum = null) {
    // Fallback de seguridad: Si window.dataManager no está listo, intentar leer localStorage directamente
    let dataManager = window.dataManager;
    if (!dataManager) {
        try {
            const rawData = localStorage.getItem('peliXxUserData');
            if (rawData) {
                const data = JSON.parse(rawData);
                // Crear un mini-gestor temporal
                dataManager = {
                    getContinueWatching: () => data.continueWatching || {},
                    saveContinueWatching: (items) => {
                        data.continueWatching = items;
                        localStorage.setItem('peliXxUserData', JSON.stringify(data));
                    },
                    getViewHistory: () => data.viewHistory || [],
                    saveViewHistory: (history) => {
                        data.viewHistory = history;
                        localStorage.setItem('peliXxUserData', JSON.stringify(data));
                    }
                };
            }
        } catch (e) { console.error("Error en fallback de guardado", e); }
    }

    if (!pelicula || !pelicula.id || !currentTime || currentTime < 5 || !dataManager) return;

    // Save to continue watching
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

    // Also save to view history
    let viewHistory = dataManager.getViewHistory();
    // Remove if already exists to avoid duplicates
    viewHistory = viewHistory.filter(item => item.id !== pelicula.id);
    // Add to the beginning of the array (most recent first)
    viewHistory.unshift({
        id: pelicula.id,
        timestamp: new Date().toISOString()
    });
    // Keep only the last 20 items
    viewHistory = viewHistory.slice(0, 20);
    dataManager.saveViewHistory(viewHistory);
}

let saveProgressInterval;
let saveProgressHandler; // Variable para controlar el guardado al cerrar

function startSavingProgress(pelicula, videoElement, seasonNum = null, episodeNum = null) {
    if (saveProgressInterval) clearInterval(saveProgressInterval);

    // Limpiar el evento anterior para evitar duplicados o guardar episodios viejos
    if (saveProgressHandler) {
        window.removeEventListener('beforeunload', saveProgressHandler);
        window.removeEventListener('pagehide', saveProgressHandler);
        document.removeEventListener('visibilitychange', saveProgressHandler);
        if (videoElement) {
            videoElement.removeEventListener('timeupdate', saveProgressHandler);
            videoElement.removeEventListener('pause', saveProgressHandler);
        }
    }

    if (!videoElement) return;

    let lastSaveTime = 0;
    const SAVE_DELAY = 2000; // Guardar cada 2 segundos (muy frecuente para evitar pérdidas)

    // Función de guardado inteligente
    const performSave = (force = false) => {
        const now = Date.now();
        // Guardar si forzamos (pausa/cierre) O si ha pasado el tiempo suficiente
        if (force || (now - lastSaveTime > SAVE_DELAY)) {
            if (videoElement.currentTime > 5 && !videoElement.ended) {
                updateProgress(pelicula, videoElement.currentTime, videoElement.duration || 0, seasonNum, episodeNum);
                lastSaveTime = now;
            }
        }
    };

    // 1. Guardar continuamente mientras se reproduce (evento timeupdate)
    // Esto es lo más seguro para móviles: guarda mientras ves.
    const timeUpdateHandler = () => performSave(false);
    videoElement.addEventListener('timeupdate', timeUpdateHandler);

    // 2. Guardar inmediatamente al pausar
    const pauseHandler = () => performSave(true);
    videoElement.addEventListener('pause', pauseHandler);

    // 3. Guardar al intentar salir (backup)
    saveProgressHandler = () => {
        performSave(true);
    };

    window.addEventListener('beforeunload', saveProgressHandler);
    window.addEventListener('pagehide', saveProgressHandler); // Crucial para móviles
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            saveProgressHandler();
        }
    });

    // Guardar referencia en el elemento para poder limpiarlo externamente si hiciera falta
    videoElement._saveHandler = saveProgressHandler;
}

function playSource(source, posterUrl, seasonNum = null, episodeNum = null) {
    const posterContainer = document.getElementById('detail-poster-container');
    const resumePrompt = document.getElementById('resume-prompt');

    // Siempre ocultar el prompt al iniciar la carga de una nueva fuente
    if (resumePrompt) resumePrompt.classList.remove('visible');

    posterContainer.innerHTML = ''; // Limpiamos el contenedor para poner el video o iframe

    if (!source || !source.url) {
        posterContainer.innerHTML = `
            <div class="no-video-message">
                <p>¡Ups! Parece que este contenido aún no tiene un video disponible.</p>
                <p>Estamos trabajando para añadirlo. ¡Ten paciencia, pronto estará aquí!</p>
            </div>
        `;
        return; // Salir de la función si no hay una URL de fuente válida
    }

    /**
     * Determina si una URL corresponde a un archivo de video directo o a un iframe.
     * @param {string} url - La URL a verificar.
     * @returns {'video'|'iframe'}
     */
    const getSourceType = (url) => {
        if (!url) return 'iframe';
        const videoExtensions = ['.mp4', '.webm', '.m3u8'];
        try {
            const urlPath = new URL(url).pathname.toLowerCase();
            return videoExtensions.some(ext => urlPath.endsWith(ext)) ? 'video' : 'iframe';
        } catch (e) { // Si la URL es inválida, se asume que es un iframe
            return 'iframe';
        }
    };

    if (getSourceType(source.url) === 'iframe') {
        // CORRECCIÓN: Se verifica si el sistema de seguridad está activo antes de usarlo.
        // Si no lo está, se usa la función de fallback que crea un iframe normal.
        if (window.schoolSecurity && typeof window.schoolSecurity.createProtectedIframe === 'function') {
            window.schoolSecurity.createProtectedIframe('detail-poster-container', source.url);
        } else {
            console.error("La función createProtectedIframe no está disponible.");
            // --- INICIO DE LA CORRECCIÓN ---
            // Fallback: Crear un iframe estándar si la función de seguridad no existe.
            const iframe = document.createElement('iframe');
            iframe.src = source.url;
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('allowfullscreen', 'true');
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            posterContainer.appendChild(iframe);
            // --- FIN DE LA CORRECCIÓN ---
        }
    } else { // 'video' o tipo no especificado
        const videoPlayer = document.createElement('video');
        videoPlayer.id = 'detail-video';
        videoPlayer.controls = true;
        videoPlayer.setAttribute('playsinline', ''); // Mejora la reproducción en móviles
        videoPlayer.src = source.url;
        videoPlayer.poster = posterUrl;
        posterContainer.appendChild(videoPlayer);

        // Obtener ID y datos para reanudar
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('id');
        const tmdbId = urlParams.get('tmdb');
        let movieId = urlId || (tmdbId ? `tmdb-${tmdbId}` : null);

        // Intentar buscar objeto completo, si no, crear referencia mínima
        let movie = window.peliculas ? window.peliculas.find(m => String(m.id) === String(urlId)) : null;
        if (!movie && movieId) movie = { id: movieId, tipo: seasonNum ? 'serie' : 'pelicula' };
        if (movie && !movie.tipo) movie.tipo = seasonNum ? 'serie' : 'pelicula';

        if (movie && window.dataManager) {
            videoPlayer.addEventListener('loadedmetadata', () => {
                // El prompt ya está en el HTML, solo lo controlamos
                const continueWatchingData = window.dataManager.getContinueWatching()[movie.id];

                let shouldShowPrompt = false;
                let resumeTime = 0;

                // Mostrar prompt si se ha visto más de 10s y menos del 95%
                if (continueWatchingData && continueWatchingData.currentTime > 10) {
                    const progress = continueWatchingData.duration ? (continueWatchingData.currentTime / continueWatchingData.duration) : 0;
                    if (progress < 0.95) {
                        // Validar que sea película o el episodio correcto de una serie
                        if (movie.tipo !== 'serie' || (continueWatchingData.season == seasonNum && continueWatchingData.episode == episodeNum)) {
                            shouldShowPrompt = true;
                            resumeTime = continueWatchingData.currentTime;
                        }
                    }
                }

                if (shouldShowPrompt && resumePrompt) {
                    const resumeBtn = document.getElementById('resume-btn');
                    const restartBtn = document.getElementById('restart-btn');
                    const resumeText = document.getElementById('resume-text');

                    const minutes = Math.floor(resumeTime / 60);
                    const seconds = Math.floor(resumeTime % 60);
                    resumeText.textContent = `¿Quieres continuar desde ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}?`;

                    resumePrompt.classList.add('visible');

                    resumeBtn.onclick = () => {
                        videoPlayer.currentTime = resumeTime;
                        resumePrompt.classList.remove('visible');
                        videoPlayer.play();
                    };
                    restartBtn.onclick = () => {
                        videoPlayer.currentTime = 0;
                        resumePrompt.classList.remove('visible');
                        videoPlayer.play();
                    };
                } else {
                    videoPlayer.play();
                }
            });
            startSavingProgress(movie, videoPlayer, seasonNum, episodeNum);
        }

        // --- NUEVO: Iniciar lógica de Ambilight para el video ---
        setupAmbientLight(videoPlayer, posterContainer);

        // --- NUEVO: Configurar atajos de teclado y botón PiP ---
        setupPlayerShortcuts(videoPlayer);
        setupPipButton(videoPlayer);



        // Lógica para el final del video
        if (movie.tipo === 'serie') setupEndOfEpisodeAction(videoPlayer, movie);
    }
}

/**
 * Configura el efecto de luz ambiental (Ambilight) para un elemento de video.
 * @param {HTMLVideoElement} videoElement - El elemento de video.
 * @param {HTMLElement} container - El contenedor del video donde se aplicará el efecto.
 * @returns {void}
 */
function setupAmbientLight(videoElement, container) {
    // Leer preferencia del usuario. Por defecto, está activado.
    const ambilightEnabled = localStorage.getItem('settings_ambilight') !== 'false';

    if (!ambilightEnabled || !videoElement || !container) {
        // Si está desactivado, asegurarse de que no haya sombra residual
        if (container) container.style.boxShadow = 'none';
        return;
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    const setCanvasDimensions = () => {
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
    };

    videoElement.addEventListener('loadeddata', setCanvasDimensions);
    videoElement.addEventListener('resize', setCanvasDimensions);

    function updateAmbientLight() {
        // El efecto solo se ejecuta si el video está reproduciéndose y el modo cine está activo.
        if (videoElement.paused || videoElement.ended || !document.body.classList.contains('theater-mode-active')) {
            container.style.boxShadow = 'none';
            // Si el video sigue corriendo pero el modo cine se desactivó, sigue verificando.
            if (!videoElement.paused && !videoElement.ended) requestAnimationFrame(updateAmbientLight);
            return;
        }

        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let r = 0, g = 0, b = 0;

        // Usamos un salto (sampleSize) para no analizar cada píxel y mejorar el rendimiento.
        const sampleSize = 20;
        for (let i = 0; i < data.length; i += 4 * sampleSize) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
        }
        const count = data.length / (4 * sampleSize);
        const avgColor = `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;

        container.style.boxShadow = `0 0 120px 50px ${avgColor}`;
        requestAnimationFrame(updateAmbientLight);
    }

    videoElement.addEventListener('play', updateAmbientLight);
}

/**
 * NUEVO: Configura los atajos de teclado para el reproductor de video.
 * @param {HTMLVideoElement} videoElement - El elemento de video.
 */
function setupPlayerShortcuts(videoElement) {
    if (!videoElement) return;

    // Limpiar listener anterior si existe
    if (document._playerKeydownHandler) {
        document.removeEventListener('keydown', document._playerKeydownHandler);
    }

    const keydownHandler = (e) => {
        // Solo actuar si el video está en la vista y no estamos escribiendo en un input
        const isInputFocused = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
        if (isInputFocused) return;

        // Solo aplicar atajos si el video está visible en la pantalla
        const videoRect = videoElement.getBoundingClientRect();
        if (videoRect.bottom < 0 || videoRect.top > window.innerHeight) return;

        // Prevenir el comportamiento por defecto de las teclas que usamos
        const key = e.key.toLowerCase();
        if ([' ', 'f', 'm'].includes(key) || key.startsWith('arrow')) {
            e.preventDefault();
        }

        switch (key) {
            case ' ': // Barra espaciadora para Play/Pause
                videoElement.paused ? videoElement.play() : videoElement.pause();
                break;
            case 'f': // 'F' para pantalla completa
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                } else {
                    videoElement.requestFullscreen().catch(err => console.error(err));
                }
                break;
            case 'm': // 'M' para Mute/Unmute
                videoElement.muted = !videoElement.muted;
                break;
            case 'arrowright': // Flecha derecha para adelantar 5s
                videoElement.currentTime += 5;
                break;
            case 'arrowleft': // Flecha izquierda para retroceder 5s
                videoElement.currentTime -= 5;
                break;
            case 'arrowup': // Flecha arriba para subir volumen
                if (videoElement.volume < 1) videoElement.volume = Math.min(1, videoElement.volume + 0.1);
                break;
            case 'arrowdown': // Flecha abajo para bajar volumen
                if (videoElement.volume > 0) videoElement.volume = Math.max(0, videoElement.volume - 0.1);
                break;
        }
    };

    document.addEventListener('keydown', keydownHandler);
    document._playerKeydownHandler = keydownHandler; // Guardar referencia para poder limpiarlo
}

/**
 * NUEVO: Configura el botón de Picture-in-Picture (PiP).
 * @param {HTMLVideoElement} videoElement - El elemento de video.
 */
function setupPipButton(videoElement) {
    const pipBtn = document.getElementById('pip-btn');
    if (!pipBtn || !videoElement) return;

    // Mostrar el botón solo si la API de PiP está disponible
    if ('pictureInPictureEnabled' in document && document.pictureInPictureEnabled) {
        pipBtn.style.display = 'flex';

        pipBtn.addEventListener('click', async () => {
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else {
                    await videoElement.requestPictureInPicture();
                }
            } catch (error) {
                console.error('Error al gestionar el modo Picture-in-Picture:', error);
            }
        });
    } else {
        pipBtn.style.display = 'none';
    }
}

function displayRecommendations(currentMovie) {
    const recommendationsGrid = document.getElementById('recommendations-grid');
    if (!recommendationsGrid) return;
    recommendationsGrid.innerHTML = '';
    // Unused in grid layout: const recommendationsSection = recommendationsGrid.closest('.detail-recommendations-section');

    const currentGenres = Array.isArray(currentMovie.genero) ? currentMovie.genero : [currentMovie.genero];
    const recommendations = peliculas.filter(movie => {
        if (movie.id === currentMovie.id) return false;
        const movieGenres = Array.isArray(movie.genero) ? movie.genero : [movie.genero];
        const commonGenres = movieGenres.filter(g => currentGenres.includes(g));
        return commonGenres.length > 0;
    }).slice(0, 12);

    if (recommendations.length > 0) {
        recommendations.forEach(movie => {
            // Use global createMovieCard if available
            let movieCard;
            if (window.createMovieCard) {
                movieCard = window.createMovieCard(movie);
            } else {
                movieCard = createLocalMovieCard(movie);
                movieCard.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.location.href = `detalles.html?id=${movie.id}`;
                });
            }
            recommendationsGrid.appendChild(movieCard);
        });
        
        // Initialize carousel controls for recommendations
        setupCarruselControls('#recommendations-carousel');
    } else {
        recommendationsGrid.innerHTML = '<p class="no-content-message" style="grid-column: 1/-1; text-align: center; color: #888;">No hay recomendaciones disponibles para este título.</p>';
    }
}

function createLocalMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.innerHTML = `
        <img src="${movie.poster}" alt="${movie.titulo}" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='https://via.placeholder.com/180x270?text=No+Image';">
        <div class="movie-card-info">
            <h3>${movie.titulo}</h3>
        </div>
    `;
    return card;
}

function getFlagForLanguage(idioma) {
    if (!idioma) return '🌐';
    const lang = idioma.toLowerCase();

    if (lang.includes('español') || lang.includes('castellano')) return `<img src="español.png" alt="Bandera de España" class="flag-img">`;
    if (lang.includes('latino') || lang.includes('mexico')) return `<img src="latino.png" alt="Bandera de México" class="flag-img">`;
    if (lang.includes('subtitulado')) return `<img src="subtitulado.png" alt="Bandera de USA" class="flag-img">`;
    return '🌐';
}

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn'); // Updated selector
    const tabContents = document.querySelectorAll('.tab-content'); // Updated selector

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            const activeContent = document.getElementById(tabId);
            if (activeContent) {
                activeContent.classList.add('active');
            }
        });
    });
}

// Carousel controls - largely unused in grid layout but kept for compatibility
function setupCarruselControls(carruselSelector) {
    const carrusel = document.querySelector(carruselSelector);
    if (!carrusel) return;
    const grid = carrusel.querySelector('.movie-grid');
    const prevBtn = carrusel.querySelector('.carrusel-flecha.izquierda');
    const nextBtn = carrusel.querySelector('.carrusel-flecha.derecha');

    if (!grid || !prevBtn || !nextBtn) return;

    const scrollAmount = grid.clientWidth * 0.8;

    prevBtn.addEventListener('click', () => {
        grid.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', () => {
        grid.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });

    function updateArrowVisibility() {
        const maxScrollLeft = grid.scrollWidth - grid.clientWidth;
        const hasScroll = grid.scrollWidth > grid.clientWidth;
        prevBtn.style.display = hasScroll && grid.scrollLeft > 10 ? 'flex' : 'none';
        nextBtn.style.display = hasScroll && grid.scrollLeft < maxScrollLeft - 10 ? 'flex' : 'none';
    }

    grid.addEventListener('scroll', updateArrowVisibility);
    window.addEventListener('resize', updateArrowVisibility);
    setTimeout(updateArrowVisibility, 500);
}

/**
 * Configura la barra de herramientas del reproductor (Fullscreen, Theater, PiP).
 */
function setupPlayerToolbar() {
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const theaterModeBtn = document.getElementById('theater-mode-btn');
    const pipBtn = document.getElementById('pip-btn');
    const playerContainer = document.getElementById('detail-poster-container');

    if (!playerContainer) return;

    // --- Pantalla Completa ---
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            if (document.fullscreenElement) {
                document.exitFullscreen();
                playerContainer.classList.remove('fullscreen-active');
            } else {
                // Intentar pantalla completa nativa
                if (playerContainer.requestFullscreen) {
                    playerContainer.requestFullscreen().catch(() => {
                        // Fallback: Pantalla completa simulada (útil en móviles)
                        playerContainer.classList.add('fullscreen-active');
                    });
                } else {
                    // Fallback directo
                    playerContainer.classList.toggle('fullscreen-active');
                }
            }
        });

        // Escuchar cambios de pantalla completa para limpiar clases si se sale con ESC
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
                playerContainer.classList.remove('fullscreen-active');
            }
        });
    }

    // --- Modo Cine ---
    if (theaterModeBtn) {
        theaterModeBtn.addEventListener('click', () => {
            document.body.classList.toggle('theater-mode-active');
            const isActive = document.body.classList.contains('theater-mode-active');
            const buttonText = theaterModeBtn.querySelector('span');
            if (buttonText) {
                buttonText.textContent = isActive ? 'Salir de Modo Cine' : 'Modo Cine';
            }
            theaterModeBtn.title = isActive ? 'Desactivar Modo Cine' : 'Activar Modo Cine';

            // Si activamos modo cine, desplazamos al reproductor
            if (isActive) {
                playerContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

    // --- Picture in Picture (PiP) ---
    if (pipBtn) {
        const checkPip = () => {
            const video = playerContainer.querySelector('video');
            if (video && document.pictureInPictureEnabled) {
                pipBtn.style.display = 'flex';
            } else {
                pipBtn.style.display = 'none';
            }
        };

        // El PiP solo funciona con video tracks reales (no iframes)
        setInterval(checkPip, 2000);

        pipBtn.addEventListener('click', async () => {
            const video = playerContainer.querySelector('video');
            if (!video) return;

            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else {
                    await video.requestPictureInPicture();
                }
            } catch (error) {
                console.error('Error PiP:', error);
            }
        });
    }
}

// --- NUEVO: Funciones para el Rating en Tiempo Real ---

/**
 * Actualiza la interfaz del rating (estrellas y textos).
 * @param {number} voteAverage - Calificación (0-10).
 * @param {number} voteCount - Cantidad de votos.
 */
function updateRatingUI(voteAverage, voteCount) {
    const starsForeground = document.getElementById('api-stars-foreground');
    const scoreEl = document.getElementById('api-rating-score');
    const votesEl = document.getElementById('api-rating-votes');

    if (!starsForeground || !scoreEl) return;

    const rating = parseFloat(voteAverage) || 0;
    const votes = parseInt(voteCount) || 0;

    // Calcular ancho de las estrellas (rating sobre 10)
    const percentage = (rating / 10) * 100;
    starsForeground.style.width = `${percentage}%`;

    scoreEl.textContent = rating.toFixed(1);

    if (votesEl) {
        votesEl.textContent = `(${votes} votos)`;
    }
}

/**
 * Obtiene el rating en tiempo real desde TMDB y actualiza la UI.
 * @param {string|number} tmdbId - ID de TMDB.
 * @param {string} type - 'movie', 'serie', 'tv'.
 */
async function fetchRealTimeRating(tmdbId, type) {
    if (!tmdbId) return;

    // Ajustar tipo 'serie' -> 'tv' para la API
    const apiType = (type === 'serie' || type === 'series') ? 'tv' : 'movie';
    const API_KEY = '9869fab7c867e72214c8628c6029ec74'; // Misma key que en el resto del archivo

    const url = `https://api.themoviedb.org/3/${apiType}/${tmdbId}?api_key=${API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) return; // Si falla silenciosamente, no actualizamos nada

        const data = await response.json();

        if (data && typeof data.vote_average !== 'undefined') {
            console.log(`Rating actualizado para ${tmdbId}: ${data.vote_average}`);
            updateRatingUI(data.vote_average, data.vote_count);
        }
    } catch (e) {
        console.warn('Error fetching real-time rating:', e);
    }
}

// --- NUEVO: Sistema de Reseñas ---
function setupReviews(movieId) {
    const reviewsList = document.getElementById('reviews-list');
    const reviewForm = document.getElementById('review-form');
    const starInputs = document.querySelectorAll('.star-input');
    let currentRating = 0;

    if (!reviewsList || !reviewForm) return;

    // Mock reviews data
    const mockReviews = [
        { user: 'Usuario123', rating: 5, text: '¡Increíble! Me mantuvo al borde del asiento todo el tiempo.', date: 'Hace 2 días' },
        { user: 'Cinefilo_X', rating: 4, text: 'Muy buena producción, aunque el final fue un poco predecible.', date: 'Hace 1 semana' },
        { user: 'AnaG', rating: 5, text: 'Definitivamente una de las mejores del año. Recomendada.', date: 'Hace 3 semanas' }
    ];

    // Load saved reviews from local storage
    const savedReviews = JSON.parse(localStorage.getItem(`reviews_${movieId}`)) || [];
    const allReviews = [...savedReviews, ...mockReviews];

    const renderReviews = () => {
        reviewsList.innerHTML = '';
        if (allReviews.length === 0) {
            reviewsList.innerHTML = '<p style="color: #888; text-align: center;">Sé el primero en opinar.</p>';
            return;
        }

        allReviews.forEach(review => {
            const reviewItem = document.createElement('div');
            reviewItem.className = 'review-item';
            reviewItem.style.cssText = 'background: rgba(255,255,255,0.03); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.05);';
            
            const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
            
            reviewItem.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-weight: bold; color: white;">${review.user}</span>
                    <span style="color: #888; font-size: 0.8rem;">${review.date}</span>
                </div>
                <div style="color: #ffd700; margin-bottom: 8px; letter-spacing: 2px;">${stars}</div>
                <p style="color: #ccc; line-height: 1.5; margin: 0;">${review.text}</p>
            `;
            reviewsList.appendChild(reviewItem);
        });
    };

    renderReviews();

    // Star input interaction
    starInputs.forEach(star => {
        star.addEventListener('mouseover', () => {
            const val = parseInt(star.dataset.value);
            starInputs.forEach(s => {
                s.style.color = parseInt(s.dataset.value) <= val ? '#ffd700' : '#444';
            });
        });

        star.addEventListener('mouseout', () => {
            starInputs.forEach(s => {
                s.style.color = parseInt(s.dataset.value) <= currentRating ? '#ffd700' : '#444';
            });
        });

        star.addEventListener('click', () => {
            currentRating = parseInt(star.dataset.value);
            starInputs.forEach(s => {
                s.style.color = parseInt(s.dataset.value) <= currentRating ? '#ffd700' : '#444';
            });
        });
    });

    // Form submission
    reviewForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = document.getElementById('review-text').value.trim();
        
        if (currentRating === 0) {
            alert('Por favor, selecciona una calificación.');
            return;
        }
        if (!text) {
            alert('Por favor, escribe tu reseña.');
            return;
        }

        const newReview = {
            user: 'Tú',
            rating: currentRating,
            text: text,
            date: 'Justo ahora'
        };

        // Save to local storage
        const currentSaved = JSON.parse(localStorage.getItem(`reviews_${movieId}`)) || [];
        currentSaved.unshift(newReview);
        localStorage.setItem(`reviews_${movieId}`, JSON.stringify(currentSaved));

        // Update UI
        allReviews.unshift(newReview);
        renderReviews();
        
        // Reset form
        reviewForm.reset();
        currentRating = 0;
        starInputs.forEach(s => s.style.color = '#444');
        
        if(window.showToast) window.showToast('Reseña publicada con éxito', 'success');
    });
}