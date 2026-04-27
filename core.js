// ============================================================================
// core.js  — lógica compartida de la aplicación
// Gestiona: navegación entre módulos, idioma (i18n), tema y esquema de color.
// No usa fetch() → funciona abriendo index.html con doble clic (protocolo file://)
// ============================================================================

// Aplicar tema antes de pintar el DOM para evitar flash de color incorrecto
applyStoredTheme();


// ── Navegación entre módulos ──────────────────────────────────────────────────
// Cada módulo es un <div id="module-{name}"> embebido en index.html.
// switchModule oculta el activo, muestra el nuevo y llama a su init().

let activeModule = null;

function switchModule(name) {
    // Evitar recargar el módulo si ya está activo
    if (activeModule === name) return;

    // Ocultar módulo actual y desactivar su pestaña
    if (activeModule) {
        document.getElementById(`module-${activeModule}`).style.display = 'none';
        document.getElementById(`tab-${activeModule}`)?.classList.remove('active');
    }

    // Mostrar el nuevo módulo y activar su pestaña
    document.getElementById(`module-${name}`).style.display = 'block';
    document.getElementById(`tab-${name}`)?.classList.add('active');
    activeModule = name;

    // Recordar el módulo activo para la próxima visita
    localStorage.setItem('activeModule', name);

    // Llamar al init del módulo si existe.
    // Convención: window.Liga.init(), window.Historico.init(), etc.
    const mod = window[capitalize(name)];
    if (mod && typeof mod.init === 'function') mod.init();

    // Re-aplicar traducciones al HTML del módulo recién mostrado
    applyTranslationsToDOM();
}

// Capitaliza la primera letra: 'liga' → 'Liga'
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}


// ── i18n (internacionalización) ───────────────────────────────────────────────
// Las traducciones viven en window.LANG_ES / LANG_EU / LANG_EN (lang/*.js).
// Los elementos HTML usan data-lang-key, data-lang-key-aria y data-lang-key-placeholder.

function getTranslations(lang) {
    const code = lang || localStorage.getItem('language') || 'es';
    return { es: window.LANG_ES, eu: window.LANG_EU, en: window.LANG_EN }[code] || window.LANG_ES;
}

function setLanguage(lang) {
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    applyTranslationsToDOM(lang);
    updateLangButton(lang);
    // Marcar visualmente el idioma activo en el menú
    document.querySelectorAll('.lang-option').forEach(opt =>
        opt.classList.toggle('active', opt.dataset.lang === lang)
    );
}

// Recorre el DOM y aplica los textos del idioma activo a todos los elementos marcados
function applyTranslationsToDOM(lang) {
    const t = getTranslations(lang);

    // Textos visibles: <span data-lang-key="clave">
    document.querySelectorAll('[data-lang-key]').forEach(el => {
        const key = el.dataset.langKey;
        if (t[key] && el.tagName !== 'TITLE') el.textContent = t[key];
    });

    // Título del documento
    if (t.document_title) document.title = t.document_title;

    // Atributos aria-label: <button data-lang-key-aria="clave">
    document.querySelectorAll('[data-lang-key-aria]').forEach(el => {
        const key = el.dataset.langKeyAria;
        if (t[key]) el.setAttribute('aria-label', t[key]);
    });

    // Placeholders de inputs: <input data-lang-key-placeholder="clave">
    document.querySelectorAll('[data-lang-key-placeholder]').forEach(el => {
        const key = el.dataset.langKeyPlaceholder;
        if (t[key]) el.placeholder = t[key];
    });
}

// SVGs de banderas inline para evitar peticiones externas (funciona con file://)
const FLAG_SVGS = {
    es: `<svg class="flag-svg" width="28" height="19" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#AA151B"/><rect y="10" width="60" height="20" fill="#F1BF00"/></svg>`,
    eu: `<svg class="flag-svg" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#D8202C"/><line x1="0" y1="0" x2="60" y2="40" stroke="#007A3D" stroke-width="10"/><line x1="60" y1="0" x2="0" y2="40" stroke="#007A3D" stroke-width="10"/><rect x="25" y="0" width="10" height="40" fill="white"/><rect x="0" y="15" width="60" height="10" fill="white"/></svg>`,
    en: `<svg class="flag-svg" width="28" height="19" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#012169"/><line x1="0" y1="0" x2="60" y2="40" stroke="white" stroke-width="8"/><line x1="60" y1="0" x2="0" y2="40" stroke="white" stroke-width="8"/><line x1="0" y1="0" x2="60" y2="40" stroke="#C8102E" stroke-width="4.5"/><line x1="60" y1="0" x2="0" y2="40" stroke="#C8102E" stroke-width="4.5"/><rect x="24" y="0" width="12" height="40" fill="white"/><rect x="0" y="14" width="60" height="12" fill="white"/><rect x="26" y="0" width="8" height="40" fill="#C8102E"/><rect x="0" y="16" width="60" height="8" fill="#C8102E"/></svg>`,
};
const LANG_CODES = { es: 'ES', eu: 'EU', en: 'EN' };

// Actualiza el botón del header con la bandera e idioma activo
function updateLangButton(lang) {
    const btn = document.getElementById('langButtonContent');
    if (btn) btn.innerHTML = `${FLAG_SVGS[lang] || ''}<span class="lang-code">${LANG_CODES[lang] || lang.toUpperCase()}</span>`;
}

// Abre/cierra el menú de idioma y cierra el de tema si estaba abierto
window.toggleLangMenu = function () {
    const menu = document.getElementById('langMenu');
    const btn  = document.getElementById('langButton');
    const open = menu.classList.toggle('hidden') === false;
    btn.setAttribute('aria-expanded', open);
    document.getElementById('themeMenu')?.classList.add('hidden');
};


// ── Tema y esquema de color ───────────────────────────────────────────────────
// El tema (claro/oscuro/auto) se aplica como data-theme en <html>.
// El esquema de color se aplica como data-color-scheme en <html>.
// Ambos se leen de localStorage al arrancar para evitar flash.

// Lee localStorage y aplica tema + color antes de que se pinte el DOM
function applyStoredTheme() {
    const theme  = localStorage.getItem('theme')  || 'auto';
    const scheme = localStorage.getItem('color')  || 'blue';
    applyTheme(theme);
    document.documentElement.setAttribute('data-color-scheme', scheme);
}

// Aplica el modo de tema: 'light', 'dark' o 'auto' (sigue la preferencia del sistema)
function applyTheme(mode) {
    const dark = mode === 'auto'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : mode === 'dark';
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}

// Cambia el tema y lo guarda en localStorage
window.changeTheme = function (mode) {
    localStorage.setItem('theme', mode);
    applyTheme(mode);
    document.getElementById('themeMenu')?.classList.add('hidden');
};

// Cambia el esquema de color (azul, verde, púrpura, naranja, rojo) y lo guarda
window.changeColorScheme = function (scheme) {
    localStorage.setItem('color', scheme);
    document.documentElement.setAttribute('data-color-scheme', scheme);
    // Marcar visualmente el color activo en el menú
    document.querySelectorAll('.color-option').forEach(el =>
        el.classList.toggle('active', el.getAttribute('onclick')?.includes(`'${scheme}'`))
    );
    document.getElementById('themeMenu')?.classList.add('hidden');
};

// Abre/cierra el menú de tema y cierra el de idioma si estaba abierto
window.toggleThemeMenu = function () {
    const menu = document.getElementById('themeMenu');
    const btn  = document.getElementById('themeButton');
    const open = menu.classList.toggle('hidden') === false;
    btn.setAttribute('aria-expanded', open);
    document.getElementById('langMenu')?.classList.add('hidden');
};

// Cierra ambos menús al hacer clic en cualquier otra parte del documento
document.addEventListener('click', e => {
    if (!e.target.closest('.language-selector')) document.getElementById('langMenu')?.classList.add('hidden');
    if (!e.target.closest('.theme-selector'))    document.getElementById('themeMenu')?.classList.add('hidden');
});

// Si el usuario cambia la preferencia del sistema y el modo es 'auto', actualizar el tema
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if ((localStorage.getItem('theme') || 'auto') === 'auto') applyTheme('auto');
});


// ── Arranque ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    const lang   = localStorage.getItem('language') || 'es';
    const scheme = localStorage.getItem('color')    || 'blue';

    // Aplicar idioma y marcar opciones activas en los menús
    applyTranslationsToDOM(lang);
    updateLangButton(lang);
    document.querySelectorAll('.lang-option').forEach(opt =>
        opt.classList.toggle('active', opt.dataset.lang === lang)
    );
    document.querySelectorAll('.color-option').forEach(el =>
        el.classList.toggle('active', el.getAttribute('onclick')?.includes(`'${scheme}'`))
    );

    // Activar el último módulo visitado, o Liga Fantasy por defecto
    const saved = localStorage.getItem('activeModule') || 'liga';
    switchModule(saved);
});
