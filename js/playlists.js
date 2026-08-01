/**
 * EchoArchive — Playlist Manager
 * Управление плейлистами через localStorage
 */
window.Playlists = {
    STORAGE_KEY: 'echoarchive_playlists',
    playlists: [],

    init() {
        this.load();
    },

    load() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            this.playlists = raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Playlists: ошибка загрузки', e);
            this.playlists = [];
        }
    },

    save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.playlists));
        } catch (e) {
            console.error('Playlists: ошибка сохранения', e);
        }
    },

    create(name, description) {
        const playlist = {
            id: 'pl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            name: name.trim() || 'Новый плейлист',
            description: (description || '').trim(),
            tracks: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        this.playlists.unshift(playlist);
        this.save();
        return playlist;
    },

    getById(id) {
        return this.playlists.find(p => p.id === id) || null;
    },

    rename(id, newName) {
        const pl = this.getById(id);
        if (!pl) return false;
        pl.name = newName.trim() || pl.name;
        pl.updatedAt = Date.now();
        this.save();
        return true;
    },

    delete(id) {
        const idx = this.playlists.findIndex(p => p.id === id);
        if (idx === -1) return false;
        this.playlists.splice(idx, 1);
        this.save();
        return true;
    },

    addTrack(playlistId, track) {
        const pl = this.getById(playlistId);
        if (!pl) return false;
        const exists = pl.tracks.some(t => t.id === track.id);
        if (exists) return false;
        pl.tracks.push({
            id: track.id,
            title: track.title,
            artist: track.artist,
            cover: track.cover,
            addedAt: Date.now()
        });
        pl.updatedAt = Date.now();
        this.save();
        return true;
    },

    removeTrack(playlistId, trackId) {
        const pl = this.getById(playlistId);
        if (!pl) return false;
        const idx = pl.tracks.findIndex(t => t.id === trackId);
        if (idx === -1) return false;
        pl.tracks.splice(idx, 1);
        pl.updatedAt = Date.now();
        this.save();
        return true;
    },

    getTracks(playlistId) {
        const pl = this.getById(playlistId);
        return pl ? pl.tracks : [];
    },

    getCoverUrls(playlist) {
        if (!playlist.tracks.length) return [];
        return playlist.tracks.slice(0, 4).map(t => t.cover);
    },

    getAll() {
        return this.playlists;
    },

    count() {
        return this.playlists.length;
    },

    pluralTracks(n) {
        const abs = Math.abs(n) % 100;
        const last = abs % 10;
        if (abs > 10 && abs < 20) return n + ' треков';
        if (last === 1) return n + ' трек';
        if (last >= 2 && last <= 4) return n + ' трека';
        return n + ' треков';
    }
};