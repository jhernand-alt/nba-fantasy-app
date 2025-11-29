// --- VARIABLES GLOBALES DEL ESTADO DE LA APLICACIÓN ---
let allPlayerData = []; 
let activePlayers = []; // Jugadores filtrados por Posición/Equipo
let chartInstance = null; 
let dateLabels = []; 
let weeklyLabels = []; 
let currentSortKey = 'totalPoints'; 
let sortDirection = 'desc'; 
let currentPositionFilter = 'all'; 
let currentTeamFilter = 'all'; 

// Definición de las semanas de fantasía (Ajuste las fechas según su liga)
// Nota: La fecha de inicio asumida es '2023-10-22' (índice 0).
const fantasyWeeks = [
    { start: '21/10', end: '27/10', label: 'S1 (21/10 - 27/10)', startDay: 0, endDay: 6 }, 
    { start: '28/10', end: '03/11', label: 'S2 (28/10 - 03/11)', startDay: 7, endDay: 13 },
    { start: '04/11', end: '10/11', label: 'S3 (04/11 - 10/11)', startDay: 14, endDay: 20 },
    { start: '11/11', end: '17/11', label: 'S4 (11/11 - 17/11)', startDay: 21, endDay: 27 },
    { start: '18/11', end: '24/11', label: 'S5 (18/11 - 24/11)', startDay: 28, endDay: 34 }, 
    { start: '25/11', end: '01/12', label: 'S6 (25/11 - 01/12)', startDay: 35, endDay: 41 }, 
    { start: '02/12', end: '08/12', label: 'S7 (02/12 - 08/12)', startDay: 42, endDay: 48 },
    { start: '09/12', end: '15/12', label: 'S8 (09/12 - 15/12)', startDay: 49, endDay: 55 },
];
weeklyLabels = fantasyWeeks.map(w => w.label);

// Colores cíclicos para las líneas del gráfico (Optimizados para el tema Lakers)
const chartColors = [
    'rgb(255, 185, 39)', // Dorado/Amarillo
    'rgb(89, 107, 240)', // Azul (más brillante)
    'rgb(255, 99, 132)', 
    'rgb(75, 192, 192)', 
    'rgb(153, 102, 255)', 
    'rgb(255, 159, 64)',
    'rgb(199, 199, 199)', 
    'rgb(54, 162, 235)',
    'rgb(10, 200, 100)'
];

// --- FUNCIONES DE CÁLCULO ESTADÍSTICO ---

/**
 * Calcula la Desviación Estándar de una muestra (usando la fórmula de la muestra, n-1).
 * @param {number[]} arr - Array de puntos de fantasía.
 * @param {number} mean - Media de los puntos.
 * @returns {number} - Desviación Estándar.
 */
function calculateStdDev(arr, mean) {
    const validData = arr.filter(p => p !== null);
    if (validData.length <= 1) return 0;
    const squaredDifferences = validData.map(p => Math.pow(p - mean, 2));
    const variance = squaredDifferences.reduce((sum, val) => sum + val, 0) / (validData.length - 1);
    return Math.sqrt(variance);
}

/**
 * Calcula el Margen de Error (95% CI).
 * @param {number} stdDev - Desviación Estándar.
 * @param {number} n - Número de juegos jugados.
 * @returns {number} - Margen de Error.
 */
function calculateMarginOfError(stdDev, n) {
    if (n < 2) return 0; 
    const Z_95 = 1.96; // Valor Z para el 95% de confianza (aproximado)
    return Z_95 * (stdDev / Math.sqrt(n));
}

// --- GESTIÓN DE ARCHIVOS Y PARSEO ---

/**
 * Maneja la carga y el procesamiento del archivo CSV.
 * @param {Event} event - Evento de cambio de archivo.
 */
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const csvText = e.target.result;
        try {
            allPlayerData = parseCSV(csvText); 
        } catch (error) {
            console.error("Error al procesar el archivo CSV. Asegúrate de que el formato es correcto (separado por ';'). Detalle: " + error.message);
            resetDisplay();
            return;
        }

        if (allPlayerData.length === 0) {
            console.warn("El archivo CSV no contiene datos de jugadores válidos.");
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
 * @param {string} csvText - Contenido del archivo CSV.
 * @returns {object[]} - Array de objetos de jugador.
 */
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    // Mínimo 2 líneas de datos (asumiendo que las primeras 2 son encabezados/descripción)
    if (lines.length <= 2) return []; 
    
    const data = [];
    let playerIdCounter = 1; 

    for (let i = 2; i < lines.length; i++) { 
        const values = lines[i].split(';'); 
        
        // Mínimo 4 columnas de información + 1 día de puntos
        if (values.length >= 5) { 
            
            // Los puntos empiezan en el índice 4 
            const dailyPoints = values.slice(4).map(p => {
                const trimmed = p.trim();
                if (trimmed === '') return null; // Tratar celdas vacías como null
                // Reemplazar la coma por punto si es necesario para el parseFloat
                const num = parseFloat(trimmed.replace(',', '.')); 
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
                id: playerIdCounter++, 
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
            };
            data.push(player);
        }
    }
    return data;
}

/**
 * Agrupa los puntos diarios en totales semanales según las semanas predefinidas.
 * @param {number[]} dailyPoints - Array de puntos diarios.
 * @returns {number[]} - Array de puntos semanales.
 */
function calculateWeeklyPoints(dailyPoints) {
    const weeklyTotals = [];
    const maxDays = dailyPoints.length;
    fantasyWeeks.forEach(week => {
        let weekSum = 0;
        const end = Math.min(week.endDay + 1, maxDays); 
        
        if (week.startDay < maxDays) {
            for (let i = week.startDay; i < end; i++) {
                const points = dailyPoints[i];
                if (points !== null) {
                    weekSum += points;
                }
            }
            weeklyTotals.push(weekSum);
        }
    });
    return weeklyTotals;
}

/**
 * Genera las etiquetas de fecha (Día-Mes) a partir de una fecha de inicio fija.
 * @param {number} numDays - Número de días a generar.
 * @returns {string[]} - Array de etiquetas de fecha.
 */
function generateDateLabels(numDays) {
    const startDate = new Date('2023-10-22T00:00:00'); // Fecha de inicio de ejemplo (ajustar si es necesario)
    const labels = [];
    for (let i = 0; i < numDays; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const day = currentDate.getDate();
        // Usar formato corto de mes sin el punto (ej. oct, nov)
        const month = currentDate.toLocaleString('es-ES', { month: 'short' }).replace('.', '');
        labels.push(`${day}-${month}`);
    }
    return labels;
}

// --- GESTIÓN DE ESTADO (LOCAL STORAGE) ---

/**
 * Guarda el estado actual de filtros y ordenamiento en localStorage.
 * @param {object} options - Opciones para sobrescribir el estado.
 */
function saveState(options = {}) {
    const state = {
        sortKey: options.sortKey !== undefined ? options.sortKey : currentSortKey,
        sortDir: options.sortDir !== undefined ? options.sortDir : sortDirection,
        posFilter: options.posFilter !== undefined ? options.posFilter : currentPositionFilter,
        teamFilter: options.teamFilter !== undefined ? options.teamFilter : currentTeamFilter,
    };
    localStorage.setItem('fantasyAppState', JSON.stringify(state));
}

/**
 * Carga el estado guardado de localStorage si existe.
 * @returns {object} - Objeto con el estado de filtros.
 */
function loadState() {
    const savedState = localStorage.getItem('fantasyAppState');
    if (savedState) {
        try {
            const state = JSON.parse(savedState);
            // 'marginOfErrorPts' o 'marginOfErrorPct' son válidos para el estado guardado aunque la columna esté combinada
            const validKeys = ['name', 'team', 'gamesPlayed', 'totalPoints', 'averagePoints', 'fantasyTeam', 'marginOfErrorPts', 'marginOfErrorPct']; 
            const validDirs = ['asc', 'desc'];
            
            currentSortKey = validKeys.includes(state.sortKey) ? state.sortKey : 'totalPoints';
            sortDirection = validDirs.includes(state.sortDir) ? state.sortDir : 'desc';
            currentPositionFilter = state.posFilter || 'all';
            currentTeamFilter = state.teamFilter || 'all'; 

            return { pos: currentPositionFilter, team: currentTeamFilter };
        } catch (e) {
            console.error("Error al parsear el estado guardado:", e);
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
    const savedTeamFilter = currentTeamFilter; 
    
    selector.innerHTML = '<option value="all">TODOS LOS EQUIPOS FANTASY</option>';
    
    // Obtener equipos únicos y ordenarlos alfabéticamente
    const teams = [...new Set(allPlayerData.map(p => p.fantasyTeam))].sort((a, b) => a.localeCompare(b));
    
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        selector.appendChild(option);
    });
    
    // Restaurar el valor del filtro de equipo si es válido
    selector.value = teams.includes(savedTeamFilter) ? savedTeamFilter : 'all';
    currentTeamFilter = selector.value;
    selector.disabled = false;
}

/**
 * Punto de entrada después de cargar los datos.
 * @param {object[]} data - Array de objetos de jugador.
 */
function initializeApplication(data) {
    if (data.length === 0) {
        resetDisplay();
        return;
    }
    document.getElementById('downloadChart').disabled = false;
    document.getElementById('downloadCSV').disabled = false;

    const initialFilters = loadState(); 
    
    populateFantasyTeamSelector(); 
    
    // Simula la aplicación del filtro de posición inicial (o el guardado)
    // Esto asegura que el botón tenga la clase 'active' correcta
    const initialPositionButton = document.querySelector(`.filter-btn[onclick*="filterPlayersByPosition('${initialFilters.pos}')"]`);
    
    if (initialPositionButton) {
        filterPlayersByPosition(initialFilters.pos, initialPositionButton);
    } else {
        filterPlayersByPosition('all', document.querySelector(`.filter-btn[onclick*="filterPlayersByPosition('all')"]`));
    }
    
    // Asegura que el selector de equipo fantasy refleje el estado cargado
    document.getElementById('fantasyTeamSelector').value = initialFilters.team;
}

/**
 * Filtra la lista de jugadores por posición.
 * @param {string} position - Posición a filtrar ('PG', 'SF', 'all', etc.).
 * @param {HTMLElement} button - Botón del filtro clicado (para activar/desactivar).
 */
function filterPlayersByPosition(position, button) {
    currentPositionFilter = position;
    saveState({ posFilter: position });
    
    // Actualizar el estado activo de los botones de filtro
    document.querySelectorAll('#positionFilters .filter-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
    });
    if (button) {
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');
    }
    
    applyFilters();
}

/**
 * Filtra la lista de jugadores por equipo fantasy.
 * @param {string} team - Nombre del equipo fantasy.
 */
function filterPlayersByFantasyTeam(team) {
    currentTeamFilter = team;
    saveState({ teamFilter: team });
    
    applyFilters();
}

/**
 * Aplica los filtros de posición y equipo fantasy a todos los jugadores.
 */
function applyFilters() {
    activePlayers = allPlayerData.filter(player => {
        // Filtrado por posición: soporta G (PG/SG) y F (SF/PF)
        const matchesPosition = currentPositionFilter === 'all' || 
                                player.position.includes(currentPositionFilter) ||
                                // Lógica de G y F sin la descripción en el botón:
                                (currentPositionFilter === 'G' && (player.position === 'PG' || player.position === 'SG')) ||
                                (currentPositionFilter === 'F' && (player.position === 'SF' || player.position === 'PF'));

        // Filtrado por equipo fantasy
        const matchesTeam = currentTeamFilter === 'all' || player.fantasyTeam === currentTeamFilter;
        
        return matchesPosition && matchesTeam;
    });

    // Re-ordenar y renderizar la tabla y el gráfico
    sortAndRenderTable();
    updateChartDisplay(); 
}


// --- MANEJO DE LA TABLA ---

/**
 * Define los encabezados de la tabla con la lógica de ordenamiento.
 */
function renderTableHeader() {
    const header = document.getElementById('playerTableHeader');
    header.innerHTML = `
        <tr>
            <th data-sort-key="fantasyTeam">Equipo Fantasy</th>
            <th data-sort-key="name">Nombre</th>
            <th data-sort-key="team">Equipo NBA</th>
            <th data-sort-key="position">Posición</th>
            <th data-sort-key="gamesPlayed">Partidos</th>
            <th data-sort-key="totalPoints">Pts Totales</th>
            <th data-sort-key="averagePoints">Media Diaria</th>
            <!-- Columna única para Margen de Error. La clave de ordenamiento es 'marginOfErrorPts' -->
            <th data-sort-key="marginOfErrorPts" title="Margen de error al 95% de confianza (Pts y %)">Margen Error</th> 
        </tr>
    `;
    
    // Adjuntar listeners de clic para ordenar
    header.querySelectorAll('th').forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.getAttribute('data-sort-key');
            handleTableSort(sortKey); 
        });
    });
    
    // Añadir indicadores de ordenamiento (flechas)
    header.querySelectorAll('th').forEach(th => {
        const key = th.getAttribute('data-sort-key');
        let indicator = '';
        
        // El indicador se pone si la clave actual de ordenamiento coincide
        if (key === currentSortKey) {
            indicator = sortDirection === 'asc' ? ' ▲' : ' ▼';
        }

        // Si la columna es Margen Error, el indicador se pone si la clave de ordenamiento es 'marginOfErrorPts'
        if (key === 'marginOfErrorPts' && currentSortKey === 'marginOfErrorPts') {
            indicator = sortDirection === 'asc' ? ' ▲' : ' ▼';
        }
        
        th.textContent += indicator;
    });
}

/**
 * Maneja el cambio de columna de ordenamiento.
 * @param {string} sortKey - Clave de la propiedad por la que ordenar.
 */
function handleTableSort(sortKey) {
    if (currentSortKey === sortKey) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortKey = sortKey;
        // Puntos y porcentajes se ordenan por defecto descendente
        sortDirection = ['totalPoints', 'averagePoints', 'marginOfErrorPts', 'marginOfErrorPct', 'gamesPlayed'].includes(sortKey) ? 'desc' : 'asc';
    }
    
    saveState({ sortKey: currentSortKey, sortDir: sortDirection });
    sortAndRenderTable();
}

/**
 * Ordena los jugadores activos y renderiza la tabla.
 */
function sortAndRenderTable() {
    const key = currentSortKey;
    const direction = sortDirection;

    activePlayers.sort((a, b) => {
        let valA = a[key];
        let valB = b[key];
        
        // Ordenamiento numérico (Asegura que los valores nulos o indefinidos sean 0 para el ordenamiento)
        if (typeof valA === 'number' || typeof valB === 'number' || key === 'gamesPlayed' || key === 'totalPoints' || key === 'averagePoints' || key === 'marginOfErrorPts' || key === 'marginOfErrorPct') {
            valA = valA || 0;
            valB = valB || 0;
            return direction === 'asc' ? valA - valB : valB - valA;
        } else {
            // Ordenamiento alfabético
            valA = String(valA || '').toLowerCase();
            valB = String(valB || '').toLowerCase();
            return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
    });

    renderPlayerTable(activePlayers);
    renderTableHeader(); // Re-renderiza para actualizar las flechas de ordenamiento
}

/**
 * Renderiza el cuerpo de la tabla.
 * @param {object[]} players - Array de jugadores a mostrar.
 */
function renderPlayerTable(players) {
    const body = document.getElementById('playerTableBody');
    body.innerHTML = ''; // Limpiar la tabla

    if (players.length === 0) {
        body.innerHTML = '<tr><td colspan="8">No hay jugadores que coincidan con los filtros aplicados.</td></tr>';
        return;
    }

    players.forEach(player => {
        const marginPts = player.marginOfErrorPts.toFixed(2);
        const marginPct = player.marginOfErrorPct.toFixed(1);

        const marginText = `±${marginPts} (${marginPct}%)`; // Formato combinado

        const row = body.insertRow();
        row.innerHTML = `
            <td>${player.fantasyTeam}</td>
            <td>${player.name}</td>
            <td>${player.team}</td>
            <td>${player.position}</td>
            <td>${player.gamesPlayed}</td>
            <td>${player.totalPoints.toFixed(1)}</td>
            <td>${player.averagePoints.toFixed(2)}</td>
            <td>${marginText}</td>
        `;
    });
}


// --- MANEJO DEL GRÁFICO (Chart.js) ---

/**
 * Actualiza el gráfico basándose en el tipo de visualización seleccionado.
 */
function updateChartDisplay() {
    const chartType = document.getElementById('chartTypeSelector').value;
    renderChart(activePlayers, chartType);
}

/**
 * Destruye la instancia del gráfico si existe.
 */
function destroyChart() {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}

/**
 * Renderiza el gráfico de puntos.
 * @param {object[]} players - Array de jugadores a graficar.
 * @param {string} type - Tipo de gráfico ('daily' o 'weekly').
 */
function renderChart(players, type) {
    destroyChart();
    
    const ctx = document.getElementById('pointsChart').getContext('2d');
    
    // Seleccionar datos y etiquetas basados en el tipo
    const isDaily = type === 'daily';
    const labels = isDaily ? dateLabels : weeklyLabels.slice(0, players.length > 0 ? players[0].weeklyPoints.length : 0);
    const title = isDaily ? 'Puntos Diarios por Jugador' : 'Puntos Totales por Semana Fantasy';
    const yAxisLabel = isDaily ? 'Puntos Diarios' : 'Puntos Semanales';

    // Construir los datasets para Chart.js
    const datasets = players.map((player, index) => {
        const colorIndex = index % chartColors.length;
        const dataPoints = isDaily ? player.dailyPoints : player.weeklyPoints;
        
        // Aplicar tensión (curva) al gráfico para ambos, como se solicitó
        const tensionValue = 0.3; 
        
        return {
            // MOSTRAR SOLO EL NOMBRE DEL JUGADOR EN LA LEYENDA
            label: player.name, 
            data: dataPoints,
            borderColor: chartColors[colorIndex],
            backgroundColor: chartColors[colorIndex].replace('rgb', 'rgba').replace(')', ', 0.2)'),
            tension: tensionValue, // Aplicado a ambos (diario y semanal)
            fill: false,
            pointRadius: isDaily ? 3 : 5, 
            pointHoverRadius: isDaily ? 5 : 7,
            spanGaps: true, // Conecta puntos a través de valores 'null' (juegos perdidos)
            type: 'line' 
        };
    });

    chartInstance = new Chart(ctx, {
        type: 'line', // Tipo de gráfico principal es línea para ambos
        data: {
            labels: labels,
            datasets: datasets,
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: { size: 18, weight: 'bold' }
                },
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        boxWidth: 20
                    },
                    // Permite interactuar con la leyenda para ocultar/mostrar líneas
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

// --- UTILIDADES Y MANEJO DE EVENTOS ---

/**
 * Restablece el estado de la aplicación y la interfaz.
 */
function resetDisplay() {
    allPlayerData = [];
    activePlayers = [];
    currentPositionFilter = 'all';
    currentTeamFilter = 'all';
    
    destroyChart();
    
    // Resetear encabezado y cuerpo de tabla
    document.getElementById('playerTableHeader').innerHTML = `
        <tr>
            <th>Equipo Fantasy</th>
            <th>Nombre</th>
            <th>Equipo NBA</th>
            <th>Posición</th>
            <th>Partidos</th>
            <th>Pts Totales</th>
            <th>Media Diaria</th>
            <th>Margen Error</th>
        </tr>
    `;
    document.getElementById('playerTableBody').innerHTML = '<tr><td colspan="8">Cargue un archivo CSV para ver los datos.</td></tr>';
    document.getElementById('fantasyTeamSelector').innerHTML = '<option value="all">TODOS LOS EQUIPOS FANTASY</option>';
    document.getElementById('fantasyTeamSelector').disabled = true;
    document.getElementById('downloadChart').disabled = true;
    document.getElementById('downloadCSV').disabled = true;

    // Resetear el filtro de posición activo a 'TODOS'
    document.querySelectorAll('#positionFilters .filter-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
    });
    const allBtn = document.querySelector(`.filter-btn[onclick*="filterPlayersByPosition('all')"]`);
    if (allBtn) {
        allBtn.classList.add('active');
        allBtn.setAttribute('aria-pressed', 'true');
    }
    
    localStorage.removeItem('fantasyAppState'); // Limpiar estado al resetear
}

/**
 * Descarga el gráfico como una imagen PNG con fondo blanco.
 */
function downloadChartImage() {
    if (chartInstance) {
        const chartTitle = document.getElementById('chartTypeSelector').options[document.getElementById('chartTypeSelector').selectedIndex].text;
        const filename = `${chartTitle.replace(/ /g, '_')}_${new Date().toISOString().slice(0, 10)}.png`;
        
        // OBTENER LA URL BASE64 CON FONDO BLANCO
        const dataURL = chartInstance.toBase64Image('image/png', 1.0, {
            backgroundColor: 'white' // Fondo más claro para la descarga
        });

        const link = document.createElement('a');
        link.href = dataURL;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        console.warn("No hay gráfico para descargar."); 
    }
}

/**
 * Exporta los datos actualmente filtrados/ordenados a un archivo CSV.
 */
function downloadCSV() {
    const dataToExport = [...activePlayers]; // Usar una copia de los datos activos (ya ordenados)
    
    if (dataToExport.length === 0) {
        console.warn("No hay datos para exportar.");
        return;
    }
    
    generateAndDownloadCSV(dataToExport);
}

/**
 * Genera el contenido del CSV y fuerza la descarga.
 * @param {object[]} players - Array de jugadores a exportar.
 */
function generateAndDownloadCSV(players) {
    // Se genera un encabezado dinámico para los días/puntos
    const dailyPointsHeaders = dateLabels.map(label => `Ptos ${label}`).join(';');
    
    // Encabezados estáticos y dinámicos de los puntos
    // Se mantienen ambas columnas de margen de error en el CSV exportado para mayor detalle
    const headers = [
        "Equipo Fantasy", "Nombre", "Equipo NBA", "Posición", "Partidos", "Pts Totales", "Media Diaria", 
        "Margen Error (Pts)", "Margen Error (%)", dailyPointsHeaders
    ].join(';');

    const rows = players.map(p => {
        // Reemplazar el punto decimal por coma para CSV en español
        const formatNumber = (num, fixed = 2) => (num || 0).toFixed(fixed).replace('.', ',');
        
        const pointsString = p.dailyPoints.map(pt => pt === null ? '' : formatNumber(pt, 1)).join(';');
        
        return [
            p.fantasyTeam, 
            p.name, 
            p.team, 
            p.position, 
            p.gamesPlayed, 
            formatNumber(p.totalPoints, 1), 
            formatNumber(p.averagePoints, 2), 
            formatNumber(p.marginOfErrorPts, 2), 
            formatNumber(p.marginOfErrorPct, 1),
            pointsString
        ].join(';');
    });
    
    const csvContent = [headers, ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "datos_nba_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Muestra la fecha actual en el pie de página.
 */
function updateCreditDate() {
    const now = new Date();
    // Formato: DD/MM/AAAA (ejemplo: 27/11/2025)
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const formattedDate = now.toLocaleDateString('es-ES', options);

    const dateElement = document.getElementById('currentDatePlaceholder');
    if (dateElement) {
        dateElement.textContent = formattedDate;
    }
}

// --- INICIALIZACIÓN DE EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    // Escucha el evento de carga de archivo
    document.getElementById('csvFile').addEventListener('change', handleFileUpload);
    
    // Escucha los botones de descarga
    document.getElementById('downloadChart').addEventListener('click', downloadChartImage);
    document.getElementById('downloadCSV').addEventListener('click', downloadCSV);
    
    // Inicialización al cargar la ventana
    updateCreditDate(); 
    resetDisplay();
    renderChart([], 'daily'); 
});

// Exponer funciones globales necesarias para los eventos en HTML
window.filterPlayersByFantasyTeam = filterPlayersByFantasyTeam;
window.filterPlayersByPosition = filterPlayersByPosition;
window.updateChartDisplay = updateChartDisplay;