/**
 * EchoArchive — App Controller
 * Навигация, рендеринг, модалки, инициализация
 */
window.App = {
    currentScreen: 'home',
    currentPlaylistId: null,
    previousScreen: 'home',
    _toastTimer: null,

    init() {
        window.Playlists.init();
        window.Player.init();
        window.Search.init();

        this.initNavigation();
        this.bindCreateButtons();
        this.initCreateModal();
        this.initPlaylistMenu();
        this.initPlaylistActions();

        const backBtn = document.getElementById('btn-back-playlist');
        if (backBtn) backBtn.addEventListener('click', () => this.navigateBack());

        this.refreshAllViews();
        this.updateGreeting();
    },

    /* ═══════════ НАВИГАЦИЯ ═══════════ */
    initNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const screen = item.getAttribute('data-screen');
                this.switchScreen(screen);
            });
        });
    },

    switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById('screen-' + screenId);
        if (target) target.classList.add('active');

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-screen') === screenId);
        });

        this.currentScreen = screenId;
        if (target) target.scrollTop = 0;
    },

    openPlaylist(playlistId) {
        this.previousScreen = this.currentScreen;
        this.currentPlaylistId = playlistId;
        this.renderPlaylistDetail(playlistId);
        this.switchScreen('playlist');
        const nav = document.getElementById('bottom-nav');
        if (nav) nav.style.display = 'none';
    },

    navigateBack() {
        const nav = document.getElementById('bottom-nav');
        if (nav) nav.style.display = 'flex';
        this.currentPlaylistId = null;
        this.switchScreen(this.previousScreen || 'home');
        this.refreshAllViews();
    },

    /* ═══════════ РЕНДЕРИНГ ═══════════ */
    refreshAllViews() {
        this.renderHomePlaylists();
        this.renderLibraryPlaylists();
        if (this.currentPlaylistId) this.renderPlaylistDetail(this.currentPlaylistId);
    },

    renderHomePlaylists() {
        const playlists = window.Playlists.getAll();
        const grid = document.getElementById('home-playlists');
        const empty = document.getElementById('empty-home');
        const quickContainer = document.getElementById('quick-playlists');
        const recentSection = document.getElementById('recent-section');
        const recentGrid = document.getElementById('recent-playlists');

        if (!grid) return;

        if (playlists.length === 0) {
            grid.style.display = 'none';
            if (empty) empty.style.display = 'flex';
            if (quickContainer) quickContainer.innerHTML = '';
            if (recentSection) recentSection.style.display = 'none';
            return;
        }

        grid.style.display = 'grid';
        if (empty) empty.style.display = 'none';

        if (quickContainer) {
            quickContainer.innerHTML = '';
            playlists.slice(0, 4).forEach(pl => {
                const item = document.createElement('div');
                item.className = 'quick-item';
                const urls = window.Playlists.getCoverUrls(pl);
                if (urls.length > 0) {
                    const img = document.createElement('img');
                    img.src = urls[0];
                    img.className = 'quick-item-cover';
                    img.alt = '';
                    img.onerror = function() {
                        this.outerHTML = '<div class="quick-item-cover-placeholder"><span class="material-icons">music_note</span></div>';
                    };
                    item.appendChild(img);
                } else {
                    item.innerHTML = '<div class="quick-item-cover-placeholder"><span class="material-icons">music_note</span></div>';
                }
                const nameSpan = document.createElement('span');
                nameSpan.className = 'quick-item-name';
                nameSpan.textContent = pl.name;
                item.appendChild(nameSpan);
                item.addEventListener('click', () => this.openPlaylist(pl.id));
                quickContainer.appendChild(item);
            });
        }

        if (recentSection && recentGrid) {
            const recent = [...playlists].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4);
            if (recent.length > 0) {
                recentSection.style.display = 'block';
                recentGrid.innerHTML = '';
                recent.forEach(pl => recentGrid.appendChild(this.createPlaylistCard(pl)));
            } else {
                recentSection.style.display = 'none';
            }
        }

        grid.innerHTML = '';
        playlists.forEach(pl => grid.appendChild(this.createPlaylistCard(pl)));
    },

    renderLibraryPlaylists() {
        const playlists = window.Playlists.getAll();
        const list = document.getElementById('library-playlists');
        const empty = document.getElementById('empty-library');
        if (!list) return;

        if (playlists.length === 0) {
            list.style.display = 'none';
            if (empty) empty.style.display = 'flex';
            return;
        }

        list.style.display = 'flex';
        if (empty) empty.style.display = 'none';
        list.innerHTML = '';

        playlists.forEach(pl => {
            const item = document.createElement('div');
            item.className = 'playlist-list-item';

            const coverDiv = document.createElement('div');
            coverDiv.className = 'playlist-list-cover';
            const urls = window.Playlists.getCoverUrls(pl);
            if (urls.length > 0) {
                const img = document.createElement('img');
                img.src = urls[0];
                img.alt = '';
                img.onerror = function() { this.outerHTML = '<span class="material-icons">music_note</span>'; };
                coverDiv.appendChild(img);
            } else {
                coverDiv.innerHTML = '<span class="material-icons">music_note</span>';
            }

            const infoDiv = document.createElement('div');
            infoDiv.className = 'playlist-list-info';
            infoDiv.innerHTML = '<div class="playlist-list-name">' + this.esc(pl.name) + '</div>' +
                '<div class="playlist-list-meta">' + window.Playlists.pluralTracks(pl.tracks.length) + '</div>';

            item.appendChild(coverDiv);
            item.appendChild(infoDiv);
            item.addEventListener('click', () => this.openPlaylist(pl.id));
            list.appendChild(item);
        });
    },

    renderPlaylistDetail(playlistId) {
        const pl = window.Playlists.getById(playlistId);
        if (!pl) return;

        const nameEl = document.getElementById('playlist-detail-name');
        if (nameEl) nameEl.textContent = pl.name;

        const nameLarge = document.getElementById('playlist-name-large');
        if (nameLarge) nameLarge.textContent = pl.name;

        const descEl = document.getElementById('playlist-desc');
        if (descEl) {
            descEl.textContent = pl.description || '';
            descEl.style.display = pl.description ? 'block' : 'none';
        }

        const countEl = document.getElementById('playlist-track-count');
        if (countEl) countEl.textContent = window.Playlists.pluralTracks(pl.tracks.length);

        const coverLarge = document.getElementById('playlist-cover-large');
        if (coverLarge) {
            const urls = window.Playlists.getCoverUrls(pl);
            coverLarge.innerHTML = '';
            if (urls.length > 1) {
                const mosaic = document.createElement('div');
                mosaic.className = 'cover-mosaic';
                urls.forEach(u => {
                    const img = document.createElement('img');
                    img.src = u;
                    img.alt = '';
                    img.onerror = function() { this.style.display = 'none'; };
                    mosaic.appendChild(img);
                });
                coverLarge.appendChild(mosaic);
            } else if (urls.length === 1) {
                const img = document.createElement('img');
                img.src = urls[0];
                img.alt = '';
                img.onerror = function() { this.outerHTML = '<span class="material-icons">music_note</span>'; };
                coverLarge.appendChild(img);
            } else {
                coverLarge.innerHTML = '<span class="material-icons">music_note</span>';
            }
        }

        const tracksContainer = document.getElementById('playlist-tracks');
        const emptyTracks = document.getElementById('empty-playlist-tracks');
        if (!tracksContainer) return;

        if (pl.tracks.length === 0) {
            tracksContainer.innerHTML = '';
            if (emptyTracks) emptyTracks.style.display = 'flex';
            return;
        }

        if (emptyTracks) emptyTracks.style.display = 'none';
        tracksContainer.innerHTML = '';

        pl.tracks.forEach((track, index) => {
            const item = document.createElement('div');
            item.className = 'playlist-track-item';
            item.setAttribute('data-track-id', track.id);

            const num = document.createElement('span');
            num.className = 'playlist-track-num';
            num.textContent = index + 1;

            const img = document.createElement('img');
            img.src = track.cover;
            img.className = 'playlist-track-cover';
            img.alt = '';
            img.loading = 'lazy';
            img.onerror = function() { this.src = 'assets/icons/logo-app.png'; };

            const info = document.createElement('div');
            info.className = 'playlist-track-info';
            info.innerHTML = '<div class="playlist-track-title">' + this.esc(track.title) + '</div>' +
                '<div class="playlist-track-artist">' + this.esc(track.artist) + '</div>';

            const removeBtn = document.createElement('button');
            removeBtn.className = 'playlist-track-remove';
            removeBtn.title = 'Удалить';
            removeBtn.innerHTML = '<span class="material-icons">close</span>';

            item.appendChild(num);
            item.appendChild(img);
            item.appendChild(info);
            item.appendChild(removeBtn);

            item.addEventListener('click', (e) => {
                if (e.target.closest('.playlist-track-remove')) return;
                window.Player.loadAndPlay(track, pl.tracks, index);
            });

            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.Playlists.removeTrack(playlistId, track.id);
                this.renderPlaylistDetail(playlistId);
                this.showToast('Трек удалён');
            });

            tracksContainer.appendChild(item);
        });

        window.Player.highlightCurrent();
    },

    createPlaylistCard(pl) {
        const card = document.createElement('div');
        card.className = 'playlist-card';

        const coverDiv = document.createElement('div');
        coverDiv.className = 'playlist-card-cover';
        const urls = window.Playlists.getCoverUrls(pl);

        if (urls.length > 1) {
            const mosaic = document.createElement('div');
            mosaic.className = 'cover-mosaic';
            urls.forEach(u => {
                const img = document.createElement('img');
                img.src = u;
                img.alt = '';
                img.onerror = function() { this.style.display = 'none'; };
                mosaic.appendChild(img);
            });
            coverDiv.appendChild(mosaic);
        } else if (urls.length === 1) {
            const img = document.createElement('img');
            img.src = urls[0];
            img.alt = '';
            img.onerror = function() { this.outerHTML = '<span class="material-icons">music_note</span>'; };
            coverDiv.appendChild(img);
        } else {
            coverDiv.innerHTML = '<span class="material-icons">music_note</span>';
        }

        const nameDiv = document.createElement('div');
        nameDiv.className = 'playlist-card-name';
        nameDiv.textContent = pl.name;

        const countDiv = document.createElement('div');
        countDiv.className = 'playlist-card-count';
        countDiv.textContent = window.Playlists.pluralTracks(pl.tracks.length);

        card.appendChild(coverDiv);
        card.appendChild(nameDiv);
        card.appendChild(countDiv);
        card.addEventListener('click', () => this.openPlaylist(pl.id));
        return card;
    },

    /* ═══════════ КНОПКИ СОЗДАНИЯ ═══════════ */
    bindCreateButtons() {
        ['btn-create-home', 'btn-create-empty', 'btn-create-library', 'btn-create-library-empty'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', () => this.openCreateModal());
        });
    },

    /* ═══════════ МОДАЛКА СОЗДАНИЯ ═══════════ */
    initCreateModal() {
        const modal = document.getElementById('modal-create');
        const cancel = document.getElementById('btn-cancel-create');
        const confirm = document.getElementById('btn-confirm-create');
        const nameInput = document.getElementById('input-playlist-name');

        if (cancel) cancel.addEventListener('click', () => this.closeCreateModal());
        if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) this.closeCreateModal(); });

        if (confirm) {
            confirm.addEventListener('click', () => {
                const name = nameInput ? nameInput.value.trim() : '';
                const descInput = document.getElementById('input-playlist-desc');
                const description = descInput ? descInput.value.trim() : '';
                if (!name) { if (nameInput) nameInput.focus(); return; }
                window.Playlists.create(name, description);
                this.closeCreateModal();
                this.refreshAllViews();
                this.showToast('Плейлист создан');
            });
        }

        if (nameInput) {
            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); if (confirm) confirm.click(); }
            });
        }
    },

    openCreateModal() {
        const modal = document.getElementById('modal-create');
        const nameInput = document.getElementById('input-playlist-name');
        const descInput = document.getElementById('input-playlist-desc');
        if (nameInput) nameInput.value = '';
        if (descInput) descInput.value = '';
        if (modal) modal.style.display = 'flex';
        setTimeout(() => { if (nameInput) nameInput.focus(); }, 300);
    },

    closeCreateModal() {
        const modal = document.getElementById('modal-create');
        if (modal) modal.style.display = 'none';
    },

    /* ═══════════ МЕНЮ ПЛЕЙЛИСТА ═══════════ */
    initPlaylistMenu() {
        const menuBtn = document.getElementById('btn-playlist-menu');
        const modal = document.getElementById('modal-playlist-menu');
        const cancel = document.getElementById('btn-cancel-menu');
        const renameBtn = document.getElementById('menu-rename');
        const deleteBtn = document.getElementById('menu-delete');

        if (menuBtn) menuBtn.addEventListener('click', () => { if (modal) modal.style.display = 'flex'; });
        if (cancel) cancel.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });
        if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
        if (renameBtn) renameBtn.addEventListener('click', () => { if (modal) modal.style.display = 'none'; this.renamePlaylist(); });
        if (deleteBtn) deleteBtn.addEventListener('click', () => { if (modal) modal.style.display = 'none'; this.deletePlaylist(); });
    },

    renamePlaylist() {
        if (!this.currentPlaylistId) return;
        const pl = window.Playlists.getById(this.currentPlaylistId);
        if (!pl) return;
        const newName = prompt('Новое название:', pl.name);
        if (newName && newName.trim()) {
            window.Playlists.rename(this.currentPlaylistId, newName);
            this.renderPlaylistDetail(this.currentPlaylistId);
            this.refreshAllViews();
            this.showToast('Переименовано');
        }
    },

    deletePlaylist() {
        if (!this.currentPlaylistId) return;
        const pl = window.Playlists.getById(this.currentPlaylistId);
        if (!pl) return;
        if (confirm('Удалить плейлист «' + pl.name + '»?')) {
            window.Playlists.delete(this.currentPlaylistId);
            this.showToast('Плейлист удалён');
            this.navigateBack();
        }
    },

    /* ═══════════ ДЕЙСТВИЯ ПЛЕЙЛИСТА ═══════════ */
    initPlaylistActions() {
        const playBtn = document.getElementById('btn-play-playlist');
        const shuffleBtn = document.getElementById('btn-shuffle-playlist');
        if (playBtn) playBtn.addEventListener('click', () => this.playPlaylist(false));
        if (shuffleBtn) shuffleBtn.addEventListener('click', () => this.playPlaylist(true));
    },

    playPlaylist(shuffle) {
        if (!this.currentPlaylistId) return;
        const tracks = window.Playlists.getTracks(this.currentPlaylistId);
        if (!tracks.length) { this.showToast('Плейлист пуст'); return; }
        if (shuffle && !window.Player.shuffleMode) window.Player.toggleShuffle();
        window.Player.loadAndPlay(tracks[0], tracks, 0);
    },

    /* ═══════════ УТИЛИТЫ ═══════════ */
    updateGreeting() {
        const el = document.getElementById('greeting-text');
        if (!el) return;
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) el.textContent = 'Доброе утро';
        else if (hour >= 12 && hour < 18) el.textContent = 'Добрый день';
        else if (hour >= 18 && hour < 23) el.textContent = 'Добрый вечер';
        else el.textContent = 'Доброй ночи';
    },

    showToast(message) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.style.display = 'block';
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 2500);
    },

    esc(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

/* ═══════════ ЗАПУСК ═══════════ */
document.addEventListener('DOMContentLoaded', () => {
    window.App.init();
});