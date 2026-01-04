document.addEventListener('DOMContentLoaded', function() {
    // --- OBTENER REFERENCIAS A ELEMENTOS DEL DOM ---
    const grid = document.getElementById('ciencia-ficcion-grid');
    const genreFilter = document.getElementById('genre-filter');
    const sortBy = document.getElementById('sort-by');
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');

    // Asegurarse de que el grid existe antes de continuar
    if (!grid) return;

    let contentList = [];

    // --- FUNCIONES DE CARGA Y PREPARACIÓN DE DATOS ---
    const loadContent = () => {
        const favoriteIds = window.dataManager ? window.dataManager.getFavorites() : [];
        const listaPeliculas = window.peliculas || [];

        if (listaPeliculas.length > 0) {
            // Marcar favoritos
            listaPeliculas.forEach(p => {
                p.favorito = favoriteIds.includes(p.id);
            });

            // Filtrar contenido de Ciencia Ficción
            contentList = listaPeliculas.filter(p => {
                if (p.esta_roto) return false;
                
                // Lógica robusta para detectar ciencia ficción en género o categoría
                let tags = [];
                if (Array.isArray(p.genero)) tags = [...tags, ...p.genero];
                else if (typeof p.genero === 'string') tags = [...tags, ...p.genero.split(',')];
                
                if (Array.isArray(p.categoria)) tags = [...tags, ...p.categoria];
                else if (typeof p.categoria === 'string') tags = [...tags, ...p.categoria.split(',')];

                const normalizedTags = tags.map(t => window.normalizeText ? window.normalizeText(t) : t.toLowerCase().trim());
                const keywords = ['ciencia ficcion', 'sci-fi', 'scifi'];
                
                return normalizedTags.some(tag => keywords.some(k => tag.includes(k)));
            });
        }
    };

    // Rellena el filtro de géneros secundarios
    const populateGenreFilter = () => {
        if (!genreFilter) return;
        
        const allGenres = contentList.flatMap(p => {
            const genero = p.genero;
            if (!genero) return [];
            if (Array.isArray(genero)) return genero;
            return genero.split(/[\s,]+/);
        }).map(g => String(g).trim().toLowerCase()).filter(Boolean);

        const genres = [...new Set(allGenres)];

        genreFilter.innerHTML = '<option value="all">Todos los Géneros</option>';
        genres.sort().forEach(genre => {
            // Excluir 'ciencia ficción' del filtro porque ya estamos en esa página
            if (genre && !['ciencia', 'ficcion', 'ficción', 'sci-fi', 'scifi'].includes(genre)) {
                const option = document.createElement('option');
                option.value = genre.toLowerCase();
                option.textContent = genre.charAt(0).toUpperCase() + genre.slice(1);
                genreFilter.appendChild(option);
            }
        });
    };

    // --- LÓGICA DE RENDERIZADO ---
    const renderContent = () => {
        let filtrados = [...contentList];

        // 1. Filtrar por sub-género
        if (genreFilter) {
            const selectedGenre = genreFilter.value;
            if (selectedGenre !== 'all' && window.normalizeText) {
                filtrados = filtrados.filter(p => p.genero && window.normalizeText(p.genero).includes(selectedGenre));
            }
        }

        // 2. Ordenar
        if (sortBy) {
            const sortValue = sortBy.value;
            filtrados.sort((a, b) => {
                switch (sortValue) {
                    case 'popularity': return (b.votos || 0) - (a.votos || 0);
                    case 'release_date_desc':
                        const dateA = a.addedDate ? new Date(a.addedDate) : new Date(a.año || 0, 0, 1);
                        const dateB = b.addedDate ? new Date(b.addedDate) : new Date(b.año || 0, 0, 1);
                        return dateB - dateA;
                    case 'rating_desc': return (b.calificacion || 0) - (a.calificacion || 0);
                    case 'title_asc': return (a.titulo || '').localeCompare(b.titulo || '');
                    default: return 0;
                }
            });
        }

        // 3. Renderizar usando la función global estándar
        grid.innerHTML = '';
        if (filtrados.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: #888;">
                <h3>No se encontraron títulos de ciencia ficción.</h3>
            </div>`;
        } else {
            filtrados.forEach(item => {
                if (window.createMovieCard) {
                    grid.appendChild(window.createMovieCard(item));
                }
            });
        }
    };

    // --- EVENT LISTENERS ---
    if (genreFilter) genreFilter.addEventListener('change', renderContent);
    if (sortBy) sortBy.addEventListener('change', renderContent);
    
    if (gridViewBtn && listViewBtn) {
        gridViewBtn.addEventListener('click', () => { 
            grid.classList.remove('list-view'); 
            gridViewBtn.classList.add('active'); 
            listViewBtn.classList.remove('active'); 
        });
        listViewBtn.addEventListener('click', () => { 
            grid.classList.add('list-view'); 
            listViewBtn.classList.add('active'); 
            gridViewBtn.classList.remove('active'); 
        });
    }

    // --- INICIALIZACIÓN ---
    const init = () => {
        loadContent();
        populateGenreFilter();
        renderContent();
    };

    // Esperar a que la app principal esté lista
    if (window.peliculas && window.peliculas.length > 0) {
        init();
    } else {
        document.addEventListener('app-ready', () => {
            console.log("Ciencia Ficción: App lista, inicializando...");
            init();
        });
        // Fallback por si el evento ya pasó
        setTimeout(() => {
            if (contentList.length === 0 && window.peliculas) init();
        }, 1000);
    }
});