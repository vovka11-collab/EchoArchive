/**
 * EchoArchive — Daily Mixes.
 * Готовые жанровые подборки по 20 релизов, кэш на день, пересборка разом.
 * Источник сейчас — Archive.org (subject + mediatype:audio, sort by downloads,
 * окно из топ-100 со смещением по дню, чтобы подборка менялась ежедневно).
 * Архитектура провайдер-независима: позже сюда воткнётся Jamendo по жанровым тегам.
 */
window.DailyMix = {
    STORAGE_KEY: 'echoarchive_dailymix',
    PER_GENRE: 20,
    GENRES: [
        { key: 'rock',       label: 'Rock',       icon: 'electric_guitar', query: 'subject:(rock)' },
        { key: 'pop',        label: 'Pop',        icon: 'star',            query: 'subject:(pop OR "pop music")' },
        { key: 'jpop',       label: 'J-Pop',      icon: 'translate',       query: 'subject:(jpop OR "j-pop" OR japanese OR anime)' },
        { key: 'jazz',       label: 'Jazz',       icon: 'piano',           query: 'subject:(jazz)' },
        { key: 'electronic', label: 'Electronic', icon: 'synthesizer',     query: 'subject:(electronic OR "electronic music" OR techno OR house)' },
        { key: 'hiphop',     label: 'Hip-Hop',    icon: 'mic',             query: 'subject:(hip-hop OR hiphop OR rap)' },
        { key: 'ambient',    label: 'Ambient',    icon: 'spa',             query: 'subject:(ambient)' },
        { key: 'classical',  label: 'Classical',  icon: 'music_note',      query: 'subject:(classical)' },
        { key: 'metal',      label: 'Metal',      icon: 'whatshot',        query: 'subject:(metal OR "heavy metal")' },
        { key: 'indie',      label: 'Indie',      icon: 'headphones',      query: 'subject:(indie OR "indie rock")' },
        { key: 'folk',       label: 'Folk',       icon: 'acoustic_guitar', query: 'subject:(folk)' }
    ],
    cache: null,
    ready: null,

    init() {
        this.cache = this.loadCache();
        if (this.isFresh(this.cache)) {
            this.ready = Promise.resolve(this.cache);
        } else {
            this.ready = this.generateAll().then(c => { this.cache = c; return c; });
        }
    },

    loadCache() {
        try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || 'null'); } catch (e) { return null; }
    },
    saveCache() {
        try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cache)); } catch (e) {}
    },

    todayStr() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); },
    dayOfYear() { const d = new Date(); const start = new Date(d.getFullYear(), 0, 0); return Math.floor((d - start) / 86400000); },
    isFresh(c) { return !!(c && c.date === this.todayStr() && c.mixes); },

    /** смещение окна по дню: каждый день новое окно из топ-100 */
    startOffset() { return (this.dayOfYear() % 5) * this.PER_GENRE; },

    async fetchGenre(genre) {
        const q = 'mediatype:(audio) AND (' + genre.query + ')';
        const url = 'https://archive.org/advancedsearch.php?q=' + encodeURIComponent(q) +
            '&fl[]=identifier,title,creator&sort[]=downloads+desc&rows=' + this.PER_GENRE +
            '&start=' + this.startOffset() + '&output=json';
        try {
            const r = await fetch(url); const data = await r.json();
            const docs = (data.response && data.response.docs) || [];
            return docs.map(d => ({
                id: d.identifier,
                releaseId: d.identifier,
                title: d.title || 'Без названия',
                artist: Array.isArray(d.creator) ? d.creator[0] : (d.creator || 'Неизвестен'),
                cover: 'https://archive.org/services/img/' + d.identifier,
                format: '', length: 0
            }));
        } catch (e) { console.error('DailyMix fetch', genre.key, e); return []; }
    },

    async generateAll() {
        const results = await Promise.all(this.GENRES.map(g => this.fetchGenre(g).then(tracks => [g.key, tracks])));
        const mixes = {}; results.forEach(([k, t]) => { mixes[k] = t; });
        const c = { date: this.todayStr(), mixes: mixes };
        this.saveCache();
        return c;
    },

    /** ленивый fallback: собрать один жанр, если его нет в свежем кэше */
    async ensure(key) {
        if (this.isFresh(this.cache) && this.cache.mixes[key]) return this.cache.mixes[key];
        const genre = this.GENRES.find(g => g.key === key); if (!genre) return [];
        const tracks = await this.fetchGenre(genre);
        if (!this.cache) this.cache = { date: this.todayStr(), mixes: {} };
        if (this.cache.date !== this.todayStr()) this.cache = { date: this.todayStr(), mixes: {} };
        this.cache.mixes[key] = tracks;
        this.saveCache();
        return tracks;
    },

    get(key) {
        if (this.isFresh(this.cache) && this.cache.mixes[key]) return this.cache.mixes[key];
        return null;
    },
    isStale() { return !this.isFresh(this.cache); },
    genres() { return this.GENRES; }
};