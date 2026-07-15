const audio = document.getElementById('audio-player');
const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const progressBar = document.getElementById('progress-bar');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl = document.getElementById('total-time');

const playerCover = document.getElementById('player-cover');
const playerTitle = document.getElementById('player-title');
const playerArtist = document.getElementById('player-artist');

// Выбор и загрузка трека
async function selectTrack(index) {
    if (index < 0 || index >= state.currentTracks.length) return;
    
    state.currentIndex = index;
    const track = state.currentTracks[index];

    // Обновляем плеер в UI
    playerTitle.textContent = track.title;
    playerArtist.textContent = track.artist;
    playerCover.src = track.cover;

    // Выделяем активный трек в списке
    const items = document.querySelectorAll('.track-item');
    items.forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });

    // Получаем список файлов из архива, чтобы найти mp3
    try {
        const response = await fetch(`https://archive.org/metadata/${track.id}`);
        const data = await response.json();
        
        // Находим первый аудиофайл (часто mp3 или ogg)
        const audioFile = data.files.find(f => f.name.endsWith('.mp3') || f.name.endsWith('.ogg'));
        
        if (audioFile) {
            const streamUrl = `https://archive.org/download/${track.id}/${audioFile.name}`;
            audio.src = streamUrl;
            playTrack();
        } else {
            alert('Не удалось найти подходящий аудиофайл для воспроизведения.');
        }
    } catch (e) {
        console.error("Ошибка загрузки аудиофайла:", e);
    }
}

function playTrack() {
    audio.play();
    playBtn.innerHTML = `<span class="material-icons">pause</span>`;
}

function pauseTrack() {
    audio.pause();
    playBtn.innerHTML = `<span class="material-icons">play_arrow</span>`;
}

// События кнопок плеера
playBtn.addEventListener('click', () => {
    if (audio.paused) {
        if (state.currentIndex === -1 && state.currentTracks.length > 0) {
            selectTrack(0);
        } else {
            playTrack();
        }
    } else {
        pauseTrack();
    }
});

prevBtn.addEventListener('click', () => {
    if (state.currentIndex > 0) {
        selectTrack(state.currentIndex - 1);
    }
});

nextBtn.addEventListener('click', () => {
    if (state.currentIndex < state.currentTracks.length - 1) {
        selectTrack(state.currentIndex + 1);
    }
});

// Обновление прогресс-бара
audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
        const percent = (audio.currentTime / audio.duration) * 100;
        progressBar.value = percent;
        
        currentTimeEl.textContent = formatTime(audio.currentTime);
        totalTimeEl.textContent = formatTime(audio.duration);
    }
});

// Перемотка вручную
progressBar.addEventListener('input', () => {
    if (audio.duration) {
        const newTime = (progressBar.value / 100) * audio.duration;
        audio.currentTime = newTime;
    }
});

// Автоматическое переключение на следующий трек
audio.addEventListener('ended', () => {
    if (state.currentIndex < state.currentTracks.length - 1) {
        selectTrack(state.currentIndex + 1);
    } else {
        pauseTrack();
    }
});

// Форматирование секунд в "минуты:секунды"
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}