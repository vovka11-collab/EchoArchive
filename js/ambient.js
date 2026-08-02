/**
 * EchoArchive — Ambient layer: живой фон, ripple от касания.
 * Без извлечения цвета из картинок (CORS-safe): свечение берётся из акцента темы.
 */
window.Ambient = {
    init() {
        this.buildBackground();
        this.initRipple();
    },

    buildBackground() {
        if (document.querySelector('.ambient')) return;
        const wrap = document.createElement('div');
        wrap.className = 'ambient';
        wrap.innerHTML =
            '<div class="ambient-blob b1"></div>' +
            '<div class="ambient-blob b2"></div>' +
            '<div class="ambient-blob b3"></div>' +
            '<div class="ambient-grain"></div>' +
            '<div class="ambient-vignette"></div>';
        const container = document.querySelector('.app-container');
        if (container) container.insertBefore(wrap, container.firstChild);
    },

    initRipple() {
        const hosts = '.playlist-card,.track-item,.playlist-track-item,.playlist-list-item,.quick-item,' +
            '.btn-primary,.btn-secondary,.nav-item,.filter-chip,.control-btn,.theme-opt,.format-row,' +
            '.similar-card,.menu-item,.add-to-item,.icon-btn,.btn-create-playlist,.back-btn,.btn-more,' +
            '.search-btn,.btn-play-large,.btn-shuffle-large,.continue-play,.moment-chip,.sleep-opt';
        document.addEventListener('pointerdown', (e) => {
            if (document.documentElement.getAttribute('data-reduce-motion') === 'on') return;
            const host = e.target.closest(hosts);
            if (!host) return;
            const rect = host.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const ink = document.createElement('span');
            ink.className = 'ripple-ink';
            ink.style.width = ink.style.height = size + 'px';
            ink.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ink.style.top = (e.clientY - rect.top - size / 2) + 'px';
            host.appendChild(ink);
            setTimeout(() => ink.remove(), 650);
        });
    }
};