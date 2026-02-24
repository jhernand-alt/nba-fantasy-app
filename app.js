// ============================================================================
// FANTASY NBA - APLICACIÓN DE ESTADÍSTICAS
// ============================================================================
// Esta aplicación procesa datos de jugadores NBA de fantasy y muestra
// estadísticas, gráficos y permite filtrar por equipos y posiciones.
// ============================================================================

// Aplicar tema guardado ANTES del DOM para evitar parpadeo
applyStoredTheme();

// ============================================================================
// INTERNACIONALIZACIÓN (i18n)
// ============================================================================

function getTranslations(lang) {
    const code = lang || localStorage.getItem('language') || 'es';
    const map  = { es: window.LANG_ES, eu: window.LANG_EU, en: window.LANG_EN };
    return map[code] || window.LANG_ES;
}

function setLanguage(lang) {
    const t = getTranslations(lang);
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-lang-key]').forEach(el => {
        const key = el.dataset.langKey;
        if (!t[key] || el.tagName === 'TITLE') return;
        el.textContent = t[key];
    });

    if (t.document_title) document.title = t.document_title;

    document.querySelectorAll('[data-lang-key-aria]').forEach(el => {
        const key = el.dataset.langKeyAria;
        if (t[key]) el.setAttribute('aria-label', t[key]);
    });

    updateLangButton(lang);
    document.querySelectorAll('.lang-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.lang === lang);
    });

    // Re-render si hay datos cargados
    if (typeof activePlayers !== 'undefined' && activePlayers.length > 0) {
        renderPlayerTable(activePlayers);
    }

    // Actualizar encabezados de tabla siempre (estén o no cargados los datos)
    const th = getTranslations(lang);
    const headerEl = document.getElementById('playerTableHeader');
    if (headerEl) {
        headerEl.innerHTML = `<tr>
            <th onclick="sortTable('name', this)" class="sortable">${th.col_name}</th>
            <th onclick="sortTable('team', this)" class="sortable">${th.col_nba_team}</th>
            <th onclick="sortTable('fantasyTeam', this)" class="sortable">${th.col_fantasy_team}</th>
            <th>${th.col_position}</th>
            <th onclick="sortTable('totalPoints', this)" class="sortable">${th.col_total_points}</th>
            <th onclick="sortTable('averagePoints', this)" class="sortable">${th.col_avg_points}</th>
            <th onclick="sortTable('performance', this)" class="sortable">${th.col_rating}</th>
        </tr>`;
    }

    // Actualizar la primera opción de los selectores de equipo
    const fSel = document.getElementById('fantasyTeamSelector');
    if (fSel && fSel.options[0]) fSel.options[0].textContent = th.filter_all_fantasy;
    const nSel = document.getElementById('nbaTeamSelector');
    if (nSel && nSel.options[0]) nSel.options[0].textContent = th.filter_all_nba;

    // Refrescar pie de página si no hay datos cargados
    if (typeof playersFileDate === 'undefined' || (!playersFileDate && !statsFileDate)) {
        const datePlaceholder = document.getElementById('currentDatePlaceholder');
        if (datePlaceholder) datePlaceholder.textContent = th.credit_no_data;
    }
}

function applyStoredLanguage() {
    setLanguage(localStorage.getItem('language') || 'es');
}

// ── Selector de idioma (UI) ──

const FLAG_SVGS = {
    es: `<svg class="flag-svg" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#AA151B"/><rect y="10" width="60" height="20" fill="#F1BF00"/></svg>`,
    eu: `<svg class="flag-svg" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#D8202C"/><rect x="24" y="0" width="12" height="40" fill="white"/><rect x="0" y="14" width="60" height="12" fill="white"/><rect x="26.5" y="0" width="7" height="40" fill="#007A3D"/><rect x="0" y="16.5" width="60" height="7" fill="#007A3D"/></svg>`,
    en: `<svg class="flag-svg" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#012169"/><line x1="0" y1="0" x2="60" y2="40" stroke="white" stroke-width="8"/><line x1="60" y1="0" x2="0" y2="40" stroke="white" stroke-width="8"/><line x1="0" y1="0" x2="60" y2="40" stroke="#C8102E" stroke-width="4.5"/><line x1="60" y1="0" x2="0" y2="40" stroke="#C8102E" stroke-width="4.5"/><rect x="24" y="0" width="12" height="40" fill="white"/><rect x="0" y="14" width="60" height="12" fill="white"/><rect x="26" y="0" width="8" height="40" fill="#C8102E"/><rect x="0" y="16" width="60" height="8" fill="#C8102E"/></svg>`
};

function updateLangButton(lang) {
    const btn = document.getElementById('langButtonContent');
    if (!btn) return;
    const codes = { es: 'ES', eu: 'EU', en: 'EN' };
    btn.innerHTML = `${FLAG_SVGS[lang] || ''}<span class="lang-code">${codes[lang] || lang.toUpperCase()}</span>`;
}

window.toggleLangMenu = function () {
    const menu   = document.getElementById('langMenu');
    const button = document.getElementById('langButton');
    menu.classList.toggle('hidden');
    const isOpen = !menu.classList.contains('hidden');
    button.setAttribute('aria-expanded', isOpen);
    if (isOpen) {
        setTimeout(() => document.addEventListener('click', closeLangMenuOnClickOutside), 0);
    }
};

function closeLangMenuOnClickOutside(e) {
    const wrapper = document.getElementById('languageSelectorWrapper');
    if (!wrapper.contains(e.target)) {
        document.getElementById('langMenu').classList.add('hidden');
        document.getElementById('langButton').setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', closeLangMenuOnClickOutside);
    }
}

// ============================================================================
// TEMA Y COLORES
// ============================================================================

window.toggleThemeMenu = function() {
    const menu = document.getElementById('themeMenu');
    menu.classList.toggle('hidden');
    if (!menu.classList.contains('hidden')) {
        setTimeout(() => document.addEventListener('click', closeThemeMenuOnClickOutside), 0);
    }
};

function closeThemeMenuOnClickOutside(e) {
    const menu   = document.getElementById('themeMenu');
    const button = document.getElementById('themeButton');
    if (!menu.contains(e.target) && !button.contains(e.target)) {
        menu.classList.add('hidden');
        document.removeEventListener('click', closeThemeMenuOnClickOutside);
    }
}

window.changeTheme = function(theme) {
    const root = document.documentElement;
    if (theme === 'auto') {
        root.setAttribute('data-theme',
            window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (localStorage.getItem('theme') === 'auto')
                root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        });
    } else {
        root.setAttribute('data-theme', theme);
    }
    localStorage.setItem('theme', theme);
    toggleThemeMenu();
};

window.changeColorScheme = function(scheme) {
    document.documentElement.setAttribute('data-color-scheme', scheme);
    localStorage.setItem('colorScheme', scheme);
    toggleThemeMenu();
};

function applyStoredTheme() {
    const t = localStorage.getItem('theme')       || 'auto';
    const s = localStorage.getItem('colorScheme') || 'blue';
    document.documentElement.setAttribute('data-theme',
        t === 'auto'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : t
    );
    document.documentElement.setAttribute('data-color-scheme', s);
}

// ============================================================================
// FIN INFRAESTRUCTURA — LÓGICA DE LA APP
// ============================================================================

// --- VARIABLES GLOBALES DEL ESTADO DE LA APLICACIÓN ---
let playersData = []; // Datos cargados de jugadores.csv
let statsData = []; // Datos cargados de stats_semanales.csv
let allPlayerData = []; // Datos combinados y procesados listos para mostrar
let activePlayers = []; // Jugadores filtrados actualmente visibles
let chartInstance = null; // Instancia del gráfico Chart.js
let weeklyLabels = []; // Etiquetas de semanas para el eje X (S01, S02, etc.)
let currentSortKey = 'totalPoints'; // Columna actual por la que se ordena
let sortDirection = 'desc'; // Dirección de ordenamiento ('asc' o 'desc')
let currentPositionFilter = 'all'; // Filtro de posición activo
let currentTeamFilter = 'all'; // Filtro de equipo fantasy activo
let currentNBATeamFilter = 'all'; // Filtro de equipo NBA activo
let playersFileDate = null; // Fecha de modificación del archivo de jugadores
let statsFileDate = null; // Fecha de modificación del archivo de stats

// Configuración de formato CSV
const DECIMAL_SEPARATOR = ','; // Separador decimal en el CSV español
const COLUMN_DELIMITER = ';'; // Delimitador de columnas

// ============================================================================
// CONFIGURACIÓN DE FÓRMULA DE RATING (EDITABLE)
// ============================================================================
// Puedes modificar estos valores para ajustar cómo se calcula el rating
// IMPORTANTE: Los valores deben sumar 1.0 (100%)
const RATING_WEIGHTS = {
    volume: 0.60,      // 60% - Peso del volumen de puntos totales
    regularity: 0.40,  // 40% - Peso de la regularidad (inversa del CV)
    activity: 0.00     // 0% - No se usa (todos los jugadores tienen el mismo número de semanas)
};
// ============================================================================ en CSV

// Colores para las líneas del gráfico (se repiten cíclicamente)
const chartColors = [
    'rgb(255, 99, 132)', 'rgb(54, 162, 235)', 'rgb(255, 205, 86)', 
    'rgb(75, 192, 192)', 'rgb(153, 102, 255)', 'rgb(255, 159, 64)',
    'rgb(199, 199, 199)', 'rgb(83, 102, 255)', 'rgb(10, 200, 100)'
];

// ============================================================================
// CARGA DE ARCHIVOS CSV
// ============================================================================
// Maneja la carga de los dos archivos CSV necesarios: jugadores y estadísticas

// Event listener para el archivo de jugadores
document.getElementById('csvPlayers').addEventListener('change', handlePlayersUpload);
// Event listener para el archivo de estadísticas
document.getElementById('csvStats').addEventListener('change', handleStatsUpload);

/**
 * Maneja la carga del archivo jugadores.csv
 * @param {Event} event - Evento del input file
 */
function handlePlayersUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Guardar la fecha de modificación del archivo
    playersFileDate = new Date(file.lastModified);

    const reader = new FileReader();
    reader.onload = function(e) {
        const csvText = e.target.result;
        try {
            playersData = parsePlayersCSV(csvText);
            // Mostrar nombre del archivo cargado
            const statusElement = document.getElementById('playersFileStatus');
            if (statusElement) {
                statusElement.textContent = `✓ ${file.name}`;
                statusElement.classList.add('loaded');
            }
            // Actualizar fecha en el pie de página
            updateCreditDate();
            checkAndProcessData(); // Intenta combinar si ya están ambos archivos
        } catch (error) {
            alert("Error al procesar jugadores.csv: " + error.message);
            return;
        }
    };
    reader.readAsText(file);
}

/**
 * Maneja la carga del archivo stats_semanales.csv
 * @param {Event} event - Evento del input file
 */
function handleStatsUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Guardar la fecha de modificación del archivo
    statsFileDate = new Date(file.lastModified);

    const reader = new FileReader();
    reader.onload = function(e) {
        const csvText = e.target.result;
        try {
            statsData = parseStatsCSV(csvText);
            // Mostrar nombre del archivo cargado
            const statusElement = document.getElementById('statsFileStatus');
            if (statusElement) {
                statusElement.textContent = `✓ ${file.name}`;
                statusElement.classList.add('loaded');
            }
            // Actualizar fecha en el pie de página
            updateCreditDate();
            checkAndProcessData(); // Intenta combinar si ya están ambos archivos
        } catch (error) {
            alert("Error al procesar stats_semanales.csv: " + error.message);
            return;
        }
    };
    reader.readAsText(file);
}

// ============================================================================
// PARSEO DE ARCHIVOS CSV
// ============================================================================

/**
 * Parsea el archivo jugadores.csv
 * Estructura esperada: ID_NBA;Nombre;Equipo_Fantasy;Equipo_NBA;Posicion;Enlace_Web_ESPN
 * @param {string} csvText - Contenido del archivo CSV
 * @returns {Array} Array de objetos con datos de jugadores
 */
function parsePlayersCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length <= 1) return [];
    
    const data = [];
    
    // Saltar la primera línea (encabezados) y procesar cada línea
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(COLUMN_DELIMITER);
        
        // Verificar que tenga al menos las 5 columnas obligatorias
        if (values.length >= 5) {
            const player = {
                id: values[0].trim(),
                name: values[1].trim(),
                fantasyTeam: values[2].trim(),
                team: values[3].trim(),
                position: values[4].trim().toUpperCase(),
                espnLink: values.length >= 6 ? values[5].trim() : '' // Columna opcional
            };
            data.push(player);
        }
    }
    return data;
}

/**
 * Parsea el archivo stats_semanales.csv
 * Estructura esperada: ID_NBA;Semana;Puntos_Fantasy;... (otras columnas ignoradas)
 * IMPORTANTE: Puede tener filas con puntos vacíos (semanas futuras aún sin rellenar)
 * @param {string} csvText - Contenido del archivo CSV
 * @returns {Array} Array de objetos con estadísticas semanales
 */
function parseStatsCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length <= 1) return [];
    
    const data = [];
    
    // Saltar la primera línea (encabezados) y procesar cada línea
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(COLUMN_DELIMITER);
        
        // Verificar que tenga al menos las 3 primeras columnas
        if (values.length >= 3) {
            const idNBA = values[0].trim();
            const weekStr = values[1].trim();
            const pointsStr = values[2].trim();
            
            // Parsear semana
            const week = parseInt(weekStr);
            
            // Si la semana no es válida, saltar esta línea
            if (isNaN(week) || week < 1) {
                continue;
            }
            
            // Parsear puntos - PUEDE ESTAR VACÍO para semanas futuras
            // IMPORTANTE: Distinguir entre:
            //   - Celda vacía (sin datos) → points = null → No se cuenta, no se pinta
            //   - Valor 0 (jugó pero no anotó) → points = 0 → SÍ se cuenta, SÍ se pinta
            let points = null;
            if (pointsStr !== '' && pointsStr !== null && pointsStr !== undefined) {
                const parsedPoints = parseFloat(pointsStr.replace(DECIMAL_SEPARATOR, '.'));
                // Solo usar el valor si es un número válido (incluyendo 0)
                if (!isNaN(parsedPoints)) {
                    points = parsedPoints;  // Puede ser 0, que es válido y diferente de null
                }
            }
            
            // Agregar el registro solo si tiene ID válido y semana válida
            // Los puntos pueden ser null (semana aún no jugada)
            if (idNBA !== '' && !isNaN(week)) {
                const stat = {
                    id: idNBA,
                    week: week,
                    points: points  // null si la celda está vacía
                };
                data.push(stat);
            }
        }
    }
    return data;
}

// ============================================================================
// PROCESAMIENTO Y COMBINACIÓN DE DATOS
// ============================================================================

/**
 * Verifica si ambos archivos están cargados y los combina
 * Solo procesa cuando ambos CSV están disponibles
 */
function checkAndProcessData() {
    // Esperar a que ambos archivos estén cargados
    if (playersData.length === 0 || statsData.length === 0) {
        return;
    }
    
    try {
        // Combinar datos de jugadores con sus estadísticas
        allPlayerData = combineData(playersData, statsData);
        
        if (allPlayerData.length === 0) {
            alert("No se pudieron combinar los datos. Verifica que los IDs coincidan.");
            resetDisplay();
            return;
        }
        
        // Calcular prestaciones para cada jugador
        const maxTotalPoints = Math.max(...allPlayerData.map(p => p.totalPoints), 1);
        allPlayerData.forEach(player => {
            player.performance = calculatePerformance(player, maxTotalPoints);
            player.trend = calculateTrend(player.weeklyPoints);
        });
        
        // Determinar el número máximo de semanas en los datos
        const maxWeek = Math.max(...statsData.map(s => s.week));
        // Generar etiquetas S01, S02, S03, etc.
        weeklyLabels = Array.from({length: maxWeek}, (_, i) => `S${String(i + 1).padStart(2, '0')}`);
        
        // Inicializar la aplicación con los datos procesados
        initializeApplication(allPlayerData);
    } catch (error) {
        alert("Error al combinar los datos: " + error.message);
        resetDisplay();
    }
}

/**
 * Combina los datos de jugadores con sus estadísticas semanales
 * MANEJA CORRECTAMENTE: Semanas con puntos null (aún no jugadas/rellenadas)
 * @param {Array} players - Array de jugadores
 * @param {Array} stats - Array de estadísticas semanales
 * @returns {Array} Array de jugadores con estadísticas agregadas
 */
function combineData(players, stats) {
    const combined = [];
    
    // Agrupar estadísticas por ID_NBA para acceso rápido
    const statsByPlayer = {};
    stats.forEach(stat => {
        if (!statsByPlayer[stat.id]) {
            statsByPlayer[stat.id] = {};
        }
        // Guardar puntos por semana: statsByPlayer[id][semana] = puntos (puede ser null)
        statsByPlayer[stat.id][stat.week] = stat.points;
    });
    
    // Determinar el número máximo de semanas en los datos
    const maxWeek = Math.max(...stats.map(s => s.week), 0);
    
    // Combinar cada jugador con sus estadísticas
    players.forEach(player => {
        const playerStats = statsByPlayer[player.id] || {};
        
        // Crear array de puntos semanales
        const weeklyPoints = [];
        let totalPoints = 0;
        let weeksPlayed = 0;
        
        // Para cada semana, obtener puntos o null si no jugó o aún no se ha rellenado
        for (let week = 1; week <= maxWeek; week++) {
            const points = playerStats[week];
            
            // Si los puntos existen Y son un número válido (no null)
            if (points !== undefined && points !== null && !isNaN(points)) {
                weeklyPoints.push(points);
                totalPoints += points;
                weeksPlayed++;
            } else {
                // Semana no jugada o aún no rellenada
                weeklyPoints.push(null);
            }
        }
        
        // Calcular promedio de puntos por semana (solo semanas jugadas)
        const averagePoints = weeksPlayed > 0 ? (totalPoints / weeksPlayed) : 0;
        
        // Crear array de puntos acumulados para el gráfico de totales
        const cumulativePoints = [];
        let cumulative = 0;
        let hasStarted = false; // Para saber si ya empezó a acumular puntos
        
        weeklyPoints.forEach(points => {
            if (points !== null && !isNaN(points)) {
                cumulative += points;
                hasStarted = true;
                cumulativePoints.push(cumulative);
            } else {
                // Si aún no ha empezado a jugar, null
                // Si ya jugó pero esta semana no tiene datos, también null (evita líneas horizontales)
                cumulativePoints.push(null);
            }
        });
        
        // Crear objeto jugador completo con todas las propiedades
        combined.push({
            id: player.id,
            name: player.name,
            fantasyTeam: player.fantasyTeam,
            team: player.team,
            position: player.position,
            espnLink: player.espnLink,
            weeklyPoints: weeklyPoints,
            cumulativePoints: cumulativePoints,
            totalPoints: totalPoints,
            averagePoints: averagePoints,
            weeksPlayed: weeksPlayed
        });
    });
    
    return combined;
}

// ============================================================================
// CÁLCULO DE PRESTACIONES (PERFORMANCE RATING)
// ============================================================================

/**
 * Calcula la desviación estándar de un array de puntos
 * @param {Array} points - Array de puntos (puede incluir null)
 * @param {number} mean - Media de los puntos
 * @returns {number} Desviación estándar
 */
function calculateStdDev(points, mean) {
    // Filtrar nulls y convertir a números válidos (incluir ceros)
    const validPoints = points.filter(p => p !== null && !isNaN(p));
    
    if (validPoints.length <= 1) return 0;
    
    const squaredDiffs = validPoints.map(p => Math.pow(p - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / (validPoints.length - 1);
    
    return Math.sqrt(variance);
}

/**
 * Calcula el coeficiente de variación (CV)
 * @param {number} stdDev - Desviación estándar
 * @param {number} mean - Media
 * @returns {number} Coeficiente de variación (0 a 1+)
 */
function calculateCV(stdDev, mean) {
    if (mean === 0) return 0;
    return stdDev / mean;
}

/**
 * Calcula la tendencia del jugador (subiendo, bajando o estable)
 * Compara el promedio de las últimas 4 semanas con las 4 anteriores
 * @param {Array} weeklyPoints - Array de puntos semanales
 * @returns {string} '↑' subiendo, '↓' bajando, '−' estable
 */
function calculateTrend(weeklyPoints) {
    // Filtrar solo puntos válidos (no null)
    const validPoints = weeklyPoints.filter(p => p !== null && !isNaN(p));
    
    // Necesitamos al menos 6 semanas para calcular tendencia (4 + 4 anteriores mínimo)
    if (validPoints.length < 6) return '−';
    
    // Tomar las últimas 4 semanas y las 4 anteriores
    const recentWeeks = validPoints.slice(-4);
    const previousWeeks = validPoints.slice(-8, -4);
    
    if (previousWeeks.length === 0) return '−';
    
    const recentAvg = recentWeeks.reduce((sum, p) => sum + p, 0) / recentWeeks.length;
    const previousAvg = previousWeeks.reduce((sum, p) => sum + p, 0) / previousWeeks.length;
    
    // Umbral del 5% para considerar cambio significativo
    const threshold = previousAvg * 0.05;
    
    if (recentAvg > previousAvg + threshold) return '↑';
    if (recentAvg < previousAvg - threshold) return '↓';
    return '−';
}

/**
 * Calcula el rating de prestaciones de un jugador (0-100)
 * Fórmula: 50% volumen + 30% regularidad + 20% actividad
 * @param {Object} player - Objeto jugador con weeklyPoints, totalPoints, etc.
 * @param {number} maxTotalPoints - Puntos totales máximos de todos los jugadores
 * @returns {number} Rating entre 0 y 100
 */
function calculatePerformance(player, maxTotalPoints) {
    // Si no ha jugado ninguna semana O tiene 0 puntos totales, rating = 0
    if (player.weeksPlayed === 0 || player.totalPoints === 0) return 0;
    
    const validPoints = player.weeklyPoints.filter(p => p !== null && !isNaN(p));
    
    // 1. VOLUMEN (50%): Puntos totales normalizados
    const volumeScore = maxTotalPoints > 0 ? (player.totalPoints / maxTotalPoints) * 100 : 0;
    
    // 2. REGULARIDAD (30%): Inversa del coeficiente de variación
    const mean = player.averagePoints;
    const stdDev = calculateStdDev(player.weeklyPoints, mean);
    const cv = calculateCV(stdDev, mean);
    
    // Normalizar CV: un CV de 0 (perfecta regularidad) = 100, CV alto = 0
    // Usamos una función exponencial decreciente para suavizar
    // CV típico en NBA puede ser 0.3-0.8, así que normalizamos en ese rango
    const regularityScore = Math.max(0, 100 * Math.exp(-cv * 1.5));
    
    // 3. ACTIVIDAD (20%): Porcentaje de semanas jugadas
    const totalWeeks = player.weeklyPoints.length;
    const activityScore = totalWeeks > 0 ? (player.weeksPlayed / totalWeeks) * 100 : 0;
    
    // RATING FINAL: Media ponderada usando pesos configurables
    const performance = (volumeScore * RATING_WEIGHTS.volume) + 
                       (regularityScore * RATING_WEIGHTS.regularity) + 
                       (activityScore * RATING_WEIGHTS.activity);
    
    return Math.round(performance); // Redondear a entero
}

// ============================================================================
// GESTIÓN DE ESTADO (LOCAL STORAGE)
// ============================================================================
// Guarda y recupera el estado de filtros y ordenamiento entre sesiones

/**
 * Guarda el estado actual en localStorage
 * @param {Object} options - Opciones adicionales para guardar
 */
function saveState(options = {}) {
    const state = {
        sortKey: currentSortKey,
        sortDir: sortDirection,
        posFilter: options.posFilter || currentPositionFilter,
        teamFilter: options.teamFilter || currentTeamFilter,
        nbaTeamFilter: options.nbaTeamFilter || currentNBATeamFilter
    };
    localStorage.setItem('fantasyAppState', JSON.stringify(state));
}

/**
 * Carga el estado guardado desde localStorage
 */
function loadState() {
    const savedState = localStorage.getItem('fantasyAppState');
    if (!savedState) return;

    const state = JSON.parse(savedState);
    currentSortKey = state.sortKey || 'totalPoints';
    sortDirection = state.sortDir || 'desc';
    currentPositionFilter = state.posFilter || 'all'; 
    currentTeamFilter = state.teamFilter || 'all';
    currentNBATeamFilter = state.nbaTeamFilter || 'all';
}

// ============================================================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ============================================================================

/**
 * Inicializa la aplicación con los datos cargados
 * Configura selectores, filtros y renderiza la vista inicial
 * @param {Array} allData - Array con todos los jugadores procesados
 */
function initializeApplication(allData) {
    
    // Cargar estado guardado
    loadState();

    // ========== CONFIGURAR SELECTOR DE EQUIPOS FANTASY ==========
    const fantasyTeamsSet = new Set(allData.map(p => p.fantasyTeam));
    const fantasyTeams = Array.from(fantasyTeamsSet).sort();
    const fantasySelector = document.getElementById('fantasyTeamSelector');
    fantasySelector.innerHTML = `<option value="all">${getTranslations().filter_all_fantasy}</option>`;
    fantasyTeams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = getShortTeamName(team); // Solo mostrar la parte después del guión
        fantasySelector.appendChild(option);
    });
    fantasySelector.value = currentTeamFilter;
    fantasySelector.disabled = false;

    // ========== CONFIGURAR SELECTOR DE EQUIPOS NBA ==========
    const nbaTeamsSet = new Set(allData.map(p => p.team));
    const nbaTeams = Array.from(nbaTeamsSet).sort();
    const nbaSelector = document.getElementById('nbaTeamSelector');
    nbaSelector.innerHTML = `<option value="all">${getTranslations().filter_all_nba}</option>`;
    nbaTeams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = getShortTeamName(team); // Solo mostrar la parte después del guión
        nbaSelector.appendChild(option);
    });
    nbaSelector.value = currentNBATeamFilter;
    nbaSelector.disabled = false;

    // ========== ACTUALIZAR BOTONES DE FILTRO DE POSICIÓN ==========
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const posMatch = btn.getAttribute('onclick').match(/filterPlayersByPosition\('([^']+)'/);
        if (posMatch) {
            const pos = posMatch[1];
            if (pos === currentPositionFilter) {
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
            } else {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            }
        }
    });

    // Aplicar los filtros guardados y renderizar
    applyFiltersAndSort();

    // Habilitar botón de descarga de gráfico
    document.getElementById('downloadChart').disabled = false; 
}

// ============================================================================
// FILTRADO DE JUGADORES
// ============================================================================

/**
 * Filtra jugadores por posición
 * @param {string} position - Posición a filtrar ('all', 'PG', 'SG', etc.)
 * @param {HTMLElement} button - Botón que fue clickeado
 */
window.filterPlayersByPosition = function(position, button) {
    currentPositionFilter = position; 
    
    // Actualizar UI de botones
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
    });
    button.classList.add('active');
    button.setAttribute('aria-pressed', 'true');
    
    // Guardar estado y aplicar filtros
    saveState({ posFilter: position, teamFilter: currentTeamFilter, nbaTeamFilter: currentNBATeamFilter });
    applyFiltersAndSort();
}

/**
 * Filtra jugadores por equipo fantasy
 * @param {string} teamValue - Nombre del equipo o 'all'
 */
window.filterPlayersByFantasyTeam = function(teamValue) {
    currentTeamFilter = teamValue; 
    saveState({ posFilter: currentPositionFilter, teamFilter: teamValue, nbaTeamFilter: currentNBATeamFilter });
    applyFiltersAndSort(); 
}

/**
 * Filtra jugadores por equipo NBA
 * @param {string} teamValue - Nombre del equipo NBA o 'all'
 */
window.filterPlayersByNBATeam = function(teamValue) {
    currentNBATeamFilter = teamValue;
    saveState({ posFilter: currentPositionFilter, teamFilter: currentTeamFilter, nbaTeamFilter: teamValue });
    applyFiltersAndSort();
}

/**
 * Aplica todos los filtros activos y ordena los resultados
 */
function applyFiltersAndSort() {
    let filtered = allPlayerData;

    // Filtro por equipo fantasy
    if (currentTeamFilter !== 'all') {
        filtered = filtered.filter(p => p.fantasyTeam === currentTeamFilter);
    }

    // Filtro por equipo NBA
    if (currentNBATeamFilter !== 'all') {
        filtered = filtered.filter(p => p.team === currentNBATeamFilter);
    }

    // Filtro por posición
    if (currentPositionFilter !== 'all') {
        filtered = filtered.filter(p => p.position.includes(currentPositionFilter));
    }

    activePlayers = filtered;

    // Ordenar según criterio actual
    sortPlayerData(activePlayers, currentSortKey, sortDirection);
    
    // Renderizar tabla y gráfico con los datos filtrados
    renderTable(activePlayers);
    
    // Usar updateChartDisplay para que aplique el límite del selector
    updateChartDisplay();
}

// ============================================================================
// ORDENACIÓN DE LA TABLA
// ============================================================================

/**
 * Ordena la tabla por una columna específica
 * @param {string} key - Clave de la columna a ordenar
 * @param {HTMLElement} thElement - Elemento th que fue clickeado
 */
window.sortTable = function(key, thElement) {
    // Si ya estaba ordenando por esta columna, invertir dirección
    if (currentSortKey === key) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'; 
    } else {
        // Nueva columna, ordenar descendente por defecto
        currentSortKey = key; 
        sortDirection = 'desc'; 
    }
    
    saveState(); 
    applyFiltersAndSort(); 
    updateSortArrows(thElement); 
}

/**
 * Ordena un array de jugadores según criterio
 * @param {Array} players - Array de jugadores a ordenar
 * @param {string} key - Clave por la que ordenar
 * @param {string} direction - 'asc' o 'desc'
 */
function sortPlayerData(players, key, direction) {
    players.sort((a, b) => {
        let valA = a[key]; 
        let valB = b[key]; 
        
        // Para ordenar strings alfabéticamente (case-insensitive)
        if (typeof valA === 'string') { 
            valA = valA.toLowerCase(); 
            valB = valB.toLowerCase(); 
        }

        if (valA < valB) {
            return direction === 'asc' ? -1 : 1; 
        }
        if (valA > valB) {
            return direction === 'asc' ? 1 : -1; 
        }
        return 0; 
    });
}

/**
 * Actualiza las flechas de ordenamiento en los headers
 * @param {HTMLElement} clickedTh - Header clickeado
 */
function updateSortArrows(clickedTh) {
    // Remover atributo aria-sort de todos los headers
    document.querySelectorAll('.player-table th[onclick]').forEach(th => {
        th.removeAttribute('aria-sort'); 
    });
    
    // Agregar aria-sort al header clickeado
    if (sortDirection === 'asc') {
        clickedTh.setAttribute('aria-sort', 'ascending'); 
    } else {
        clickedTh.setAttribute('aria-sort', 'descending'); 
    }
}

// ============================================================================
// ICONOS DE EQUIPOS NBA Y FANTASY
// ============================================================================

/**
 * Extrae el nombre corto de un equipo (la parte después de " - ")
 * Ejemplo: "LAL - Los Angeles Lakers" -> "Los Angeles Lakers"
 * Ejemplo: "OSC - Oscar's ogonzalo" -> "Oscar's ogonzalo"
 * @param {string} fullName - Nombre completo del equipo
 * @returns {string} Nombre corto
 */
function getShortTeamName(fullName) {
    if (!fullName) return '';
    
    const parts = fullName.split(' - ');
    // Si tiene el formato "XXX - Nombre", devolver la parte después del guión
    if (parts.length >= 2) {
        return parts.slice(1).join(' - ').trim(); // slice(1) por si hay varios guiones
    }
    // Si no tiene guión, devolver el nombre completo
    return fullName.trim();
}

/**
 * Extrae el código del equipo (la parte antes de " - ")
 * Ejemplo: "LAL - Los Angeles Lakers" -> "LAL"
 * @param {string} fullName - Nombre completo del equipo
 * @returns {string} Código del equipo
 */
function getTeamCode(fullName) {
    if (!fullName) return '';
    
    const parts = fullName.split(' - ');
    if (parts.length >= 2) {
        return parts[0].trim();
    }
    return fullName.trim();
}

/**
 * Genera rutas alternativas para el icono de un equipo NBA
 * @param {string} teamName - Nombre completo del equipo NBA (puede ser "LAL - Los Angeles Lakers")
 * @returns {Array} Array de posibles rutas al icono
 */
function getTeamIconAlternatives(teamName) {
    // Extraer el código del equipo (parte antes del guión)
    const code = getTeamCode(teamName);
    
    // Limpiar el código para usarlo como nombre de archivo
    const raw = code.toString()
        .replace(/\./g, '')
        .replace(/\s+/g, '-')
        .replace(/\//g, '-')
        .replace(/[^a-zA-Z0-9\-]/g, '');
    
    // Retornar múltiples alternativas (mayúsculas, minúsculas, tal cual)
    return [
        `assets/team-icons/${raw.toUpperCase()}.png`,
        `assets/team-icons/${raw.toLowerCase()}.png`,
        `assets/team-icons/${raw}.png`
    ];
}

/**
 * Obtiene la URL del icono de un equipo NBA
 * @param {string} teamName - Nombre del equipo NBA
 * @returns {string} URL del icono
 */
function getTeamIconUrl(teamName) {
    const alts = getTeamIconAlternatives(teamName);
    return alts.length > 0 ? alts[0] : '';
}

/**
 * Extrae las primeras 3-4 letras del nombre del equipo Fantasy
 * para usarlas como nombre del archivo SVG
 * Ejemplo: "OSC - Oscar's ogonzalo" -> "OSC"
 * @param {string} fantasyTeamName - Nombre completo del equipo Fantasy
 * @returns {string} Código del equipo (ej: "OSC", "LAK")
 */
function getFantasyTeamShortName(fantasyTeamName) {
    // Obtener el código (antes del guión)
    const code = getTeamCode(fantasyTeamName);
    
    // Tomar las primeras 3-4 letras del código
    return code.substring(0, 4).toUpperCase();
}

/**
 * Obtiene la URL del icono SVG de un equipo Fantasy
 * @param {string} fantasyTeamName - Nombre del equipo Fantasy
 * @returns {string} URL del icono o cadena vacía si es Waivers
 */
function getFantasyIconUrl(fantasyTeamName) {
    // Waivers no tiene icono
    if (fantasyTeamName.toLowerCase().includes('waiver')) {
        return '';
    }
    
    const shortName = getFantasyTeamShortName(fantasyTeamName);
    
    // Intentar con 4 letras primero, luego con 3
    const options = [
        `assets/fantasy-icons/${shortName}.svg`,
        `assets/fantasy-icons/${shortName.substring(0, 3)}.svg`
    ];
    
    return options[0]; // Retornar primera opción, el onerror manejará alternativas
}

// ============================================================================
// RENDERIZACIÓN DE LA TABLA
// ============================================================================

/**
 * Renderiza la tabla de jugadores con los datos actuales
 * @param {Array} players - Array de jugadores a mostrar
 */
function renderTable(players) {
    const tableBody = document.getElementById('playerTableBody'); 
    tableBody.innerHTML = ''; 
    
    // Si no hay jugadores, mostrar mensaje
    if (players.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6">No hay jugadores para mostrar con los filtros actuales.</td></tr>'; 
        return;
    }

    // Generar una fila por cada jugador
    players.forEach(player => {
        const row = tableBody.insertRow();
        
        // ========== COLUMNA 1: NOMBRE (con enlace ESPN) ==========
        const nameCell = row.insertCell();
        const nameWrapper = document.createElement('div');
        nameWrapper.style.display = 'flex';
        nameWrapper.style.alignItems = 'center';
        
        // Nombre del jugador
        const nameSpan = document.createElement('span');
        nameSpan.textContent = player.name;
        nameWrapper.appendChild(nameSpan);
        
        // Enlace a ESPN si está disponible
        if (player.espnLink && player.espnLink !== '') {
            const espnLink = document.createElement('a');
            espnLink.href = player.espnLink;
            espnLink.target = '_blank';
            espnLink.className = 'espn-link';
            espnLink.innerHTML = '🔗'; // Icono de enlace
            espnLink.title = 'Ver en ESPN';
            nameWrapper.appendChild(espnLink);
        }
        
        nameCell.appendChild(nameWrapper);

        // ========== COLUMNA 2: EQUIPO NBA (con icono) ==========
        const nbaTeamCell = row.insertCell();
        const nbaWrapper = document.createElement('div');
        nbaWrapper.style.display = 'flex';
        nbaWrapper.style.alignItems = 'center';
        
        // Icono del equipo NBA
        const iconUrl = getTeamIconUrl(player.team);
        const nbaImg = document.createElement('img');
        nbaImg.src = iconUrl;
        nbaImg.alt = `${player.team} logo`;
        nbaImg.width = 24;
        nbaImg.height = 24;
        nbaImg.style.objectFit = 'contain';
        nbaImg.style.marginRight = '8px';
        nbaImg.style.borderRadius = '3px';
        
        // Manejo de error de carga de imagen (probar alternativas)
        nbaImg.onerror = function() {
            if (!this.dataset._triedAlt) {
                this.dataset._triedAlt = '1';
                const alts = getTeamIconAlternatives(player.team);
                for (let i = 0; i < alts.length; i++) {
                    if (alts[i] && alts[i] !== this.src) {
                        this.src = alts[i];
                        return;
                    }
                }
            }
            // Si todas las alternativas fallaron, ocultar imagen
            this.style.display = 'none';
        };

        // Nombre del equipo NBA (solo la parte después del guión)
        const nbaTeamSpan = document.createElement('span');
        nbaTeamSpan.textContent = getShortTeamName(player.team);

        nbaWrapper.appendChild(nbaImg);
        nbaWrapper.appendChild(nbaTeamSpan);
        nbaTeamCell.appendChild(nbaWrapper);

        // ========== COLUMNA 3: EQUIPO FANTASY (con icono SVG) ==========
        const fantasyTeamCell = row.insertCell();
        const fantasyWrapper = document.createElement('div');
        fantasyWrapper.style.display = 'flex';
        fantasyWrapper.style.alignItems = 'center';
        
        // Icono del equipo Fantasy (solo si no es Waivers)
        const fantasyIconUrl = getFantasyIconUrl(player.fantasyTeam);
        if (fantasyIconUrl !== '') {
            const fantasyImg = document.createElement('img');
            fantasyImg.src = fantasyIconUrl;
            fantasyImg.alt = `${player.fantasyTeam} logo`;
            fantasyImg.width = 24;
            fantasyImg.height = 24;
            fantasyImg.style.objectFit = 'contain';
            fantasyImg.style.marginRight = '8px';
            fantasyImg.style.borderRadius = '3px';
            
            // Manejo de error - intentar con 3 letras si falla con 4
            fantasyImg.onerror = function() {
                if (!this.dataset._triedAlt) {
                    this.dataset._triedAlt = '1';
                    const shortName = getFantasyTeamShortName(player.fantasyTeam);
                    const altUrl = `assets/fantasy-icons/${shortName.substring(0, 3)}.svg`;
                    if (this.src !== altUrl) {
                        this.src = altUrl;
                        return;
                    }
                }
                // Si falla, ocultar imagen
                this.style.display = 'none';
            };
            
            fantasyWrapper.appendChild(fantasyImg);
        }
        
        // Nombre del equipo Fantasy (solo la parte después del guión)
        const fantasyTeamSpan = document.createElement('span');
        fantasyTeamSpan.textContent = getShortTeamName(player.fantasyTeam);
        fantasyWrapper.appendChild(fantasyTeamSpan);
        fantasyTeamCell.appendChild(fantasyWrapper);
        
        // ========== COLUMNA 4: POSICIÓN ==========
        row.insertCell().textContent = player.position; 
        
        // ========== COLUMNA 5: PUNTOS TOTALES ==========
        row.insertCell().textContent = player.totalPoints.toFixed(2).replace('.', ','); 
        
        // ========== COLUMNA 6: PUNTOS PROMEDIO ==========
        row.insertCell().textContent = player.averagePoints.toFixed(2).replace('.', ','); 
        
        // ========== COLUMNA 7: RATING ==========
        const performanceCell = row.insertCell();
        
        // Crear contenedor para el rating
        const ratingWrapper = document.createElement('span');
        ratingWrapper.textContent = player.performance;
        
        // Crear span para la flecha con estilo
        const trendSpan = document.createElement('span');
        trendSpan.className = 'trend-indicator';
        trendSpan.textContent = player.trend;
        
        // Añadir clase específica según la tendencia
        if (player.trend === '↑') {
            trendSpan.classList.add('trend-up');
        } else if (player.trend === '↓') {
            trendSpan.classList.add('trend-down');
        } else {
            trendSpan.classList.add('trend-stable');
        }
        
        performanceCell.appendChild(ratingWrapper);
        performanceCell.appendChild(trendSpan);
    });
}

// ============================================================================
// RENDERIZACIÓN DEL GRÁFICO
// ============================================================================

/**
 * Actualiza el tipo de gráfico mostrado (semanal o total)
 */
window.updateChartDisplay = function() {
    const chartType = document.getElementById('chartTypeSelector').value;
    const chartLimit = document.getElementById('chartLimitSelector').value;
    
    // Determinar qué jugadores mostrar según el límite seleccionado
    let playersToChart = [...activePlayers];
    
    if (chartLimit !== 'all') {
        const limit = parseInt(chartLimit);
        // Ordenar por puntos totales (descendente) y tomar los top N
        playersToChart.sort((a, b) => b.totalPoints - a.totalPoints);
        playersToChart = playersToChart.slice(0, limit);
    }
    
    renderChart(playersToChart, chartType);
}

/**
 * Renderiza el gráfico de puntos
 * @param {Array} players - Jugadores a graficar
 * @param {string} chartType - Tipo de gráfico ('weekly' o 'total')
 */
function renderChart(players, chartType = 'weekly') {
    
    const canvas = document.getElementById('pointsChart'); 
    const ctx = canvas.getContext('2d'); 
    
    // Destruir gráfico anterior si existe
    if (chartInstance) {
        chartInstance.destroy(); 
    }
    
    // Configuración según tipo de gráfico
    const isWeekly = (chartType === 'weekly');
    let labels = weeklyLabels; // Por defecto, todas las semanas
    const yAxisLabel = isWeekly ? 'Puntos de la Semana' : 'Puntos Acumulados';
    
    // Crear dataset por cada jugador
    const playerDatasets = players.map((player, index) => {
        // Elegir datos semanales o acumulados según tipo de gráfico
        const dataPoints = isWeekly ? player.weeklyPoints : player.cumulativePoints;
        
        return {
            label: player.name,
            data: dataPoints,
            borderColor: chartColors[index % chartColors.length],
            backgroundColor: chartColors[index % chartColors.length],
            borderWidth: 2,
            fill: false,
            tension: 0.3,
            spanGaps: true, // Conectar puntos aunque haya nulls
        };
    });
    
    // Si no hay jugadores, salir
    if (playerDatasets.length === 0) {
         return;
    }
    
    // ========== RECORTAR SEMANAS VACÍAS EN VISTA DE TOTALES ==========
    if (!isWeekly) {
        // En vista de totales, encontrar la última semana con datos
        let lastWeekWithData = 0;
        players.forEach(player => {
            for (let i = player.cumulativePoints.length - 1; i >= 0; i--) {
                if (player.cumulativePoints[i] !== null) {
                    lastWeekWithData = Math.max(lastWeekWithData, i);
                    break;
                }
            }
        });
        
        // Recortar labels y datos de todos los datasets
        if (lastWeekWithData > 0) {
            labels = weeklyLabels.slice(0, lastWeekWithData + 1);
            playerDatasets.forEach(dataset => {
                dataset.data = dataset.data.slice(0, lastWeekWithData + 1);
            });
        }
    }
    
    // ========== LÍNEA DE PROMEDIO (solo en vista semanal) ==========
    const totalAvgPoints = players.reduce((sum, p) => sum + p.averagePoints, 0);
    const overallAverage = players.length > 0 ? totalAvgPoints / players.length : 0;

    const numLabels = labels.length;
    const fixedAverageData = new Array(numLabels).fill(overallAverage.toFixed(2));
    
    const averageDataset = {
        label: `Promedio (${overallAverage.toFixed(2)} pts)`, // Texto más corto
        data: fixedAverageData,
        borderColor: 'rgba(0, 0, 0, 0.8)', 
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderWidth: 3,
        borderDash: [5, 5], 
        tension: 0, 
        fill: false,
        pointRadius: 0, 
        order: 0, 
        spanGaps: false,
    };
    
    // Solo incluir línea de promedio en vista semanal
    const datasets = isWeekly ? [averageDataset, ...playerDatasets] : playerDatasets;

    // ========== CREAR GRÁFICO ==========
    chartInstance = new Chart(ctx, {
        type: 'line', 
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, 
            layout: {
                padding: {
                    bottom: 40 
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 20
                    },
                    // Permitir ocultar/mostrar líneas clickeando la leyenda
                    onClick: (e, legendItem, legend) => {
                        const index = legendItem.datasetIndex;
                        const meta = legend.chart.getDatasetMeta(index);
                        meta.hidden = meta.hidden === null ? !legend.chart.data.datasets[index].hidden : null;
                        legend.chart.update();
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Semana Fantasy',
                    },
                    grid: {
                        offset: false 
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: yAxisLabel,
                    },
                    beginAtZero: true,
                }
            }
        }
    });
}

// ============================================================================
// DESCARGA DE GRÁFICO
// ============================================================================

/**
 * Descarga el gráfico actual como imagen PNG
 * El nombre del archivo incluye los filtros activos y la fecha
 */
window.downloadChartImage = function() {
    if (!chartInstance) {
        alert("No hay un gráfico para descargar.");
        return;
    }
    
    // Construir nombre descriptivo del archivo
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES').replace(/\//g, '-');
    const chartType = document.getElementById('chartTypeSelector').value === 'weekly' ? 'Semanal' : 'Total';
    
    // Componentes del nombre del archivo
    let filenameParts = ['Grafico', chartType];
    
    // Agregar filtro de equipo fantasy si está activo
    if (currentTeamFilter !== 'all') {
        filenameParts.push(currentTeamFilter.replace(/\s+/g, '_'));
    }
    
    // Agregar filtro de equipo NBA si está activo
    if (currentNBATeamFilter !== 'all') {
        filenameParts.push(currentNBATeamFilter.replace(/\s+/g, '_'));
    }
    
    // Agregar filtro de posición si está activo
    if (currentPositionFilter !== 'all') {
        filenameParts.push(currentPositionFilter);
    }
    
    // Agregar fecha
    filenameParts.push(dateStr);
    
    const filename = filenameParts.join('_') + '.png';
    
    // Crear canvas temporal con fondo blanco
    const canvas = chartInstance.canvas;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    // Fondo blanco
    tempCtx.fillStyle = '#FFFFFF';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Dibujar el gráfico encima
    tempCtx.drawImage(canvas, 0, 0);

    // Descargar imagen
    const image = tempCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ============================================================================
// RESET DE LA APLICACIÓN
// ============================================================================

/**
 * Reinicia la aplicación a su estado inicial
 */
function resetDisplay() {
     localStorage.removeItem('fantasyAppState');
     playersData = [];
     statsData = [];
     allPlayerData = []; 
     activePlayers = []; 
     playersFileDate = null;
     statsFileDate = null;
     
     // Limpiar indicadores de archivos cargados
     const playersStatus = document.getElementById('playersFileStatus');
     const statsStatus = document.getElementById('statsFileStatus');
     if (playersStatus) {
         playersStatus.textContent = '';
         playersStatus.classList.remove('loaded');
     }
     if (statsStatus) {
         statsStatus.textContent = '';
         statsStatus.classList.remove('loaded');
     }
     
     // Actualizar mensaje de fecha
     updateCreditDate();
     
     // Restaurar headers de tabla
     const t = getTranslations();
     const headerRow = `<tr>
        <th onclick="sortTable('name', this)" class="sortable">${t.col_name}</th>
        <th onclick="sortTable('team', this)" class="sortable">${t.col_nba_team}</th>
        <th onclick="sortTable('fantasyTeam', this)" class="sortable">${t.col_fantasy_team}</th>
        <th>${t.col_position}</th>
        <th onclick="sortTable('totalPoints', this)" class="sortable" aria-sort="descending">${t.col_total_points}</th>
        <th onclick="sortTable('averagePoints', this)" class="sortable" aria-sort="none">${t.col_avg_points}</th>
        <th onclick="sortTable('performance', this)" class="sortable" aria-sort="none">${t.col_rating}</th>
     </tr>`;
     document.getElementById('playerTableHeader').innerHTML = headerRow;

     // Mensaje inicial en tabla
     document.getElementById('playerTableBody').innerHTML = '<tr><td colspan="7">Cargue los archivos CSV para ver los datos.</td></tr>'; 
     
     // Destruir gráfico
     if (chartInstance) {
        chartInstance.destroy(); 
     }
     
     // Deshabilitar controles
     document.getElementById('downloadChart').disabled = true; 
     document.getElementById('fantasyTeamSelector').innerHTML = `<option value="all">${t.filter_all_fantasy}</option>`;
     document.getElementById('fantasyTeamSelector').disabled = true;
     document.getElementById('nbaTeamSelector').disabled = true;
     document.getElementById('nbaTeamSelector').innerHTML = `<option value="all">${t.filter_all_nba}</option>`;

     // Resetear filtros de posición
     document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
     });
     
     // Valores por defecto
     currentSortKey = 'totalPoints';
     sortDirection = 'desc';
     currentPositionFilter = 'all';
     currentTeamFilter = 'all';
     currentNBATeamFilter = 'all';
     
     // Activar botón "TODOS"
     const allButton = document.querySelector('.filter-btn[onclick*="filterPlayersByPosition(\'all\')"]');
     if (allButton) {
         allButton.classList.add('active');
         allButton.setAttribute('aria-pressed', 'true');
     }
     
     // Resetear selector de tipo de gráfico
     document.getElementById('chartTypeSelector').value = 'weekly';

     weeklyLabels = [];
}

// ============================================================================
// PIE DE PÁGINA
// ============================================================================

/**
 * Actualiza la fecha en el pie de página
 * Muestra la fecha de modificación más reciente de los archivos CSV cargados
 */
function updateCreditDate() {
    const dateElement = document.getElementById('currentDatePlaceholder');
    if (!dateElement) return;

    // Si no hay archivos cargados, mostrar mensaje por defecto
    if (!playersFileDate && !statsFileDate) {
        dateElement.textContent = getTranslations().credit_no_data;
        return;
    }

    // Determinar la fecha más reciente
    let mostRecentDate = null;
    if (playersFileDate && statsFileDate) {
        mostRecentDate = playersFileDate > statsFileDate ? playersFileDate : statsFileDate;
    } else if (playersFileDate) {
        mostRecentDate = playersFileDate;
    } else if (statsFileDate) {
        mostRecentDate = statsFileDate;
    }

    // Formatear la fecha con día, mes, año, hora y minutos
    const options = { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    const formattedDate = mostRecentDate.toLocaleDateString('es-ES', options);
    
    dateElement.textContent = formattedDate;
}

// ============================================================================
// INICIALIZACIÓN AL CARGAR LA PÁGINA
// ============================================================================

window.onload = function() {
    // 1. Aplicar idioma y tema guardados
    applyStoredLanguage();
    // 2. Inicializa la fecha dinámica en el pie de página
    updateCreditDate();
    // 3. Restablece el estado de la aplicación
    resetDisplay();
    renderChart([], 'weekly');
    // 4. Asigna event listener para descarga de gráfico
    document.getElementById('downloadChart').addEventListener('click', downloadChartImage);
};
