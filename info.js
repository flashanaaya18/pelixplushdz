/**
 * info.js
 * Módulo para obtener información adicional desde The Movie Database (TMDB).
 * Se especializa en buscar y renderizar el reparto de una película o serie.
 */

const TMDB_API_KEY = '9869fab7c867e72214c8628c6029ec74';
const TMDB_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI5ODY5ZmFiN2M4NjdlNzIyMTRjODYyOGM2MDI5ZWM3NCIsIm5iZiI6MTc1OTI2NzMzMi43MDg5OTk5LCJzdWIiOiI2OGRjNGEwNDE1NWQwOWZjZGQyZGY0MTMiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0._sxkF_bWFZtZOQU_8GcEa4x7TawgM_CB9zA43VzSiAY';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w200';

/**
 * Busca y renderiza el reparto de una película o serie usando la API de TMDB.
 * @param {string|number} mediaId - El ID de la película o serie en TMDB.
 * @param {'pelicula'|'serie'} mediaType - El tipo de contenido.
 * @param {HTMLElement} castContainer - El contenedor donde se renderizará el reparto.
 */
async function fetchAndRenderCast(mediaId, mediaType, castContainer) {
    if (!mediaId || !castContainer) {
        castContainer.innerHTML = '<p class="cast-placeholder">No se pudo cargar la información del reparto.</p>';
        return;
    }

    const type = mediaType === 'serie' ? 'tv' : 'movie';
    const url = `${TMDB_BASE_URL}/${type}/${mediaId}/credits?api_key=${TMDB_API_KEY}&language=es-ES`;

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
                'Content-Type': 'application/json;charset=utf-8'
            }
        });

        if (!response.ok) {
            throw new Error(`Error en la respuesta de la API: ${response.statusText}`);
        }

        const credits = await response.json();
        const cast = credits.cast.slice(0, 12); // Limitar a los 12 actores principales

        if (cast.length === 0) {
            castContainer.innerHTML = '<p class="cast-placeholder">No hay información de reparto disponible.</p>';
            return;
        }

        castContainer.innerHTML = ''; // Limpiar el contenedor
        cast.forEach(member => {
            const profilePath = member.profile_path 
                ? `${TMDB_IMAGE_BASE_URL}${member.profile_path}`
                : 'https://via.placeholder.com/200x300/1E293B/94A3B8?text=Sin+Foto';

            const castMemberCard = document.createElement('div');
            castMemberCard.className = 'cast-member-card';
            castMemberCard.innerHTML = `
                <img src="${profilePath}" alt="${member.name}" loading="lazy">
                <div class="cast-member-info">
                    <p class="actor-name">${member.name}</p>
                    <p class="character-name">${member.character}</p>
                </div>
            `;
            castContainer.appendChild(castMemberCard);
        });

    } catch (error) {
        console.error('Error al obtener el reparto desde TMDB:', error);
        castContainer.innerHTML = '<p class="cast-placeholder">No se pudo cargar la información del reparto en este momento.</p>';
    }
}

// Exponer la función para que sea accesible desde otros scripts
window.tmdbAPI = {
    fetchAndRenderCast
};