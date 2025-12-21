document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('todos-grid');
    const genreFilter = document.getElementById('genre-filter');
    const sortBy = document.getElementById('sort-by');
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');

    let allContent = [];

    // --- Funciones de Carga y Preparación ---
    const loadContent = () => {
        const favoriteIds = JSON.parse(localStorage.getItem('favoriteMovies')) || [];
        peliculas.forEach((p, index) => {
            p.id = p.id || `${p.titulo.toLowerCase().replace(/\s+/g, '-')}-${p.año}-${index}`;
            p.favorito = favoriteIds.includes(p.id);
        });
        // CORRECCIÓN: Excluye contenido roto.
        allContent = peliculas.filter(p => !p.esta_roto);
    };

    const populateGenreFilter = () => {
        const allGenres = allContent.flatMap(p => {
            const genero = p.genero;
            if (!genero) return [];
            if (Array.isArray(genero)) {
                return genero;
            }
            return genero.split(/[\s,]+/);
        }).map(g => g.trim().toLowerCase()).filter(Boolean);
        const genres = [...new Set(allGenres)];
        genreFilter.innerHTML = '<option value="all">Todos</option>';
        genres.sort().forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            genreFilter.appendChild(option);
        });
    };

    const createContentCard = (content) => {
        const tarjeta = document.createElement('div');
        tarjeta.className = 'movie-card';
        tarjeta.dataset.peliculaId = content.id;
        tarjeta.classList.toggle('is-broken', content.esta_roto); // Apply broken status

        const hasVideo = content.videoUrl || content.teraboxId || (content.fuentes && content.fuentes.length > 0) || (content.temporadas && content.temporadas.length > 0);
        const playIcon = hasVideo ? `<div class="play-icon"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>` : '';

        tarjeta.innerHTML = `
            ${playIcon}
            <div class="favorite-icon ${content.favorito ? 'favorited' : ''}">
                <button class="card-favorite-btn ${content.favorito ? 'favorited' : ''}" data-movie-id="${content.id}" title="Añadir a Favoritos">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.248c-3.148-5.402-12-3.825-12 2.944 0 4.661 5.571 9.427 12 15.808 6.43-6.381 12-11.147 12-15.808 0-6.792-8.875-8.306-12-2.944z"/></svg>
                </button>
            </div>
            <img src="${content.poster}" alt="Póster de ${content.titulo}" onerror="this.src='https://via.placeholder.com/180x270/333333/ffffff?text=No+Image'">
            <div class="movie-card-content">
                <div class="movie-info">
                    ${content.genero ? `<span class="genre-badge">${content.genero}</span>` : ''}
                    <h3>${content.titulo}</h3>
                    <div class="movie-card-details">
                        <span>${content.año}</span>
                        ${content.calificacion ? `<span>★ ${content.calificacion.toFixed(1)}</span>` : ''}
                    </div>
                    <p class="movie-card-description">${content.descripcion || ''}</p>
                </div>
            </div>
        `;

        const tipoTag = `<div class="card-tag tag-tipo tag-${content.tipo}">${content.tipo.toUpperCase()}</div>`;
        const edadTag = content.clasificacion_edad ? `<div class="card-tag tag-edad ${content.clasificacion_edad.includes('+18') ? 'tag-fire' : ''}">${content.clasificacion_edad}</div>` : '';
        const nuevoTag = content.es_nuevo ? `<div class="card-tag tag-nuevo">NUEVO</div>` : '';
        const recienteTag = content.es_reciente ? `<div class="card-tag tag-reciente">RECIENTE</div>` : '';
        const plataformaTag = content.plataforma ? `<div class="card-tag tag-plataforma tag-${content.plataforma.toLowerCase().replace(/[^a-z0-9]/g, '-')}">${content.plataforma}</div>` : '';
        const nuevaTemporadaTag = content.estado_temporada === 'nueva' ? `<div class="card-tag tag-nueva-temporada">NUEVA TEMPORADA</div>` : '';
        const prontoTemporadaTag = content.estado_temporada === 'pronto' ? `<div class="card-tag tag-pronto-temporada">PRONTO NUEVA TEMP.</div>` : '';

        tarjeta.insertAdjacentHTML('afterbegin', `${plataformaTag}${nuevoTag}${recienteTag}${edadTag}${tipoTag}${nuevaTemporadaTag}${prontoTemporadaTag}`);

        tarjeta.addEventListener('click', (e) => {
            if (!e.target.closest('.favorite-icon')) {
                sessionStorage.setItem('openModal', content.id);
                window.location.href = 'index.html';
            }
        });

        // Use the global dataManager for favorite toggling
        const favoriteButton = tarjeta.querySelector('.card-favorite-btn');
        favoriteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const movieId = content.id;
            let favorites = window.dataManager.getFavorites();
            
            if (favorites.includes(movieId)) {
                favorites = favorites.filter(id => id !== movieId);
                favoriteButton.classList.remove('favorited');
            } else {
                favorites.push(movieId);
                favoriteButton.classList.add('favorited');
            }
            window.dataManager.saveFavorites(favorites);
        });

        return tarjeta;
    };

    // --- Lógica de Renderizado, Filtro y Ordenación ---
    const renderContent = () => {
        let contentToRender = [...allContent];

        const selectedGenre = genreFilter.value;
        if (selectedGenre !== 'all') {
            contentToRender = contentToRender.filter(p => {
                if (!p.genero) return false;
                return Array.isArray(p.genero) ? p.genero.includes(selectedGenre) : p.genero.split(/[\s,]+/).includes(selectedGenre);
            });
        }

        const sortValue = sortBy.value;
        contentToRender.sort((a, b) => {
            switch (sortValue) {
                case 'popularity': return (b.votos || 0) - (a.votos || 0);
                case 'release_date_desc': return b.año - a.año;
                case 'rating_desc': return (b.calificacion || 0) - (a.calificacion || 0);
                case 'title_asc': return a.titulo.localeCompare(b.titulo);
                default: return 0;
            }
        });

        grid.innerHTML = '';
        if (contentToRender.length === 0) {
            grid.innerHTML = `<div class="no-favorites-message">No hay contenido que coincida con tus filtros.</div>`;
        } else {
            contentToRender.forEach(content => {
                const tarjeta = createContentCard(content);
                grid.appendChild(tarjeta);
            });
        }
    };

    // --- Event Listeners ---
    genreFilter.addEventListener('change', renderContent);
    sortBy.addEventListener('change', renderContent);
    gridViewBtn.addEventListener('click', () => { grid.classList.remove('list-view'); gridViewBtn.classList.add('active'); listViewBtn.classList.remove('active'); });
    listViewBtn.addEventListener('click', () => { grid.classList.add('list-view'); listViewBtn.classList.add('active'); gridViewBtn.classList.remove('active'); });

    // --- Carga Inicial ---
    const init = () => {
        loadContent();
        populateGenreFilter();
        renderContent();
    };

    init();
});