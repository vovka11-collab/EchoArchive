/**
 * EchoArchive — Settings: 9 тем + форматы + доступность.
 */
window.Settings = {
    STORAGE_KEY: 'echoarchive_settings',
    THEMES: [
        { id: 'dark',   name: 'Green Night', bg: '#121214', accent: '#00ff66' },
        { id: 'amoled', name: 'Pure Black',  bg: '#000000', accent: '#00ff66' },
        { id: 'ocean',  name: 'Ocean Blue',  bg: '#0a1420', accent: '#29b6ff' },
        { id: 'sunset', name: 'Sunset',      bg: '#160e1a', accent: '#ff7a59' },
        { id: 'rose',   name: 'Rose',        bg: '#1a0e14', accent: '#ff5c8a' },
        { id: 'amber',  name: 'Amber',       bg: '#18130a', accent: '#ffb020' },
        { id: 'violet', name: 'Violet',      bg: '#140f1f', accent: '#a78bfa' },
        { id: 'teal',   name: 'Teal',        bg: '#08171a', accent: '#14e0c0' },
        { id: 'light',  name: 'Light',       bg: '#f4f4f6', accent: '#16a34a' }
    ],
    FORMATS: [
        { key: 'mp3',  name: 'MP3',        ext: ['.mp3'] },
        { key: 'ogg',  name: 'OGG Vorbis', ext: ['.ogg'] },
        { key: 'opus', name: 'Opus',       ext: ['.opus'] },
        { key: 'flac', name: 'FLAC',       ext: ['.flac'] },
        { key: 'wav',  name: 'WAV',        ext: ['.wav'] },
        { key: 'aac',  name: 'AAC / M4A',  ext: ['.m4a', '.mp4', '.aac'] }
    ],
    get FORMAT_EXT() { const m = {}; this.FORMATS.forEach(f => { m[f.key] = f.ext.map(e => e.replace('.', '')); }); return m; },

    data: { theme: 'dark', formats: null, reduceMotion: false },

    init() {
        this.load();
        this.applyTheme(this.data.theme);
        this.applyReduceMotion(this.data.reduceMotion);
        this.renderThemes();
        this.renderFormats();
        this.renderA11y();
    },

    load() {
        try {
            const s = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
            this.data.theme = s.theme || 'dark';
            this.data.formats = s.formats || this.defaultFormats();
            this.data.reduceMotion = !!s.reduceMotion;
        } catch (e) { this.data.theme = 'dark'; this.data.formats = this.defaultFormats(); this.data.reduceMotion = false; }
    },
    defaultFormats() { const o = {}; this.FORMATS.forEach(f => o[f.key] = true); return o; },
    save() { try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data)); } catch (e) {} },
    getFormats() { return this.data.formats; },

    applyTheme(id) {
        document.documentElement.setAttribute('data-theme', id);
        const meta = document.querySelector('meta[name="theme-color"]');
        const th = this.THEMES.find(t => t.id === id);
        if (meta && th) meta.setAttribute('content', th.bg);
    },
    applyReduceMotion(on) {
        if (on) document.documentElement.setAttribute('data-reduce-motion', 'on');
        else document.documentElement.removeAttribute('data-reduce-motion');
    },

    renderThemes() {
        const grid = document.getElementById('themes-grid'); if (!grid) return;
        grid.innerHTML = '';
        this.THEMES.forEach(t => {
            const btn = document.createElement('button');
            btn.className = 'theme-opt' + (t.id === this.data.theme ? ' active' : '');
            btn.innerHTML = '<div class="theme-preview" style="background:' + t.bg + ';"><span class="dot" style="background:' + t.accent + ';color:' + t.accent + ';"></span></div>' +
                '<div class="theme-opt-name">' + t.name + '</div>';
            btn.addEventListener('click', () => {
                this.data.theme = t.id; this.applyTheme(t.id); this.save();
                grid.querySelectorAll('.theme-opt').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                window.App.showToast('Тема: ' + t.name);
            });
            grid.appendChild(btn);
        });
    },

    renderFormats() {
        const list = document.getElementById('formats-list'); if (!list) return;
        list.innerHTML = '';
        this.FORMATS.forEach(f => {
            const on = !!this.data.formats[f.key];
            const row = document.createElement('div');
            row.className = 'format-row' + (on ? ' on' : '');
            row.innerHTML = '<div class="fr-info"><div class="fr-name">' + f.name + '</div><div class="fr-ext">' + f.ext.join('  ') + '</div></div><div class="format-toggle"></div>';
            row.addEventListener('click', () => {
                this.data.formats[f.key] = !this.data.formats[f.key];
                row.classList.toggle('on', this.data.formats[f.key]);
                this.save();
                if (window.App && window.App.currentPlaylistId) window.App.renderPlaylistDetail(window.App.currentPlaylistId);
            });
            list.appendChild(row);
        });
    },

    renderA11y() {
        const list = document.getElementById('a11y-list'); if (!list) return;
        list.innerHTML = '';
        const row = document.createElement('div');
        row.className = 'format-row' + (this.data.reduceMotion ? ' on' : '');
        row.innerHTML = '<div class="fr-info"><div class="fr-name">Уменьшить анимации</div><div class="fr-ext">Для чувствительности к движению</div></div><div class="format-toggle"></div>';
        row.addEventListener('click', () => {
            this.data.reduceMotion = !this.data.reduceMotion;
            row.classList.toggle('on', this.data.reduceMotion);
            this.applyReduceMotion(this.data.reduceMotion);
            this.save();
        });
        list.appendChild(row);
    }
};