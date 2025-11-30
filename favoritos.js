document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('favorites-grid');
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');

    let favoriteMovies = [];

    const loadAndFilterFavorites = () => {
        const favoriteIds = JSON.parse(localStorage.getItem('favoriteMovies')) || [];
        // Asigna un ID único si no existe para garantizar la consistencia
        peliculas.forEach(p => {
            // --- CORRECCIÓN ---: Usar el mismo método de ID seguro que en script.js
            const safeTitle = (p.titulo || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            p.id = p.id || `${safeTitle}-${p.año}`;
        });
        favoriteMovies = peliculas.filter(p => favoriteIds.includes(p.id));
    };

    const createMovieCard = (pelicula) => {
        const tarjeta = document.createElement('div');
        tarjeta.className = 'movie-card';
        tarjeta.dataset.peliculaId = pelicula.id;

        tarjeta.innerHTML = `
            <div class="favorite-icon favorited">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 4.248c-3.148-5.402-12-3.825-12 2.944 0 4.661 5.571 9.427 12 15.808 6.43-6.381 12-11.147 12-15.808 0-6.792-8.875-8.306-12-2.944z"/></svg>
            </div>
            ${pelicula.calidad ? `<span class="quality-badge-card">${pelicula.calidad}</span>` : ''}
            <img src="${pelicula.poster}" alt="Póster de ${pelicula.titulo}">
            <div class="movie-card-content">
                <div class="movie-info">
                    <h3>${pelicula.titulo}</h3>
                    <div class="movie-card-details">
                        <span>${pelicula.año}</span>
                        ${pelicula.calificacion ? `<span>★ ${pelicula.calificacion.toFixed(1)}</span>` : ''}
                    </div>
                    <p class="movie-card-description">${pelicula.descripcion || ''}</p>
                </div>
            </div>
        `;

        // Evento para abrir el modal
        tarjeta.addEventListener('click', (e) => {
            if (!e.target.closest('.favorite-icon')) {
                // Guarda el ID de la película en sessionStorage y redirige a index.html
                sessionStorage.setItem('openModal', pelicula.id);
                window.location.href = 'index.html';
            }
        });

        // Evento para quitar de favoritos
        const favoriteIcon = tarjeta.querySelector('.favorite-icon');
        favoriteIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            // Elimina la tarjeta de la vista y actualiza el localStorage
            tarjeta.remove();
            const favoriteIds = JSON.parse(localStorage.getItem('favoriteMovies')) || [];
            const updatedIds = favoriteIds.filter(id => id !== pelicula.id);
            localStorage.setItem('favoriteMovies', JSON.stringify(updatedIds));

            // Si no quedan favoritos, muestra el mensaje
            if (grid.children.length === 0) {
                renderMovies();
            }
        });

        return tarjeta;
    };

    const renderMovies = () => {
        grid.innerHTML = '';
        if (favoriteMovies.length === 0) {
            grid.innerHTML = `<div class="no-favorites-message"><h3>¡Aún no tienes favoritos!</h3><p>Haz clic en el corazón de cualquier película para agregarla aquí.</p></div>`;
            grid.classList.remove('search-results-grid'); // Quita la clase de grilla si no hay nada
        } else {
            grid.classList.add('search-results-grid'); // Asegura que la clase esté si hay elementos
            favoriteMovies.forEach(pelicula => {
                grid.appendChild(createMovieCard(pelicula));
            });
        }
    };

    // --- Event Listeners para cambio de vista ---
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

    // --- Carga Inicial ---
    loadAndFilterFavorites();
    renderMovies();
});