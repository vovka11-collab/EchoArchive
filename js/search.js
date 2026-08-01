/**
 * EchoArchive — Search Module
 * Поиск по Archive.org с добавлением в плейлисты
 */
window.Search = {
    searchType: 'track',
    lastResults: [],
    pendingTrack: null,

    init() {
        const searchBtn = document.getElementById('search-btn');
        const searchInput = document.getElementById('search-input');

        if (searchBtn) searchBtn.addEventListener('click', () => this.performSearch());
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); this.performSearch(); }
            });
        }

        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.searchType = e.currentTarget.getAttribute('data-type');
                this.performSearch();
            });
        });

        const cancelAdd = document.getElementById('btn-cancel-add');
        if (cancelAdd) cancelAdd.addEventListener('click', () => this.closeAddModal());

        const modalAdd = document.getElementById('modal-add-to');
        if (modalAdd) {
            modalAdd.addEventListener('click', (e) => {
                if (e.target === modalAdd) this.closeAddModal();
            });
        }
    },

    async performSearch() {
        const input = document.getElementById('search-input');
        const query = input ? input.value.trim() : '';
        if (!query) return;

        const tracksList = document.getElementById('tracks-list');
        if (tracksList) tracksList.innerHTML = '<div class="loading-spinner"></div>';

        try {
            let apiQuery;
            switch (this.searchType) {
                case 'artist':
                    apiQuery = 'creator:(' + query + ') AND mediatype:(audio)';
                    break;
                case 'album':
                    apiQuery = 'title:(' + query + ') AND mediatype:(audio) AND collection:(audio_music)';
                    break;
                default:
                    apiQuery = 'mediatype:(audio) AND (title:(' + query + ') OR creator:(' + query + '))';
            }

            const url = 'https://archive.org/advancedsearch.php?q=' + encodeURIComponent(apiQuery) +
                '&fl[]=identifier,title,creator&sort[]=downloads+desc&output=json&rows=20';
            const response = await fetch(url);
            const data = await response.json();
            const docs = data.response.docs;

            if (!docs || docs.length === 0) {
                if (tracksList) {
                    tracksList.innerHTML = '<div class="empty-state"><span class="material-icons empty-icon">search_off</span><p>Ничего не найдено</p></div>';
                }
                this.lastResults = [];
                return;
            }

            this.lastResults = docs.map(doc => ({
                id: doc.identifier,
                title: doc.title || 'Без названия',
                artist: Array.isArray(doc.creator) ? doc.creator[0] : (doc.creator || 'Неизвестен'),
                cover: 'https://archive.org/services/img/' + doc.identifier
            }));

            this.renderResults(this.lastResults);
        } catch (error) {
            console.error('Search: ошибка', error);
            if (tracksList) {
                tracksList.innerHTML = '<div class="empty-state"><span class="material-icons empty-icon">wifi_off</span><p>Ошибка сети. Попробуйте снова.</p></div>';
            }
        }
    },

    renderResults(tracks) {
        const tracksList = document.getElementById('tracks-list');
        if (!tracksList) return;
        tracksList.innerHTML = '';

        tracks.forEach((track, index) => {
            const item = document.createElement('div');
            item.className = 'track-item';
            item.setAttribute('data-track-id', track.id);

            const img = document.createElement('img');
            img.src = track.cover;
            img.className = 'track-img';
            img.alt = '';
            img.loading = 'lazy';
            img.onerror = function() { this.src = 'assets/icons/logo-app.png'; };

            const info = document.createElement('div');
            info.className = 'track-info';
            info.innerHTML = '<div class="track-title">' + this.escapeHtml(track.title) + '</div>' +
                '<div class="track-artist">' + this.escapeHtml(track.artist) + '</div>';

            const addBtn = document.createElement('button');
            addBtn.className = 'track-add-btn';
            addBtn.title = 'Добавить в плейлист';
            addBtn.innerHTML = '<span class="material-icons">playlist_add</span>';

            item.appendChild(img);
            item.appendChild(info);
            item.appendChild(addBtn);

            item.addEventListener('click', (e) => {
                if (e.target.closest('.track-add-btn')) return;
                window.Player.loadAndPlay(track, tracks, index);
            });

            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openAddModal(track);
            });

            tracksList.appendChild(item);
        });

        window.Player.highlightCurrent();
    },

    openAddModal(track) {
        this.pendingTrack = track;
        const modal = document.getElementById('modal-add-to');
        const list = document.getElementById('add-to-list');
        if (!modal || !list) return;

        const playlists = window.Playlists.getAll();

        if (playlists.length === 0) {
            list.innerHTML = '<div class="empty-state" style="padding:24px 0;"><p style="margin-bottom:12px;">Сначала создайте плейлист</p><button class="btn-primary" id="btn-create-from-add">Создать</button></div>';
            const createBtn = list.querySelector('#btn-create-from-add');
            if (createBtn) {
                createBtn.addEventListener('click', () => {
                    this.closeAddModal();
                    window.App.openCreateModal();
                });
            }
        } else {
            list.innerHTML = '';
            playlists.forEach(pl => {
                const hasTrack = pl.tracks.some(t => t.id === track.id);
                const btn = document.createElement('button');
                btn.className = 'add-to-item';
                btn.innerHTML = '<span class="material-icons">' + (hasTrack ? 'check_circle' : 'playlist_add') + '</span><span>' + this.escapeHtml(pl.name) + '</span>';
                btn.style.opacity = hasTrack ? '0.5' : '1';

                btn.addEventListener('click', () => {
                    if (hasTrack) {
                        window.App.showToast('Уже в плейлисте');
                    } else {
                        const ok = window.Playlists.addTrack(pl.id, track);
                        if (ok) {
                            window.App.showToast('Добавлено в «' + pl.name + '»');
                            window.App.refreshAllViews();
                        }
                    }
                    this.closeAddModal();
                });

                list.appendChild(btn);
            });
        }

        modal.style.display = 'flex';
    },

    closeAddModal() {
        const modal = document.getElementById('modal-add-to');
        if (modal) modal.style.display = 'none';
        this.pendingTrack = null;
    },

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};