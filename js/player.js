window.Player = {
    audio: new Audio(),
    playlist: [],
    currentIndex: -1,
    isPlaying: false,

    init() {
        // Слушаем события аудио-движка
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.next());

        // Привязываем кнопки управления
        const playBtn = document.getElementById('play-btn');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');

        if (playBtn) playBtn.onclick = () => this.togglePlay();
        if (prevBtn) prevBtn.onclick = () => this.prev();
        if (nextBtn) nextBtn.onclick = () => this.next();

        // Перемотка трека пальцем по полоске
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.oninput = (e) => {
                if (this.audio.duration) {
                    this.audio.currentTime = (e.target.value / 100) * this.audio.duration;
                }
            };
        }
    },

    async loadAndPlay(track, playlist, index) {
        this.playlist = playlist;
        this.currentIndex = index;

        this.audio.pause();
        this.isPlaying = false;

        document.getElementById('player-title').innerText = "Загрузка...";
        document.getElementById('player-artist').innerText = track.artist;
        document.getElementById('player-cover').src = track.cover;

        try {
            // Запрашиваем список файлов релиза
            const response = await fetch(`https://archive.org/metadata/${track.id}`);
            const data = await response.json();
            
            // Находим первый MP3-файл в раздаче
            const mp3File = data.files.find(f => f.name.endsWith('.mp3'));

            if (!mp3File) {
                alert("В этом релизе не найдено MP3 файлов.");
                document.getElementById('player-title').innerText = "Формат не поддерживается";
                return;
            }

            // Прямой стриминговый URL
            const streamUrl = `https://archive.org/download/${track.id}/${encodeURIComponent(mp3File.name)}`;
            
            this.audio.src = streamUrl;
            this.audio.load();

            document.getElementById('player-title').innerText = track.title;
            this.play();

        } catch (error) {
            console.error("Ошибка при получении файлов:", error);
            document.getElementById('player-title').innerText = "Ошибка загрузки";
        }
    },

    play() {
        this.audio.play()
            .then(() => {
                this.isPlaying = true;
                const playIcon = document.querySelector('#play-btn .material-icons');
                if (playIcon) playIcon.innerText = 'pause';
            })
            .catch(err => {
                console.error("Ошибка воспроизведения:", err);
            });
    },

    togglePlay() {
        if (!this.audio.src) return;
        
        const playIcon = document.querySelector('#play-btn .material-icons');
        if (this.isPlaying) {
            this.audio.pause();
            this.isPlaying = false;
            if (playIcon) playIcon.innerText = 'play_arrow';
        } else {
            this.audio.play()
                .then(() => {
                    this.isPlaying = true;
                    if (playIcon) playIcon.innerText = 'pause';
                });
        }
    },

    next() {
        if (this.currentIndex < this.playlist.length - 1) {
            const nextIndex = this.currentIndex + 1;
            this.loadAndPlay(this.playlist[nextIndex], this.playlist, nextIndex);
        }
    },

    prev() {
        if (this.currentIndex > 0) {
            const prevIndex = this.currentIndex - 1;
            this.loadAndPlay(this.playlist[prevIndex], this.playlist, prevIndex);
        }
    },

    updateProgress() {
        const cur = this.audio.currentTime || 0;
        const dur = this.audio.duration || 0;
        const progressBar = document.getElementById('progress-bar');
        if (dur > 0 && progressBar) {
            progressBar.value = (cur / dur) * 100;
        }
    }
};