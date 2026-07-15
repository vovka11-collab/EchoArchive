// Конфиг и глобальное состояние
const state = {
    currentTracks: [],
    currentIndex: -1,
    searchType: 'track' // По умолчанию ищем по трекам
};

// Функция поиска на Archive.org с учетом выбранного типа
async function searchArchive(query) {
    const tracksList = document.getElementById('tracks-list');
    tracksList.innerHTML = `<p class="status-msg">Загрузка...</p>`;

    try {
        let apiQuery = '';

        // Формируем запрос в зависимости от выбранного типа поиска
        if (state.searchType === 'track') {
            apiQuery = `title:(${query}) AND mediatype:(audio)`;
        } else if (state.searchType === 'artist') {
            apiQuery = `creator:(${query}) AND mediatype:(audio)`;
        } else if (state.searchType === 'album') {
            // Ищем аудио-коллекции или записи, содержащие "album" в метаданных
            apiQuery = `(title:(${query}) OR subject:(album)) AND mediatype:(audio)`;
        } else if (state.searchType === 'playlist') {
            // Ищем плейлисты / подборки
            apiQuery = `(title:(${query}) OR description:(playlist)) AND mediatype:(audio)`;
        }

        const response = await fetch(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(apiQuery)}&fl[]=identifier,title,creator,downloads&sort[]=downloads+desc&output=json&rows=15`);
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

        trackItem.addEventListener('click', () => {
            selectTrack(index);
        });

        tracksList.appendChild(trackItem);
    });
}

// Слушатели поиска
const performSearch = () => {
    const query = document.getElementById('search-input').value.trim();
    if (query) searchArchive(query);
};

document.getElementById('search-btn').addEventListener('click', performSearch);
document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});

// Обработка кликов по кнопкам-фильтрам
document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
        // Убираем активный класс у всех и добавляем нажатому
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');

        // Меняем тип поиска в состоянии и сразу перезапускаем поиск
        state.searchType = e.target.getAttribute('data-type');
        performSearch();
    });
});

// Автопоиск при старте приложения
window.addEventListener('DOMContentLoaded', () => {
    searchArchive('Evangelion');
});