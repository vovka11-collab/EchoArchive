/**
 * EchoArchive — Moments: «Продолжить слушать» + контекстные чипы по времени суток.
 * (таймер сна удалён)
 */
window.Moments = {
    init() {
        this.renderContinue();
        this.renderMoments();
        const cp = document.getElementById('continue-play');
        if (cp) cp.addEventListener('click', () => this.playContinue());
        const cc = document.getElementById('continue-card');
        if (cc) cc.addEventListener('click', (e) => { if (e.target.closest('#continue-play')) return; this.playContinue(); });
    },

    getLastTrack() {
        try { return JSON.parse(localStorage.getItem('echoarchive_last_track') || 'null'); } catch (e) { return null; }
    },

    renderContinue() {
        const card = document.getElementById('continue-card'); if (!card) return;
        const t = this.getLastTrack();
        if (!t || !t.title) { card.hidden = true; return; }
        card.hidden = false;
        const set = (i, v) => { const el = document.getElementById(i); if (el) el.textContent = v; };
        set('continue-title', t.title); set('continue-artist', t.artist || '');
        const cov = document.getElementById('continue-cover'); if (cov && t.cover) cov.src = t.cover;
    },

    playContinue() {
        const t = this.getLastTrack(); if (!t) return;
        window.Player.loadAndPlay(t, [t], 0);
    },

    momentSet() {
        const h = new Date().getHours();
        return [
            { icon: 'local_cafe', label: 'Бодрое утро', q: 'upbeat morning', when: () => h >= 5 && h < 12 },
            { icon: 'psychology', label: 'Фокус', q: 'ambient focus instrumental', when: () => h >= 9 && h < 18 },
            { icon: 'directions_walk', label: 'Прогулка', q: 'groove walk', when: () => h >= 10 && h < 21 },
            { icon: 'restaurant', label: 'За едой', q: 'jazz lounge', when: () => (h >= 11 && h < 15) || (h >= 18 && h < 21) },
            { icon: 'nightlight', label: 'Вечер', q: 'chill evening', when: () => h >= 17 && h < 23 },
            { icon: 'dark_mode', label: 'Поздний час', q: 'downtempo night', when: () => h >= 22 || h < 5 }
        ];
    },

    renderMoments() {
        const row = document.getElementById('moments-row'); if (!row) return;
        row.innerHTML = '';
        this.momentSet().forEach(m => {
            const chip = document.createElement('button');
            chip.className = 'moment-chip' + (m.when() ? ' is-now' : '');
            chip.innerHTML = '<span class="material-icons">' + m.icon + '</span>' + m.label;
            chip.addEventListener('click', () => {
                const input = document.getElementById('search-input');
                if (input) input.value = m.q;
                window.App.switchScreen('search', true);
                window.Search.performSearch();
            });
            row.appendChild(chip);
        });
    }
};