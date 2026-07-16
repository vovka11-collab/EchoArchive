window.Search = {
    searchType: 'track',

    init() {
        document.getElementById('search-btn').addEventListener('click', () => this.performSearch());
        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });

        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                this.searchType = e.target.getAttribute('data-type');
                this.performSearch();
            });
        });
    },

    async performSearch() {
        const query = document.getElementById('search-input').value.trim();
        if (!query) return;

        const tracksList = document.getElementById('tracks-list');
        tracksList.innerHTML = `<p class="status-msg">Поиск на Archive.org...</p>`;

        try {
            let apiQuery = `mediatype:(audio) AND (title:(${query}) OR creator:(${query}))`;

            if (this.searchType === 'artist') {
                apiQuery = `creator:(${query}) AND mediatype:(audio)`;
            } else if (this.searchType === 'album') {
                apiQuery = `title:(${query}) AND mediatype:(audio) AND collection:(audio_music)`;
            }

            const response = await fetch(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(apiQuery)}&fl[]=identifier,title,creator&sort[]=downloads+desc&output=json&rows=15`);
            const data = await response.json();
            const docs = data.response.docs;

            if (!docs || docs.length === 0) {
                tracksList.innerHTML = `<p class="status-msg">Ничего не найдено 😢</p>`;
                return;
            }

            const tracks = docs.map(doc => ({
                id: doc.identifier, // Это ID папки (item) на архиве
                title: doc.title || 'Без названия',
                artist: doc.creator || 'Неизвестен',
                cover: `https://archive.org/services/img/${doc.identifier}`
            }));

            this.renderTracks(tracks);

        } catch (error) {
            console.error(error);
            tracksList.innerHTML = `<p class="status-msg">Ошибка сети...</p>`;
        }
    },

    renderTracks(tracks) {
        const tracksList = document.getElementById('tracks-list');
        tracksList.innerHTML = '';

        tracks.forEach((track, index) => {
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
                // Запускаем воспроизведение
                window.Player.loadAndPlay(track, tracks, index);
            });

            tracksList.appendChild(trackItem);
        });
    }
};