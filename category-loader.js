/**
 * category-loader.js
 * Script unificado para cargar contenido en todas las páginas de categoría.
 */
document.addEventListener('DOMContentLoaded', () => {
    const pageCategory = document.body.dataset.page;
    const grid = document.getElementById(`${pageCategory}-grid`);
    const genreFilter = document.getElementById('genre-filter');
    const sortBy = document.getElementById('sort-by');
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');

    if (!grid || !pageCategory) {
        console.error('No se encontró la grilla o la categoría de la página.');
        return;
    }

    let categoryContent = [];

    const loadContent = () => {
        if (typeof peliculas === 'undefined') {
            console.warn("Datos de 'peliculas' no disponibles, reintentando...");
            setTimeout(loadContent, 100);
            return;
        }
        
        const favoriteIds = window.dataManager ? window.dataManager.getFavorites() : [];
        peliculas.forEach(p => {
            p.favorito = favoriteIds.includes(p.id);
        });

        categoryContent = peliculas.filter(p => {
            if (p.esta_roto) return false;
            const categorias = Array.isArray(p.categoria) ? p.categoria.map(c => c.toLowerCase()) : [String(p.categoria).toLowerCase()];
            return categorias.includes(pageCategory);
        });

        renderContent();
    };

    const renderContent = () => {
        let contentToRender = [...categoryContent];

        // Lógica de filtrado y ordenación (simplificada para el ejemplo)
        const sortValue = sortBy ? sortBy.value : 'popularity';
        contentToRender.sort((a, b) => {
            switch (sortValue) {
                case 'release_date_desc':
                    return new Date(b.addedDate || b.año) - new Date(a.addedDate || a.año);
                case 'rating_desc':
                    return (b.calificacion || 0) - (a.calificacion || 0);
                case 'title_asc':
                    return a.titulo.localeCompare(b.titulo);
                default: // popularity
                    return (b.votos || 0) - (a.votos || 0);
            }
        });

        grid.innerHTML = '';
        if (contentToRender.length === 0) {
            grid.innerHTML = `<p class="no-content-message">No se encontró contenido en esta categoría.</p>`;
        } else {
            contentToRender.forEach(item => {
                if (window.createMovieCard) {
                    grid.appendChild(window.createMovieCard(item));
                }
            });
        }
    };

    // Event Listeners
    if (sortBy) sortBy.addEventListener('change', renderContent);
    if (genreFilter) genreFilter.addEventListener('change', renderContent);
    if (gridViewBtn && listViewBtn) {
        gridViewBtn.addEventListener('click', () => { grid.classList.remove('list-view'); gridViewBtn.classList.add('active'); listViewBtn.classList.remove('active'); });
        listViewBtn.addEventListener('click', () => { grid.classList.add('list-view'); listViewBtn.classList.add('active'); gridViewBtn.classList.remove('active'); });
    }

    loadContent();
});