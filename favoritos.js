document.addEventListener('DOMContentLoaded', () => {
    // If app is already ready (window.peliculas populated), init immediately
    if (window.peliculas && window.peliculas.length > 0 && window.dataManager) {
        initFavoritesPage();
    } else {
        // Otherwise wait for the event
        document.addEventListener('app-ready', initFavoritesPage);
    }
});

function initFavoritesPage() {
    console.log("Iniciando página de favoritos...");
    const grid = document.getElementById('favorites-grid');
    const noFavsMessage = document.getElementById('no-favorites-message');
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');

    if (!grid || !window.dataManager) return;

    // View toggles (Optional, but kept for UI consistency if buttons exist)
    if (gridViewBtn && listViewBtn) {
        gridViewBtn.addEventListener('click', () => {
            grid.classList.remove('list-view');
            gridViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
        });
        listViewBtn.addEventListener('click', () => {
            // If we implement list-view CSS later, this will work. 
            // Currently it just adds a class.
            grid.classList.add('list-view');
            listViewBtn.classList.add('active');
            gridViewBtn.classList.remove('active');
        });
    }

    renderFavorites();

    function renderFavorites() {
        const favoriteIds = window.dataManager.getFavorites();

        // Find movie objects
        const favoriteMovies = window.peliculas.filter(p => favoriteIds.includes(p.id));

        grid.innerHTML = '';

        if (favoriteMovies.length === 0) {
            grid.style.display = 'none';
            if (noFavsMessage) noFavsMessage.style.display = 'block';
        } else {
            grid.style.display = 'grid'; // Ensure grid display for movie-grid-full
            if (noFavsMessage) noFavsMessage.style.display = 'none';

            favoriteMovies.forEach(movie => {
                // Use the global card creator for consistency
                if (typeof window.createMovieCard === 'function') {
                    // Ensure the 'favorito' property is set correctly before creating card
                    movie.favorito = true;

                    const card = window.createMovieCard(movie);

                    // Add logic to remove card if unfavorited from this page
                    const favBtn = card.querySelector('.card-favorite-btn');
                    if (favBtn) {
                        favBtn.classList.add('favorited'); // Ensure it looks favorited

                        // Intercept click to remove from view if needed
                        favBtn.addEventListener('click', () => {
                            // The global handler in script.js toggles the state and saves it.
                            // We just wait a moment to see the result and update UI.
                            setTimeout(() => {
                                const isStillFav = favBtn.classList.contains('favorited');
                                if (!isStillFav) {
                                    // Animate removal
                                    card.style.transition = 'opacity 0.3s, transform 0.3s';
                                    card.style.opacity = '0';
                                    card.style.transform = 'scale(0.8)';

                                    setTimeout(() => {
                                        card.remove();
                                        // Check if empty
                                        if (grid.children.length === 0) {
                                            grid.style.display = 'none';
                                            if (noFavsMessage) noFavsMessage.style.display = 'block';
                                        }
                                    }, 300);
                                }
                            }, 50);
                        });
                    }
                    grid.appendChild(card);
                }
            });
        }
    }
}