document.addEventListener('DOMContentLoaded', () => {
    const proximamentePageGrid = document.getElementById('proximamente-grid');

    // Si no estamos en la página de "Próximamente", no hacemos nada.
    if (!proximamentePageGrid) return;

    // Cargar notificaciones guardadas
    let notifiedMovies = JSON.parse(localStorage.getItem('notifiedMovies')) || [];


    const createProximamenteCard = (movie) => {
        const isNotified = notifiedMovies.includes(movie.id);

        const card = document.createElement('div');
        card.className = 'movie-card';
        card.innerHTML = ` 
            <img src="${movie.poster}" alt="${movie.titulo}" class="movie-poster">
            <div class="movie-info">
                <h3 class="movie-title">${movie.titulo}</h3>
                <div class="movie-card-controls">
                    <button class="notify-btn ${isNotified ? 'active' : ''}" data-movie-id="${movie.id}" title="Notificarme cuando esté disponible">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bell-icon" viewBox="0 0 16 16">
                            <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        const notifyBtn = card.querySelector('.notify-btn');
        notifyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleNotification(movie.id, notifyBtn);
        });

        return card;
    };

    const toggleNotification = (movieId, button) => {
        const movieIndex = notifiedMovies.indexOf(movieId);
        if (movieIndex > -1) {
            // Si ya está, la quitamos (desactivar notificación)
            notifiedMovies = notifiedMovies.filter(item => item.id !== movieId);
            button.classList.remove('active');
            button.title = "Notificarme cuando esté disponible";
        } else {
            // Si no está, la añadimos (activar notificación)
            notifiedMovies.push({ id: movieId, titulo: peliculas.find(p => p.id === movieId)?.titulo || 'Película desconocida' });
            button.classList.add('active');
            button.title = "Notificación activada";
        }
        // Guardar el estado actualizado en localStorage
        localStorage.setItem('notifiedMovies', JSON.stringify(notifiedMovies));
    };

    const renderProximamentePage = (container) => {
        if (!container) return;

        // --- LÓGICA SIMPLIFICADA: Mostrar solo lo que tenga la categoría 'proximamente' ---
        const moviesToRender = peliculas.filter(movie => 
            movie.categoria && Array.isArray(movie.categoria) && movie.categoria.includes('proximamente')
        );

        if (moviesToRender.length === 0) {
            container.innerHTML = `<p class="no-favorites-message">No hay títulos anunciados próximamente.</p>`;
            return;
        }

        container.innerHTML = '';
        moviesToRender.forEach(movie => {
            const card = createProximamenteCard(movie);
            container.appendChild(card);
        });
    };

    renderProximamentePage(proximamentePageGrid);
});