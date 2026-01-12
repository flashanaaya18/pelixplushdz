
document.addEventListener('DOMContentLoaded', () => {
    const platformCards = document.querySelectorAll('.platform-card');
    const resultsSection = document.getElementById('platform-results-section');
    const resultsGrid = document.getElementById('platform-results-grid');
    const resultsTitle = document.getElementById('platform-results-title');
    const closeBtn = document.getElementById('close-platform-results');

    // Mapa para relacionar el título de la tarjeta con los valores en tu base de datos
    const platformMap = {
        'Netflix': ['netflix'],
        'Disney+': ['disney', 'disney+'],
        'Amazon Prime Video': ['amazon', 'prime video', 'amazon prime'],
        'HBO Max': ['hbo', 'hbo max', 'max'],
        'Vix': ['vix'],
        'Apple TV+': ['apple tv', 'apple tv+', 'apple'],
        'Paramount+': ['paramount', 'paramount+']
    };

    // Botón para cerrar la sección de resultados
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (resultsSection) {
                resultsSection.style.display = 'none';
                // Opcional: Scroll de vuelta a las plataformas
                document.getElementById('platforms-section').scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

    // Evento Click para cada tarjeta de plataforma
    platformCards.forEach(card => {
        card.addEventListener('click', () => {
            const platformName = card.getAttribute('title');
            const keys = platformMap[platformName] || [platformName.toLowerCase()];
            
            // Efecto visual de selección
            platformCards.forEach(c => c.style.border = '1px solid rgba(255,255,255,0.1)');
            card.style.border = '2px solid #e50914';

            // Recopilar contenido de todas las fuentes posibles
            let allContent = [];
            if (typeof peliculas !== 'undefined') allContent = allContent.concat(peliculas);
            if (typeof peliculas1 !== 'undefined') allContent = allContent.concat(peliculas1);
            if (typeof peliculas2 !== 'undefined') allContent = allContent.concat(peliculas2);
            if (typeof peliculas3 !== 'undefined') allContent = allContent.concat(peliculas3);
            if (allContent.length === 0 && typeof window.peliculas !== 'undefined') allContent = window.peliculas;
            
            const filtered = allContent.filter(item => {
                if (!item.plataforma) return false;
                const p = item.plataforma.toLowerCase();
                // Verifica si alguna de las claves está incluida en el string de plataforma del item
                return keys.some(k => p.includes(k));
            });

            // Mostrar resultados
            if (resultsSection && resultsGrid) {
                resultsGrid.innerHTML = ''; // Limpiar resultados anteriores
                resultsTitle.innerHTML = `Catálogo de <span style="color: #e50914;">${platformName}</span> (${filtered.length})`;
                
                if (filtered.length === 0) {
                    resultsGrid.innerHTML = `
                        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #888;">
                            <i class="fas fa-film" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                            <p>No se encontraron títulos disponibles para ${platformName} en este momento.</p>
                        </div>
                    `;
                } else {
                    // Generar tarjetas
                    filtered.forEach(movie => {
                        const cardHTML = createMovieCard(movie);
                        resultsGrid.innerHTML += cardHTML;
                    });
                }

                // Mostrar la sección y hacer scroll hacia ella
                resultsSection.style.display = 'block';
                resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Función auxiliar para crear el HTML de la tarjeta (Reutilizando tu diseño)
    function createMovieCard(movie) {
        const title = movie.titulo || movie.title || 'Sin título';
        const poster = movie.poster || 'https://via.placeholder.com/300x450?text=No+Image';
        const year = movie.año || movie.year || '----';
        const rating = movie.calificacion || movie.vote_average || '0.0';
        const id = movie.id || '';
        const type = movie.tipo === 'serie' ? 'Serie' : 'Película';
        
        // Construir enlace
        const link = `detalles.html?id=${id}`;

        return `
            <div class="movie-card">
                <a href="${link}" class="card-link" style="text-decoration:none; color:inherit;">
                    <div class="card-head">
                        <img src="${poster}" alt="${title}" loading="lazy">
                        <div class="rating-badge">
                            <i class="fas fa-star"></i> ${typeof rating === 'number' ? rating.toFixed(1) : rating}
                        </div>
                        ${movie.es_nuevo ? '<span class="badge-new" style="position:absolute; top:10px; left:10px; background:#e50914; color:white; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold;">NUEVO</span>' : ''}
                    </div>
                    <div class="card-body">
                        <h3 class="card-title">${title}</h3>
                        <div class="card-info">
                            <span>${year}</span>
                            <span>${type}</span>
                        </div>
                    </div>
                </a>
            </div>
        `;
    }
});
