/**
 * EchoArchive — Search. Результаты = альбомы/релизы.
 * Клик по результату → экран альбома. «+» → добавить все треки альбома.
 */
window.Search = {
    searchType: 'all',

    init() {
        const btn = document.getElementById('search-btn');
        const input = document.getElementById('search-input');
        if (btn) btn.addEventListener('click', () => this.performSearch());
        if (input) input.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); this.performSearch(); } });

        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', e => {
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.searchType = e.currentTarget.getAttribute('data-type');
                this.performSearch();
            });
        });
    },

    buildQuery(q) {
        switch (this.searchType) {
            case 'artist': return 'creator:(' + q + ') AND mediatype:(audio)';
            case 'album': return 'title:(' + q + ') AND mediatype:(audio)';
            default: return 'mediatype:(audio) AND (title:(' + q + ') OR creator:(' + q + '))';
        }
    },

    async performSearch() {
        const input = document.getElementById('search-input');
        const q = input ? input.value.trim() : ''; if (!q) return;
        const list = document.getElementById('results-list');
        const simSec = document.getElementById('similar-search-section');
        if (list) list.innerHTML = '<div class="loading-spinner"></div>';
        if (simSec) simSec.style.display = 'none';

        try {
            const url = 'https://archive.org/advancedsearch.php?q=' + encodeURIComponent(this.buildQuery(q)) +
                '&fl[]=identifier,title,creator&sort[]=downloads+desc&output=json&rows=20';
            const r = await fetch(url); const data = await r.json();
            const docs = (data.response && data.response.docs) || [];

            if (!docs.length) {
                list.innerHTML = '<div class="empty-state"><span class="material-icons empty-icon">search_off</span><p>Ничего не найдено</p></div>';
                return;
            }

            const albums = docs.map(d => ({
                id: d.identifier,
                title: d.title || 'Без названия',
                artist: Array.isArray(d.creator) ? d.creator[0] : (d.creator || 'Неизвестен'),
                cover: window.Album.coverOf(d.identifier)
            }));
            this.renderResults(albums);

            // похожие альбомы по исполнителю первого результата
            if (simSec) {
                const simRow = document.getElementById('similar-search-row');
                const sim = await window.Album.fetchSimilar(albums[0].artist, albums[0].id);
                if (sim.length && simRow) {
                    simRow.innerHTML = ''; sim.forEach(a => simRow.appendChild(window.Album.renderSimilarCard(a)));
                    simSec.style.display = 'block';
                }
            }
        } catch (e) {
            console.error('Search', e);
            list.innerHTML = '<div class="empty-state"><span class="material-icons empty-icon">wifi_off</span><p>Ошибка сети. Попробуйте снова.</p></div>';
        }
    },

    renderResults(albums) {
        const list = document.getElementById('results-list'); if (!list) return;
        list.innerHTML = '';
        albums.forEach(album => {
            const item = document.createElement('div'); item.className = 'track-item';
            const img = document.createElement('img'); img.src = album.cover; img.className = 'track-img'; img.alt = ''; img.loading = 'lazy';
            img.onerror = function () { this.src = 'assets/icons/logo-app.png'; };
            const info = document.createElement('div'); info.className = 'track-info';
            info.innerHTML = '<div class="track-title">' + window.App.esc(album.title) + '</div>' +
                '<div class="track-artist">' + window.App.esc(album.artist) + ' · альбом</div>';
            const addBtn = document.createElement('button'); addBtn.className = 'track-add-btn'; addBtn.title = 'Добавить альбом в плейлист';
            addBtn.innerHTML = '<span class="material-icons">playlist_add</span>';

            item.appendChild(img); item.appendChild(info); item.appendChild(addBtn);
            item.addEventListener('click', e => { if (e.target.closest('.track-add-btn')) return; window.App.openAlbum(album.id); });
            addBtn.addEventListener('click', async e => {
                e.stopPropagation();
                addBtn.querySelector('.material-icons').textContent = 'hourglass_empty';
                try {
                    const data = await window.Album.fetchMetadata(album.id);
                    const tracks = window.Album.buildTracks(data, album.id);
                    if (!tracks.length) { window.App.showToast('В альбоме нет подходящих форматов'); }
                    else window.App.openAddModal(tracks);
                } catch (err) { window.App.showToast('Ошибка загрузки альбома'); }
                addBtn.querySelector('.material-icons').textContent = 'playlist_add';
            });
            list.appendChild(item);
        });
    }
};