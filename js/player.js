/**
 * EchoArchive — Player.
 * Трек уже содержит готовый url (releaseId+file). Legacy-треки без file
 * резолвятся через metadata (старое поведение).
 */
window.Player = {
    audio: new Audio(),
    queue: [], currentIndex: -1, isPlaying: false,
    shuffleMode: false, repeatMode: 0, shuffleOrder: [],

    init() {
        this.audio.preload = 'auto';
        this.audio.addEventListener('timeupdate', () => this.onTimeUpdate());
        this.audio.addEventListener('ended', () => this.onEnded());
        this.audio.addEventListener('error', () => this.onError());
        this.audio.addEventListener('waiting', () => this.setLoading(true));
        this.audio.addEventListener('playing', () => this.setLoading(false));

        const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
        on('play-btn', () => this.togglePlay());
        on('prev-btn', () => this.prev());
        on('next-btn', () => this.next());
        on('shuffle-btn', () => this.toggleShuffle());
        on('repeat-btn', () => this.toggleRepeat());

        const bar = document.getElementById('progress-bar');
        if (bar) bar.addEventListener('input', e => { if (this.audio.duration) this.audio.currentTime = (e.target.value / 100) * this.audio.duration; });
    },

    buildUrl(track) {
        if (track.url) return track.url;
        if (track.releaseId && track.file) return 'https://archive.org/download/' + track.releaseId + '/' + encodeURIComponent(track.file);
        return null;
    },

    async loadAndPlay(track, queue, index) {
        this.queue = (queue && queue.length) ? queue : [track];
        this.currentIndex = (typeof index === 'number') ? index : 0;
        this.generateShuffleOrder();
        this.audio.pause(); this.isPlaying = false; this.showBar();

        const titleEl = document.getElementById('player-title');
        const artistEl = document.getElementById('player-artist');
        const coverEl = document.getElementById('player-cover');
        if (titleEl) titleEl.textContent = 'Загрузка...';
        if (artistEl) artistEl.textContent = track.artist || '';
        if (coverEl) coverEl.src = track.cover || 'assets/icons/logo-app.png';

        try {
            let url = this.buildUrl(track);
            if (!url) url = await this.legacyResolve(track);   // старые записи без file
            if (!url) { if (titleEl) titleEl.textContent = 'Нет подходящего аудиофайла'; return; }
            track.url = url;
            this.audio.src = url; this.audio.load();
            if (titleEl) titleEl.textContent = track.title || 'Без названия';
            this.play(); this.highlightCurrent();
        } catch (err) {
            console.error('Player load', err);
            if (titleEl) titleEl.textContent = 'Ошибка загрузки';
        }
    },

    /** fallback для legacy-треков: metadata → первый файл по предпочтениям форматов */
    async legacyResolve(track) {
        const id = track.releaseId || track.id; if (!id) return null;
        try {
            const r = await fetch('https://archive.org/metadata/' + id);
            const data = await r.json();
            const file = window.Album ? window.Album.pickFile(data.files) : null;
            if (!file) return null;
            track.file = file.name; track.url = 'https://archive.org/download/' + id + '/' + encodeURIComponent(file.name);
            return track.url;
        } catch (e) { return null; }
    },

    play() { this.audio.play().then(() => { this.isPlaying = true; this.updatePlayIcon(); }).catch(e => console.error('play()', e)); },
    pause() { this.audio.pause(); this.isPlaying = false; this.updatePlayIcon(); },
    togglePlay() { if (!this.audio.src) return; this.isPlaying ? this.pause() : this.play(); },

    next() {
        if (!this.queue.length) return;
        let idx;
        if (this.shuffleMode) { const pos = this.shuffleOrder.indexOf(this.currentIndex); idx = this.shuffleOrder[(pos + 1) % this.shuffleOrder.length]; }
        else { idx = this.currentIndex + 1; if (idx >= this.queue.length) { if (this.repeatMode === 1) idx = 0; else { this.pause(); return; } } }
        this.loadAndPlay(this.queue[idx], this.queue, idx);
    },
    prev() {
        if (!this.queue.length) return;
        if (this.audio.currentTime > 3) { this.audio.currentTime = 0; return; }
        let idx;
        if (this.shuffleMode) { const pos = this.shuffleOrder.indexOf(this.currentIndex); idx = this.shuffleOrder[(pos - 1 + this.shuffleOrder.length) % this.shuffleOrder.length]; }
        else { idx = this.currentIndex - 1; if (idx < 0) idx = this.repeatMode === 1 ? this.queue.length - 1 : 0; }
        this.loadAndPlay(this.queue[idx], this.queue, idx);
    },

    toggleShuffle() {
        this.shuffleMode = !this.shuffleMode;
        const b = document.getElementById('shuffle-btn'); if (b) b.classList.toggle('active', this.shuffleMode);
        if (this.shuffleMode) this.generateShuffleOrder();
    },
    toggleRepeat() {
        this.repeatMode = (this.repeatMode + 1) % 3;
        const b = document.getElementById('repeat-btn'); if (!b) return;
        const ic = b.querySelector('.material-icons'); b.classList.toggle('active', this.repeatMode > 0);
        if (ic) ic.textContent = this.repeatMode === 2 ? 'repeat_one' : 'repeat';
    },
    generateShuffleOrder() {
        this.shuffleOrder = this.queue.map((_, i) => i);
        for (let i = this.shuffleOrder.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [this.shuffleOrder[i], this.shuffleOrder[j]] = [this.shuffleOrder[j], this.shuffleOrder[i]]; }
    },

    onTimeUpdate() {
        const cur = this.audio.currentTime || 0, dur = this.audio.duration || 0;
        const bar = document.getElementById('progress-bar'); if (dur > 0 && bar) bar.value = (cur / dur) * 100;
    },
    onEnded() { if (this.repeatMode === 2) { this.audio.currentTime = 0; this.play(); } else this.next(); },
    onError() { this.setLoading(false); const t = document.getElementById('player-title'); if (t) t.textContent = 'Ошибка воспроизведения'; },
    updatePlayIcon() { const ic = document.querySelector('#play-btn .material-icons'); if (ic) ic.textContent = this.isPlaying ? 'pause' : 'play_arrow'; },
    setLoading(l) { const ic = document.querySelector('#play-btn .material-icons'); if (l && ic) ic.textContent = 'hourglass_empty'; else this.updatePlayIcon(); },
    showBar() { const b = document.getElementById('player-bar'); if (b) b.style.display = 'block'; },

    highlightCurrent() {
        document.querySelectorAll('.playlist-track-item.playing').forEach(el => el.classList.remove('playing'));
        const cur = this.queue[this.currentIndex]; if (!cur || !window.App) return;
        const key = window.App.trackKey(cur);
        document.querySelectorAll('.playlist-track-item[data-track-key="' + key + '"]').forEach(el => el.classList.add('playing'));
    },
    getCurrentTrack() { return (this.currentIndex >= 0 && this.currentIndex < this.queue.length) ? this.queue[this.currentIndex] : null; }
};