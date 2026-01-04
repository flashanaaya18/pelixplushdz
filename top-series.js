document.addEventListener('DOMContentLoaded', () => {
    const renderTopSeriesSection = () => {
        // Asegúrate de que el ID en index.html sea 'top-mejores-series'
        const section = document.getElementById('top-mejores-series');
        
        // Si no encuentra la sección (por ejemplo, en otras páginas), no hace nada
        if (!section) return;

        // --- CONFIGURACIÓN: AQUI PUEDES EDITAR LAS SERIES TOP ---
        const topSeries = [
            {
                titulo: "Chespirito: Sin querer queriendo",
                poster: "https://ww4.pelisplushd.to/poster/chespirito-sin-querer-queriendo-thumb.jpg",
                link: "detalles.html?id=chespirito-sin-querer-queriendo-2025"
            },
            {
                titulo: "It: Bienvenidos a Derry",
                poster: "https://image.tmdb.org/t/p/w500/2titW404dPYOzK5NElQoAJ2ivK5.jpg",
                link: "detalles.html?id=it-bienvenidos-a-derry-2025"
            },
            {
                titulo: "Stranger Things",
                poster: "https://imgs.search.brave.com/wjekKeWv4t5UjtAds9RVOi4MiGXqh2NGNSdB3XqdyNk/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93YWxs/cGFwZXJzLmNvbS9p/bWFnZXMvaGQvc3Ry/YW5nZXItdGhpbmdz/LXBpY3R1cmVzLXF5/aThxMDZ2d3dtdXhn/c3AuanBn",
                link: "detalles.html?id=stranger-things-20216"
            },
            {
                titulo: "Merlina",
                poster: "https://ww5.pelisplushd.to/poster/merlina-thumb.jpg",
                link: "detalles.html?id=merlina-2022"
            },
            {
                titulo: "The Boys",
                poster: "https://ww5.pelisplushd.to/poster/the-boys-thumb.jpg",
                link: "detalles.html?id=the-boys-2019"
            },
            {
                titulo: "VGLY",
                poster: "https://image.tmdb.org/t/p/w300/SYvwtsk4vWPAtB0wlgLlecWCFc.jpg",
                link: "detalles.html?id=vgly-2023"
            }
        ];

        // Limpiar contenido previo
        section.innerHTML = '';

        // Crear título
        const titleContainer = document.createElement('div');
        titleContainer.className = 'section-title-container';
        titleContainer.innerHTML = `<h2 class="section-title">🏆 Top Mejores Series por Pelixplushd</h2>`;
        section.appendChild(titleContainer);

        // Crear contenedor del carrusel
        const carrusel = document.createElement('div');
        carrusel.className = 'carrusel-contenedor';
        carrusel.innerHTML = `
            <button class="carrusel-flecha izquierda" aria-label="Anterior">&#10094;</button>
            <div class="movie-grid" id="top-series-grid"></div>
            <button class="carrusel-flecha derecha" aria-label="Siguiente">&#10095;</button>
        `;
        
        const grid = carrusel.querySelector('#top-series-grid');
        
        // Generar tarjetas
        topSeries.forEach(serie => {
            const card = document.createElement('a');
            card.className = 'movie-card';
            card.href = serie.link;
            // Usamos window.showPageLoader si está disponible (definido en script.js)
            card.onclick = (e) => { e.preventDefault(); if(window.showPageLoader) window.showPageLoader(serie.link); else window.location.href = serie.link; };
            card.innerHTML = `
                <div class="card-tag tag-tipo tag-serie">SERIE</div>
                <img src="${serie.poster}" alt="${serie.titulo}" loading="lazy">
                <div class="movie-card-info"><h3>${serie.titulo}</h3></div>
            `;
            grid.appendChild(card);
        });

        // Lógica de flechas del carrusel
        const flechaIzq = carrusel.querySelector('.izquierda');
        const flechaDer = carrusel.querySelector('.derecha');
        
        flechaIzq.addEventListener('click', () => grid.scrollBy({ left: -grid.clientWidth * 0.7, behavior: 'smooth' }));
        flechaDer.addEventListener('click', () => grid.scrollBy({ left: grid.clientWidth * 0.7, behavior: 'smooth' }));

        section.appendChild(carrusel);
        section.style.display = 'block';
    };

    // Ejecutar la función
    renderTopSeriesSection();
});