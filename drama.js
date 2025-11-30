document.addEventListener('DOMContentLoaded', () => {
    const dramaGrid = document.getElementById('drama-grid');

    if (dramaGrid && typeof peliculas !== 'undefined' && typeof createMovieCard === 'function') {
        // CORRECCIÓN: Filtrar por la 'categoria' en lugar del 'genero'.
        const dramaContent = peliculas.filter(item => {
            const categorias = Array.isArray(item.categoria) ? item.categoria.map(c => c.toLowerCase()) : [String(item.categoria).toLowerCase()];
            return categorias.includes('drama');
        });

        if (dramaContent.length > 0) {
            dramaContent.forEach(item => {
                const movieCard = createMovieCard(item);
                dramaGrid.appendChild(movieCard);
            });
        } else {
            dramaGrid.innerHTML = '<p class="no-content-message">No se encontró contenido de drama en este momento.</p>';
        }
    } else {
        console.error('No se pudo inicializar la página de drama. Faltan elementos esenciales (grid, datos o función createMovieCard).');
        if (dramaGrid) {
            dramaGrid.innerHTML = '<p class="no-content-message">Error al cargar el contenido.</p>';
        }
    }
});