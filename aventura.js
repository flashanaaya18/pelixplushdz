document.addEventListener('DOMContentLoaded', () => {
    const aventuraGrid = document.getElementById('aventura-grid');

    if (aventuraGrid && typeof peliculas !== 'undefined' && typeof createMovieCard === 'function') {
        // CORRECCIÓN: Filtrar por la 'categoria' en lugar del 'genero'.
        const aventuraContent = peliculas.filter(item => {
            const categorias = Array.isArray(item.categoria) ? item.categoria.map(c => c.toLowerCase()) : [String(item.categoria).toLowerCase()];
            return categorias.includes('aventura');
        });

        if (aventuraContent.length > 0) {
            aventuraContent.forEach(item => {
                const movieCard = createMovieCard(item);
                aventuraGrid.appendChild(movieCard);
            });
        } else {
            aventuraGrid.innerHTML = '<p class="no-content-message">No se encontró contenido de aventura en este momento.</p>';
        }
    } else {
        console.error('No se pudo inicializar la página de aventura. Faltan elementos esenciales (grid, datos o función createMovieCard).');
        if (aventuraGrid) {
            aventuraGrid.innerHTML = '<p class="no-content-message">Error al cargar el contenido.</p>';
        }
    }
});