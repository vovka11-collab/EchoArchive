/**
 * EchoArchive — Audio Player
 * Плеер с поддержкой shuffle, repeat, очереди
 */
window.Player = {
    audio: new Audio(),
    queue: [],
    currentIndex: -1,
    isPlaying: false,
    shuffleMode: false,
    repeatMode: 0,
    shuffleOrder: [],

    init() {
        this.audio.preload = 'auto';

        this.audio.addEventListener('timeupdate', () => this.onTimeUpdate());
        this.audio.addEventListener('ended', () => this.onEnded());
        this.audio.addEventListener('error', () => this.onError());
        this.audio.addEventListener('waiting', () => this.setLoading(true));
        this.audio.addEventListener('playing', () => this.setLoading(false));

        const playBtn = document.getElementById('play-btn');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const shuffleBtn = document.getElementById('shuffle-btn');
        const repeatBtn = document.getElementById('repeat-btn');

        if (playBtn) playBtn.addEventListener('click', () => this.togglePlay());
        if (prevBtn) prevBtn.addEventListener('click', () => this.prev());
        if (nextBtn) nextBtn.addEventListener('click', () => this.next());
        if (shuffleBtn) shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        if (repeatBtn) repeatBtn.addEventListener('click', () => this.toggleRepeat());

        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.addEventListener('input', (e) => {
                if (this.audio.duration) {
                    this.audio.currentTime = (e.target.value / 100) * this.audio.duration;
                }
            });
        }
    },

    async loadAndPlay(track, queue, index) {
        this.queue = queue || [track];
        this.currentIndex = index || 0;
        this.generateShuffleOrder();

        this.audio.pause();
        this.isPlaying = false;
        this.showBar();

        const titleEl = document.getElementById('player-title');
        const artistEl = document.getElementById('player-artist');
        const coverEl = document.getElementById('player-cover');

        if (titleEl) titleEl.textContent = 'Загрузка...';
        if (artistEl) artistEl.textContent = track.artist || '';
        if (coverEl) coverEl.src = track.cover || 'assets/icons/logo-app.png';

        try {
            const streamUrl = await this.resolveStreamUrl(track.id);
            if (!streamUrl) {
                if (titleEl) titleEl.textContent = 'Нет MP3 в этом релизе';
                return;
            }
            this.audio.src = streamUrl;
            this.audio.load();
            if (titleEl) titleEl.textContent = track.title || 'Без названия';
            this.play();
            this.highlightCurrent();
        } catch (err) {
            console.error('Player: ошибка загрузки', err);
            if (titleEl) titleEl.textContent = 'Ошибка загрузки';
        }
    },

    async resolveStreamUrl(itemId) {
        const response = await fetch('https://archive.org/metadata/' + itemId);
        const data = await response.json();
        if (!data.files || !data.files.length) return null;

        const mp3Files = data.files.filter(f =>
            f.name && f.name.toLowerCase().endsWith('.mp3')
        );
        if (!mp3Files.length) return null;

        mp3Files.sort((a, b) => {
            const brA = parseInt(a.bitrate) || 0;
            const brB = parseInt(b.bitrate) || 0;
            return brB - brA;
        });

        const file = mp3Files[0];
        return 'https://archive.org/download/' + itemId + '/' + encodeURIComponent(file.name);
    },

    play() {
        this.audio.play()
            .then(() => {
                this.isPlaying = true;
                this.updatePlayIcon();
            })
            .catch(err => console.error('Player: play() отклонён', err));
    },

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.updatePlayIcon();
    },

    togglePlay() {
        if (!this.audio.src) return;
        if (this.isPlaying) this.pause();
        else this.play();
    },

    next() {
        if (!this.queue.length) return;
        let nextIdx;
        if (this.shuffleMode) {
            const pos = this.shuffleOrder.indexOf(this.currentIndex);
            const nextPos = (pos + 1) % this.shuffleOrder.length;
            nextIdx = this.shuffleOrder[nextPos];
        } else {
            nextIdx = this.currentIndex + 1;
            if (nextIdx >= this.queue.length) {
                if (this.repeatMode === 1) nextIdx = 0;
                else { this.pause(); return; }
            }
        }
        this.loadAndPlay(this.queue[nextIdx], this.queue, nextIdx);
    },

    prev() {
        if (!this.queue.length) return;
        if (this.audio.currentTime > 3) {
            this.audio.currentTime = 0;
            return;
        }
        let prevIdx;
        if (this.shuffleMode) {
            const pos = this.shuffleOrder.indexOf(this.currentIndex);
            const prevPos = (pos - 1 + this.shuffleOrder.length) % this.shuffleOrder.length;
            prevIdx = this.shuffleOrder[prevPos];
        } else {
            prevIdx = this.currentIndex - 1;
            if (prevIdx < 0) prevIdx = this.repeatMode === 1 ? this.queue.length - 1 : 0;
        }
        this.loadAndPlay(this.queue[prevIdx], this.queue, prevIdx);
    },

    toggleShuffle() {
        this.shuffleMode = !this.shuffleMode;
        const btn = document.getElementById('shuffle-btn');
        if (btn) btn.classList.toggle('active', this.shuffleMode);
        if (this.shuffleMode) this.generateShuffleOrder();
    },

    toggleRepeat() {
        this.repeatMode = (this.repeatMode + 1) % 3;
        const btn = document.getElementById('repeat-btn');
        if (!btn) return;
        const icon = btn.querySelector('.material-icons');
        btn.classList.toggle('active', this.repeatMode > 0);
        if (icon) icon.textContent = this.repeatMode === 2 ? 'repeat_one' : 'repeat';
    },

    generateShuffleOrder() {
        this.shuffleOrder = this.queue.map((_, i) => i);
        for (let i = this.shuffleOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.shuffleOrder[i], this.shuffleOrder[j]] = [this.shuffleOrder[j], this.shuffleOrder[i]];
        }
    },

    onTimeUpdate() {
        const cur = this.audio.currentTime || 0;
        const dur = this.audio.duration || 0;
        const progressBar = document.getElementById('progress-bar');
        if (dur > 0 && progressBar) progressBar.value = (cur / dur) * 100;
    },

    onEnded() {
        if (this.repeatMode === 2) {
            this.audio.currentTime = 0;
            this.play();
        } else {
            this.next();
        }
    },

    onError() {
        this.setLoading(false);
        const titleEl = document.getElementById('player-title');
        if (titleEl) titleEl.textContent = 'Ошибка воспроизведения';
    },

    updatePlayIcon() {
        const icon = document.querySelector('#play-btn .material-icons');
        if (icon) icon.textContent = this.isPlaying ? 'pause' : 'play_arrow';
    },

    setLoading(loading) {
        const icon = document.querySelector('#play-btn .material-icons');
        if (loading && icon) icon.textContent = 'hourglass_empty';
        else this.updatePlayIcon();
    },

    showBar() {
        const bar = document.getElementById('player-bar');
        if (bar) bar.style.display = 'block';
    },

    highlightCurrent() {
        document.querySelectorAll('.track-item.playing, .playlist-track-item.playing').forEach(el => {
            el.classList.remove('playing');
        });
        const currentTrack = this.queue[this.currentIndex];
        if (!currentTrack) return;
        document.querySelectorAll('[data-track-id="' + currentTrack.id + '"]').forEach(el => {
            el.classList.add('playing');
        });
    },

    getCurrentTrack() {
        if (this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
            return this.queue[this.currentIndex];
        }
        return null;
    }
};