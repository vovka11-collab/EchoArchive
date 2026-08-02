/**
 * EchoArchive — Moments: повседневный помощник.
 * «Продолжить слушать» + контекстные чипы по времени суток + таймер сна.
 */
window.Moments = {
    init() {
        this.renderContinue();
        this.renderMoments();
        this.initSleepModal();
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

    /* чипы зависят от часа; «сейчас» подсвечивается */
    momentSet() {
        const h = new Date().getHours();
        const base = [
            { icon: 'local_cafe', label: 'Бодрое утро', q: 'upbeat morning', when: () => h >= 5 && h < 12 },
            { icon: 'psychology', label: 'Фокус', q: 'ambient focus instrumental', when: () => h >= 9 && h < 18 },
            { icon: 'directions_walk', label: 'Прогулка', q: 'groove walk', when: () => h >= 10 && h < 21 },
            { icon: 'restaurant', label: 'За едой', q: 'jazz lounge', when: () => (h >= 11 && h < 15) || (h >= 18 && h < 21) },
            { icon: 'nightlight', label: 'Вечер', q: 'chill evening', when: () => h >= 17 && h < 23 },
            { icon: 'bedtime', label: 'Сон', sleep: true, when: () => h >= 21 || h < 5 }
        ];
        return base;
    },

    renderMoments() {
        const row = document.getElementById('moments-row'); if (!row) return;
        row.innerHTML = '';
        const set = this.momentSet();
        set.forEach(m => {
            const chip = document.createElement('button');
            chip.className = 'moment-chip' + (m.when() ? ' is-now' : '');
            chip.innerHTML = '<span class="material-icons">' + m.icon + '</span>' + m.label;
            chip.addEventListener('click', () => {
                if (m.sleep) { this.openSleepModal(); return; }
                const input = document.getElementById('search-input');
                if (input) input.value = m.q;
                window.App.switchScreen('search', true);
                window.Search.performSearch();
            });
            row.appendChild(chip);
        });
    },

    /* ═══════════ SLEEP MODAL ═══════════ */
    initSleepModal() {
        const modal = document.getElementById('modal-sleep');
        const cancel = document.getElementById('btn-cancel-sleep');
        const grid = document.getElementById('sleep-grid');
        if (cancel) cancel.addEventListener('click', () => this.closeSleepModal());
        if (modal) modal.addEventListener('click', e => { if (e.target === modal) this.closeSleepModal(); });
        if (grid) {
            grid.innerHTML = '';
            const opts = [15, 30, 45, 60, 90];
            opts.forEach(min => {
                const b = document.createElement('button'); b.className = 'sleep-opt'; b.dataset.min = min;
                b.innerHTML = min + '<small>мин</small>';
                b.addEventListener('click', () => this.pickSleep(min));
                grid.appendChild(b);
            });
            const off = document.createElement('button'); off.className = 'sleep-opt off'; off.dataset.min = '0';
            off.textContent = 'Выключить';
            off.addEventListener('click', () => this.pickSleep(0));
            grid.appendChild(off);
        }
    },

    openSleepModal() {
        const modal = document.getElementById('modal-sleep'); if (!modal) return;
        const cur = window.Player.getSleepMinutes();
        modal.querySelectorAll('.sleep-opt').forEach(b => b.classList.toggle('active', parseInt(b.dataset.min) === cur));
        modal.style.display = 'flex';
    },
    closeSleepModal() { const m = document.getElementById('modal-sleep'); if (m) m.style.display = 'none'; },

    pickSleep(min) {
        window.Player.setSleepTimer(min);
        this.closeSleepModal();
        if (min > 0) window.App.showToast('Таймер сна: ' + min + ' мин');
        else window.App.showToast('Таймер сна выключен');
    }
};