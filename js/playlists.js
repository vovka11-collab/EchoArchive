/**
 * EchoArchive — Playlist storage.
 * Трек в плейлисте: { releaseId, file, title, artist, cover, format, length, url, addedAt }
 * Обратная совместимость со старыми записями { id, title, artist, cover }.
 */
window.Playlists = {
    STORAGE_KEY: 'echoarchive_playlists',
    playlists: [],

    init() { this.load(); },

    load() {
        try { this.playlists = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]'); }
        catch (e) { console.error('Playlists load', e); this.playlists = []; }
    },
    save() {
        try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.playlists)); }
        catch (e) { console.error('Playlists save', e); }
    },

    create(name, description) {
        const pl = {
            id: 'pl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            name: (name || '').trim() || 'Новый плейлист',
            description: (description || '').trim(),
            tracks: [], createdAt: Date.now(), updatedAt: Date.now()
        };
        this.playlists.unshift(pl); this.save(); return pl;
    },
    getById(id) { return this.playlists.find(p => p.id === id) || null; },
    rename(id, newName) { const p = this.getById(id); if (!p) return false; p.name = (newName || '').trim() || p.name; p.updatedAt = Date.now(); this.save(); return true; },
    delete(id) { const i = this.playlists.findIndex(p => p.id === id); if (i === -1) return false; this.playlists.splice(i, 1); this.save(); return true; },

    /** track = объект трека (новый или legacy). Добавляет один. */
    addTrack(playlistId, track) {
        const p = this.getById(playlistId); if (!p) return false;
        const key = window.App ? window.App.trackKey(track) : (track.id || track.releaseId || '');
        if (p.tracks.some(t => (window.App ? window.App.trackKey(t) : t.id) === key)) return false;
        p.tracks.push(this.normalize(track)); p.updatedAt = Date.now(); this.save(); return true;
    },
    /** tracks = массив. Возвращает кол-во реально добавленных. */
    addTracks(playlistId, tracks) {
        const p = this.getById(playlistId); if (!p) return 0;
        let added = 0;
        tracks.forEach(t => {
            const key = window.App.trackKey(t);
            if (!p.tracks.some(x => window.App.trackKey(x) === key)) { p.tracks.push(this.normalize(t)); added++; }
        });
        if (added) { p.updatedAt = Date.now(); this.save(); }
        return added;
    },
    removeTrack(playlistId, track) {
        const p = this.getById(playlistId); if (!p) return false;
        const key = window.App.trackKey(track);
        const i = p.tracks.findIndex(t => window.App.trackKey(t) === key);
        if (i === -1) return false; p.tracks.splice(i, 1); p.updatedAt = Date.now(); this.save(); return true;
    },
    getTracks(id) { const p = this.getById(id); return p ? p.tracks : []; },
    getAll() { return this.playlists; },

    normalize(t) {
        return {
            releaseId: t.releaseId || t.id || '',
            file: t.file || null,
            title: t.title || 'Без названия',
            artist: t.artist || 'Неизвестен',
            cover: t.cover || '',
            format: t.format || '',
            length: t.length || 0,
            url: t.url || null,
            addedAt: t.addedAt || Date.now()
        };
    },
    getCoverUrls(pl) {
        const seen = new Set(), out = [];
        for (const t of pl.tracks) {
            if (t.cover && !seen.has(t.cover)) { seen.add(t.cover); out.push(t.cover); if (out.length >= 4) break; }
        }
        return out;
    },
    pluralTracks(n) {
        const abs = Math.abs(n) % 100, last = abs % 10;
        if (abs > 10 && abs < 20) return n + ' треков';
        if (last === 1) return n + ' трек';
        if (last >= 2 && last <= 4) return n + ' трека';
        return n + ' треков';
    }
};