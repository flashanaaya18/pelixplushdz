/* ========================================
   NETFLIX ADVANCED FEATURES - JAVASCRIPT
   Funcionalidades premium tipo Netflix
   ======================================== */

// --- 1. PREVIEW CARD SYSTEM ---
class PreviewCardManager {
    constructor() {
        this.hoverTimeout = null;
        this.currentPreview = null;
        this.HOVER_DELAY = 500; // ms antes de mostrar preview
    }

    init() {
        document.querySelectorAll('.movie-card').forEach(card => {
            card.addEventListener('mouseenter', (e) => this.handleMouseEnter(e, card));
            card.addEventListener('mouseleave', () => this.handleMouseLeave());
        });
    }

    handleMouseEnter(e, card) {
        this.hoverTimeout = setTimeout(() => {
            this.showPreview(card);
        }, this.HOVER_DELAY);
    }

    handleMouseLeave() {
        clearTimeout(this.hoverTimeout);
        if (this.currentPreview) {
            this.currentPreview.remove();
            this.currentPreview = null;
        }
    }

    showPreview(card) {
        const movieData = this.getMovieData(card);

        const preview = document.createElement('div');
        preview.className = 'movie-card-preview';
        preview.innerHTML = `
      <div class="preview-actions">
        <button class="preview-btn play" onclick="playMovie('${movieData.id}')">
          <i class="fas fa-play"></i>
        </button>
        <button class="preview-btn" onclick="addToFavorites('${movieData.id}')">
          <i class="fas fa-plus"></i>
        </button>
        <button class="preview-btn" onclick="toggleLike('${movieData.id}')">
          <i class="fas fa-thumbs-up"></i>
        </button>
        <button class="preview-btn" onclick="showMoreInfo('${movieData.id}')">
          <i class="fas fa-chevron-down"></i>
        </button>
      </div>
      <div class="preview-info">
        <span class="preview-match">${movieData.match}% Match</span>
        <span class="preview-rating">${movieData.rating}</span>
        <span>${movieData.duration}</span>
      </div>
      <div class="preview-genres">
        ${movieData.genres.map(g => `<span class="preview-genre">${g}</span>`).join(' • ')}
      </div>
    `;

        card.appendChild(preview);
        this.currentPreview = preview;
    }

    getMovieData(card) {
        // Extraer datos de la card
        return {
            id: card.dataset.movieId || '',
            match: Math.floor(Math.random() * 30 + 70), // 70-100%
            rating: card.dataset.rating || 'PG-13',
            duration: card.dataset.duration || '2h 15m',
            genres: (card.dataset.genres || 'Acción,Drama').split(',')
        };
    }
}

// --- 2. BILLBOARD HERO MANAGER ---
class BillboardManager {
    constructor() {
        this.currentIndex = 0;
        this.billboards = [];
        this.autoplayInterval = null;
    }

    init(billboardsData) {
        this.billboards = billboardsData;
        if (this.billboards.length > 0) {
            this.showBillboard(0);
            this.startAutoplay();
        }
    }

    showBillboard(index) {
        const billboard = this.billboards[index];
        const container = document.querySelector('.billboard-hero');

        if (!container) return;

        container.innerHTML = `
      <div class="billboard-video-container">
        ${billboard.videoUrl ?
                `<video class="billboard-video" autoplay muted loop>
            <source src="${billboard.videoUrl}" type="video/mp4">
          </video>` :
                `<img src="${billboard.image}" alt="${billboard.title}" style="width:100%;height:100%;object-fit:cover;">`
            }
      </div>
      <div class="billboard-vignette"></div>
      <div class="billboard-content">
        ${billboard.logo ?
                `<img src="${billboard.logo}" alt="${billboard.title}" class="billboard-logo">` :
                `<h1 style="font-size:4rem;font-weight:900;margin-bottom:1.5rem;">${billboard.title}</h1>`
            }
        <p class="billboard-description">${billboard.description}</p>
        <div class="billboard-buttons">
          <button class="billboard-btn primary" onclick="playMovie('${billboard.id}')">
            <i class="fas fa-play"></i> Reproducir
          </button>
          <button class="billboard-btn secondary" onclick="showMoreInfo('${billboard.id}')">
            <i class="fas fa-info-circle"></i> Más información
          </button>
        </div>
      </div>
    `;

        this.currentIndex = index;
    }

    startAutoplay() {
        this.autoplayInterval = setInterval(() => {
            const nextIndex = (this.currentIndex + 1) % this.billboards.length;
            this.showBillboard(nextIndex);
        }, 10000); // Cambiar cada 10 segundos
    }

    stopAutoplay() {
        if (this.autoplayInterval) {
            clearInterval(this.autoplayInterval);
        }
    }
}

// --- 3. CATEGORY PILLS MANAGER ---
class CategoryPillsManager {
    constructor() {
        this.activeCategory = 'all';
    }

    init(categories) {
        const container = document.querySelector('.category-pills');
        if (!container) return;

        const pills = categories.map(cat => `
      <div class="category-pill ${cat.id === 'all' ? 'active' : ''}" 
           data-category="${cat.id}"
           onclick="categoryManager.selectCategory('${cat.id}')">
        ${cat.name}
      </div>
    `).join('');

        container.innerHTML = pills;
    }

    selectCategory(categoryId) {
        this.activeCategory = categoryId;

        // Actualizar UI
        document.querySelectorAll('.category-pill').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.category === categoryId);
        });

        // Filtrar contenido
        this.filterContent(categoryId);
    }

    filterContent(categoryId) {
        const allCards = document.querySelectorAll('.movie-card');

        allCards.forEach(card => {
            const cardCategories = (card.dataset.categories || '').split(',');
            const shouldShow = categoryId === 'all' || cardCategories.includes(categoryId);

            card.style.display = shouldShow ? 'block' : 'none';
        });
    }
}

// --- 4. CONTINUE WATCHING MANAGER ---
class ContinueWatchingManager {
    constructor() {
        this.watchData = this.loadWatchData();
    }

    loadWatchData() {
        const data = localStorage.getItem('continueWatching');
        return data ? JSON.parse(data) : {};
    }

    saveWatchData() {
        localStorage.setItem('continueWatching', JSON.stringify(this.watchData));
    }

    updateProgress(movieId, currentTime, duration) {
        const progress = (currentTime / duration) * 100;

        this.watchData[movieId] = {
            currentTime,
            duration,
            progress,
            timestamp: Date.now()
        };

        this.saveWatchData();
        this.updateProgressBar(movieId, progress);
    }

    updateProgressBar(movieId, progress) {
        const card = document.querySelector(`[data-movie-id="${movieId}"]`);
        if (!card) return;

        let progressBar = card.querySelector('.movie-card-progress');
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.className = 'movie-card-progress';
            progressBar.innerHTML = '<div class="progress-fill"></div>';
            card.appendChild(progressBar);
        }

        const fill = progressBar.querySelector('.progress-fill');
        fill.style.width = `${progress}%`;
    }

    getContinueWatchingList() {
        return Object.entries(this.watchData)
            .filter(([_, data]) => data.progress > 5 && data.progress < 95)
            .sort((a, b) => b[1].timestamp - a[1].timestamp)
            .slice(0, 10);
    }
}

// --- 5. TOP 10 MANAGER ---
class Top10Manager {
    constructor() {
        this.top10Data = [];
    }

    init(moviesData) {
        // Calcular top 10 basado en vistas, ratings, etc.
        this.top10Data = this.calculateTop10(moviesData);
        this.renderTop10Badges();
    }

    calculateTop10(movies) {
        return movies
            .sort((a, b) => (b.views || 0) - (a.views || 0))
            .slice(0, 10);
    }

    renderTop10Badges() {
        this.top10Data.forEach((movie, index) => {
            const card = document.querySelector(`[data-movie-id="${movie.id}"]`);
            if (!card) return;

            const badge = document.createElement('div');
            badge.className = 'top-10-badge';
            badge.textContent = index + 1;
            card.appendChild(badge);
        });
    }
}

// --- 6. MINI PLAYER MANAGER ---
class MiniPlayerManager {
    constructor() {
        this.isActive = false;
        this.videoElement = null;
    }

    init() {
        this.createMiniPlayer();
        this.setupScrollListener();
    }

    createMiniPlayer() {
        const miniPlayer = document.createElement('div');
        miniPlayer.className = 'mini-player';
        miniPlayer.id = 'mini-player';
        miniPlayer.innerHTML = `
      <video class="mini-player-video" id="mini-player-video"></video>
      <div class="mini-player-controls">
        <button class="mini-player-btn" onclick="miniPlayerManager.togglePlay()">
          <i class="fas fa-pause"></i>
        </button>
        <button class="mini-player-btn" onclick="miniPlayerManager.close()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
        document.body.appendChild(miniPlayer);
        this.videoElement = document.getElementById('mini-player-video');
    }

    setupScrollListener() {
        let mainPlayer = document.querySelector('.player-container video');
        if (!mainPlayer) return;

        window.addEventListener('scroll', () => {
            const playerRect = mainPlayer.getBoundingClientRect();
            const isPlayerVisible = playerRect.top < window.innerHeight && playerRect.bottom > 0;

            if (!isPlayerVisible && !mainPlayer.paused) {
                this.activate(mainPlayer.src, mainPlayer.currentTime);
            } else if (isPlayerVisible && this.isActive) {
                this.deactivate();
            }
        });
    }

    activate(src, currentTime) {
        this.videoElement.src = src;
        this.videoElement.currentTime = currentTime;
        this.videoElement.play();
        document.getElementById('mini-player').classList.add('active');
        this.isActive = true;
    }

    deactivate() {
        this.videoElement.pause();
        document.getElementById('mini-player').classList.remove('active');
        this.isActive = false;
    }

    togglePlay() {
        if (this.videoElement.paused) {
            this.videoElement.play();
        } else {
            this.videoElement.pause();
        }
    }

    close() {
        this.deactivate();
    }
}

// --- 7. SKIP INTRO MANAGER ---
class SkipIntroManager {
    constructor() {
        this.introStart = 0;
        this.introEnd = 0;
    }

    init(videoElement, introStart, introEnd) {
        this.introStart = introStart;
        this.introEnd = introEnd;

        videoElement.addEventListener('timeupdate', () => {
            this.checkIntro(videoElement);
        });
    }

    checkIntro(video) {
        const currentTime = video.currentTime;
        const skipBtn = document.querySelector('.skip-intro-btn');

        if (currentTime >= this.introStart && currentTime <= this.introEnd) {
            if (!skipBtn) {
                this.createSkipButton(video);
            } else {
                skipBtn.classList.add('show');
            }
        } else if (skipBtn) {
            skipBtn.classList.remove('show');
        }
    }

    createSkipButton(video) {
        const btn = document.createElement('button');
        btn.className = 'skip-intro-btn';
        btn.textContent = 'Saltar Intro';
        btn.onclick = () => {
            video.currentTime = this.introEnd;
            btn.classList.remove('show');
        };
        video.parentElement.appendChild(btn);
    }
}

// --- 8. NEXT EPISODE MANAGER ---
class NextEpisodeManager {
    constructor() {
        this.nextEpisode = null;
        this.countdownTimer = null;
    }

    init(videoElement, nextEpisodeData) {
        this.nextEpisode = nextEpisodeData;

        videoElement.addEventListener('timeupdate', () => {
            this.checkEndCredits(videoElement);
        });
    }

    checkEndCredits(video) {
        const timeRemaining = video.duration - video.currentTime;

        if (timeRemaining <= 30 && timeRemaining > 0) {
            this.showNextEpisodeCard();
            this.startCountdown(video, timeRemaining);
        }
    }

    showNextEpisodeCard() {
        let card = document.querySelector('.next-episode-card');

        if (!card && this.nextEpisode) {
            card = document.createElement('div');
            card.className = 'next-episode-card';
            card.innerHTML = `
        <img src="${this.nextEpisode.thumbnail}" class="next-episode-thumbnail" alt="${this.nextEpisode.title}">
        <div class="next-episode-info">
          <h4>Siguiente episodio</h4>
          <h3>${this.nextEpisode.title}</h3>
          <p>${this.nextEpisode.description}</p>
        </div>
      `;
            document.querySelector('.player-container').appendChild(card);
            setTimeout(() => card.classList.add('show'), 100);
        }
    }

    startCountdown(video, initialTime) {
        let countdown = Math.floor(initialTime);

        const countdownEl = this.createCountdownElement();

        this.countdownTimer = setInterval(() => {
            countdown--;
            countdownEl.querySelector('.countdown-number').textContent = countdown;

            if (countdown <= 0) {
                this.playNextEpisode();
            }
        }, 1000);
    }

    createCountdownElement() {
        let el = document.querySelector('.autoplay-countdown');

        if (!el) {
            el = document.createElement('div');
            el.className = 'autoplay-countdown';
            el.innerHTML = `
        <span class="countdown-text">Siguiente episodio en</span>
        <span class="countdown-number">10</span>
        <button class="cancel-autoplay" onclick="nextEpisodeManager.cancelAutoplay()">
          Cancelar
        </button>
      `;
            document.querySelector('.player-container').appendChild(el);
        }

        el.classList.add('show');
        return el;
    }

    cancelAutoplay() {
        clearInterval(this.countdownTimer);
        document.querySelector('.autoplay-countdown')?.classList.remove('show');
    }

    playNextEpisode() {
        if (this.nextEpisode) {
            window.location.href = `detalles.html?id=${this.nextEpisode.id}`;
        }
    }
}

// --- 9. VOLUME INDICATOR ---
class VolumeIndicatorManager {
    constructor() {
        this.hideTimeout = null;
    }

    init() {
        this.createIndicator();
        this.setupKeyboardControls();
    }

    createIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'volume-indicator';
        indicator.id = 'volume-indicator';
        indicator.innerHTML = `
      <i class="fas fa-volume-up volume-icon"></i>
      <div class="volume-bar">
        <div class="volume-fill" style="width: 100%"></div>
      </div>
    `;
        document.body.appendChild(indicator);
    }

    show(volume) {
        const indicator = document.getElementById('volume-indicator');
        const fill = indicator.querySelector('.volume-fill');
        const icon = indicator.querySelector('.volume-icon');

        fill.style.width = `${volume}%`;

        // Cambiar icono según volumen
        if (volume === 0) {
            icon.className = 'fas fa-volume-mute volume-icon';
        } else if (volume < 50) {
            icon.className = 'fas fa-volume-down volume-icon';
        } else {
            icon.className = 'fas fa-volume-up volume-icon';
        }

        indicator.classList.add('show');

        clearTimeout(this.hideTimeout);
        this.hideTimeout = setTimeout(() => {
            indicator.classList.remove('show');
        }, 1000);
    }

    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            const video = document.querySelector('video');
            if (!video) return;

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                video.volume = Math.min(1, video.volume + 0.1);
                this.show(video.volume * 100);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                video.volume = Math.max(0, video.volume - 0.1);
                this.show(video.volume * 100);
            }
        });
    }
}

// --- INICIALIZACIÓN GLOBAL ---
let previewManager, billboardManager, categoryManager, continueWatchingManager;
let top10Manager, miniPlayerManager, skipIntroManager, nextEpisodeManager, volumeManager;

function initNetflixAdvancedFeatures() {
    // Inicializar todos los managers
    previewManager = new PreviewCardManager();
    previewManager.init();

    categoryManager = new CategoryPillsManager();
    continueWatchingManager = new ContinueWatchingManager();
    top10Manager = new Top10Manager();
    miniPlayerManager = new MiniPlayerManager();
    miniPlayerManager.init();

    volumeManager = new VolumeIndicatorManager();
    volumeManager.init();

    console.log('✅ Netflix Advanced Features initialized');
}

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNetflixAdvancedFeatures);
} else {
    initNetflixAdvancedFeatures();
}
