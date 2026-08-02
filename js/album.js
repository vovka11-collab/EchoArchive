/**
 * EchoArchive — Album (release): metadata, треки, фильтры форматов, похожие, скелетоны, эквалайзер.
 */
window.Album = {
    cache: {},
    AUDIO_EXTS: ['mp3', 'ogg', 'opus', 'flac', 'wav', 'm4a', 'mp4', 'aac', 'aiff'],
    PRIORITY: ['mp3', 'ogg', 'opus', 'm4a', 'mp4', 'aac', 'wav', 'flac', 'aiff'],
    _currentTracks: [],

    extOf(name) { if (!name) return ''; const m = String(name).toLowerCase().match(/\.([a-z0-9]+)$/); return m ? m[1] : ''; },
    isAudio(name) { return this.AUDIO_EXTS.indexOf(this.extOf(name)) !== -1; },

    allowedExts() {
        const s = window.Settings ? window.Settings.getFormats() : null; if (!s) return null;
        const set = new Set();
        Object.keys(s).forEach(k => { if (s[k]) (window.Settings.FORMAT_EXT[k] || []).forEach(e => set.add(e)); });
        return set.size ? set : null;
    },

    cleanTitle(file) {
        let t = (file.title || file.name || '').trim();
        t = t.replace(/\.[a-z0-9]+$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
        return t || 'Без названия';
    },
    fmtTime(sec) { sec = parseInt(sec) || 0; if (sec <= 0) return ''; const m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; },

    async fetchMetadata(id) {
        if (this.cache[id]) return this.cache[id];
        const r = await fetch('https://archive.org/metadata/' + id);
        const data = await r.json(); this.cache[id] = data; return data;
    },
    creatorOf(data) { const c = data && data.metadata && data.metadata.creator; if (Array.isArray(c)) return c[0] || 'Неизвестен'; return c || 'Неизвестен'; },
    titleOf(data) { return (data && data.metadata && data.metadata.title) || 'Без названия'; },
    coverOf(id) { return 'https://archive.org/services/img/' + id; },

    audioFiles(data) {
        const files = (data && data.files) || [];
        let audio = files.filter(f => this.isAudio(f.name));
        const allowed = this.allowedExts();
        if (allowed) { const filtered = audio.filter(f => allowed.has(this.extOf(f.name))); if (filtered.length) audio = filtered; }
        return audio;
    },
    pickFile(files) {
        const audio = (files || []).filter(f => this.isAudio(f.name)); if (!audio.length) return null;
        const allowed = this.allowedExts();
        const pool = allowed ? (audio.filter(f => allowed.has(this.extOf(f.name))) || audio) : audio;
        const list = pool.length ? pool : audio;
        for (const ext of this.PRIORITY) { const f = list.find(x => this.extOf(x.name) === ext); if (f) return f; }
        return list[0];
    },
    buildTracks(data, id) {
        const artist = this.creatorOf(data), cover = this.coverOf(id);
        return this.audioFiles(data).map(f => ({
            releaseId: id, file: f.name, title: this.cleanTitle(f), artist: artist, cover: cover,
            format: this.extOf(f.name), length: parseInt(f.length) || 0,
            url: 'https://archive.org/download/' + id + '/' + encodeURIComponent(f.name)
        }));
    },

    async fetchSimilar(creator, excludeId) {
        if (!creator || creator === 'Неизвестен') return [];
        try {
            const q = 'creator:("' + creator.replace(/"/g, '') + '") AND mediatype:(audio)';
            const url = 'https://archive.org/advancedsearch.php?q=' + encodeURIComponent(q) + '&fl[]=identifier,title,creator&sort[]=downloads+desc&output=json&rows=10';
            const r = await fetch(url); const data = await r.json();
            const docs = (data.response && data.response.docs) || [];
            return docs.filter(d => d.identifier !== excludeId).slice(0, 8).map(d => ({
                id: d.identifier, title: d.title || 'Без названия',
                artist: Array.isArray(d.creator) ? d.creator[0] : (d.creator || creator), cover: this.coverOf(d.identifier)
            }));
        } catch (e) { return []; }
    },

    skeletonHtml(n) {
        let h = '';
        for (let i = 0; i < n; i++) {
            h += '<div class="skeleton-row"><div class="skeleton sk-cover"></div>' +
                '<div style="flex:1;"><div class="skeleton sk-line w70"></div><div class="skeleton sk-line w40"></div></div></div>';
        }
        return h;
    },

    async open(id) {
        const tracksEl = document.getElementById('album-tracks');
        const emptyEl = document.getElementById('empty-album-tracks');
        if (tracksEl) tracksEl.innerHTML = this.skeletonHtml(6);
        if (emptyEl) emptyEl.style.display = 'none';

        let data;
        try { data = await this.fetchMetadata(id); }
        catch (e) { if (tracksEl) tracksEl.innerHTML = ''; if (emptyEl) { emptyEl.querySelector('p').textContent = 'Ошибка загрузки альбома'; emptyEl.style.display = 'flex'; } return; }

        const title = this.titleOf(data), artist = this.creatorOf(data), cover = this.coverOf(id);
        const tracks = this.buildTracks(data, id);

        const set = (i, v) => { const el = document.getElementById(i); if (el) el.textContent = v; };
        set('album-detail-name', title); set('album-name-large', title); set('album-artist-large', artist);
        set('album-track-count', window.Playlists.pluralTracks(tracks.length));

        const coverEl = document.getElementById('album-cover-large');
        if (coverEl) {
            coverEl.innerHTML = '';
            const img = document.createElement('img'); img.src = cover; img.alt = '';
            img.onerror = function () { this.outerHTML = '<span class="material-icons">album</span>'; };
            coverEl.appendChild(img);
        }

        this._currentTracks = tracks;

        if (!tracks.length) {
            tracksEl.innerHTML = ''; if (emptyEl) emptyEl.style.display = 'flex';
        } else {
            if (emptyEl) emptyEl.style.display = 'none';
            tracksEl.innerHTML = '';
            tracks.forEach((t, i) => tracksEl.appendChild(this.renderTrackRow(t, i, tracks, i)));
        }

        const simSec = document.getElementById('album-similar-section');
        const simRow = document.getElementById('album-similar-row');
        if (simSec && simRow) {
            simRow.innerHTML = '<div class="loading-spinner" style="padding:12px 0;"></div>';
            simSec.style.display = 'block';
            const sim = await this.fetchSimilar(artist, id);
            if (sim.length) { simRow.innerHTML = ''; sim.forEach((a, i) => simRow.appendChild(this.renderSimilarCard(a, i))); }
            else simSec.style.display = 'none';
        }
        window.Player.highlightCurrent();
    },

    renderTrackRow(track, index, queue, revealIdx) {
        const item = document.createElement('div');
        item.className = 'playlist-track-item reveal';
        item.style.animationDelay = (Math.min(revealIdx, 10) * 35) + 'ms';
        item.setAttribute('data-track-key', window.App.trackKey(track));

        const idx = document.createElement('span'); idx.className = 'pt-index';
        idx.innerHTML = '<span class="pt-num">' + (index + 1) + '</span><span class="eq"><i></i><i></i><i></i><i></i></span>';
        const img = document.createElement('img'); img.src = track.cover; img.className = 'playlist-track-cover'; img.alt = ''; img.loading = 'lazy';
        img.onerror = function () { this.src = 'assets/icons/logo-app.png'; };
        const info = document.createElement('div'); info.className = 'playlist-track-info';
        const dur = this.fmtTime(track.length);
        info.innerHTML = '<div class="playlist-track-title">' + window.App.esc(track.title) + '</div>' +
            '<div class="playlist-track-artist">' + window.App.esc(track.artist) +
            (track.format ? ' · <span class="pt-format">' + track.format + '</span>' : '') + (dur ? ' · ' + dur : '') + '</div>';
        const addBtn = document.createElement('button'); addBtn.className = 'playlist-track-remove'; addBtn.title = 'Добавить в плейлист';
        addBtn.style.opacity = '1'; addBtn.style.color = 'var(--text-secondary)';
        addBtn.innerHTML = '<span class="material-icons">playlist_add</span>';

        item.appendChild(idx); item.appendChild(img); item.appendChild(info); item.appendChild(addBtn);
        item.addEventListener('click', e => { if (e.target.closest('.playlist-track-remove')) return; window.Player.loadAndPlay(track, queue, index); });
        addBtn.addEventListener('click', e => { e.stopPropagation(); window.App.openAddModal([track]); });
        return item;
    },

    renderSimilarCard(album, revealIdx) {
        const card = document.createElement('div'); card.className = 'similar-card reveal';
        card.style.animationDelay = (Math.min(revealIdx || 0, 8) * 40) + 'ms';
        const cover = document.createElement('div'); cover.className = 'similar-card-cover';
        const img = document.createElement('img'); img.src = album.cover; img.alt = ''; img.loading = 'lazy';
        img.onerror = function () { this.outerHTML = '<span class="material-icons">album</span>'; };
        cover.appendChild(img);
        const name = document.createElement('div'); name.className = 'similar-card-name'; name.textContent = album.title;
        const sub = document.createElement('div'); sub.className = 'similar-card-sub'; sub.textContent = album.artist;
        card.appendChild(cover); card.appendChild(name); card.appendChild(sub);
        card.addEventListener('click', () => window.App.openAlbum(album.id));
        return card;
    },

    playAll(shuffle) {
        const t = this._currentTracks || [];
        if (!t.length) { window.App.showToast('Нет треков для воспроизведения'); return; }
        if (shuffle && !window.Player.shuffleMode) window.Player.toggleShuffle();
        window.Player.loadAndPlay(t[0], t, 0);
    },
    addAllToPlaylist() {
        const t = this._currentTracks || [];
        if (!t.length) { window.App.showToast('Альбом пуст'); return; }
        window.App.openAddModal(t);
    }
};