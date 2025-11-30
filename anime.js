document.addEventListener('DOMContentLoaded', () => {
    const animeGrid = document.getElementById('anime-grid');

    if (animeGrid && typeof peliculas !== 'undefined' && typeof createMovieCard === 'function') {
        // CORRECCIÓN: Filtrar por la 'categoria' en lugar del 'genero'.
        const animeContent = peliculas.filter(item => {
            const categorias = Array.isArray(item.categoria) ? item.categoria.map(c => c.toLowerCase()) : [String(item.categoria).toLowerCase()];
            return categorias.includes('anime');
        });

        if (animeContent.length > 0) {
            animeContent.forEach(item => {
                const movieCard = createMovieCard(item);
                animeGrid.appendChild(movieCard);
            });
        } else {
            animeGrid.innerHTML = '<p class="no-content-message">No se encontró contenido de anime en este momento.</p>';
        }
    } else {
        console.error('No se pudo inicializar la página de anime. Faltan elementos esenciales (grid, datos o función createMovieCard).');
        if (animeGrid) {
            animeGrid.innerHTML = '<p class="no-content-message">Error al cargar el contenido.</p>';
        }
    }
});