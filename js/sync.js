/**
 * EchoArchive — Sync & Backup.
 * Без сервера. Два рабочих пути:
 *  1) GitHub через personal access token (scope: gist) — api.github.com отдаёт CORS,
 *     поэтому плейлисты реально сохраняются/читаются из приватного gist. Это и есть
 *     «вход через GitHub» без сервера-посредника (OAuth-кнопка невозможна: эндпоинт
 *     обмена токена GitHub не поддерживает CORS в браузере/WebView).
 *  2) Локальная копия: экспорт/импорт .json + код восстановления (base64) в буфер обмена.
 * Google без сервера не поддерживается (GIS не для WebView) — честно помечено.
 */
window.Sync = {
    TOKEN_KEY: 'echoarchive_gh_token',
    GIST_KEY: 'echoarchive_gh_gist',
    GIST_FILE: 'echoarchive-playlists.json',

    init() { this.render(); },

    getToken() { try { return localStorage.getItem(this.TOKEN_KEY) || ''; } catch (e) { return ''; } },
    setToken(t) { try { if (t) localStorage.setItem(this.TOKEN_KEY, t); else localStorage.removeItem(this.TOKEN_KEY); } catch (e) {} },
    getGistId() { try { return localStorage.getItem(this.GIST_KEY) || ''; } catch (e) { return ''; } },
    setGistId(id) { try { if (id) localStorage.setItem(this.GIST_KEY, id); else localStorage.removeItem(this.GIST_KEY); } catch (e) {} },

    render() {
        const box = document.getElementById('sync-section'); if (!box) return;
        box.innerHTML = '';
        const token = this.getToken();

        const status = document.createElement('div');
        status.className = 'sync-status' + (token ? '' : ' off');
        status.innerHTML = '<span class="material-icons">' + (token ? 'cloud_done' : 'cloud_off') + '</span>' +
            (token ? 'GitHub подключён' : 'GitHub не подключён');
        box.appendChild(status);

        if (!token) {
            const note = document.createElement('p');
            note.className = 'sync-note';
            note.innerHTML = 'Подключите GitHub, чтобы хранить плейлисты в облаке без сервера. ' +
                'Создайте <a href="https://github.com/settings/tokens/new?scopes=gist&description=EchoArchive" target="_blank" rel="noopener">токен с галочкой gist</a>, ' +
                'скопируйте его и вставьте ниже. Токен хранится только на этом устройстве.';
            box.appendChild(note);

            const input = document.createElement('input');
            input.type = 'password'; input.className = 'modal-input'; input.placeholder = 'ghp_... (personal access token)';
            box.appendChild(input);

            const act = document.createElement('div'); act.className = 'sync-actions full';
            const save = document.createElement('button'); save.className = 'btn-primary'; save.textContent = 'Подключить GitHub';
            save.addEventListener('click', () => this.connect(input.value.trim()));
            act.appendChild(save); box.appendChild(act);
        } else {
            const act = document.createElement('div'); act.className = 'sync-actions';
            const up = document.createElement('button'); up.className = 'btn-primary'; up.textContent = 'В облако';
            up.addEventListener('click', () => this.pushToGist());
            const down = document.createElement('button'); down.className = 'btn-secondary'; down.textContent = 'Из облака';
            down.addEventListener('click', () => this.pullFromGist());
            act.appendChild(up); act.appendChild(down); box.appendChild(act);

            const disc = document.createElement('div'); disc.className = 'sync-actions full';
            const off = document.createElement('button'); off.className = 'btn-secondary'; off.textContent = 'Отключить GitHub';
            off.addEventListener('click', () => { this.setToken(''); this.setGistId(''); this.render(); window.App.showToast('GitHub отключён'); });
            disc.appendChild(off); box.appendChild(disc);
        }

        const divider = document.createElement('div'); divider.className = 'sync-divider'; box.appendChild(divider);

        const sub = document.createElement('div'); sub.className = 'sync-subtitle'; sub.textContent = 'Локальная копия'; box.appendChild(sub);
        const note2 = document.createElement('p'); note2.className = 'sync-note';
        note2.textContent = 'Работает всегда, без интернета. Код восстановления — строка для переноса между устройствами через буфер обмена.';
        box.appendChild(note2);

        const local = document.createElement('div'); local.className = 'sync-actions';
        const exp = document.createElement('button'); exp.className = 'btn-secondary'; exp.textContent = 'Экспорт .json';
        exp.addEventListener('click', () => this.exportFile());
        const imp = document.createElement('button'); imp.className = 'btn-secondary'; imp.textContent = 'Импорт .json';
        imp.addEventListener('click', () => this.importFile());
        local.appendChild(exp); local.appendChild(imp); box.appendChild(local);

        const local2 = document.createElement('div'); local2.className = 'sync-actions';
        const copy = document.createElement('button'); copy.className = 'btn-secondary'; copy.textContent = 'Скопировать код';
        copy.addEventListener('click', () => this.copyCode());
        const paste = document.createElement('button'); paste.className = 'btn-secondary'; paste.textContent = 'Вставить код';
        paste.addEventListener('click', () => this.pasteCode());
        local2.appendChild(copy); local2.appendChild(paste); box.appendChild(local2);

        const gnote = document.createElement('p'); gnote.className = 'sync-note';
        gnote.textContent = 'Вход через Google без собственного сервера не поддерживается в этом приложении.';
        box.appendChild(gnote);
    },

    /* ═══════════ GitHub ═══════════ */
    async gh(url, method, body) {
        const headers = { 'Accept': 'application/vnd.github+json', 'Authorization': 'token ' + this.getToken() };
        if (body) { headers['Content-Type'] = 'application/json'; }
        const r = await fetch(url, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
    },

    async connect(token) {
        if (!token) { window.App.showToast('Вставьте токен'); return; }
        try {
            const old = this.getToken(); this.setToken(token);
            await this.gh('https://api.github.com/user', 'GET');   // проверка токена + CORS
            this.render();
            window.App.showToast('GitHub подключён');
        } catch (e) {
            console.error('Sync connect', e);
            this.setToken(''); this.render();
            window.App.showToast('Не удалось подключиться (токен или сеть)');
        }
    },

    async pushToGist() {
        if (!this.getToken()) return;
        const content = JSON.stringify(window.Playlists.getAll());
        const fileObj = {}; fileObj[this.GIST_FILE] = { content: content };
        const body = { description: 'EchoArchive playlists sync', public: false, files: fileObj };
        try {
            const id = this.getGistId();
            let res;
            if (id) res = await this.gh('https://api.github.com/gists/' + id, 'PATCH', body);
            else { res = await this.gh('https://api.github.com/gists', 'POST', body); this.setGistId(res.id); }
            window.App.showToast('Сохранено в облако');
        } catch (e) {
            console.error('Sync push', e);
            window.App.showToast('Ошибка сохранения в GitHub');
        }
    },

    async pullFromGist() {
        if (!this.getToken()) return;
        const id = this.getGistId();
        if (!id) { window.App.showToast('Сначала сохраните плейлисты в облако'); return; }
        try {
            const res = await this.gh('https://api.github.com/gists/' + id, 'GET');
            const file = res.files && res.files[this.GIST_FILE];
            if (!file) { window.App.showToast('В gist нет файла плейлистов'); return; }
            const parsed = JSON.parse(file.content);
            if (!Array.isArray(parsed)) throw new Error('bad format');
            if (!confirm('Заменить текущие плейлисты облачной копией?')) return;
            window.Playlists.playlists = parsed; window.Playlists.save();
            window.App.refreshAllViews();
            window.App.showToast('Загружено из облака');
        } catch (e) {
            console.error('Sync pull', e);
            window.App.showToast('Ошибка загрузки из GitHub');
        }
    },

    /* ═══════════ локальная копия ═══════════ */
    exportFile() {
        const json = JSON.stringify(window.Playlists.getAll(), null, 2);
        try {
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'echoarchive-playlists.json';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            window.App.showToast('Файл экспортирован');
        } catch (e) {
            console.error('export', e);
            window.App.showToast('Файл не сохранился — используйте код');
        }
    },

    importFile() {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'application/json,.json';
        input.addEventListener('change', () => {
            const f = input.files && input.files[0]; if (!f) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const parsed = JSON.parse(reader.result);
                    if (!Array.isArray(parsed)) throw new Error('bad');
                    if (!confirm('Заменить текущие плейлисты импортированными?')) return;
                    window.Playlists.playlists = parsed; window.Playlists.save();
                    window.App.refreshAllViews();
                    window.App.showToast('Плейлисты импортированы');
                } catch (e) { window.App.showToast('Неверный файл'); }
            };
            reader.readAsText(f);
        });
        input.click();
    },

    encode(json) { return btoa(unescape(encodeURIComponent(json))); },
    decode(str) { return decodeURIComponent(escape(atob(str.trim()))); },

    copyCode() {
        const code = this.encode(JSON.stringify(window.Playlists.getAll()));
        const done = () => window.App.showToast('Код скопирован');
        const fail = () => window.App.showToast('Не удалось скопировать');
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(done).catch(() => this.legacyCopy(code) ? done() : fail());
        } else {
            this.legacyCopy(code) ? done() : fail();
        }
    },
    legacyCopy(text) {
        try {
            const ta = document.createElement('textarea');
            ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.focus(); ta.select();
            const ok = document.execCommand('copy'); ta.remove(); return ok;
        } catch (e) { return false; }
    },

    pasteCode() {
        const code = prompt('Вставьте код восстановления:');
        if (!code) return;
        try {
            const parsed = JSON.parse(this.decode(code));
            if (!Array.isArray(parsed)) throw new Error('bad');
            if (!confirm('Заменить текущие плейлисты восстановленными?')) return;
            window.Playlists.playlists = parsed; window.Playlists.save();
            window.App.refreshAllViews();
            window.App.showToast('Плейлисты восстановлены');
        } catch (e) { window.App.showToast('Неверный код'); }
    }
};