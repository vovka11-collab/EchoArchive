/**
 * EchoArchive — App controller v0.5: навигация, рендер, миксы, модалки.
 * firstPaint-флаг убирает мерцание каскада при повторной навигации.
 */
window.App = {
    currentScreen: 'home',
    currentPlaylistId: null,
    currentMixKey: null,
    previousScreen: 'home',
    _toastTimer: null,
    _addPayload: null,

    init() {
        window.Playlists.init();
        window.Settings.init();
        window.Ambient.init();
        window.Player.init();
        window.Search.init();
        window.DailyMix.init();
        window.Sync.init();
        window.Moments.init();

        this.initNavigation();
        this.bindCreateButtons();
        this.initCreateModal();
        this.initAddModal();
        this.initPlaylistMenu();
        this.initPlaylistActions();
        this.initAlbumActions();
        this.initMixActions();
        this.initSettingsNav();

        const bp = document.getElementById('btn-back-playlist'); if (bp) bp.addEventListener('click', () => this.navigateBack());
        const ba = document.getElementById('btn-back-album');   if (ba) ba.addEventListener('click', () => this.navigateBack());
        const bm = document.getElementById('btn-back-mix');     if (bm) bm.addEventListener('click', () => this.navigateBack());
        const bs = document.getElementById('btn-back-settings');if (bs) bs.addEventListener('click', () => this.navigateBack());

        this.refreshAllViews();
        this.renderDailyMixes();
        window.DailyMix.ready.then(() => this.renderDailyMixes());
        this.updateGreeting();
    },

    trackKey(t) { return (t.releaseId || t.id || '') + '|' + (t.file || ''); },
    esc(s) { if (s == null) return ''; const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; },

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
    openMix(key) { this.previousScreen = this.currentScreen; this.currentMixKey = key; this.switchScreen('mix'); this.renderMix(key); },
    openSettings() { this.previousScreen = this.currentScreen; this.switchScreen('settings'); },
    navigateBack() { this.currentPlaylistId = null; this.currentMixKey = null; this.switchScreen(this.previousScreen || 'home', true); this.refreshAllViews(); },
    initSettingsNav() { const b = document.getElementById('btn-settings'); if (b) b.addEventListener('click', () => this.openSettings()); },

    refreshAllViews() {
        this.renderHomePlaylists();
        this.renderLibraryPlaylists();
        if (this.currentPlaylistId) this.renderPlaylistDetail(this.currentPlaylistId);
    },

    /* ═══════════ МИКСЫ ═══════════ */
    renderDailyMixes() {
        const row = document.getElementById('mix-row');
        const note = document.getElementById('mix-note');
        if (!row) return;
        const stale = window.DailyMix.isStale();
        if (note) note.textContent = stale ? 'обновляется…' : 'обновлено сегодня';
        row.innerHTML = '';
        window.DailyMix.genres().forEach((g, i) => {
            const tracks = window.DailyMix.get(g.key);
            if (!tracks) { row.appendChild(this.mixSkeleton()); return; }
            row.appendChild(this.mixCard(g, tracks, i));
        });
    },

    mixSkeleton() {
        const w = document.createElement('div'); w.className = 'mix-skeleton';
        w.innerHTML = '<div class="skeleton"></div><div class="skeleton sk-line"></div>';
        return w;
    },

    mixCard(genre, tracks, revealIdx) {
        const card = document.createElement('div'); card.className = 'mix-card reveal';
        card.style.animationDelay = (Math.min(revealIdx, 8) * 40) + 'ms';
        const cover = document.createElement('div'); cover.className = 'mix-card-cover';
        const covers = tracks.slice(0, 4).map(t => t.cover).filter(Boolean);
        if (covers.length > 1) {
            const m = document.createElement('div'); m.className = 'cover-mosaic';
            covers.forEach(u => { const img = document.createElement('img'); img.src = u; img.alt = ''; img.loading = 'lazy'; img.onerror = function () { this.style.display = 'none'; }; m.appendChild(img); });
            cover.appendChild(m);
        } else if (covers.length === 1) {
            const img = document.createElement('img'); img.src = covers[0]; img.alt = ''; img.onerror = function () { this.outerHTML = '<span class="material-icons">' + genre.icon + '</span>'; };
            cover.appendChild(img);
        } else {
            cover.innerHTML = '<span class="material-icons">' + genre.icon + '</span>';
        }
        const badge = document.createElement('div'); badge.className = 'mix-badge';
        badge.innerHTML = '<span class="material-icons">play_arrow</span>';
        cover.appendChild(badge);
        const name = document.createElement('div'); name.className = 'mix-card-name'; name.textContent = genre.label;
        const sub = document.createElement('div'); sub.className = 'mix-card-sub';
        sub.textContent = tracks.length ? (tracks.length + ' треков') : 'мало материала';
        card.appendChild(cover); card.appendChild(name); card.appendChild(sub);
        card.addEventListener('click', () => this.openMix(genre.key));
        return card;
    },

    async renderMix(key) {
        const genre = window.DailyMix.genres().find(g => g.key === key);
        const label = genre ? genre.label : 'Микс';
        const set = (i, v) => { const e = document.getElementById(i); if (e) e.textContent = v; };
        set('mix-detail-name', label); set('mix-name-large', label);
        set('mix-desc', 'Ежедневная подборка лучшего · Archive.org');

        const tc = document.getElementById('mix-tracks');
        const empty = document.getElementById('empty-mix-tracks');
        tc.innerHTML = '<div class="loading-spinner"></div>'; if (empty) empty.style.display = 'none';

        let tracks = window.DailyMix.get(key);
        if (!tracks) tracks = await window.DailyMix.ensure(key);

        set('mix-track-count', window.Playlists.pluralTracks(tracks.length));

        const cov = document.getElementById('mix-cover-large');
        if (cov) {
            const covers = tracks.slice(0, 4).map(t => t.cover).filter(Boolean); cov.innerHTML = '';
            if (covers.length > 1) { const m = document.createElement('div'); m.className = 'cover-mosaic'; covers.forEach(u => { const img = document.createElement('img'); img.src = u; img.alt = ''; img.onerror = function () { this.style.display = 'none'; }; m.appendChild(img); }); cov.appendChild(m); }
            else if (covers.length === 1) { const img = document.createElement('img'); img.src = covers[0]; img.alt = ''; img.onerror = function () { this.outerHTML = '<span class="material-icons">auto_awesome</span>'; }; cov.appendChild(img); }
            else cov.innerHTML = '<span class="material-icons">auto_awesome</span>';
        }

        if (!tracks.length) { tc.innerHTML = ''; if (empty) empty.style.display = 'flex'; return; }
        if (empty) empty.style.display = 'none';
        tc.innerHTML = '';
        tracks.forEach((t, i) => tc.appendChild(this.renderMixTrackRow(t, i, tracks, i)));
        window.Player.highlightCurrent();
    },

    renderMixTrackRow(track, index, queue, revealIdx) {
        const item = document.createElement('div'); item.className = 'playlist-track-item reveal';
        item.style.animationDelay = (Math.min(revealIdx, 10) * 30) + 'ms';
        item.setAttribute('data-track-key', this.trackKey(track));
        const idx = document.createElement('span'); idx.className = 'pt-index';
        idx.innerHTML = '<span class="pt-num">' + (index + 1) + '</span><span class="eq"><i></i><i></i><i></i><i></i></span>';
        const img = document.createElement('img'); img.src = track.cover || 'assets/icons/logo-app.png'; img.className = 'playlist-track-cover'; img.alt = ''; img.loading = 'lazy';
        img.onerror = function () { this.src = 'assets/icons/logo-app.png'; };
        const info = document.createElement('div'); info.className = 'playlist-track-info';
        info.innerHTML = '<div class="playlist-track-title">' + this.esc(track.title) + '</div><div class="playlist-track-artist">' + this.esc(track.artist) + '</div>';
        const addBtn = document.createElement('button'); addBtn.className = 'playlist-track-remove'; addBtn.title = 'Добавить в плейлист';
        addBtn.style.opacity = '1'; addBtn.style.color = 'var(--text-secondary)';
        addBtn.innerHTML = '<span class="material-icons">playlist_add</span>';
        item.appendChild(idx); item.appendChild(img); item.appendChild(info); item.appendChild(addBtn);
        item.addEventListener('click', e => { if (e.target.closest('.playlist-track-remove')) return; window.Player.loadAndPlay(track, queue, index); });
        addBtn.addEventListener('click', e => { e.stopPropagation(); this.openAddModal([track]); });
        return item;
    },

    initMixActions() {
        const p = document.getElementById('btn-play-mix'); const s = document.getElementById('btn-shuffle-mix');
        const a = document.getElementById('btn-add-mix'); const sr = document.getElementById('btn-mix-search');
        if (p) p.addEventListener('click', () => this.playMix(false));
        if (s) s.addEventListener('click', () => this.playMix(true));
        if (a) a.addEventListener('click', () => this.addMixToPlaylist());
        if (sr) sr.addEventListener('click', () => {
            const genre = window.DailyMix.genres().find(g => g.key === this.currentMixKey);
            const input = document.getElementById('search-input');
            if (input && genre) input.value = genre.label;
            this.switchScreen('search', true); window.Search.performSearch();
        });
    },
    playMix(shuffle) {
        const tracks = window.DailyMix.get(this.currentMixKey) || [];
        if (!tracks.length) { this.showToast('Подборка пуста'); return; }
        if (shuffle && !window.Player.shuffleMode) window.Player.toggleShuffle();
        window.Player.loadAndPlay(tracks[0], tracks, 0);
    },
    addMixToPlaylist() {
        const tracks = window.DailyMix.get(this.currentMixKey) || [];
        if (!tracks.length) { this.showToast('Подборка пуста'); return; }
        this.openAddModal(tracks);
    },

    /* ═══════════ рендер плейлистов ═══════════ */
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
            if (quick) { quick.innerHTML = ''; quick.dataset.filled = ''; }
            if (recSec) recSec.style.display = 'none'; return;
        }
        grid.style.display = 'grid'; if (empty) empty.style.display = 'none';

        if (quick) {
            const animate = !quick.dataset.filled;
            quick.innerHTML = '';
            pls.slice(0, 4).forEach((pl, i) => {
                const item = document.createElement('div'); item.className = 'quick-item';
                if (animate) { item.classList.add('reveal'); item.style.animationDelay = (i * 40) + 'ms'; }
                const urls = window.Playlists.getCoverUrls(pl);
                if (urls.length) {
                    const img = document.createElement('img'); img.src = urls[0]; img.className = 'quick-item-cover'; img.alt = '';
                    img.onerror = function () { this.outerHTML = '<div class="quick-item-cover-placeholder"><span class="material-icons">music_note</span></div>'; };
                    item.appendChild(img);
                } else item.innerHTML = '<div class="quick-item-cover-placeholder"><span class="material-icons">music_note</span></div>';
                const nm = document.createElement('span'); nm.className = 'quick-item-name'; nm.textContent = pl.name; item.appendChild(nm);
                item.addEventListener('click', () => this.openPlaylist(pl.id)); quick.appendChild(item);
            });
            quick.dataset.filled = '1';
        }
        if (recSec && recGrid) {
            const recent = [...pls].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4);
            recSec.style.display = recent.length ? 'block' : 'none';
            const animateR = !recGrid.dataset.filled; recGrid.innerHTML = '';
            recent.forEach((pl, i) => recGrid.appendChild(this.createPlaylistCard(pl, animateR ? i : -1)));
            recGrid.dataset.filled = '1';
        }
        const animateG = !grid.dataset.filled;
        grid.innerHTML = '';
        pls.forEach((pl, i) => grid.appendChild(this.createPlaylistCard(pl, animateG ? i : -1)));
        grid.dataset.filled = '1';
    },

    renderLibraryPlaylists() {
        const pls = window.Playlists.getAll();
        const list = document.getElementById('library-playlists');
        const empty = document.getElementById('empty-library'); if (!list) return;
        if (!pls.length) { list.style.display = 'none'; list.dataset.filled = ''; if (empty) empty.style.display = 'flex'; return; }
        list.style.display = 'flex'; if (empty) empty.style.display = 'none';
        const animate = !list.dataset.filled; list.innerHTML = '';
        pls.forEach((pl, i) => {
            const item = document.createElement('div'); item.className = 'playlist-list-item';
            if (animate) { item.classList.add('reveal'); item.style.animationDelay = (Math.min(i, 10) * 35) + 'ms'; }
            const cov = document.createElement('div'); cov.className = 'playlist-list-cover';
            const urls = window.Playlists.getCoverUrls(pl);
            if (urls.length) { const img = document.createElement('img'); img.src = urls[0]; img.alt = ''; img.onerror = function () { this.outerHTML = '<span class="material-icons">music_note</span>'; }; cov.appendChild(img); }
            else cov.innerHTML = '<span class="material-icons">music_note</span>';
            const info = document.createElement('div'); info.className = 'playlist-list-info';
            info.innerHTML = '<div class="playlist-list-name">' + this.esc(pl.name) + '</div><div class="playlist-list-meta">' + window.Playlists.pluralTracks(pl.tracks.length) + '</div>';
            item.appendChild(cov); item.appendChild(info);
            item.addEventListener('click', () => this.openPlaylist(pl.id)); list.appendChild(item);
        });
        list.dataset.filled = '1';
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
        if (!pl.tracks.length) { tc.innerHTML = ''; tc.dataset.filled = ''; if (empty) empty.style.display = 'flex'; return; }
        if (empty) empty.style.display = 'none';
        const animate = !tc.dataset.filled; tc.innerHTML = '';
        pl.tracks.forEach((t, i) => tc.appendChild(this.renderPlaylistTrackRow(pl.id, t, i, pl.tracks, animate ? i : -1)));
        tc.dataset.filled = '1';
        window.Player.highlightCurrent();
    },

    renderPlaylistTrackRow(playlistId, track, index, queue, revealIdx) {
        const item = document.createElement('div'); item.className = 'playlist-track-item';
        if (revealIdx >= 0) { item.classList.add('reveal'); item.style.animationDelay = (Math.min(revealIdx, 10) * 35) + 'ms'; }
        item.setAttribute('data-track-key', this.trackKey(track));
        const idx = document.createElement('span'); idx.className = 'pt-index';
        idx.innerHTML = '<span class="pt-num">' + (index + 1) + '</span><span class="eq"><i></i><i></i><i></i><i></i></span>';
        const img = document.createElement('img'); img.src = track.cover || 'assets/icons/logo-app.png'; img.className = 'playlist-track-cover'; img.alt = ''; img.loading = 'lazy';
        img.onerror = function () { this.src = 'assets/icons/logo-app.png'; };
        const info = document.createElement('div'); info.className = 'playlist-track-info';
        const dur = window.Album.fmtTime(track.length);
        info.innerHTML = '<div class="playlist-track-title">' + this.esc(track.title) + '</div><div class="playlist-track-artist">' + this.esc(track.artist) +
            (track.format ? ' · <span class="pt-format">' + track.format + '</span>' : '') + (dur ? ' · ' + dur : '') + '</div>';
        const rm = document.createElement('button'); rm.className = 'playlist-track-remove'; rm.title = 'Удалить'; rm.innerHTML = '<span class="material-icons">close</span>';
        item.appendChild(idx); item.appendChild(img); item.appendChild(info); item.appendChild(rm);
        item.addEventListener('click', e => { if (e.target.closest('.playlist-track-remove')) return; window.Player.loadAndPlay(track, queue, index); });
        rm.addEventListener('click', e => { e.stopPropagation(); window.Playlists.removeTrack(playlistId, track); this.renderPlaylistDetail(playlistId); this.showToast('Трек удалён'); });
        return item;
    },

    createPlaylistCard(pl, revealIdx) {
        const card = document.createElement('div'); card.className = 'playlist-card';
        if (revealIdx >= 0) { card.classList.add('reveal'); card.style.animationDelay = (Math.min(revealIdx, 8) * 45) + 'ms'; }
        const cov = document.createElement('div'); cov.className = 'playlist-card-cover';
        const urls = window.Playlists.getCoverUrls(pl);
        if (urls.length > 1) { const m = document.create