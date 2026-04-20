// ============================================================================
// core.js  — lógica compartida: tema, idioma, navegación entre módulos
// Sin fetch() — funciona con doble clic (file://)
// ============================================================================

applyStoredTheme();

// ── Navegación entre módulos ──────────────────────────────────────────────────

let activeModule = null;

function switchModule(name) {
    if (activeModule === name) return;

    // Ocultar módulo actual
    if (activeModule) {
        document.getElementById(`module-${activeModule}`).style.display = 'none';
        document.getElementById(`tab-${activeModule}`)?.classList.remove('active');
    }

    // Mostrar el nuevo
    document.getElementById(`module-${name}`).style.display = 'block';
    document.getElementById(`tab-${name}`)?.classList.add('active');
    activeModule = name;
    localStorage.setItem('activeModule', name);

    // Llamar al init del módulo si existe (Liga.init, Historico.init...)
    const mod = window[capitalize(name)];
    if (mod && typeof mod.init === 'function') mod.init();

    applyTranslationsToDOM();
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}


// ── i18n ──────────────────────────────────────────────────────────────────────

function getTranslations(lang) {
    const code = lang || localStorage.getItem('language') || 'es';
    return { es: window.LANG_ES, eu: window.LANG_EU, en: window.LANG_EN }[code] || window.LANG_ES;
}

function setLanguage(lang) {
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    applyTranslationsToDOM(lang);
    updateLangButton(lang);
    document.querySelectorAll('.lang-option').forEach(opt =>
        opt.classList.toggle('active', opt.dataset.lang === lang)
    );
}

function applyTranslationsToDOM(lang) {
    const t = getTranslations(lang);
    document.querySelectorAll('[data-lang-key]').forEach(el => {
        const key = el.dataset.langKey;
        if (t[key] && el.tagName !== 'TITLE') el.textContent = t[key];
    });
    if (t.document_title) document.title = t.document_title;
    document.querySelectorAll('[data-lang-key-aria]').forEach(el => {
        const key = el.dataset.langKeyAria;
        if (t[key]) el.setAttribute('aria-label', t[key]);
    });
    document.querySelectorAll('[data-lang-key-placeholder]').forEach(el => {
        const key = el.dataset.langKeyPlaceholder;
        if (t[key]) el.placeholder = t[key];
    });
}

const FLAG_SVGS = {
    es: `<svg class="flag-svg" width="28" height="19" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#AA151B"/><rect y="10" width="60" height="20" fill="#F1BF00"/></svg>`,
    eu: `<svg class="flag-svg" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#D8202C"/><line x1="0" y1="0" x2="60" y2="40" stroke="#007A3D" stroke-width="10"/><line x1="60" y1="0" x2="0" y2="40" stroke="#007A3D" stroke-width="10"/><rect x="25" y="0" width="10" height="40" fill="white"/><rect x="0" y="15" width="60" height="10" fill="white"/></svg>`,
    en: `<svg class="flag-svg" width="28" height="19" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#012169"/><line x1="0" y1="0" x2="60" y2="40" stroke="white" stroke-width="8"/><line x1="60" y1="0" x2="0" y2="40" stroke="white" stroke-width="8"/><line x1="0" y1="0" x2="60" y2="40" stroke="#C8102E" stroke-width="4.5"/><line x1="60" y1="0" x2="0" y2="40" stroke="#C8102E" stroke-width="4.5"/><rect x="24" y="0" width="12" height="40" fill="white"/><rect x="0" y="14" width="60" height="12" fill="white"/><rect x="26" y="0" width="8" height="40" fill="#C8102E"/><rect x="0" y="16" width="60" height="8" fill="#C8102E"/></svg>`,
};
const LANG_CODES = { es: 'ES', eu: 'EU', en: 'EN' };

function updateLangButton(lang) {
    const btn = document.getElementById('langButtonContent');
    if (btn) btn.innerHTML = `${FLAG_SVGS[lang] || ''}<span class="lang-code">${LANG_CODES[lang] || lang.toUpperCase()}</span>`;
}

window.toggleLangMenu = function () {
    const menu = document.getElementById('langMenu');
    const btn  = document.getElementById('langButton');
    const open = menu.classList.toggle('hidden') === false;
    btn.setAttribute('aria-expanded', open);
    document.getElementById('themeMenu')?.classList.add('hidden');
};


// ── Tema ──────────────────────────────────────────────────────────────────────

function applyStoredTheme() {
    const theme  = localStorage.getItem('theme')  || 'auto';
    const scheme = localStorage.getItem('color')  || 'blue';
    applyTheme(theme);
    document.documentElement.setAttribute('data-color-scheme', scheme);
}

function applyTheme(mode) {
    const dark = mode === 'auto'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : mode === 'dark';
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}

window.changeTheme = function (mode) {
    localStorage.setItem('theme', mode);
    applyTheme(mode);
    document.getElementById('themeMenu')?.classList.add('hidden');
};

window.changeColorScheme = function (scheme) {
    localStorage.setItem('color', scheme);
    document.documentElement.setAttribute('data-color-scheme', scheme);
    document.querySelectorAll('.color-option').forEach(el =>
        el.classList.toggle('active', el.getAttribute('onclick')?.includes(`'${scheme}'`))
    );
    document.getElementById('themeMenu')?.classList.add('hidden');
};

window.toggleThemeMenu = function () {
    const menu = document.getElementById('themeMenu');
    const btn  = document.getElementById('themeButton');
    const open = menu.classList.toggle('hidden') === false;
    btn.setAttribute('aria-expanded', open);
    document.getElementById('langMenu')?.classList.add('hidden');
};

// Cerrar menús al hacer clic fuera
document.addEventListener('click', e => {
    if (!e.target.closest('.language-selector')) document.getElementById('langMenu')?.classList.add('hidden');
    if (!e.target.closest('.theme-selector'))    document.getElementById('themeMenu')?.classList.add('hidden');
});

// Sincronizar tema automático si cambia la preferencia del sistema
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if ((localStorage.getItem('theme') || 'auto') === 'auto') applyTheme('auto');
});


// ── Arranque ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    const lang   = localStorage.getItem('language') || 'es';
    const scheme = localStorage.getItem('color')    || 'blue';

    applyTranslationsToDOM(lang);
    updateLangButton(lang);
    document.querySelectorAll('.lang-option').forEach(opt =>
        opt.classList.toggle('active', opt.dataset.lang === lang)
    );
    document.querySelectorAll('.color-option').forEach(el =>
        el.classList.toggle('active', el.getAttribute('onclick')?.includes(`'${scheme}'`))
    );

    // Activar el módulo recordado, o Liga por defecto
    const saved = localStorage.getItem('activeModule') || 'liga';
    switchModule(saved);
});
