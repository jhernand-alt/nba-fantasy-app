// ============================================================================
// Liga Fantasy NBA - app.js  v3.3.0
// ============================================================================
// Archivos CSV requeridos (generados por espn_stats.py):
//   · JUGADOR ids   YYYYMMDD HHMM.csv  → jugadores con equipo fantasy actual
//   · JUGADOR stats YYYYMMDD HHMM.csv  → stats de jugadores
//   · ENTRENADOR ids.csv               → estático, solo cambia si hay nuevos managers
//   · ENTRENADOR stats YYYYMMDD HHMM.csv → stats de equipos fantasy
//
// La web carga dos archivos a la vez:
//   · Un CSV de "jugadores" (JUGADOR ids o ENTRENADOR ids)
//   · Un CSV de "stats"     (JUGADOR stats o ENTRENADOR stats)
// ============================================================================

// Aplicar tema guardado antes de que el DOM se pinte (evita flash)
applyStoredTheme();


// ── i18n ──────────────────────────────────────────────────────────────────────

function getTranslations(lang) {
    const code = lang || localStorage.getItem('language') || 'es';
    return { es: window.LANG_ES, eu: window.LANG_EU, en: window.LANG_EN }[code] || window.LANG_ES;
}

function setLanguage(lang) {
    const t = getTranslations(lang);
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;

    // Textos normales
    document.querySelectorAll('[data-lang-key]').forEach(el => {
        const key = el.dataset.langKey;
        if (t[key] && el.tagName !== 'TITLE') el.textContent = t[key];
    });
    if (t.document_title) document.title = t.document_title;

    // Atributos aria-label
    document.querySelectorAll('[data-lang-key-aria]').forEach(el => {
        const key = el.dataset.langKeyAria;
        if (t[key]) el.setAttribute('aria-label', t[key]);
    });

    // Placeholders
    document.querySelectorAll('[data-lang-key-placeholder]').forEach(el => {
        const key = el.dataset.langKeyPlaceholder;
        if (t[key]) el.placeholder = t[key];
    });

    updateLangButton(lang);
    document.querySelectorAll('.lang-option').forEach(opt =>
        opt.classList.toggle('active', opt.dataset.lang === lang));

    // Actualizar textos dinámicos si ya hay datos cargados
    if (allPlayerData.length > 0) renderTable(activePlayers);
    const fSel = document.getElementById('fantasyTeamSelector');
    if (fSel?.options[0]) fSel.options[0].textContent = t.filter_all_fantasy;
    const nSel = document.getElementById('nbaTeamSelector');
    if (nSel?.options[0]) nSel.options[0].textContent = t.filter_all_nba;
    if (!playersFileDate && !statsFileDate) {
        const el = document.getElementById('currentDatePlaceholder');
        if (el) el.textContent = t.credit_no_data;
    }
}

function applyStoredLanguage() {
    setLanguage(localStorage.getItem('language') || 'es');
}

// SVGs de banderas (inline para evitar peticiones externas)
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

// Abrir/cerrar menú de idioma
window.toggleLangMenu = function () {
    const menu = document.getElementById('langMenu');
    const btn  = document.getElementById('langButton');
    menu.classList.toggle('hidden');
    btn.setAttribute('aria-expanded', !menu.classList.contains('hidden'));
    if (!menu.classList.contains('hidden'))
        setTimeout(() => document.addEventListener('click', closeLangOutside), 0);
};
function closeLangOutside(e) {
    const wrapper = document.getElementById('languageSelectorWrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        document.getElementById('langMenu').classList.add('hidden');
        document.getElementById('langButton').setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', closeLangOutside);
    }
}


// ── Tema ──────────────────────────────────────────────────────────────────────

window.toggleThemeMenu = function () {
    const menu = document.getElementById('themeMenu');
    menu.classList.toggle('hidden');
    if (!menu.classList.contains('hidden'))
        setTimeout(() => document.addEventListener('click', closeThemeOutside), 0);
};
function closeThemeOutside(e) {
    const menu = document.getElementById('themeMenu');
    const btn  = document.getElementById('themeButton');
    if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
        menu.classList.add('hidden');
        document.removeEventListener('click', closeThemeOutside);
    }
}
window.changeTheme = function (theme) {
    const resolved = theme === 'auto'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;
    document.documentElement.setAttribute('data-theme', resolved);
    localStorage.setItem('theme', theme);
    // Escuchar cambios del sistema solo si está en modo auto
    if (theme === 'auto') {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (localStorage.getItem('theme') === 'auto')
                document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        });
    }
    toggleThemeMenu();
};
window.changeColorScheme = function (scheme) {
    document.documentElement.setAttribute('data-color-scheme', scheme);
    localStorage.setItem('colorScheme', scheme);
    toggleThemeMenu();
};
function applyStoredTheme() {
    const theme  = localStorage.getItem('theme')       || 'auto';
    const scheme = localStorage.getItem('colorScheme') || 'blue';
    const resolved = theme === 'auto'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.setAttribute('data-color-scheme', scheme);
}


// ── Variables globales ────────────────────────────────────────────────────────

let playersData   = [];   // filas del CSV de jugadores/entrenadores (ids)
let statsData     = {};   // mapa id→stats del CSV de estadísticas
let allPlayerData = [];   // datos combinados de todos los jugadores
let activePlayers = [];   // subconjunto tras aplicar filtros
let chartInstance = null; // instancia actual de Chart.js
let currentChart  = 'topTotal';

let selectedIds = new Set(); // IDs seleccionados con checkbox para comparar

let playersFileDate = null;
let statsFileDate   = null;

// Filtros y ordenación
let currentSortKey        = 'rankTotal';
let sortDirection         = 'asc';
let currentPositionFilter = 'all';
let currentTeamFilter     = 'all';
let currentNBATeamFilter  = 'all';
let currentSearchText     = '';

// Formato CSV
const SEP     = ';';   // separador de columnas
const DEC_SEP = ',';   // separador decimal (coma europea)

// Colores para el gráfico (20 colores distintos)
const CHART_COLORS = [
    '#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea',
    '#0891b2', '#db2777', '#65a30d', '#ea580c', '#7c3aed',
    '#0284c7', '#b91c1c', '#15803d', '#b45309', '#7e22ce',
    '#0369a1', '#991b1b', '#166534', '#92400e', '#6b21a8',
];

// Nombres que se excluyen de los gráficos de grupo
const FILTERED_FANTASY_NAMES = ['waiver', 'waivers'];
const FILTERED_NBA_NAMES     = ['free agent', 'fa'];


// ── Carga de archivos CSV ─────────────────────────────────────────────────────

// Registrar listeners al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {

    document.getElementById('csvPlayers').addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;
        playersFileDate = new Date(file.lastModified);
        const reader = new FileReader();
        reader.onload = ev => {
            // Limpiar datos y filtros al cargar nuevo archivo (mantiene indicadores)
            resetData();
            playersData = parsePlayersCSV(ev.target.result);
            const status = document.getElementById('playersFileStatus');
            status.textContent = `✓ ${file.name}`;
            status.classList.add('loaded');
            updateCreditDate();
            checkAndProcess();
        };
        reader.readAsText(file, 'UTF-8');
    });

    document.getElementById('csvStats').addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;
        statsFileDate = new Date(file.lastModified);
        const reader = new FileReader();
        reader.onload = ev => {
            // Limpiar datos y filtros al cargar nuevo archivo (mantiene indicadores)
            resetData();
            statsData = parseStatsCSV(ev.target.result);
            const status = document.getElementById('statsFileStatus');
            status.textContent = `✓ ${file.name}`;
            status.classList.add('loaded');
            updateCreditDate();
            checkAndProcess();
        };
        reader.readAsText(file, 'UTF-8');
    });

    document.getElementById('downloadChart').addEventListener('click', downloadChartImage);
    applyStoredLanguage();
    updateCreditDate();
    resetDisplay();
});


// ── Parseo CSV ────────────────────────────────────────────────────────────────

// JUGADOR ids / ENTRENADOR ids
// Formato: ID;Nombre;Equipo_Fantasy;Equipo_NBA;Posicion;Enlace_Web_ESPN
function parsePlayersCSV(text) {
    const lines = text.trim().split('\n');
    const data  = [];
    for (let i = 1; i < lines.length; i++) {
        const v = lines[i].split(SEP);
        if (v.length >= 5) {
            data.push({
                id:          v[0].trim(),
                name:        v[1].trim(),
                fantasyTeam: v[2].trim(),  // vacío en JUGADOR ids, relleno en ENTRENADOR ids
                team:        v[3].trim(),
                position:    v[4].trim().toUpperCase(),
                espnLink:    v[5]?.trim() || '',
            });
        }
    }
    return data;
}

// JUGADOR stats / ENTRENADOR stats
// Formato jugadores (13 col): ID;Equipo_Fantasy;Pts_Total;Pts_Avg;Partidos;
//                              Rank_Pos;Rank_Total;
//                              Pts_Semana;Rank_Semana;Pts_2Semanas;Rank_2Semanas;Pts_Mes;Rank_Mes
// Formato entrenadores (9 col): ID;Equipo_Fantasy;Pts_Total;Pts_Avg;Partidos;
//                                Rank_Total;Pts_Semana;Pts_2Semanas;Pts_Mes
function parseStatsCSV(text) {
    const lines = text.trim().split('\n');
    const data  = {};
    const pf = (v, idx) => {
        const s = (v[idx] || '').trim();
        if (!s) return null;
        const n = parseFloat(s.replace(DEC_SEP, '.'));
        return isNaN(n) ? null : n;
    };
    const pi = (v, idx) => {
        const s = (v[idx] || '').trim();
        if (!s) return null;
        const n = parseInt(s);
        return isNaN(n) ? null : n;
    };

    // Detectar formato por la cabecera
    const header = (lines[0] || '').toLowerCase();
    const isExtended = header.includes('rank_pos');  // formato jugadores (13 col)

    for (let i = 1; i < lines.length; i++) {
        const v  = lines[i].split(SEP);
        const id = v[0]?.trim();
        if (!id) continue;

        if (isExtended) {
            // Formato jugadores: con Rank_Pos, rankings por período, partido hoy y lesión
            data[id] = {
                fantasyTeam:   v[1]?.trim() || '',
                ptsTotal:      pf(v, 2),
                ptsAvg:        pf(v, 3),
                partidos:      pi(v, 4),
                rankPos:       pi(v, 5),
                rankTotal:     pi(v, 6),
                ptsSemana:     pf(v, 7),
                rankSemana:    pi(v, 8),
                pts2Semanas:   pf(v, 9),
                rank2Semanas:  pi(v, 10),
                ptsMes:        pf(v, 11),
                rankMes:       pi(v, 12),
                juegaHoy:      pi(v, 13),   // 1 = juega hoy, 0 = no juega
                injuryStatus:  v[14]?.trim() || 'ACTIVE',
            };
        } else {
            // Formato entrenadores: sin rankings por período ni rank_pos
            data[id] = {
                fantasyTeam:  v[1]?.trim() || '',
                ptsTotal:     pf(v, 2),
                ptsAvg:       pf(v, 3),
                partidos:     pi(v, 4),
                rankPos:      null,
                rankTotal:    pi(v, 5),
                ptsSemana:    pf(v, 6),
                rankSemana:   null,
                pts2Semanas:  pf(v, 7),
                rank2Semanas: null,
                ptsMes:       pf(v, 8),
                rankMes:      null,
            };
        }
    }
    return data;
}


// ── Combinar datos y arrancar ─────────────────────────────────────────────────

function checkAndProcess() {
    if (!playersData.length || !Object.keys(statsData).length) return;
    try {
        allPlayerData = playersData.map(p => {
            const s = statsData[p.id] || {};
            // Equipo_Fantasy: viene del stats CSV (actualizado por el script)
            // Fallback al jugadores CSV por compatibilidad con archivos viejos
            const fantasyTeam = s.fantasyTeam || p.fantasyTeam || '';
            return {
                id:           p.id,
                name:         p.name,
                fantasyTeam,
                team:         p.team,
                position:     p.position,
                espnLink:     p.espnLink,
                ptsTotal:     s.ptsTotal     ?? 0,
                ptsAvg:       s.ptsAvg       ?? 0,
                partidos:     s.partidos     ?? 0,
                rankPos:      s.rankPos      ?? null,
                rankTotal:    s.rankTotal    ?? null,
                ptsSemana:    s.ptsSemana    ?? null,
                rankSemana:   s.rankSemana   ?? null,
                pts2Semanas:  s.pts2Semanas  ?? null,
                rank2Semanas: s.rank2Semanas ?? null,
                ptsMes:       s.ptsMes       ?? null,
                rankMes:      s.rankMes      ?? null,
                juegaHoy:     s.juegaHoy     ?? null,  // null = formato entrenadores (no aplica)
                injuryStatus: s.injuryStatus  || null,
            };
        });
        if (!allPlayerData.length) { alert('No se pudieron combinar los datos. Verifica que los IDs coincidan.'); return; }
        initializeApp(allPlayerData);
    } catch (err) {
        alert('Error al procesar los datos: ' + err.message);
    }
}


// ── Inicialización de la app ──────────────────────────────────────────────────

function initializeApp(data) {
    loadState();

    // Poblar selector de equipos NBA
    const nSel = document.getElementById('nbaTeamSelector');
    nSel.innerHTML = `<option value="all">${getTranslations().filter_all_nba}</option>`;
    const allNBATeams  = Array.from(new Set(data.map(p => p.team)));
    const realNBATeams = allNBATeams.filter(t => !isFilteredNBAName(t))
                                    .sort((a, b) => getShortName(a).localeCompare(getShortName(b)));
    const freeAgents   = allNBATeams.filter(t =>  isFilteredNBAName(t));

    realNBATeams.forEach(t => {
        const o = document.createElement('option');
        o.value = t; o.textContent = getShortName(t);
        nSel.appendChild(o);
    });
    if (freeAgents.length) {
        const sep = document.createElement('option');
        sep.disabled = true; sep.textContent = '──────────────';
        nSel.appendChild(sep);
        freeAgents.forEach(t => {
            const o = document.createElement('option');
            o.value = t; o.textContent = `— ${getShortName(t)} —`;
            nSel.appendChild(o);
        });
    }
    nSel.value = currentNBATeamFilter; nSel.disabled = false;

    // Poblar selector de equipos fantasy
    const fSel = document.getElementById('fantasyTeamSelector');
    fSel.innerHTML = `<option value="all">${getTranslations().filter_all_fantasy}</option>`;
    const allFantasyTeams = Array.from(new Set(data.map(p => p.fantasyTeam)));
    const realTeams   = allFantasyTeams.filter(t => !isFilteredFantasyName(t))
                                       .sort((a, b) => getShortName(a).localeCompare(getShortName(b)));
    const waiverTeams = allFantasyTeams.filter(t =>  isFilteredFantasyName(t));

    realTeams.forEach(t => {
        const o = document.createElement('option');
        o.value = t; o.textContent = getShortName(t);
        fSel.appendChild(o);
    });
    // Waivers al final, separado visualmente
    if (waiverTeams.length) {
        const sep = document.createElement('option');
        sep.disabled = true; sep.textContent = '──────────────';
        fSel.appendChild(sep);
        waiverTeams.forEach(t => {
            const o = document.createElement('option');
            o.value = t; o.textContent = `— ${getShortName(t)} —`;
            fSel.appendChild(o);
        });
    }
    fSel.value = currentTeamFilter; fSel.disabled = false;

    // Restaurar botón de posición activo
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const m = btn.getAttribute('onclick')?.match(/filterPlayersByPosition\('([^']+)'/);
        if (m) {
            const active = m[1] === currentPositionFilter;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-pressed', active);
        }
    });

    // Checkbox "seleccionar todos"
    const checkAll = document.getElementById('checkAll');
    if (checkAll) checkAll.addEventListener('change', function () {
        if (this.checked) activePlayers.forEach(p => selectedIds.add(p.id));
        else selectedIds.clear();
        renderTable(activePlayers);
        if (currentChart === 'compare') renderCompareChart();
    });

    document.getElementById('downloadChart').disabled = false;
    applyFiltersAndSort();
}


// ── Filtros y búsqueda ────────────────────────────────────────────────────────

window.filterBySearch = function (text) {
    currentSearchText = text.toLowerCase().trim();
    saveState(); applyFiltersAndSort();
};
window.filterPlayersByNBATeam = function (v) {
    currentNBATeamFilter = v; saveState({ nbaTeamFilter: v }); applyFiltersAndSort();
};
window.filterPlayersByFantasyTeam = function (v) {
    currentTeamFilter = v; saveState({ teamFilter: v }); applyFiltersAndSort();
};
window.filterPlayersByPosition = function (pos, btn) {
    currentPositionFilter = pos;
    document.querySelectorAll('.filter-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
    btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true');
    saveState({ posFilter: pos }); applyFiltersAndSort();
};

function applyFiltersAndSort() {
    let filtered = allPlayerData;
    if (currentNBATeamFilter  !== 'all') filtered = filtered.filter(p => p.team === currentNBATeamFilter);
    if (currentTeamFilter     !== 'all') filtered = filtered.filter(p => p.fantasyTeam === currentTeamFilter);
    if (currentPositionFilter !== 'all') filtered = filtered.filter(p => p.position.includes(currentPositionFilter));
    if (currentSearchText)               filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(currentSearchText) ||
        (p.fantasyTeam || '').toLowerCase().includes(currentSearchText) ||
        (p.team || '').toLowerCase().includes(currentSearchText)
    );
    activePlayers = filtered;
    sortData(activePlayers, currentSortKey, sortDirection);
    renderTable(activePlayers);
    updateCurrentChart();
}


// ── Ordenación ────────────────────────────────────────────────────────────────

window.sortTable = function (key, th) {
    if (currentSortKey === key) sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    else { currentSortKey = key; sortDirection = (key === 'rankTotal' || key === 'rankPos') ? 'asc' : 'desc'; }
    saveState(); applyFiltersAndSort();
    document.querySelectorAll('.player-table th[onclick]').forEach(t => t.removeAttribute('aria-sort'));
    th.setAttribute('aria-sort', sortDirection === 'asc' ? 'ascending' : 'descending');
};

function sortData(arr, key, dir) {
    arr.sort((a, b) => {
        let va = a[key], vb = b[key];
        if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
        // Nulls siempre al final, independientemente de la dirección
        if (va === null || va === undefined) return 1;
        if (vb === null || vb === undefined) return -1;
        if (va < vb) return dir === 'asc' ? -1 : 1;
        if (va > vb) return dir === 'asc' ?  1 : -1;
        return 0;
    });
}


// ── Persistencia de estado ────────────────────────────────────────────────────

function saveState(opts = {}) {
    localStorage.setItem('fantasyAppState', JSON.stringify({
        sortKey:       currentSortKey,
        sortDir:       sortDirection,
        posFilter:     opts.posFilter     || currentPositionFilter,
        teamFilter:    opts.teamFilter    || currentTeamFilter,
        nbaTeamFilter: opts.nbaTeamFilter || currentNBATeamFilter,
    }));
}
function loadState() {
    const s = JSON.parse(localStorage.getItem('fantasyAppState') || '{}');
    currentSortKey        = s.sortKey       || 'rankTotal';
    sortDirection         = s.sortDir       || 'asc';
    currentPositionFilter = s.posFilter     || 'all';
    currentTeamFilter     = s.teamFilter    || 'all';
    currentNBATeamFilter  = s.nbaTeamFilter || 'all';
}


// ── Utilidades de nombres e iconos ────────────────────────────────────────────

// Los equipos tienen formato "ABBR - Nombre completo"
// getShortName devuelve "Nombre completo", getTeamCode devuelve "ABBR"
function getShortName(full) {
    if (!full) return '';
    const parts = full.split(' - ');
    return parts.length >= 2 ? parts.slice(1).join(' - ').trim() : full.trim();
}
function getTeamCode(full) {
    if (!full) return '';
    const parts = full.split(' - ');
    return parts.length >= 2 ? parts[0].trim() : full.trim();
}
function getNBAIconUrl(team) {
    const raw = getTeamCode(team).replace(/\./g, '').replace(/\s+/g, '-').replace(/\//g, '-').replace(/[^a-zA-Z0-9\-]/g, '');
    return `assets/team-icons/${raw.toUpperCase()}.png`;
}
function getFantasyIconUrl(name) {
    if (!name || name.toLowerCase().includes('waiver')) return '';
    return `assets/fantasy-icons/${getTeamCode(name).substring(0, 4).toUpperCase()}.svg`;
}
function isFilteredFantasyName(name) {
    return FILTERED_FANTASY_NAMES.some(f => name.toLowerCase().includes(f));
}
function isFilteredNBAName(name) {
    return FILTERED_NBA_NAMES.some(f => getShortName(name).toLowerCase().includes(f));
}


// ── Tabla ─────────────────────────────────────────────────────────────────────

// Formatea número con coma decimal; devuelve '—' para null/undefined
function fmtNum(v, dec = 2) {
    if (v === null || v === undefined) return '—';
    return typeof v === 'number' ? v.toFixed(dec).replace('.', ',') : v;
}

// Calcula la tendencia comparando rankSemana con rankTotal
// Rank más bajo = mejor. Si rankSemana < rankTotal el jugador está en racha.
// Solo aplica a jugadores (entrenadores no tienen rankSemana → devuelve null)
function getTendencia(rankSemana, rankTotal) {
    if (rankSemana === null || rankSemana === undefined ||
        rankTotal  === null || rankTotal  === undefined) return null;
    const diff = rankTotal - rankSemana; // positivo = está mejor esta semana
    if (diff >= 50)  return { icon: '↑↑', color: '#15803d', title: `Muy en racha (rank sem ${rankSemana} vs total ${rankTotal})` };
    if (diff >= 10)  return { icon: '↑',  color: '#16a34a', title: `En racha (rank sem ${rankSemana} vs total ${rankTotal})` };
    if (diff >= -10) return { icon: '--', color: '#6b7280', title: `Estable (rank sem ${rankSemana} vs total ${rankTotal})` };
    if (diff >= -50) return { icon: '↓',  color: '#ea580c', title: `Bajando (rank sem ${rankSemana} vs total ${rankTotal})` };
    return                   { icon: '↓↓', color: '#ef4444', title: `Muy por debajo (rank sem ${rankSemana} vs total ${rankTotal})` };
}

// Devuelve el indicador de partido hoy según juegaHoy e injuryStatus
// Solo aplica a jugadores (juegaHoy=null significa formato entrenadores)
// Textos de lesión: OUT, DTD (Day-To-Day), Q (Questionable)
function getPartidoHoy(juegaHoy, injuryStatus) {
    if (juegaHoy === null) return null;  // formato entrenadores, no mostrar
    const inj = (injuryStatus || '').toUpperCase();
    if (inj === 'OUT')          return { text: 'OUT', color: '#ef4444', title: 'Lesionado — fuera' };
    if (inj === 'DAY_TO_DAY')   return { text: 'DTD', color: '#ea580c', title: 'Day-To-Day' };
    if (inj === 'QUESTIONABLE') return { text: 'Q',   color: '#d97706', title: 'Questionable' };
    if (juegaHoy === 1)         return { text: '🏀',  color: '',        title: 'Juega hoy' };
    return                               { text: '',    color: '',        title: 'No juega hoy' };
}

// Formatea número con rank entre paréntesis: "4070,90 (1)"
// Si no hay rank muestra solo el número
function fmtWithRank(val, rank, dec = 2) {
    if (val === null || val === undefined) return '—';
    const numStr = typeof val === 'number' ? val.toFixed(dec).replace('.', ',') : val;
    return rank !== null && rank !== undefined ? `${numStr} (${rank})` : numStr;
}

// Crea una celda con icono + texto
function makeIconCell(row, iconSrc, altText, displayText) {
    const td  = row.insertCell();
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;align-items:center;';
    if (iconSrc) {
        const img = document.createElement('img');
        img.src = iconSrc; img.alt = altText; img.width = 24; img.height = 24;
        img.style.cssText = 'object-fit:contain;margin-right:8px;border-radius:3px;';
        img.onerror = function () { this.style.display = 'none'; };
        div.appendChild(img);
    }
    const span = document.createElement('span');
    span.textContent = displayText;
    div.appendChild(span);
    td.appendChild(div);
}

function renderTable(players) {
    const body = document.getElementById('playerTableBody');
    body.innerHTML = '';
    if (!players.length) {
        body.innerHTML = `<tr><td colspan="12">${getTranslations().table_no_results}</td></tr>`;
        return;
    }
    players.forEach(p => {
        const row = body.insertRow();

        // Checkbox para comparar
        const chkCell = row.insertCell();
        const chk = document.createElement('input');
        chk.type = 'checkbox'; chk.checked = selectedIds.has(p.id);
        chk.addEventListener('change', () => {
            if (chk.checked) selectedIds.add(p.id); else selectedIds.delete(p.id);
            // Si la pestaña activa es Comparar, actualizar el gráfico en tiempo real
            if (currentChart === 'compare') renderCompareChart();
        });
        chkCell.appendChild(chk);

        // Nombre + enlace a ESPN
        const nc  = row.insertCell();
        const ndiv = document.createElement('div');
        ndiv.style.cssText = 'display:flex;align-items:center;gap:4px;';
        const nspan = document.createElement('span');
        nspan.textContent = p.name;
        ndiv.appendChild(nspan);
        if (p.espnLink) {
            const a = document.createElement('a');
            a.href = p.espnLink; a.target = '_blank';
            a.className = 'espn-link'; a.innerHTML = '🔗'; a.title = 'Ver en ESPN';
            ndiv.appendChild(a);
        }
        nc.appendChild(ndiv);

        // Equipo NBA (con icono)
        makeIconCell(row, getNBAIconUrl(p.team), p.team, getShortName(p.team));

        // Equipo Fantasy (con icono)
        makeIconCell(row, getFantasyIconUrl(p.fantasyTeam), p.fantasyTeam, getShortName(p.fantasyTeam));

        // Datos numéricos
        row.insertCell().textContent = p.position;
        row.insertCell().textContent = p.rankPos    ?? '—';
        row.insertCell().textContent = fmtWithRank(p.ptsTotal,    p.rankTotal);
        row.insertCell().textContent = fmtNum(p.ptsAvg);
        row.insertCell().textContent = p.partidos   || '—';
        row.insertCell().textContent = fmtWithRank(p.ptsSemana,   p.rankSemana);
        row.insertCell().textContent = fmtWithRank(p.pts2Semanas, p.rank2Semanas);
        row.insertCell().textContent = fmtWithRank(p.ptsMes,      p.rankMes);

        // Columna tendencia: compara rankSemana vs rankTotal
        const tendCell = row.insertCell();
        tendCell.style.cssText = 'text-align:center;font-weight:600;cursor:default;white-space:nowrap;';
        const tend = getTendencia(p.rankSemana, p.rankTotal);
        if (tend) {
            tendCell.textContent = tend.icon;
            tendCell.style.color = tend.color;
            tendCell.title       = tend.title;
        }

        // Columna partido hoy: 🏀 / OUT / DTD / Q / vacío
        const hoyCell = row.insertCell();
        hoyCell.style.cssText = 'text-align:center;font-weight:600;cursor:default;';
        const hoy = getPartidoHoy(p.juegaHoy, p.injuryStatus);
        if (hoy !== null) {
            hoyCell.textContent = hoy.text;
            if (hoy.color) hoyCell.style.color = hoy.color;
            hoyCell.title = hoy.title;
        }
    });
}


// ── Gráficos ──────────────────────────────────────────────────────────────────

window.switchChart = function (type, btn) {
    currentChart = type;
    document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateCurrentChart();
};

window.updateCurrentChart = function () {
    if (!allPlayerData.length) return;
    const limit = document.getElementById('chartLimitSelector').value;
    switch (currentChart) {
        case 'topTotal':       renderBarChartPlayers('ptsTotal', limit); break;
        case 'topAvg':         renderBarChartPlayers('ptsAvg',   limit); break;
        case 'byFantasyTotal': renderGroupChart('fantasy', 'total', limit); break;
        case 'byFantasyAvg':   renderGroupChart('fantasy', 'avg',   limit); break;
        case 'byNBATotal':     renderGroupChart('nba',     'total', limit); break;
        case 'byNBAAvg':       renderGroupChart('nba',     'avg',   limit); break;
        case 'compare':        renderCompareChart(); break;
    }
};

function getLimit(val) {
    return val === 'all' ? null : parseInt(val);
}

// Top N jugadores individuales ordenados por un campo
function renderBarChartPlayers(field, limitVal) {
    const t     = getTranslations();
    const label = field === 'ptsTotal'
        ? t.col_pts_total.replace(' ⇅', '')
        : t.col_pts_avg.replace(' ⇅', '');
    const limit = getLimit(limitVal);

    let sorted = [...activePlayers].sort((a, b) => b[field] - a[field]);
    if (limit) sorted = sorted.slice(0, limit);

    buildChart({
        title:    label,
        labels:   sorted.map(p => p.name),
        datasets: [{ label, data: sorted.map(p => p[field] || 0), backgroundColor: sorted.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]), borderRadius: 4 }],
        indexAxis: 'y',
        xTitle:   label,
    });
}

// Agrupado por equipo fantasy o equipo NBA
function renderGroupChart(groupBy, metric, limitVal) {
    const t     = getTranslations();
    const label = metric === 'total'
        ? t.col_pts_total.replace(' ⇅', '')
        : t.col_pts_avg.replace(' ⇅', '');

    // Acumular por grupo, excluyendo Waivers y Free Agent
    const groupMap = {};
    activePlayers.forEach(p => {
        const rawKey = groupBy === 'fantasy' ? p.fantasyTeam : p.team;
        if (groupBy === 'fantasy' && isFilteredFantasyName(rawKey)) return;
        if (groupBy === 'nba'     && isFilteredNBAName(rawKey))     return;
        const key = getShortName(rawKey);
        if (!groupMap[key]) groupMap[key] = { total: 0, partidos: 0 };
        groupMap[key].total    += p.ptsTotal || 0;
        groupMap[key].partidos += p.partidos || 0;
    });

    let entries = Object.entries(groupMap);
    if (metric === 'total') {
        entries.sort((a, b) => b[1].total - a[1].total);
    } else {
        entries.sort((a, b) => {
            const avgA = a[1].partidos > 0 ? a[1].total / a[1].partidos : 0;
            const avgB = b[1].partidos > 0 ? b[1].total / b[1].partidos : 0;
            return avgB - avgA;
        });
    }

    const limit = getLimit(limitVal);
    if (limit) entries = entries.slice(0, limit);

    const values = entries.map(e =>
        metric === 'total'
            ? Math.round(e[1].total * 100) / 100
            : e[1].partidos > 0 ? Math.round(e[1].total / e[1].partidos * 100) / 100 : 0
    );

    buildChart({
        title:    label,
        labels:   entries.map(e => e[0]),
        datasets: [{ label, data: values, backgroundColor: entries.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]), borderRadius: 4 }],
        indexAxis: 'y',
        xTitle:   label,
    });
}

// Bump chart: evolución de rankings (Total → Mes → 2Sem → Sem)
// Eje Y invertido: 1 arriba = mejor ranking
function renderCompareChart() {
    const t        = getTranslations();
    const selected = allPlayerData.filter(p => selectedIds.has(p.id));
    if (!selected.length) { clearChart(); return; }

    // Solo jugadores tienen rankings por período; filtrar los que tengan al menos uno
    const withRanks = selected.filter(p =>
        p.rankTotal !== null || p.rankMes !== null ||
        p.rank2Semanas !== null || p.rankSemana !== null
    );
    if (!withRanks.length) { clearChart(); return; }

    const labels = ['Rank Total', 'Rank Mes', 'Rank 2 Sem', 'Rank Sem'];

    const datasets = withRanks.map((p, i) => ({
        label:           p.name,
        data:            [p.rankTotal, p.rankMes, p.rank2Semanas, p.rankSemana],
        borderColor:     CHART_COLORS[i % CHART_COLORS.length],
        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
        borderWidth:     2,
        pointRadius:     6,
        pointHoverRadius:8,
        tension:         0,      // líneas rectas entre puntos
        fill:            false,
        spanGaps:        true,   // conectar aunque haya nulls
    }));

    const canvas = document.getElementById('pointsChart');
    const ctx    = canvas.getContext('2d');
    if (chartInstance) chartInstance.destroy();

    // Calcular el máximo rank para el eje Y (peor ranking visible)
    const allRanks = withRanks.flatMap(p =>
        [p.rankTotal, p.rankMes, p.rank2Semanas, p.rankSemana].filter(v => v !== null)
    );
    const maxRank = allRanks.length ? Math.max(...allRanks) + 10 : 100;

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive:          true,
            maintainAspectRatio: false,
            layout: { padding: { bottom: 20, top: 10 } },
            plugins: {
                title:   {
                    display: true,
                    text:    t.tab_compare,
                    font:    { size: 14, weight: 'bold' },
                    padding: { bottom: 10 },
                },
                legend:  { position: 'top', labels: { boxWidth: 20 } },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: #${ctx.parsed.y}`
                    }
                },
            },
            scales: {
                x: {
                    title: { display: false },
                },
                y: {
                    reverse:    true,   // 1 arriba = mejor
                    min:        1,
                    max:        maxRank,
                    title:      { display: true, text: 'Ranking (↑ mejor)' },
                    ticks:      { stepSize: Math.ceil(maxRank / 10) },
                },
            },
        },
    });
}

// Función genérica para construir cualquier gráfico de barras
function buildChart({ title = '', labels, datasets, indexAxis = 'x', xTitle = '' }) {
    const ctx = document.getElementById('pointsChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive:          true,
            maintainAspectRatio: false,
            indexAxis,
            layout: { padding: { bottom: 20, top: 10 } },
            plugins: {
                title:   { display: !!title, text: title, font: { size: 14, weight: 'bold' }, padding: { bottom: 10 } },
                legend:  { position: datasets.length > 1 ? 'top' : 'none', labels: { boxWidth: 20 } },
                tooltip: { mode: 'index', intersect: false },
            },
            scales: {
                x: { title: { display: !!xTitle, text: xTitle }, beginAtZero: true },
                y: { beginAtZero: true },
            },
        },
    });
}

function clearChart() {
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    const canvas = document.getElementById('pointsChart');
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

window.clearChartBtn = function () {
    clearChart();
    document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
    currentChart = '';
};


// ── Descarga del gráfico como PNG ─────────────────────────────────────────────

window.downloadChartImage = function () {
    if (!chartInstance) { alert('No hay gráfico para descargar.'); return; }
    const date = new Date().toLocaleDateString('es-ES').replace(/\//g, '-');
    // Renderizar sobre fondo blanco (el canvas del gráfico es transparente)
    const tmp = document.createElement('canvas');
    tmp.width  = chartInstance.canvas.width;
    tmp.height = chartInstance.canvas.height;
    const ctx  = tmp.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, tmp.width, tmp.height);
    ctx.drawImage(chartInstance.canvas, 0, 0);
    const a = document.createElement('a');
    a.href     = tmp.toDataURL('image/png');
    a.download = `Grafico_Fantasy_${currentChart}_${date}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
};


// ── Reset ────────────────────────────────────────────────────────────────────

// resetData: limpia datos, filtros y gráfico pero mantiene los indicadores de archivo
// Se usa al cargar un nuevo CSV para no perder el indicador del otro archivo ya cargado
function resetData() {
    // Limpia solo la UI y los datos combinados, NO los CSVs cargados
    // (playersData y statsData se preservan para que checkAndProcess() pueda combinarlos)
    allPlayerData = []; activePlayers = [];
    selectedIds.clear();

    const t = getTranslations();
    document.getElementById('playerTableBody').innerHTML =
        `<tr><td colspan="12">${t.table_empty_initial}</td></tr>`;

    clearChart();
    document.getElementById('downloadChart').disabled = true;

    const fSel = document.getElementById('fantasyTeamSelector');
    fSel.innerHTML = `<option value="all">${t.filter_all_fantasy}</option>`; fSel.disabled = true;
    const nSel = document.getElementById('nbaTeamSelector');
    nSel.innerHTML = `<option value="all">${t.filter_all_nba}</option>`; nSel.disabled = true;

    document.querySelectorAll('.filter-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
    const allBtn = document.querySelector(".filter-btn[onclick*=\"'all'\"]");
    if (allBtn) { allBtn.classList.add('active'); allBtn.setAttribute('aria-pressed', 'true'); }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';

    currentSortKey = 'rankTotal'; sortDirection = 'asc';
    currentPositionFilter = 'all'; currentTeamFilter = 'all'; currentNBATeamFilter = 'all';
    currentSearchText = '';
}

// resetDisplay: reset total incluyendo indicadores de archivo y fechas
// Se usa en el arranque inicial de la app
function resetDisplay() {
    // Limpiar datos CSV y fechas
    playersData = []; statsData = {};
    playersFileDate = null; statsFileDate = null;

    // Limpiar indicadores de archivo
    ['playersFileStatus', 'statsFileStatus'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.textContent = ''; el.classList.remove('loaded'); }
    });

    updateCreditDate();
    // El resto lo hace resetData()
    resetData();
}


// ── Pie de página ─────────────────────────────────────────────────────────────

function updateCreditDate() {
    const el = document.getElementById('currentDatePlaceholder');
    if (!el) return;
    if (!playersFileDate && !statsFileDate) {
        el.textContent = getTranslations().credit_no_data;
        return;
    }
    // Mostrar la fecha más reciente de los dos archivos cargados
    const d = (playersFileDate && statsFileDate)
        ? (playersFileDate > statsFileDate ? playersFileDate : statsFileDate)
        : (playersFileDate || statsFileDate);
    el.textContent = d.toLocaleDateString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}
