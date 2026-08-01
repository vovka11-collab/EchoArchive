/**
 * EchoArchive — App controller: навигация, рендер, модалки.
 */
window.App = {
    currentScreen: 'home',
    currentPlaylistId: null,
    previousScreen: 'home',
    _toastTimer: null,
    _addPayload: null,

    init() {
        window.Playlists.init();
        window.Settings.init();
        window.Player.init();
        window.Search.init();

        this.initNavigation();
        this.bindCreateButtons();
        this.initCreateModal();
        this.initAddModal();
        this.initPlaylistMenu();
        this.initPlaylistActions();
        this.initAlbumActions();
        this.initSettingsNav();

        const bp = document.getElementById('btn-back-playlist'); if (bp) bp.addEventListener('click', () => this.navigateBack());
        const ba = document.getElementById('btn-back-album');   if (ba) ba.addEventListener('click', () => this.navigateBack());
        const bs = document.getElementById('btn-back-settings');if (bs) bs.addEventListener('click', () => this.navigateBack());

        this.refreshAllViews();
        this.updateGreeting();
    },

    trackKey(t) { return (t.releaseId || t.id || '') + '|' + (t.file || ''); },
    esc(s) { if (s == null) return ''; const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; },

    /* ═══════════ навигация ═══════════ */
    initNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => this.switchScreen(item.getAttribute('data-screen'), true));
        });
    },
    switchScreen(id, fromTab) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const t = document.getElementById('screen-' + id); if (t) t.classList.add('active');
        document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.getAttribute('data-screen') === id));
        this.currentScreen = id; if (t) t.scrollTop = 0;
        const nav = document.getElementById('bottom-nav');
        if (nav) nav.style.display = (id === 'home' || id === 'search' || id === 'library') ? 'flex' : 'none';
        if (fromTab) this.previousScreen = id;
    },
    openPlaylist(id) { this.previousScreen = this.currentScreen; this.currentPlaylistId = id; this.renderPlaylistDetail(id); this.switchScreen('playlist'); },
    openAlbum(id) { this.previousScreen = this.currentScreen; this.switchScreen('album'); window.Album.open(id); },
    openSettings() { this.previousScreen = this.currentScreen; this.switchScreen('settings'); },
    navigateBack() {
        this.currentPlaylistId = null;
        this.switchScreen(this.previousScreen || 'home', true);
        this.refreshAllViews();
    },
    initSettingsNav() { const b = document.getElementById('btn-settings'); if (b) b.addEventListener('click', () => this.openSettings()); },

    /* ═══════════ рендер ═══════════ */
    refreshAllViews() {
        this.renderHomePlaylists();
        this.renderLibraryPlaylists();
        if (this.currentPlaylistId) this.renderPlaylistDetail(this.currentPlaylistId);
    },

    renderHomePlaylists() {
        const pls = window.Playlists.getAll();
        const grid = document.getElementById('home-playlists');
        const empty = document.getElementById('empty-home');
        const quick = document.getElementById('quick-playlists');
        const recSec = document.getElementById('recent-section');
        const recGrid = document.getElementById('recent-playlists');
        if (!grid) return;

        if (!pls.length) {
            grid.style.display = 'none'; if (empty) empty.style.display = 'flex';
            if (quick) quick.innerHTML = ''; if (recSec) recSec.style.display = 'none'; return;
        }
        grid.style.display = 'grid'; if (empty) empty.style.display = 'none';

        if (quick) {
            quick.innerHTML = '';
            pls.slice(0, 4).forEach(pl => {
                const item = document.createElement('div'); item.className = 'quick-item';
                const urls = window.Playlists.getCoverUrls(pl);
                if (urls.length) {
                    const img = document.createElement('img'); img.src = urls[0]; img.className = 'quick-item-cover'; img.alt = '';
                    img.onerror = function () { this.outerHTML = '<div class="quick-item-cover-placeholder"><span class="material-icons">music_note</span></div>'; };
                    item.appendChild(img);
                } else item.innerHTML = '<div class="quick-item-cover-placeholder"><span class="material-icons">music_note</span></div>';
                const nm = document.createElement('span'); nm.className = 'quick-item-name'; nm.textContent = pl.name; item.appendChild(nm);
                item.addEventListener('click', () => this.openPlaylist(pl.id)); quick.appendChild(item);
            });
        }
        if (recSec && recGrid) {
            const recent = [...pls].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4);
            recSec.style.display = recent.length ? 'block' : 'none';
            recGrid.innerHTML = ''; recent.forEach(pl => recGrid.appendChild(this.createPlaylistCard(pl)));
        }
        grid.innerHTML = ''; pls.forEach(pl => grid.appendChild(this.createPlaylistCard(pl)));
    },

    renderLibraryPlaylists() {
        const pls = window.Playlists.getAll();
        const list = document.getElementById('library-playlists');
        const empty = document.getElementById('empty-library'); if (!list) return;
        if (!pls.length) { list.style.display = 'none'; if (empty) empty.style.display = 'flex'; return; }
        list.style.display = 'flex'; if (empty) empty.style.display = 'none'; list.innerHTML = '';
        pls.forEach(pl => {
            const item = document.createElement('div'); item.className = 'playlist-list-item';
            const cov = document.createElement('div'); cov.className = 'playlist-list-cover';
            const urls = window.Playlists.getCoverUrls(pl);
            if (urls.length) { const img = document.createElement('img'); img.src = urls[0]; img.alt = ''; img.onerror = function () { this.outerHTML = '<span class="material-icons">music_note</span>'; }; cov.appendChild(img); }
            else cov.innerHTML = '<span class="material-icons">music_note</span>';
            const info = document.createElement('div'); info.className = 'playlist-list-info';
            info.innerHTML = '<div class="playlist-list-name">' + this.esc(pl.name) + '</div><div class="playlist-list-meta">' + window.Playlists.pluralTracks(pl.tracks.length) + '</div>';
            item.appendChild(cov); item.appendChild(info);
            item.addEventListener('click', () => this.openPlaylist(pl.id)); list.appendChild(item);
        });
    },

    renderPlaylistDetail(id) {
        const pl = window.Playlists.getById(id); if (!pl) return;
        const set = (i, v) => { const e = document.getElementById(i); if (e) e.textContent = v; };
        set('playlist-detail-name', pl.name); set('playlist-name-large', pl.name);
        const desc = document.getElementById('playlist-desc'); if (desc) { desc.textContent = pl.description || ''; desc.style.display = pl.description ? 'block' : 'none'; }
        set('playlist-track-count', window.Playlists.pluralTracks(pl.tracks.length));

        const cov = document.getElementById('playlist-cover-large');
        if (cov) {
            const urls = window.Playlists.getCoverUrls(pl); cov.innerHTML = '';
            if (urls.length > 1) { const m = document.createElement('div'); m.className = 'cover-mosaic'; urls.forEach(u => { const img = document.createElement('img'); img.src = u; img.alt = ''; img.onerror = function () { this.style.display = 'none'; }; m.appendChild(img); }); cov.appendChild(m); }
            else if (urls.length === 1) { const img = document.createElement('img'); img.src = urls[0]; img.alt = ''; img.onerror = function () { this.outerHTML = '<span class="material-icons">music_note</span>'; }; cov.appendChild(img); }
            else cov.innerHTML = '<span class="material-icons">music_note</span>';
        }

        const tc = document.getElementById('playlist-tracks'); const empty = document.getElementById('empty-playlist-tracks'); if (!tc) return;
        if (!pl.tracks.length) { tc.innerHTML = ''; if (empty) empty.style.display = 'flex'; return; }
        if (empty) empty.style.display = 'none'; tc.innerHTML = '';
        pl.tracks.forEach((t, i) => tc.appendChild(this.renderPlaylistTrackRow(pl.id, t, i, pl.tracks)));
        window.Player.highlightCurrent();
    },

    renderPlaylistTrackRow(playlistId, track, index, queue) {
        const item = document.createElement('div'); item.className = 'playlist-track-item'; item.setAttribute('data-track-key', this.trackKey(track));
        const num = document.createElement('span'); num.className = 'playlist-track-num'; num.textContent = index + 1;
        const img = document.createElement('img'); img.src = track.cover || 'assets/icons/logo-app.png'; img.className = 'playlist-track-cover'; img.alt = ''; img.loading = 'lazy';
        img.onerror = function () { this.src = 'assets/icons/logo-app.png'; };
        const info = document.createElement('div'); info.className = 'playlist-track-info';
        const dur = window.Album.fmtTime(track.length);
        info.innerHTML = '<div class="playlist-track-title">' + this.esc(track.title) + '</div><div class="playlist-track-artist">' + this.esc(track.artist) +
            (track.format ? ' · <span class="pt-format">' + track.format + '</span>' : '') + (dur ? ' · ' + dur : '') + '</div>';
        const rm = document.createElement('button'); rm.className = 'playlist-track-remove'; rm.title = 'Удалить'; rm.innerHTML = '<span class="material-icons">close</span>';
        item.appendChild(num); item.appendChild(img); item.appendChild(info); item.appendChild(rm);
        item.addEventListener('click', e => { if (e.target.closest('.playlist-track-remove')) return; window.Player.loadAndPlay(track, queue, index); });
        rm.addEventListener('click', e => { e.stopPropagation(); window.Playlists.removeTrack(playlistId, track); this.renderPlaylistDetail(playlistId); this.showToast('Трек удалён'); });
        return item;
    },

    createPlaylistCard(pl) {
        const card = document.createElement('div'); card.className = 'playlist-card';
        const cov = document.createElement('div'); cov.className = 'playlist-card-cover';
        const urls = window.Playlists.getCoverUrls(pl);
        if (urls.length > 1) { const m = document.createElement('div'); m.className = 'cover-mosaic'; urls.forEach(u => { const img = document.createElement('img'); img.src = u; img.alt = ''; img.onerror = function () { this.style.display = 'none'; }; m.appendChild(img); }); cov.appendChild(m); }
        else if (urls.length === 1) { const img = document.createElement('img'); img.src = urls[0]; img.alt = ''; img.onerror = function () { this.outerHTML = '<span class="material-icons">music_note</span>'; }; cov.appendChild(img); }
        else cov.innerHTML = '<span class="material-icons">music_note</span>';
        const nm = document.createElement('div'); nm.className = 'playlist-card-name'; nm.textContent = pl.name;
        const ct = document.createElement('div'); ct.className = 'playlist-card-count'; ct.textContent = window.Playlists.pluralTracks(pl.tracks.length);
        card.appendChild(cov); card.appendChild(nm); card.appendChild(ct);
        card.addEventListener('click', () => this.openPlaylist(pl.id)); return card;
    },

    /* ═══════════ создание плейлиста ═══════════ */
    bindCreateButtons() { ['btn-create-home', 'btn-create-empty', 'btn-create-library', 'btn-create-library-empty'].forEach(id => { const b = document.getElementById(id); if (b) b.addEventListener('click', () => this.openCreateModal()); }); },
    initCreateModal() {
        const modal = document.getElementById('modal-create');
        const cancel = document.getElementById('btn-cancel-create');
        const confirm = document.getElementById('btn-confirm-create');
        const name = document.getElementById('input-playlist-name');
        if (cancel) cancel.addEventListener('click', () => this.closeCreateModal());
        if (modal) modal.addEventListener('click', e => { if (e.target === modal) this.closeCreateModal(); });
        if (confirm) confirm.addEventListener('click', () => {
            const n = name ? name.value.trim() : ''; const d = document.getElementById('input-playlist-desc'); const desc = d ? d.value.trim() : '';
            if (!n) { if (name) name.focus(); return; }
            window.Playlists.create(n, desc); this.closeCreateModal(); this.refreshAllViews(); this.showToast('Плейлист создан');
        });
        if (name) name.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); if (confirm) confirm.click(); } });
    },
    openCreateModal() {
        const modal = document.getElementById('modal-create'); const n = document.getElementById('input-playlist-name'); const d = document.getElementById('input-playlist-desc');
        if (n) n.value = ''; if (d) d.value = ''; if (modal) modal.style.display = 'flex'; setTimeout(() => { if (n) n.focus(); }, 300);
    },
    closeCreateModal() { const m = document.getElementById('modal-create'); if (m) m.style.display = 'none'; },

    /* ═══════════ модалка добавления (треки = массив) ═══════════ */
    initAddModal() {
        const modal = document.getElementById('modal-add-to');
        const cancel = document.getElementById('btn-cancel-add');
        if (cancel) cancel.addEventListener('click', () => this.closeAddModal());
        if (modal) modal.addEventListener('click', e => { if (e.target === modal) this.closeAddModal(); });
    },
    openAddModal(tracks) {
        this._addPayload = tracks || [];
        const modal = document.getElementById('modal-add-to'); const list = document.getElementById('add-to-list'); if (!modal || !list) return;
        const pls = window.Playlists.getAll();
        if (!pls.length) {
            list.innerHTML = '<div class="empty-state" style="padding:24px 0;"><p style="margin-bottom:12px;">Сначала создайте плейлист</p><button class="btn-primary" id="btn-create-from-add">Создать</button></div>';
            const cb = list.querySelector('#btn-create-from-add'); if (cb) cb.addEventListener('click', () => { this.closeAddModal(); this.openCreateModal(); });
        } else {
            list.innerHTML = '';
            pls.forEach(pl => {
                const btn = document.createElement('button'); btn.className = 'add-to-item';
                btn.innerHTML = '<span class="material-icons">playlist_add</span><span>' + this.esc(pl.name) + '</span>';
                btn.addEventListener('click', () => {
                    const added = window.Playlists.addTracks(pl.id, this._addPayload);
                    this.closeAddModal(); this.refreshAllViews();
                    this.showToast(added ? ('Добавлено: ' + added) : 'Уже в плейлисте');
                });
                list.appendChild(btn);
            });
        }
        modal.style.display = 'flex';
    },
    closeAddModal() { const m = document.getElementById('modal-add-to'); if (m) m.style.display = 'none'; this._addPayload = null; },

    /* ═══════════ меню плейлиста ═══════════ */
    initPlaylistMenu() {
        const mb = document.getElementById('btn-playlist-menu'); const modal = document.getElementById('modal-playlist-menu');
        const cancel = document.getElementById('btn-cancel-menu'); const ren = document.getElementById('menu-rename'); const del = document.getElementById('menu-delete');
        if (mb) mb.addEventListener('click', () => { if (modal) modal.style.display = 'flex'; });
        if (cancel) cancel.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });
        if (modal) modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
        if (ren) ren.addEventListener('click', () => { if (modal) modal.style.display = 'none'; this.renamePlaylist(); });
        if (del) del.addEventListener('click', () => { if (modal) modal.style.display = 'none'; this.deletePlaylist(); });
    },
    renamePlaylist() {
        const pl = window.Playlists.getById(this.currentPlaylistId); if (!pl) return;
        const n = prompt('Новое название:', pl.name); if (n && n.trim()) { window.Playlists.rename(this.currentPlaylistId, n); this.renderPlaylistDetail(this.currentPlaylistId); this.refreshAllViews(); this.showToast('Переименовано'); }
    },
    deletePlaylist() {
        const pl = window.Playlists.getById(this.currentPlaylistId); if (!pl) return;
        if (confirm('Удалить плейлист «' + pl.name + '»?')) { window.Playlists.delete(this.currentPlaylistId); this.showToast('Плейлист удалён'); this.navigateBack(); }
    },

    /* ═══════════ действия ═══════════ */
    initPlaylistActions() {
        const p = document.getElementById('btn-play-playlist'); const s = document.getElementById('btn-shuffle-playlist');
        if (p) p.addEventListener('click', () => this.playPlaylist(false));
        if (s) s.addEventListener('click', () => this.playPlaylist(true));
    },
    playPlaylist(shuffle) {
        const tracks = window.Playlists.getTracks(this.currentPlaylistId);
        if (!tracks.length) { this.showToast('Плейлист пуст'); return; }
        if (shuffle && !window.Player.shuffleMode) window.Player.toggleShuffle();
        window.Player.loadAndPlay(tracks[0], tracks, 0);
    },
    initAlbumActions() {
        const p = document.getElementById('btn-play-album'); const s = document.getElementById('btn-shuffle-album'); const a = document.getElementById('btn-add-album');
        if (p) p.addEventListener('click', () => window.Album.playAll(false));
        if (s) s.addEventListener('click', () => window.Album.playAll(true));
        if (a) a.addEventListener('click', () => window.Album.addAllToPlaylist());
    },

    /* ═══════════ утилиты ═══════════ */
    updateGreeting() {
        const el = document.getElementById('greeting-text'); if (!el) return;
        const h = new Date().getHours();
        el.textContent = (h >= 5 && h < 12) ? 'Доброе утро' : (h >= 12 && h < 18) ? 'Добрый день' : (h >= 18 && h < 23) ? 'Добрый вечер' : 'Доброй ночи';
    },
    showToast(msg) {
        const t = document.getElementById('toast'); if (!t) return;
        t.textContent = msg; t.style.display = 'block'; clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => { t.style.display = 'none'; }, 2500);
    }
};

document.addEventListener('DOMContentLoaded', () => window.App.init()); 