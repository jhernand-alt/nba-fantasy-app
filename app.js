// --- VARIABLES GLOBALES DEL ESTADO DE LA APLICACIÓN ---
let allPlayerData = []; 
let activePlayers = []; // Jugadores filtrados por Posición/Equipo
let trackedPlayers = []; // Jugadores marcados con el checkbox para el gráfico
let chartInstance = null; 
let dateLabels = []; 
let weeklyLabels = []; 
let currentSortKey = 'totalPoints'; 
let sortDirection = 'desc'; 
let currentPositionFilter = 'all'; 
let currentTeamFilter = 'all'; 

// Definición de las semanas de fantasía (Ajuste las fechas según su liga)
const fantasyWeeks = [
    { start: '21/10', end: '27/10', label: 'S1 (21/10 - 27/10)', startDay: 0, endDay: 5 }, 
    { start: '28/10', end: '03/11', label: 'S2 (28/10 - 03/11)', startDay: 6, endDay: 12 },
    { start: '04/11', end: '10/11', label: 'S3 (04/11 - 10/11)', startDay: 13, endDay: 19 },
    { start: '11/11', end: '17/11', label: 'S4 (11/11 - 17/11)', startDay: 20, endDay: 26 },
    { start: '18/11', end: '24/11', label: 'S5 (18/11 - 24/11)', startDay: 27, endDay: 33 }, 
    { start: '25/11', end: '01/12', label: 'S6 (25/11 - 01/12)', startDay: 34, endDay: 40 }, 
    { start: '02/12', end: '08/12', label: 'S7 (02/12 - 08/12)', startDay: 41, endDay: 47 },
    { start: '09/12', end: '15/12', label: 'S8 (09/12 - 15/12)', startDay: 48, endDay: 54 },
];
weeklyLabels = fantasyWeeks.map(w => w.label);

// Colores cíclicos para las líneas del gráfico
const chartColors = [
    'rgb(255, 99, 132)', 'rgb(54, 162, 235)', 'rgb(255, 205, 86)', 
    'rgb(75, 192, 192)', 'rgb(153, 102, 255)', 'rgb(255, 159, 64)',
    'rgb(199, 199, 199)', 'rgb(83, 102, 255)', 'rgb(10, 200, 100)'
];

// --- FUNCIONES DE CÁLCULO ESTADÍSTICO ---

function calculateStdDev(arr, mean) {
    const validData = arr.filter(p => p !== null);
    if (validData.length <= 1) return 0;
    const squaredDifferences = validData.map(p => Math.pow(p - mean, 2));
    const variance = squaredDifferences.reduce((sum, val) => sum + val, 0) / (validData.length - 1);
    return Math.sqrt(variance);
}

function calculateMarginOfError(stdDev, n) {
    if (n < 2) return 0; 
    const Z_95 = 1.96; // Valor Z para el 95% de confianza
    return Z_95 * (stdDev / Math.sqrt(n));
}

// --- FUNCIÓN DE PARSEO Y PROCESAMIENTO DE DATOS ---

/**
 * Listener para la carga de archivos.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Inicialización de Listeners y estado
    document.getElementById('csvFile').addEventListener('change', handleFileUpload);
    document.getElementById('downloadChart').addEventListener('click', downloadChartImage);
    document.getElementById('downloadCSV').addEventListener('click', downloadCSV);
    resetDisplay();
    renderChart([], 'daily'); 
    updateCreditDate();
});


function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const csvText = e.target.result;
        try {
            allPlayerData = parseCSV(csvText); 
        } catch (error) {
            alert("Error al procesar el archivo CSV. Asegúrate de que el formato es correcto (separado por ';'). Detalle: " + error.message);
            resetDisplay();
            return;
        }

        if (allPlayerData.length === 0) {
            alert("El archivo CSV no contiene datos de jugadores válidos.");
            resetDisplay();
            return;
        }
        
        // Genera las etiquetas de fechas para el eje X
        const maxDays = Math.max(0, ...allPlayerData.map(p => p.dailyPoints.length));
        dateLabels = generateDateLabels(maxDays); 
        
        initializeApplication(allPlayerData);
    };
    reader.readAsText(file);
}

/**
 * Parsea el texto CSV en un array de objetos de jugador.
 */
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length <= 2) return []; 
    
    const data = [];
    
    // Asignar un ID único a cada jugador para el seguimiento (tracking)
    let playerIdCounter = 1; 

    for (let i = 2; i < lines.length; i++) { 
        const values = lines[i].split(';'); 
        
        // Mínimo 4 columnas de información + 1 día de puntos
        if (values.length >= 5) { 
            
            // Los puntos empiezan en el índice 4 
            const dailyPoints = values.slice(4).map(p => {
                const trimmed = p.trim();
                if (trimmed === '') return null;
                const num = parseFloat(trimmed);
                return isNaN(num) ? null : num;
            });
            
            const weeklyPoints = calculateWeeklyPoints(dailyPoints);

            const validPoints = dailyPoints.filter(p => p !== null);
            const totalPoints = validPoints.reduce((sum, p) => sum + p, 0);
            const gamesPlayed = validPoints.length; 
            
            const averagePoints = gamesPlayed > 0 ? (totalPoints / gamesPlayed) : 0;
            
            const stdDev = calculateStdDev(dailyPoints, averagePoints);
            const marginOfErrorPts = calculateMarginOfError(stdDev, gamesPlayed);
            const marginOfErrorPct = averagePoints > 0 ? (marginOfErrorPts / averagePoints) * 100 : 0;

            const player = {
                id: playerIdCounter++, // ID único
                fantasyTeam: values[0].trim(), 
                name: values[1].trim(),       
                team: values[2].trim(),       
                position: values[3].trim().toUpperCase(), 
                gamesPlayed: gamesPlayed, 
                dailyPoints: dailyPoints,
                weeklyPoints: weeklyPoints, 
                totalPoints: totalPoints,
                averagePoints: averagePoints,
                marginOfErrorPts: marginOfErrorPts,
                marginOfErrorPct: marginOfErrorPct,
                // Estado para el gráfico: inicializado a false
                isTracking: false 
            };
            data.push(player);
        }
    }
    return data;
}

function calculateWeeklyPoints(dailyPoints) {
    const weeklyTotals = [];
    const maxDays = dailyPoints.length;
    fantasyWeeks.forEach(week => {
        let weekSum = 0;
        const end = Math.min(week.endDay + 1, maxDays); 
        for (let i = week.startDay; i < end; i++) {
            const points = dailyPoints[i];
            if (points !== null) {
                weekSum += points;
            }
        }
        if (week.startDay < maxDays) {
            weeklyTotals.push(weekSum);
        } else {
            weeklyTotals.push(null);
        }
    });
    const firstNullIndex = weeklyTotals.findIndex(p => p === null);
    const sliceEnd = firstNullIndex !== -1 ? firstNullIndex : weeklyTotals.length;
    return weeklyTotals.slice(0, sliceEnd);
}

function generateDateLabels(numDays) {
    // Asume que el día 1 es '2023-10-22' como en el archivo original
    const startDate = new Date('2023-10-22'); 
    const labels = [];
    for (let i = 0; i < numDays; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const day = currentDate.getDate();
        const month = currentDate.toLocaleString('es-ES', { month: 'short' }).replace('.', '');
        labels.push(`${day}-${month}`);
    }
    return labels;
}

// --- GESTIÓN DE ESTADO (LOCAL STORAGE) ---

function saveState(options = {}) {
    const state = {
        sortKey: currentSortKey,
        sortDir: sortDirection,
        posFilter: options.posFilter !== undefined ? options.posFilter : currentPositionFilter,
        teamFilter: options.teamFilter !== undefined ? options.teamFilter : currentTeamFilter,
        trackedIds: allPlayerData.filter(p => p.isTracking).map(p => p.id) // Guardar qué jugadores se estaban rastreando
    };
    localStorage.setItem('fantasyAppState', JSON.stringify(state));
}

function loadState() {
    const savedState = localStorage.getItem('fantasyAppState');
    if (savedState) {
        try {
            const state = JSON.parse(savedState);
            const validKeys = ['name', 'team', 'gamesPlayed', 'totalPoints', 'averagePoints'];
            const validDirs = ['asc', 'desc'];
            
            currentSortKey = validKeys.includes(state.sortKey) ? state.sortKey : 'totalPoints';
            sortDirection = validDirs.includes(state.sortDir) ? state.sortDir : 'desc';
            currentPositionFilter = state.posFilter || 'all';
            currentTeamFilter = state.teamFilter || 'all'; 

            // Aplicar estado de tracking a los jugadores
            if (state.trackedIds && allPlayerData.length > 0) {
                 allPlayerData.forEach(p => {
                    p.isTracking = state.trackedIds.includes(p.id);
                 });
                 trackedPlayers = allPlayerData.filter(p => p.isTracking);
            }
            
            return { pos: currentPositionFilter, team: currentTeamFilter };
        } catch (e) {
            console.error("Error al parsear el estado guardado:", e);
            // Si hay error, limpiar el estado guardado y devolver defaults
            localStorage.removeItem('fantasyAppState');
            return { pos: 'all', team: 'all' };
        }
    }
    return { pos: 'all', team: 'all' };
}


// --- FUNCIONES DE CONTROL PRINCIPALES ---

/**
 * Rellena el selector de equipo fantasy y lo habilita.
 */
function populateFantasyTeamSelector() {
    const selector = document.getElementById('fantasyTeamSelector');
    selector.innerHTML = '<option value="all">TODOS LOS EQUIPOS FANTASY</option>';
    
    const teams = [...new Set(allPlayerData.map(p => p.fantasyTeam))].sort((a, b) => a.localeCompare(b));
    
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        selector.appendChild(option);
    });
    
    selector.value = currentTeamFilter;
    selector.disabled = false;
}

/**
 * Punto de entrada después de cargar los datos.
 */
function initializeApplication(data) {
    if (data.length === 0) {
        resetDisplay();
        return;
    }
    document.getElementById('downloadChart').disabled = false;
    document.getElementById('downloadCSV').disabled = false;

    // Cargar el estado antes de aplicar filtros para saber qué estaba activo
    const initialFilters = loadState(); 
    
    // Restablecer el selector de equipo con el valor guardado
    populateFantasyTeamSelector(); 
    
    // Simula el clic en el botón de posición guardado
    const initialPositionButton = document.querySelector(`.filter-btn[onclick*="filterPlayersByPosition('${initialFilters.pos}')"]`);
    
    if (initialPositionButton) {
        filterPlayersByPosition(initialFilters.pos, initialPositionButton);
    } else {
        filterPlayersByPosition('all', document.querySelector('.filter-btn[onclick*="filterPlayersByPosition(\'all\')"]'));
    }
    
    // Aplicar filtros actualizará la tabla y el gráfico
}

/**
 * Función clave de Filtrado: Combina ambos filtros (Equipo y Posición).
 */
function applyFilters() {
    // 1. Aplicar filtro de Equipo Fantasy
    let filteredByTeam = (currentTeamFilter === 'all' || !currentTeamFilter)
        ? [...allPlayerData]
        : allPlayerData.filter(p => p.fantasyTeam === currentTeamFilter);

    // 2. Aplicar filtro de Posición sobre el resultado del filtro de Equipo
    activePlayers = getPlayersFilteredByPosition(currentPositionFilter, filteredByTeam);
    
    // 3. Ordenar la lista activa y Renderizar la TABLA
    applySort(activePlayers);
    updatePlayerTable(activePlayers);

    // 4. Actualizar la lista de jugadores a trackear y Renderizar el GRÁFICO
    trackedPlayers = allPlayerData.filter(p => p.isTracking);
    updateChartDisplay(); 

    // 5. Guardar el estado
    saveState();
}

/**
 * Establece el filtro de Equipo Fantasy y llama a applyFilters.
 */
window.filterPlayersByFantasyTeam = function(teamKey) {
    currentTeamFilter = teamKey;
    applyFilters();
};

/**
 * Establece el filtro de Posición y llama a applyFilters.
 */
window.filterPlayersByPosition = function(positionKey, clickedButton) {
    currentPositionFilter = positionKey.toLowerCase() === 'todos' ? 'all' : positionKey;

    // Aplicar estilos de botón
    document.querySelectorAll('#positionFilters .filter-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
    });

    const targetButton = clickedButton || document.querySelector(`.filter-btn[onclick*="filterPlayersByPosition('${currentPositionFilter}')"]`);
    if(targetButton) {
        targetButton.classList.add('active');
        targetButton.setAttribute('aria-pressed', 'true');
    }
    
    applyFilters();
};


function getPositionKeys(key) {
    switch (key.toUpperCase()) {
        case 'G': return ['PG', 'SG'];
        case 'F': return ['SF', 'PF'];
        default: return [key.toUpperCase()];
    }
}

/**
 * Devuelve los jugadores de la lista base (normalmente ya filtrados por Equipo) 
 * que coinciden con el filtro de posición.
 */
function getPlayersFilteredByPosition(filterKey, baseData = allPlayerData) {
     let filteredByPosition = [];
     const normalizedKey = filterKey.toLowerCase();

     if (normalizedKey === 'all' || normalizedKey === 'todos') {
        filteredByPosition = [...baseData];
    } else {
        const positionKeys = getPositionKeys(filterKey);
        
        filteredByPosition = baseData.filter(player => {
            // Un jugador puede tener múltiples posiciones separadas por / o , (ej: "PG/SG")
            const playerPositions = player.position.split(/[\/,]/).map(p => p.trim());
            
            return playerPositions.some(pos => positionKeys.includes(pos));
        });
    }
    return filteredByPosition;
}

function applySort(data) {
    data.sort((a, b) => {
        const key = currentSortKey;
        const valueA = a[key];
        const valueB = b[key];
        
        if (['name', 'team', 'fantasyTeam'].includes(key)) { 
            const comparison = String(valueA).localeCompare(String(valueB));
            return sortDirection === 'asc' ? comparison : -comparison;
        } else { 
            const valA = valueA || 0;
            const valB = valueB || 0;
            return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
    });
}

/**
 * Cambia el orden de la tabla y vuelve a renderizarla.
 */
window.sortTable = function(key) {
    
    if (currentSortKey === key) {
        sortDirection = (sortDirection === 'asc') ? 'desc' : 'asc';
    } else {
        sortDirection = 'desc'; 
        currentSortKey = key;
    }

    applySort(activePlayers);
    
    updatePlayerTable(activePlayers);
    updateChartDisplay(); 
    
    saveState();
}

/**
 * Maneja el click en el checkbox de tracking.
 */
window.togglePlayerTracking = function(playerId, isChecked) {
    const id = parseInt(playerId, 10);
    const player = allPlayerData.find(p => p.id === id);
    
    if (player) {
        player.isTracking = isChecked;
        // La lista trackedPlayers se actualizará en applyFilters/updateChartDisplay
        // Pero es más fácil actualizar el gráfico directamente aquí, ya que sabemos qué cambió
        trackedPlayers = allPlayerData.filter(p => p.isTracking);
        updateChartDisplay();
        saveState();
    }
}

// --- FUNCIONES DE RENDERIZADO (VISTAS) ---

function updatePlayerTable(data) {
    const tableBody = document.getElementById('playerTableBody');
    tableBody.innerHTML = ''; 
    
    // Definición de encabezados con formato de dos líneas
    const headers = [
        { key: 'tracking', label: 'Gráfico', sortable: false, labelHtml: 'Gráfico' }, // Nuevo
        { key: 'fantasyTeam', label: 'Equipo Fantasy', sortable: true, labelHtml: 'Equipo<br>Fantasy' }, 
        { key: 'name', label: 'Nombre', sortable: true, labelHtml: 'Nombre' },
        { key: 'team', label: 'Equipo NBA', sortable: true, labelHtml: 'Equipo<br>NBA' },
        { key: 'position', label: 'Posición(es)', sortable: false, labelHtml: 'Posición(es)' }, 
        { key: 'gamesPlayed', label: 'Partidos Jugados', sortable: true, labelHtml: 'Partidos<br>Jugados' },
        { key: 'totalPoints', label: 'Puntos Totales', sortable: true, labelHtml: 'Puntos<br>Totales' },
        { key: 'averagePoints', label: 'Puntos Promedio', sortable: true, labelHtml: 'Puntos<br>Promedio' },
        { key: 'margin', label: 'MARGEN DE ERROR', sortable: false, labelHtml: 'MARGEN<br>DE ERROR' }, 
    ];
    
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.innerHTML = header.labelHtml; 
        th.setAttribute('aria-sort', 'none');
        
        if (header.sortable) { 
            th.setAttribute('onclick', `sortTable('${header.key}')`);
            if (header.key === currentSortKey) {
                const icon = sortDirection === 'asc' ? ' ▲' : ' ▼';
                th.innerHTML = header.labelHtml + icon; 
                th.setAttribute('aria-sort', sortDirection === 'asc' ? 'ascending' : 'descending');
            }
        } else {
            // Desactiva el cursor pointer para columnas no ordenables
            th.style.cursor = 'default';
        }
        
        headerRow.appendChild(th);
    });

    document.getElementById('playerTableHeader').innerHTML = '';
    document.getElementById('playerTableHeader').appendChild(headerRow);
    
    // GENERAR FILAS DE DATOS
    if (data.length === 0) {
         tableBody.innerHTML = '<tr><td colspan="9">No hay jugadores que coincidan con los filtros aplicados.</td></tr>';
         return;
    }
    
    data.forEach(player => {
        const row = tableBody.insertRow();
        
        // Columna de Checkbox (Nuevo)
        const checkCell = row.insertCell();
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'track-player';
        checkbox.checked = player.isTracking; // Carga el estado de tracking
        checkbox.setAttribute('data-player-id', player.id);
        // Asigna el evento con el ID del jugador y el estado del checkbox
        checkbox.setAttribute('onchange', `togglePlayerTracking(${player.id}, this.checked)`);
        checkCell.appendChild(checkbox);

        row.insertCell().textContent = player.fantasyTeam; 
        row.insertCell().textContent = player.name;
        row.insertCell().textContent = player.team; 
        row.insertCell().textContent = player.position; 
        row.insertCell().textContent = player.gamesPlayed; 
        row.insertCell().textContent = player.totalPoints.toFixed(2); 
        row.insertCell().textContent = `${player.averagePoints.toFixed(2)}`; 
        
        const marginCell = row.insertCell();
        const pts = player.marginOfErrorPts.toFixed(2);
        const pct = player.marginOfErrorPct.toFixed(1);
        marginCell.textContent = `± ${pts} (${pct}%)`;
    });
}

/**
 * Función que se llama cuando se cambia el selector de Daily/Weekly.
 */
window.updateChartDisplay = function() {
    const chartType = document.getElementById('chartTypeSelector').value;
    // Solo renderiza los jugadores que están marcados para el gráfico
    renderChart(trackedPlayers, chartType); 
}

function renderChart(players, chartType) {
     if (chartInstance) {
        chartInstance.destroy();
    }
    
    const ctx = document.getElementById('pointsChart').getContext('2d');
    
    const isDaily = chartType === 'daily';
    const labels = isDaily ? dateLabels : weeklyLabels;
    const dataKey = isDaily ? 'dailyPoints' : 'weeklyPoints';
    const yAxisLabel = isDaily ? 'Puntos Anotados (Diario)' : 'Puntos Anotados (Semanal)';

    if (players.length === 0) {
        // Renderiza un gráfico vacío si no hay jugadores seleccionados
        chartInstance = new Chart(ctx, {
            type: 'line', 
            data: { labels: labels, datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false, 
                plugins: {
                    title: {
                        display: true,
                        text: 'Seleccione jugadores en la tabla para ver su evolución en el gráfico.',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: { display: false }
                },
                scales: { y: { beginAtZero: true, title: { display: true, text: yAxisLabel } } }
            }
        });
        return;
    }

    const playerDatasets = players.map((player, index) => {
        const color = chartColors[index % chartColors.length];
        
        const dataSlice = player[dataKey] ? player[dataKey].slice(0, labels.length) : [];
        
        return {
            label: player.name,
            data: dataSlice, 
            borderColor: color,
            backgroundColor: color,
            tension: 0.2, 
            borderWidth: 2,
            fill: false, 
            pointRadius: 4,
            spanGaps: isDaily // Permite saltos de datos en el gráfico diario (nulls)
        };
    });
    
    // --- CÁLCULO DE LA LÍNEA DE PROMEDIO GLOBAL ---
    // Calculado solo sobre los jugadores que están siendo trackeados
    const trackedAvgPoints = players.filter(p => p.gamesPlayed > 0).map(p => p.averagePoints);
    const totalAvgPoints = trackedAvgPoints.reduce((sum, p) => sum + p, 0);
    
    const overallAverage = trackedAvgPoints.length > 0 ? totalAvgPoints / trackedAvgPoints.length : 0;

    const numLabels = labels.length;
    const fixedAverageData = new Array(numLabels).fill(overallAverage.toFixed(2));
    
    const averageDataset = {
        label: `PROMEDIO GLOBAL TRACKEADO (${overallAverage.toFixed(2)} pts)`,
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
    
    const datasets = [averageDataset, ...playerDatasets];


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
                padding: { bottom: 40 }
            },
            plugins: {
                legend: { position: 'top' },
                title: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: yAxisLabel 
                    }
                },
                x: {
                    afterFit: function(scale) { scale.paddingBottom = 20; },
                }
            }
        }
    });
}

/**
 * Función de descarga del gráfico con fondo blanco forzado.
 */
window.downloadChartImage = function() {
    if (!chartInstance || trackedPlayers.length === 0) {
        alert("No hay jugadores seleccionados en la tabla o no hay un gráfico para descargar.");
        return;
    }
    
    const canvas = chartInstance.canvas; 
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    // Fondo blanco
    tempCtx.fillStyle = '#FFFFFF';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Contenido del gráfico
    tempCtx.drawImage(canvas, 0, 0);

    const image = tempCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = 'grafico_puntos_fantasy.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Descarga el CSV original con datos actualizados.
 */
function downloadCSV() {
    if (allPlayerData.length === 0) {
        alert("No hay datos para descargar. Por favor, carga un archivo primero.");
        return;
    }

    const maxDays = dateLabels.length;
    // La primera fila de encabezados
    let csvContent = "Equipo Fantasy;Nombre;Equipo NBA;Posicion;" + Array.from({length: maxDays}, (_, i) => `Día ${i + 1}`).join(';') + "\n";
    // La segunda fila de encabezados con las fechas
    csvContent += "Equipo Fantasy;Nombre;Equipo NBA;Posicion;" + dateLabels.join(';') + "\n";
    
    allPlayerData.forEach(player => {
        // Aseguramos que los puntos nulos o vacíos se exporten como vacío
        const points = player.dailyPoints.map(p => p === null ? '' : p).join(';');
        csvContent += `${player.fantasyTeam};${player.name};${player.team};${player.position};${points}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "datos_nba_export_v2.csv"); 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Limpia el estado y la interfaz de usuario.
 */
function resetDisplay() {
     localStorage.removeItem('fantasyAppState');
     allPlayerData = []; 
     activePlayers = []; 
     trackedPlayers = [];
     
     // Encabezados predeterminados con 9 columnas (incluido el nuevo checkbox)
     const headerRow = `<tr>
        <th style="cursor: default;">Gráfico</th>
        <th onclick="sortTable('fantasyTeam')">Equipo<br>Fantasy</th>
        <th onclick="sortTable('name')">Nombre</th>
        <th onclick="sortTable('team')">Equipo<br>NBA</th>
        <th style="cursor: default;">Posición(es)</th>
        <th onclick="sortTable('gamesPlayed')">Partidos<br>Jugados</th>
        <th onclick="sortTable('totalPoints')" aria-sort="descending">Puntos<br>Totales</th>
        <th onclick="sortTable('averagePoints')">Puntos<br>Promedio</th>
        <th style="cursor: default;">MARGEN<br>DE ERROR</th>
     </tr>`;
     document.getElementById('playerTableHeader').innerHTML = headerRow;

     document.getElementById('playerTableBody').innerHTML = '<tr><td colspan="9">Cargue un archivo CSV para ver los datos.</td></tr>'; 
     
     if (chartInstance) {
        chartInstance.destroy(); 
     }
     document.getElementById('downloadCSV').disabled = true;
     document.getElementById('downloadChart').disabled = true; 
     document.getElementById('fantasyTeamSelector').disabled = true;
     document.getElementById('fantasyTeamSelector').innerHTML = '<option value="all">TODOS LOS EQUIPOS FANTASY</option>';

     document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
     });
     
     // Restablecer variables de estado
     currentSortKey = 'totalPoints';
     sortDirection = 'desc';
     currentPositionFilter = 'all';
     currentTeamFilter = 'all';
     
     // Activa el botón "TODOS" por defecto
     const allButton = document.querySelector('.filter-btn[onclick*="filterPlayersByPosition(\'all\')"]');
     if (allButton) {
         allButton.classList.add('active');
         allButton.setAttribute('aria-pressed', 'true');
     }
     
     document.getElementById('chartTypeSelector').value = 'daily';

     dateLabels = [];
}

// --- FUNCIÓN PARA MOSTRAR LA FECHA ACTUAL ---
function updateCreditDate() {
    const now = new Date();
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const formattedDate = now.toLocaleDateString('es-ES', options);

    const dateElement = document.getElementById('currentDatePlaceholder');
    if (dateElement) {
        dateElement.textContent = formattedDate;
    }
}