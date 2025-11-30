document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const movieId = urlParams.get('id');

    const movie = peliculas.find(m => String(m.id) === String(movieId));

    if (movie) {
        displayMovieDetails(movie);
    }
});

function displayMovieDetails(movie) {
    document.title = `${movie.titulo} - pelixplus`;

    // Elementos del DOM
    const backdropContainer = document.getElementById('detail-backdrop');
    const posterImgEl = document.getElementById('detail-poster-img');
    const titleEl = document.getElementById('detail-title');
    const metaEl = document.getElementById('detail-meta');
    const genresEl = document.getElementById('detail-genres');
    const descriptionEl = document.getElementById('detail-description');
    const castGridEl = document.getElementById('detail-cast');
    const playerContainer = document.getElementById('detail-poster-container');
    const seasonsContainer = document.getElementById('detail-seasons-container');
    const sourceButtonsContainer = document.getElementById('detail-source-buttons');

    // Resetear vistas principales
    playerContainer.innerHTML = '<p>Selecciona una fuente para reproducir.</p>';
    seasonsContainer.style.display = 'none';
    sourceButtonsContainer.innerHTML = '';
    seasonsContainer.innerHTML = '';

    // Rellenar la sección de la portada
    backdropContainer.style.backgroundImage = `url('${movie.backdrop_path || movie.poster}')`;
    posterImgEl.src = movie.poster;
    posterImgEl.alt = `Póster de ${movie.titulo}`;

    // Rellenar información básica
    titleEl.textContent = movie.titulo;
    descriptionEl.textContent = movie.descripcion || 'Descripción no disponible.';
    
    let metaHTML = `<span>${movie.año || 'N/A'}</span>`;
    if (movie.calificacion) {
        metaHTML += `<span><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg> ${movie.calificacion}</span>`;
    }
    metaEl.innerHTML = metaHTML;

    // Rellenar géneros
    genresEl.innerHTML = '';
    if (Array.isArray(movie.genero)) {
        movie.genero.forEach(genre => {
            const pill = document.createElement('span');
            pill.className = 'genre-pill';
            pill.textContent = genre;
            genresEl.appendChild(pill);
        });
    }

    // Lógica para películas
    if (movie.tipo === 'pelicula' && movie.fuentes) {
        movie.fuentes.forEach((source, index) => {
            const button = document.createElement('button');
            button.innerHTML = `<span class="flag-icon">${getFlagForLanguage(source.idioma)}</span> ${source.idioma || 'Desconocido'}`;
            button.className = 'source-btn';
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
            playSource(movie.fuentes[0], movie.poster);
        }
    }

    // Lógica para series
    if (movie.tipo === 'serie' && movie.temporadas) {
        seasonsContainer.style.display = 'block';
        movie.temporadas.forEach((season, seasonIndex) => {
            const seasonDiv = document.createElement('div');
            seasonDiv.className = 'season';

            const seasonTitle = document.createElement('h3');
            seasonTitle.className = 'season-title';
            seasonTitle.innerHTML = `
                <span>Temporada ${season.season || seasonIndex + 1}</span>
                <svg class="season-title-arrow" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            `;
            seasonDiv.appendChild(seasonTitle);

            // Evento para mostrar/ocultar episodios
            seasonTitle.addEventListener('click', () => {
                seasonDiv.classList.toggle('active');
            });

            const episodesGrid = document.createElement('div');
            episodesGrid.className = 'episodes-grid';

            season.episodios.forEach((episode, episodeIndex) => {
                const episodeButton = document.createElement('a'); // Cambiado a 'a' para mejor semántica
                episodeButton.className = 'episode-btn';
                episodeButton.textContent = `E${episode.episodio || episodeIndex + 1}`;
                episodeButton.onclick = () => {
                     document.querySelectorAll('.episode-btn').forEach(btn => btn.classList.remove('active'));
                     episodeButton.classList.add('active');
                     playSource({ url: episode.url, type: 'terabox' }, movie.poster); // Asumimos terabox
                };
                episodesGrid.appendChild(episodeButton);
            });

            seasonDiv.appendChild(episodesGrid);
            seasonsContainer.appendChild(seasonDiv);
        });
         // Reproducir el primer episodio de la primera temporada por defecto
        const firstSeasonDiv = seasonsContainer.querySelector('.season');
        if (movie.temporadas[0]?.episodios[0] && firstSeasonDiv) {
            playSource({ url: movie.temporadas[0].episodios[0].url, type: 'terabox' }, movie.poster);
            // Marcar como activo el primer botón
            const firstEpisodeButton = seasonsContainer.querySelector('.episode-btn');
            if(firstEpisodeButton) firstEpisodeButton.classList.add('active');
            // Mostrar la primera temporada por defecto
            firstSeasonDiv.classList.add('active');
        }
    }

    // --- NUEVO: Lógica mejorada para el reparto ---
    const castTab = document.querySelector('[data-tab="cast-tab"]');
    if (movie.reparto && Array.isArray(movie.reparto) && movie.reparto.length > 0 && movie.reparto[0].trim() !== '') {
        castGridEl.innerHTML = '';
        movie.reparto.forEach(actorName => {
            const actorCard = document.createElement('div');
            actorCard.className = 'cast-card';
            actorCard.innerHTML = `
                <img src="https://via.placeholder.com/120x175.png?text=${actorName.split(' ')[0]}" alt="Foto de ${actorName}">
                <div class="cast-name">${actorName}</div>
            `;
            castGridEl.appendChild(actorCard);
        });
        castTab.style.display = 'flex';
    } else {
        castTab.style.display = 'none'; // Ocultar la pestaña de reparto si no hay datos
    }

    // Recomendaciones
    displayRecommendations(movie);

    // --- NUEVO: Inicializar la funcionalidad de las pestañas ---
    setupTabs();
}

function playSource(source, posterUrl) {
    const posterContainer = document.getElementById('detail-poster-container');
    posterContainer.innerHTML = ''; // Limpiamos el contenedor para poner el video o iframe

    // Creamos los elementos de video y iframe cada vez para asegurar un estado limpio
    const videoPlayer = document.createElement('video');
    videoPlayer.id = 'detail-video';
    videoPlayer.controls = true;
    const teraboxContainer = document.createElement('div');
    teraboxContainer.id = 'terabox-container';

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
        const iframe = document.createElement('iframe');
        iframe.src = source.url;
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allowfullscreen', 'true');
        teraboxContainer.appendChild(iframe);
        posterContainer.appendChild(teraboxContainer);
    } else { // 'video' o tipo no especificado
        videoPlayer.src = source.url;
        videoPlayer.poster = posterUrl;
        posterContainer.appendChild(videoPlayer);
    }
}

function displayRecommendations(currentMovie) {
    const recommendationsGrid = document.getElementById('recommendations-grid');
    if (!recommendationsGrid) return;
    recommendationsGrid.innerHTML = '';

    const currentGenres = Array.isArray(currentMovie.genero) ? currentMovie.genero : [currentMovie.genero];
    const recommendations = peliculas.filter(movie => {
        const movieGenres = Array.isArray(movie.genero) ? movie.genero : [movie.genero];
        return movie.id !== currentMovie.id && movieGenres.some(g => currentGenres.includes(g));
    }).slice(0, 10); // Limitar a 10 recomendaciones

    if (recommendations.length > 0) {
        recommendations.forEach(movie => { // Usar la función global si existe
            const movieCard = createLocalMovieCard(movie);
            movieCard.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = `detalle.html?id=${movie.id}`;
            });
            recommendationsGrid.appendChild(movieCard);
        });
    } else {
        recommendationsGrid.innerHTML = '<p>No hay recomendaciones disponibles.</p>';
    }
    setupCarruselControls('.recommendations-carrusel', '.recommendations-grid');
}

function createLocalMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.innerHTML = `
        <img src="${movie.poster}" alt="${movie.titulo}" onerror="this.src='https://via.placeholder.com/150x225';">
        <div class="movie-card-info">
            <h3>${movie.titulo}</h3>
        </div>
    `;
    return card;
}

function getFlagForLanguage(idioma) {
    if (!idioma) return '🌐';
    const lang = idioma.toLowerCase();
    if (lang.includes('español') || lang.includes('castellano')) return '🇪🇸';
    if (lang.includes('latino')) return '🇲🇽';
    if (lang.includes('subtitulado')) return '🇺🇸';
    return '🌐';
}

function setupTabs() {
    const tabButtons = document.querySelectorAll('.detail-tab-button');
    const tabContents = document.querySelectorAll('.detail-tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Desactivar todos los botones y contenidos
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Activar el botón y contenido seleccionado
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            const activeContent = document.getElementById(tabId);
            if (activeContent) {
                activeContent.classList.add('active');
            }
        });
    });
}

function setupCarruselControls(carruselSelector, gridSelector) {
    const carrusel = document.querySelector(carruselSelector);
    if (!carrusel) return;
    const grid = carrusel.querySelector(gridSelector);
    const prevBtn = carrusel.querySelector('.rec-flecha.izquierda');
    const nextBtn = carrusel.querySelector('.rec-flecha.derecha');

    if (!grid || !prevBtn || !nextBtn) return;

    const scrollAmount = grid.clientWidth;

    prevBtn.addEventListener('click', () => {
        grid.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', () => {
        grid.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });

    function updateArrowVisibility() {
        const maxScrollLeft = grid.scrollWidth - grid.clientWidth;
        prevBtn.style.visibility = grid.scrollLeft > 10 ? 'visible' : 'hidden';
        nextBtn.style.visibility = grid.scrollLeft < maxScrollLeft - 10 ? 'visible' : 'hidden';
    }

    grid.addEventListener('scroll', updateArrowVisibility);
    window.addEventListener('resize', updateArrowVisibility);
    setTimeout(updateArrowVisibility, 500); // Dar tiempo para que las imágenes carguen
}