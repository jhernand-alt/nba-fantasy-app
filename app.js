// --- VARIABLES GLOBALES DEL ESTADO DE LA APLICACIÓN ---
let allPlayerData = []; 
let activePlayers = []; 
let chartInstance = null; 
let dateLabels = []; 
let weeklyLabels = []; 
let currentSortKey = 'totalPoints'; 
let sortDirection = 'desc'; 
let currentPositionFilter = 'all'; 
let currentTeamFilter = 'all'; 

// ** CORRECCIÓN CLAVE 1: Definición de las semanas de fantasía **
// Comienzan en el índice 0 (21/10) y cada semana tiene un ancho de 7 días.
// startDay: índice de inicio de día en el array dailyPoints
// endDay: índice de fin de día (exclusivo)
const fantasyWeeksDefinition = [
    // La primera semana (S1) comienza en el índice 0, que corresponde al 21-oct
    { start: '21/10', end: '27/10', label: 'S1 (21/10 - 27/10)', startDay: 0, endDay: 7 }, 
    { start: '28/10', end: '03/11', label: 'S2 (28/10 - 03/11)', startDay: 7, endDay: 14 },
    { start: '04/11', end: '10/11', label: 'S3 (04/11 - 10/11)', startDay: 14, endDay: 21 },
    { start: '11/11', end: '17/11', label: 'S4 (11/11 - 17/11)', startDay: 21, endDay: 28 },
    { start: '18/11', end: '24/11', label: 'S5 (18/11 - 24/11)', startDay: 28, endDay: 35 }, 
    { start: '25/11', end: '01/12', label: 'S6 (25/11 - 01/12)', startDay: 35, endDay: 42 }, 
    { start: '02/12', end: '08/12', label: 'S7 (02/12 - 08/12)', startDay: 42, endDay: 49 },
    { start: '09/12', end: '15/12', label: 'S8 (09/12 - 15/12)', startDay: 49, endDay: 56 },
];
weeklyLabels = fantasyWeeksDefinition.map(w => w.label);

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
    const Z_95 = 1.96; 
    return Z_95 * (stdDev / Math.sqrt(n));
}

// --- FUNCIÓN DE PARSEO Y PROCESAMIENTO DE DATOS ---

document.getElementById('csvFile').addEventListener('change', handleFileUpload);

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
 * Se espera que la estructura de las primeras 4 columnas sea:
 * EquipoFantasy;Nombre;EquipoNBA;Posición;...puntos diarios
 * @param {string} csvText - Contenido del archivo CSV.
 * @returns {Object[]} Array de objetos de jugadores.
 */
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length <= 2) return []; 
    
    const data = [];
    
    for (let i = 2; i < lines.length; i++) { 
        const values = lines[i].split(';'); 
        
        // Mínimo 4 columnas de información + 1 día de puntos
        if (values.length >= 5) { 
            
            // Los puntos empiezan en el índice 4 (0:FantasyTeam, 1:Name, 2:Team, 3:Position)
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
                marginOfErrorPct: marginOfErrorPct 
            };
            data.push(player);
        }
    }
    return data;
}

function calculateWeeklyPoints(dailyPoints) {
    const weeklyTotals = [];
    const maxDays = dailyPoints.length;
    
    // Usamos la definición ajustada
    fantasyWeeksDefinition.forEach(week => {
        let weekSum = 0;
        
        // La semana termina en el índice endDay (no incluido), o al final de los datos
        const end = Math.min(week.endDay, maxDays); 
        
        // Solo calculamos si la semana tiene al menos un día cubierto por los datos
        if (week.startDay < maxDays) {
            // Sumamos los puntos desde startDay hasta end - 1
            for (let i = week.startDay; i < end; i++) {
                const points = dailyPoints[i];
                if (points !== null) {
                    weekSum += points;
                }
            }
            weeklyTotals.push(weekSum);
        } else {
            // Si el inicio de la semana está fuera de los datos, rellenamos con null
            weeklyTotals.push(null);
        }
    });
    
    // Recortamos los nulls al final
    const firstNullIndex = weeklyTotals.findIndex(p => p === null);
    const sliceEnd = firstNullIndex !== -1 ? firstNullIndex : weeklyTotals.length;
    return weeklyTotals.slice(0, sliceEnd);
}

/**
 * Genera las etiquetas de fechas de forma dinámica.
 * CORRECCIÓN CLAVE 2: Inicia en '2023-10-21' para coincidir con la columna 5 del CSV.
 */
function generateDateLabels(numDays) {
    const startDate = new Date('2023-10-21'); 
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
        posFilter: options.posFilter || currentPositionFilter,
        teamFilter: options.teamFilter || currentTeamFilter 
    };
    localStorage.setItem('fantasyAppState', JSON.stringify(state));
}

function loadState() {
    const savedState = localStorage.getItem('fantasyAppState');
    if (savedState) {
        try {
            const state = JSON.parse(savedState);
            const validKeys = ['name', 'team', 'gamesPlayed', 'totalPoints', 'averagePoints', 'fantasyTeam'];
            const validDirs = ['asc', 'desc'];
            
            currentSortKey = validKeys.includes(state.sortKey) ? state.sortKey : 'totalPoints';
            sortDirection = validDirs.includes(state.sortDir) ? state.sortDir : 'desc';
            currentPositionFilter = state.posFilter || 'all';
            currentTeamFilter = state.teamFilter || 'all'; 
            
            return { pos: currentPositionFilter, team: currentTeamFilter };
        } catch (e) {
            return { pos: 'all', team: 'all' };
        }
    }
    return { pos: 'all', team: 'all' };
}


// --- FUNCIONES DE CONTROL PRINCIPALES (Expuestas al window) ---

function populateFantasyTeamSelector() {
    const selector = document.getElementById('fantasyTeamSelector');
    selector.innerHTML = '<option value="all">TODOS LOS EQUIPOS FANTASY</option>';
    
    const teams = [...new Set(allPlayerData.map(p => p.fantasyTeam))].sort();
    
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        selector.appendChild(option);
    });
    
    selector.value = currentTeamFilter;
    selector.disabled = false;
}

function initializeApplication(data) {
    if (data.length === 0) {
        resetDisplay();
        return;
    }
    document.getElementById('downloadChart').disabled = false;
    document.getElementById('downloadCSV').disabled = false;

    const initialFilters = loadState(); 
    currentPositionFilter = initialFilters.pos;
    currentTeamFilter = initialFilters.team;
    
    currentSortKey = 'totalPoints';
    sortDirection = 'desc';
    
    populateFantasyTeamSelector(); 
    
    const initialPositionButton = document.querySelector(`.filter-btn[onclick*="filterPlayersByPosition('${currentPositionFilter}')"]`);
    
    if (initialPositionButton) {
        filterPlayersByPosition(currentPositionFilter, initialPositionButton);
    } else {
        filterPlayersByPosition('all', document.querySelector(`.filter-btn[onclick*="filterPlayersByPosition('all')"]`));
    }
}

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

    // 4. Renderizar el GRÁFICO
    updateChartDisplay(); 

    // 5. Guardar el estado
    saveState();
}

window.filterPlayersByFantasyTeam = function(teamKey) {
    currentTeamFilter = teamKey;
    applyFilters();
    saveState({ teamFilter: teamKey });
};

window.filterPlayersByPosition = function(positionKey, clickedButton) {
    currentPositionFilter = positionKey.toLowerCase() === 'todos' ? 'all' : positionKey;

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
    saveState({ posFilter: currentPositionFilter });
};


function getPositionKeys(key) {
    switch (key.toUpperCase()) {
        case 'G': return ['PG', 'SG'];
        case 'F': return ['SF', 'PF'];
        default: return [key.toUpperCase()];
    }
}

function getPlayersFilteredByPosition(filterKey, baseData = allPlayerData) {
     let filteredByPosition = [];
     const normalizedKey = filterKey.toLowerCase();

     if (normalizedKey === 'all' || normalizedKey === 'todos') {
        filteredByPosition = [...baseData];
    } else {
        const positionKeys = getPositionKeys(filterKey);
        
        filteredByPosition = baseData.filter(player => {
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

window.sortTable = function(key, clickedElement) {
    
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

// --- HELPER: OBTENER URL DEL ICONO DEL EQUIPO NBA ---
// Se espera que en el repo exista una carpeta con los iconos:
// assets/team-icons/<team-key>.png
// Ejemplo: team "LAL" -> assets/team-icons/LAL.png
// La función normaliza el nombre del equipo para generar el nombre de archivo.
// Si la imagen no existe en runtime, el onerror intentará una alternativa antes de ocultarla.
function getTeamIconAlternatives(teamName) {
    if (!teamName) return [];
    // Normalizar: quitar puntos, convertir separadores a guiones y eliminar caracteres inválidos
    const raw = teamName.toString()
        .replace(/\./g, '')
        .replace(/\s+/g, '-')
        .replace(/\//g, '-')
        .replace(/[^a-zA-Z0-9\-]/g, '');
    return [
        `assets/team-icons/${raw.toUpperCase()}.png`, // coincide con nombres como LAL.png
        `assets/team-icons/${raw.toLowerCase()}.png`, // alternativa lowercase
        `assets/team-icons/${raw}.png` // alternativa tal cual
    ];
}

function getTeamIconUrl(teamName) {
    const alts = getTeamIconAlternatives(teamName);
    return alts.length > 0 ? alts[0] : '';
}

// --- FUNCIONES DE RENDERIZADO (VISTAS) ---

function updatePlayerTable(data) {
    const tableBody = document.getElementById('playerTableBody');
    tableBody.innerHTML = ''; 
    
    // Definición de encabezados con formato de dos líneas (sin "Equipo NBA")
    const headers = [
        { key: 'fantasyTeam', label: 'Equipo Fantasy', sortable: true, labelHtml: 'Equipo<br>Fantasy' }, 
        { key: 'name', label: 'Nombre', sortable: true, labelHtml: 'Nombre' },
        // Se elimina la columna 'team' (Equipo NBA) en la vista
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
            th.setAttribute('onclick', `sortTable('${header.key}', this)`);
            if (header.key === currentSortKey) {
                const icon = sortDirection === 'asc' ? ' ▲' : ' ▼';
                th.innerHTML = header.labelHtml + icon; 
                th.setAttribute('aria-sort', sortDirection === 'asc' ? 'ascending' : 'descending');
            }
        } else {
            th.style.cursor = 'default';
        }
        
        headerRow.appendChild(th);
    });

    document.getElementById('playerTableHeader').innerHTML = '';
    document.getElementById('playerTableHeader').appendChild(headerRow);
    
    // GENERAR FILAS DE DATOS
    if (data.length === 0) {
         tableBody.innerHTML = '<tr><td colspan="7">No hay jugadores que coincidan con los filtros aplicados.</td></tr>';
         return;
    }
    
    data.forEach(player => {
        const row = tableBody.insertRow();
        
        row.insertCell().textContent = player.fantasyTeam; 

        // Celda con icono del equipo NBA + nombre del jugador (seguimos mostrando el icono aquí)
        const nameCell = row.insertCell();
        // contenedor flex para alinear icono y texto
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        
        const iconUrl = getTeamIconUrl(player.team);
        const img = document.createElement('img');
        img.src = iconUrl;
        img.alt = `${player.team} logo`;
        img.width = 24;
        img.height = 24;
        img.style.objectFit = 'contain';
        img.style.marginRight = '8px';
        img.style.borderRadius = '3px';
        // Si la imagen no existe, intentamos una alternativa (cambia mayúsculas/minúsculas) antes de ocultarla
        img.onerror = function() {
            // evitamos bucles infinitos usando dataset
            if (!this.dataset._triedAlt) {
                this.dataset._triedAlt = '1';
                const alts = getTeamIconAlternatives(player.team);
                // si la primer alternativa fue la actual, probamos la siguiente
                for (let i = 0; i < alts.length; i++) {
                    if (alts[i] && alts[i] !== this.src) {
                        this.src = alts[i];
                        return; // salimos y dejamos que el navegador intente cargarla
                    }
                }
            }
            // si ya probamos alternativas o no hay, ocultamos la imagen
            this.style.display = 'none';
        };

        const nameSpan = document.createElement('span');
        nameSpan.textContent = player.name;

        wrapper.appendChild(img);
        wrapper.appendChild(nameSpan);
        nameCell.appendChild(wrapper);

        // Eliminada la celda "Equipo NBA" aquí; ahora pasamos a mostrar posición, partidos, etc.
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

window.updateChartDisplay = function() {
    const chartType = document.getElementById('chartTypeSelector').value;
    renderChart(activePlayers, chartType); 
}

function renderChart(players, chartType) {
     if (chartInstance) {
        chartInstance.destroy();
    }
    
    const ctx = document.getElementById('pointsChart').getContext('2d');
    
    const isDaily = chartType === 'daily';
    // Obtenemos las etiquetas correctas de la semana
    const weeklyLabelsSlice = weeklyLabels.slice(0, players.length > 0 ? players[0].weeklyPoints.length : 0);
    const labels = isDaily ? dateLabels : weeklyLabelsSlice;
    const dataKey = isDaily ? 'dailyPoints' : 'weeklyPoints';
    const yAxisLabel = isDaily ? 'Puntos Anotados (Diario)' : 'Puntos Anotados (Semanal)';

    const playerDatasets = players.map((player, index) => {
        const colorIndex = index % chartColors.length;
        
        // Aseguramos que los datos solo tengan la longitud de las etiquetas generadas
        const dataSlice = player[dataKey] ? player[dataKey].slice(0, labels.length) : []; 
        
        const tensionValue = 0.3; 
        
        return {
            label: player.name,
            data: dataSlice, 
            borderColor: chartColors[colorIndex],
            backgroundColor: isDaily ? chartColors[colorIndex].replace('rgb', 'rgba').replace(')', ', 0.2)') : chartColors[colorIndex],
            tension: tensionValue, 
            borderWidth: 2,
            fill: false, 
            pointRadius: isDaily ? 3 : 5, 
            pointHoverRadius: isDaily ? 5 : 7,
            spanGaps: true, 
            type: 'line' 
        };
    });
    
    if (playerDatasets.length === 0) {
         return;
    }
    
    // --- CÁLCULO DE LA LÍNEA DE PROMEDIO GLOBAL (RECTA) ---
    
    const totalAvgPoints = players.reduce((sum, p) => sum + p.averagePoints, 0);
    const overallAverage = players.length > 0 ? totalAvgPoints / players.length : 0;

    const numLabels = labels.length;
    const fixedAverageData = new Array(numLabels).fill(overallAverage.toFixed(2));
    

    const averageDataset = {
        label: `PROMEDIO DEL FILTRO (${overallAverage.toFixed(2)} pts)`,
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
                        text: isDaily ? 'Día de Juego' : 'Semana Fantasy',
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

window.downloadChartImage = function() {
    if (!chartInstance) {
        alert("No hay un gráfico para descargar.");
        return;
    }
    
    const canvas = chartInstance.canvas; 
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.fillStyle = '#FFFFFF';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    tempCtx.drawImage(canvas, 0, 0);

    const image = tempCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = 'grafico_puntos_fantasy.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.downloadCSV = function() {
    if (allPlayerData.length === 0) {
        alert("No hay datos para descargar. Por favor, carga un archivo primero.");
        return;
    }

    const maxDays = dateLabels.length;
    // Encabezados con el nuevo campo
    let csvContent = "Equipo Fantasy;Nombre;Equipo NBA;Posicion;" + Array.from({length: maxDays}, (_, i) => `Día ${i + 1}`).join(';') + "\n";
    csvContent += "Equipo Fantasy;Nombre;Equipo NBA;Posicion;" + dateLabels.join(';') + "\n";
    
    allPlayerData.forEach(player => {
        const points = player.dailyPoints.map(p => p === null ? '' : p).join(';');
        // Incluye el nuevo campo
        csvContent += `${player.fantasyTeam};${player.name};${player.team};${player.position};${points}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "datos_nba_export.csv"); 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function resetDisplay() {
     localStorage.removeItem('fantasyAppState');
     allPlayerData = []; 
     activePlayers = []; 
     
     const headerRow = `<tr>
        <th onclick="sortTable('fantasyTeam', this)">Equipo<br>Fantasy</th>
        <th onclick="sortTable('name', this)">Nombre</th>
        <!-- Se elimina el header "Equipo NBA" de la vista -->
        <th>Posición(es)</th>
        <th onclick="sortTable('gamesPlayed', this)">Partidos<br>Jugados</th>
        <th onclick="sortTable('totalPoints', this)" aria-sort="descending">Puntos<br>Totales</th>
        <th onclick="sortTable('averagePoints', this)" aria-sort="none">Puntos<br>Promedio</th>
        <th>MARGEN<br>DE ERROR</th>
     </tr>`;
     document.getElementById('playerTableHeader').innerHTML = headerRow;

     document.getElementById('playerTableBody').innerHTML = '<tr><td colspan="7">Cargue un archivo CSV para ver los datos.</td></tr>'; 
     
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
     
     currentSortKey = 'totalPoints';
     sortDirection = 'desc';
     currentPositionFilter = 'all';
     currentTeamFilter = 'all';
     
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

// --- INICIALIZACIÓN AL CARGAR LA PÁGINA ---
window.onload = function() {
    // 1. Inicializa la fecha dinámica
    updateCreditDate(); 
    
    // 2. Restablece el estado de la aplicación
    resetDisplay();
    renderChart([], 'daily'); 
    
    // 3. Asigna la función de descarga al botón.
    document.getElementById('downloadChart').addEventListener('click', downloadChartImage);
    document.getElementById('downloadCSV').addEventListener('click', downloadCSV); 

};