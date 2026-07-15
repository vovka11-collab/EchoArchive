// Конфиг и глобальное состояние
const state = {
    currentTracks: [],
    currentIndex: -1
};

// Функция поиска на Archive.org
async function searchArchive(query) {
    const tracksList = document.getElementById('tracks-list');
    tracksList.innerHTML = `<p class="status-msg">Загрузка треков...</p>`;

    try {
        // Запрос к Archive.org API для поиска аудиозаписей
        const response = await fetch(`https://archive.org/advancedsearch.php?q=title:(${query}) AND mediatype:(audio)&fl[]=identifier,title,creator,downloads&sort[]=downloads+desc&output=json&rows=15`);
        const data = await response.json();
        
        const docs = data.response.docs;
        if (!docs || docs.length === 0) {
            tracksList.innerHTML = `<p class="status-msg">Ничего не найдено 😢</p>`;
            return;
        }

        state.currentTracks = docs.map(doc => ({
            id: doc.identifier,
            title: doc.title || 'Unknown Title',
            artist: doc.creator || 'Unknown Artist',
            // Стандартное лого архива, если нет обложки
            cover: `https://archive.org/services/img/${doc.identifier}`
        }));

        renderTracks();
    } catch (error) {
        console.error(error);
        tracksList.innerHTML = `<p class="status-msg">Ошибка сети. Попробуйте еще раз.</p>`;
    }
}

// Рендерим треки на экран
function renderTracks() {
    const tracksList = document.getElementById('tracks-list');
    tracksList.innerHTML = '';

    state.currentTracks.forEach((track, index) => {
        const trackItem = document.createElement('div');
        trackItem.className = 'track-item';
        trackItem.innerHTML = `
            <img src="${track.cover}" class="track-img" onerror="this.src='https://archive.org/images/glogo.png'">
            <div class="track-info">
                <div class="track-title">${track.title}</div>
                <div class="track-artist">${track.artist}</div>
            </div>
        `;

        // Клик по треку запускает проигрывание
        trackItem.addEventListener('click', () => {
            selectTrack(index);
        });

        tracksList.appendChild(trackItem);
    });
}

// Слушатели поиска
document.getElementById('search-btn').addEventListener('click', () => {
    const query = document.getElementById('search-input').value.trim();
    if (query) searchArchive(query);
});

document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const query = document.getElementById('search-input').value.trim();
        if (query) searchArchive(query);
    }
});

// Автопоиск при старте приложения
window.addEventListener('DOMContentLoaded', () => {
    searchArchive('Nier Automata');
});