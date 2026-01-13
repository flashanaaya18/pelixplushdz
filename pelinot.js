document.addEventListener('DOMContentLoaded', () => {
    // --- DATOS DE LA NOTIFICACIÓN ---
    // Puedes cambiar esto dinámicamente o cargarlo desde otro lugar.
    const notificacionData = {"id": "Bad Influencer", "titulo": "Bad Influencer", "portada": "https://image.tmdb.org/t/p/w300/jexSSiOClrAddGm6PiuLmRvWpXg.jpg"};

    // --- VALIDACIÓN ---
    // Buscamos si la película de la notificación realmente existe en nuestro catálogo.
    // Esto evita mostrar notificaciones de contenido que ya no está disponible.
    const peliculaExiste = typeof peliculas !== 'undefined' && peliculas.some(p => p.id === notificacionData.id);
    const nuevaNotificacion = peliculaExiste ? notificacionData : null;
    
    // --- ELEMENTOS DEL DOM ---
    const notificationBanner = document.getElementById('new-content-notification');
    const notificationPoster = document.getElementById('notification-poster');
    const notificationText = document.getElementById('notification-text');
    const closeBtn = document.getElementById('close-notification-btn');

    // Si alguno de los elementos no existe, no continuamos.
    if (!notificationBanner || !notificationPoster || !notificationText || !closeBtn) {
        console.warn('No se encontraron los elementos necesarios para la notificación. (pelinot.js)');
        return;
    }

    // --- LÓGICA PARA MOSTRAR LA NOTIFICACIÓN ---
    if (nuevaNotificacion) {
        // 1. Rellenar el contenido del banner
        notificationPoster.src = nuevaNotificacion.portada;
        notificationText.innerHTML = `¡Nuevo contenido añadido! <strong>${nuevaNotificacion.titulo}</strong> ya está disponible.`;

        // 2. Construir la URL y hacer visible el banner
        notificationBanner.href = `detalles.html?id=${nuevaNotificacion.id}`;
        notificationBanner.style.display = 'flex'; // Cambiamos a flex para mostrarlo
        setTimeout(() => {
            notificationBanner.classList.add('visible');
        }, 500); // Pequeño retardo para la transición
    } else {
        // Si no hay notificación válida, nos aseguramos de que el banner esté oculto.
        notificationBanner.style.display = 'none';
    }

    // --- LÓGICA PARA CERRAR LA NOTIFICACIÓN ---
    closeBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Evita que el enlace se active al hacer clic en el botón de cerrar
        e.stopPropagation(); // Detiene la propagación del evento al contenedor <a>
        notificationBanner.classList.remove('visible');
    });
});