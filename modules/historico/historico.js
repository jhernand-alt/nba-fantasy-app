// ============================================================================
// modules/historico/historico.js  v1.1.0
// Módulo Histórico NBA — toda la lógica encapsulada en window.Historico
// Se activa desde core.js al pulsar la pestaña "Histórico NBA"
//
// Flujo de datos:
//   1. Usuario carga nba_fantasy_historico.csv (generado por nba_fusionar.py)
//   2. parseCSV() detecta las temporadas disponibles y construye el array allData
//   3. buildDesdeSelector() + buildTableHeader() + renderTable() pintan la tabla
//   4. El usuario selecciona jugadores con checkboxes y pulsa "Añadir al gráfico"
//   5. buildChart() construye el gráfico de líneas con Chart.js
//
// Formato CSV esperado (separador ';' o ',', UTF-8 con BOM):
//   JUGADOR;PTSTOT_2025;PJ_2025;PTSAVG_2025;PTSTOT_2024;PJ_2024;PTSAVG_2024;...
//   Las columnas de año se detectan automáticamente por el prefijo PTSTOT_
// ============================================================================

window.Historico = (() => {

    // ── Variables de estado ───────────────────────────────────────────────────

    let allData         = [];   // todos los jugadores tras cargar el CSV
    let filteredData    = [];   // subconjunto tras aplicar búsqueda de texto
    let años            = [];   // años detectados en el CSV, ej: [2019, 2020, ..., 2025]
    let añoDesde        = null; // año mínimo visible en la tabla (selector "Desde")
    let chartInstance   = null; // instancia Chart.js activa (null si no hay gráfico)
    let currentChart    = 'total';   // tipo de gráfico: 'total' | 'avg'
    let selectedPlayers = new Set(); // nombres de jugadores marcados para el gráfico
    let currentSearchText = '';      // texto del buscador activo
    let metricaActiva   = 'PTSTOT';  // columna visible en tabla: PTSTOT | PJ | PTSAVG
    let currentSortKey  = '';        // columna por la que está ordenada la tabla
    let sortDirection   = 'desc';    // dirección de ordenación: 'asc' | 'desc'

    // Paleta de 20 colores para las líneas del gráfico
    const CHART_COLORS = [
        '#2563eb','#dc2626','#16a34a','#d97706','#9333ea',
        '#0891b2','#db2777','#65a30d','#ea580c','#7c3aed',
        '#0284c7','#b91c1c','#15803d','#b45309','#7e22ce',
        '#0369a1','#991b1b','#166534','#92400e','#6b21a8',
    ];


    // ── Parseo del CSV ────────────────────────────────────────────────────────
    // Detecta automáticamente el separador (;  o ,) y las temporadas disponibles.
    // Filtra jugadores sin ningún punto en ninguna temporada (retirados, etc.).

    function parseCSV(text) {
        // Detectar separador por la primera línea
        const firstLine = text.split('\n')[0];
        const sep = firstLine.includes(';') ? ';' : ',';

        const lines   = text.trim().split('\n');
        // Eliminar BOM (byte order mark) si existe al inicio del fichero
        const headers = lines[0].split(sep).map(h => h.trim().replace(/^\uFEFF/, ''));

        // Extraer años de las columnas PTSTOT_XXXX y ordenarlos ascendente
        const añosDetectados = headers
            .filter(h => h.startsWith('PTSTOT_'))
            .map(h => parseInt(h.split('_')[1]))
            .sort((a, b) => a - b);

        años     = añosDetectados;
        añoDesde = años[0]; // por defecto mostrar todas las temporadas

        if (!años.length) {
            alert('No se encontraron columnas PTSTOT_XXXX en el CSV.');
            return [];
        }

        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const vals = lines[i].split(sep);
            if (!vals[0]?.trim()) continue; // saltar filas vacías
            const row = { JUGADOR: vals[0].trim() };
            headers.forEach((h, idx) => {
                if (h !== 'JUGADOR') {
                    // Convertir coma decimal a punto antes de parsear
                    const raw = (vals[idx] || '').trim().replace(',', '.');
                    row[h] = raw === '' || raw === '0' ? 0 : parseFloat(raw) || 0;
                }
            });
            data.push(row);
        }

        // Excluir jugadores sin ningún punto en ninguna temporada
        return data.filter(p => años.some(a => (p[`PTSTOT_${a}`] || 0) > 0));
    }


    // ── Años visibles en la tabla ─────────────────────────────────────────────
    // Devuelve solo los años >= añoDesde (controlado por el selector "Desde").

    function añosVisibles() {
        return años.filter(a => a >= añoDesde);
    }


    // ── Selector "Desde" ──────────────────────────────────────────────────────
    // Construye el <select> con una opción por temporada.
    // Al cambiar, actualiza añoDesde y re-renderiza cabecera y tabla.

    function buildDesdeSelector() {
        const sel   = document.getElementById('histDesdeSelector');
        const label = document.getElementById('histDesdeLabel');
        if (!sel || !label) return;

        sel.innerHTML = '';
        años.forEach(a => {
            const opt = document.createElement('option');
            opt.value       = a;
            opt.textContent = `${a-1}-${String(a).slice(-2)}`; // ej: "2024-25"
            if (a === añoDesde) opt.selected = true;
            sel.appendChild(opt);
        });

        // Mostrar el label (estaba oculto hasta que se carga un CSV)
        label.style.display = 'flex';
        sel.style.display   = 'inline-block';
    }


    // ── Cabecera de la tabla ──────────────────────────────────────────────────
    // Se reconstruye cada vez que cambia la métrica activa o el año "Desde".
    // Muestra una columna por año visible, de más reciente a más antiguo.

    function buildTableHeader() {
        const tr = document.querySelector('#histTableHeader tr');
        tr.innerHTML = '';

        // Columna checkbox — seleccionar todos
        const thChk = document.createElement('th');
        thChk.className = 'col-check';
        thChk.innerHTML = '<input type="checkbox" id="histCheckAll" title="Seleccionar todos">';
        tr.appendChild(thChk);

        // Columna nombre — ordenable
        const thName = document.createElement('th');
        thName.textContent  = 'Jugador ⇅';
        thName.style.cursor = 'pointer';
        thName.style.textAlign = 'left';
        thName.onclick = () => sortBy('JUGADOR');
        tr.appendChild(thName);

        // Una columna por año visible según la métrica activa
        // Etiquetas cortas: PTTO25, PJ25, AVG25
        const labels = {
            PTSTOT: yy => `PTTO${yy}`,
            PJ:     yy => `PJ${yy}`,
            PTSAVG: yy => `AVG${yy}`,
        };
        [...añosVisibles()].reverse().forEach(a => {
            const yy  = String(a).slice(-2);
            const key = `${metricaActiva}_${a}`;
            const th  = document.createElement('th');
            th.textContent  = labels[metricaActiva](yy) + ' ⇅';
            th.style.cursor = 'pointer';
            th.onclick = () => sortBy(key);
            tr.appendChild(th);
        });

        // Listener del checkbox "seleccionar todos": añade/quita todos de selectedPlayers
        document.getElementById('histCheckAll').addEventListener('change', function () {
            if (this.checked) filteredData.forEach(p => selectedPlayers.add(p.JUGADOR));
            else selectedPlayers.clear();
            renderTable(filteredData);
            updateSelectedCount();
        });
    }


    // ── Renderizado de filas ──────────────────────────────────────────────────
    // Pinta una fila por jugador con checkbox, nombre y el valor de la métrica
    // activa para cada año visible. Valores cero se muestran como "—" en gris.

    function renderTable(data) {
        const body = document.getElementById('histTableBody');
        body.innerHTML = '';
        if (!data.length) {
            body.innerHTML = '<tr><td colspan="100">No hay resultados.</td></tr>';
            return;
        }
        data.forEach(p => {
            const row = body.insertRow();

            // Checkbox: mantiene el estado de selección entre re-renders
            const chkCell = row.insertCell();
            const chk     = document.createElement('input');
            chk.type    = 'checkbox';
            chk.checked = selectedPlayers.has(p.JUGADOR);
            chk.addEventListener('change', () => {
                if (chk.checked) selectedPlayers.add(p.JUGADOR);
                else selectedPlayers.delete(p.JUGADOR);
                updateSelectedCount();
            });
            chkCell.appendChild(chk);

            // Nombre del jugador
            const tdNombre = row.insertCell();
            tdNombre.textContent  = p.JUGADOR;
            tdNombre.style.textAlign = 'left';

            // Valor de la métrica activa para cada año visible (más reciente primero)
            [...añosVisibles()].reverse().forEach(a => {
                const key = `${metricaActiva}_${a}`;
                const val = p[key];
                const td  = row.insertCell();
                // PJ se muestra entero; PTSTOT y PTSAVG con 2 decimales y coma
                td.textContent     = val ? (metricaActiva === 'PJ' ? val : val.toFixed(2).replace('.', ',')) : '—';
                td.style.textAlign = 'right';
                if (!val) td.style.color = 'var(--text-secondary)'; // gris para valores vacíos
            });
        });
    }


    // ── Ordenación de la tabla ────────────────────────────────────────────────
    // Al pulsar la misma columna dos veces invierte la dirección.
    // Jugadores con valor 0 siempre van al final independientemente de la dirección.

    function sortBy(key) {
        if (currentSortKey === key) sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        else { currentSortKey = key; sortDirection = key === 'JUGADOR' ? 'asc' : 'desc'; }

        filteredData.sort((a, b) => {
            const va = a[key], vb = b[key];
            if (typeof va === 'string') return sortDirection === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
            if (va === 0 && vb !== 0) return 1;  // ceros siempre al final
            if (vb === 0 && va !== 0) return -1;
            return sortDirection === 'asc' ? va - vb : vb - va;
        });
        renderTable(filteredData);
    }


    // ── Contadores de estado ──────────────────────────────────────────────────

    // Muestra cuántos jugadores hay seleccionados para el gráfico
    function updateSelectedCount() {
        const el = document.getElementById('histSelectedCount');
        if (el) el.textContent = selectedPlayers.size > 0 ? `${selectedPlayers.size} seleccionados` : '';
    }

    // Muestra el total de jugadores visible tras el buscador
    function updatePlayerCount() {
        const el = document.getElementById('histPlayerCount');
        if (el) el.textContent = `${filteredData.length} jugadores`;
    }


    // ── Gráfico de líneas ─────────────────────────────────────────────────────
    // Construye el gráfico con los jugadores en selectedPlayers.
    // IMPORTANTE: todos los datasets usan el mismo eje X global (todos los años del CSV).
    // Donde un jugador no tiene dato se usa null → Chart.js no dibuja ese punto
    // y el tooltip solo muestra los jugadores con valor en esa temporada.

    function buildChart() {
        const canvas = document.getElementById('histChart');
        if (!canvas || !selectedPlayers.size) return;

        const players   = allData.filter(p => selectedPlayers.has(p.JUGADOR));
        const metrica   = currentChart === 'total' ? 'PTSTOT' : 'PTSAVG';
        const titulo    = currentChart === 'total'
            ? 'Puntos Fantasy Totales'
            : 'Promedio de Puntos Fantasy por Partido';

        // Etiquetas del eje X: todas las temporadas del CSV ("2024-25", "2025-26", ...)
        const etiquetas = años.map(a => `${a-1}-${String(a).slice(-2)}`);

        const datasets = players.map((p, i) => {
            // Array paralelo a etiquetas: valor numérico o null si no hay dato
            const valores = años.map(a => {
                const v = p[`${metrica}_${a}`];
                return (v && v > 0) ? v : null;
            });
            return {
                label:            p.JUGADOR,
                data:             valores,
                borderColor:      CHART_COLORS[i % CHART_COLORS.length],
                backgroundColor:  CHART_COLORS[i % CHART_COLORS.length],
                borderWidth:      2,
                pointRadius:      4,
                pointHoverRadius: 6,
                tension:          0.4,  // suavizado de líneas
                fill:             false,
                spanGaps:         false, // no unir puntos separados por null
            };
        });

        if (chartInstance) chartInstance.destroy();
        chartInstance = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels: etiquetas, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 10, bottom: 10 } },
                plugins: {
                    title:  { display: true, text: titulo, font: { size: 14, weight: 'bold' }, padding: { bottom: 10 } },
                    legend: { position: 'top', labels: { boxWidth: 20 } },
                    tooltip: {
                        mode:      'index',
                        intersect: false,
                        // Ocultar del tooltip los jugadores sin dato en ese punto
                        filter:   item => item.parsed.y !== null,
                        // Ordenar el tooltip de mayor a menor valor
                        itemSort: (a, b) => b.parsed.y - a.parsed.y,
                    },
                },
                scales: {
                    x: { title: { display: true, text: 'Temporada' } },
                    y: {
                        title:        { display: true, text: currentChart === 'total' ? 'Puntos totales' : 'Pts/partido' },
                        beginAtZero:  false,
                    },
                },
            },
        });

        // Habilitar botón de descarga una vez hay gráfico
        const dlBtn = document.getElementById('histDownloadChart');
        if (dlBtn) dlBtn.disabled = false;
    }


    // ── Init ──────────────────────────────────────────────────────────────────
    // Llamado por core.js cada vez que se activa el módulo.
    // Los listeners se registran solo la primera vez (flag dataset.histBound).

    function init() {
        // Listener del input de archivo CSV
        const csvInput = document.getElementById('csvHistorico');
        if (csvInput && !csvInput.dataset.histBound) {
            csvInput.dataset.histBound = '1';
            csvInput.addEventListener('change', function (e) {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => {
                    allData = parseCSV(ev.target.result);
                    if (!allData.length) return;

                    // Ordenar por defecto: puntos totales de la temporada más reciente
                    const defaultSort = `PTSTOT_${años[años.length - 1]}`;
                    currentSortKey = defaultSort;
                    filteredData   = [...allData].sort((a, b) => (b[defaultSort] || 0) - (a[defaultSort] || 0));

                    // Construir controles y tabla
                    buildDesdeSelector();
                    buildTableHeader();
                    renderTable(filteredData);
                    updatePlayerCount();

                    // Mostrar secciones que estaban ocultas hasta cargar datos
                    document.getElementById('histFilterRow').style.display      = '';
                    document.getElementById('histMetricSelector').style.display = '';
                    document.getElementById('histTableSection').style.display   = '';
                    document.getElementById('histChartSection').style.display   = '';
                    document.getElementById('histCredit').style.display         = '';

                    // Actualizar indicador de archivo cargado
                    const status = document.getElementById('historicoFileStatus');
                    status.textContent = `✓ ${file.name}  (${allData.length} jugadores, ${años.length} temporadas)`;
                    status.classList.add('loaded');
                };
                reader.readAsText(file, 'UTF-8');
            });
        }

        // Listener del selector "Desde": filtra columnas visibles en la tabla
        const desdeEl = document.getElementById('histDesdeSelector');
        if (desdeEl && !desdeEl.dataset.histBound) {
            desdeEl.dataset.histBound = '1';
            desdeEl.addEventListener('change', function () {
                añoDesde = parseInt(this.value);
                buildTableHeader(); // reconstruir cabecera con nuevos años visibles
                renderTable(filteredData);
            });
        }

        applyTranslationsToDOM();
    }


    // ── API pública ───────────────────────────────────────────────────────────
    // Solo se expone lo que el HTML llama directamente con onclick="Historico.xxx()".

    return {
        init,

        // Cambia la métrica visible en la tabla (Puntos Totales / Partidos / Promedio)
        switchMetrica: (tipo, btn) => {
            metricaActiva = tipo;
            document.querySelectorAll('.hist-metric-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            buildTableHeader();
            renderTable(filteredData);
        },

        // Filtra la tabla por nombre de jugador
        filterBySearch: (text) => {
            currentSearchText = text.toLowerCase().trim();
            filteredData = currentSearchText
                ? allData.filter(p => p.JUGADOR.toLowerCase().includes(currentSearchText))
                : [...allData];
            if (currentSortKey) sortBy(currentSortKey);
            else renderTable(filteredData);
            updatePlayerCount();
        },

        // Cambia entre gráfico de totales y de promedios
        switchChart: (type, btn) => {
            currentChart = type;
            document.querySelectorAll('#module-historico .chart-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            buildChart();
        },

        // Añade los jugadores seleccionados al gráfico y lo renderiza
        addSelectedToChart: () => {
            if (!selectedPlayers.size) { alert('Selecciona al menos un jugador en la tabla.'); return; }
            buildChart();
        },

        // Limpia la selección de jugadores y destruye el gráfico
        clearChartSelection: () => {
            selectedPlayers.clear();
            updateSelectedCount();
            document.querySelectorAll('#histTableBody input[type=checkbox]').forEach(c => c.checked = false);
            const histCheckAll = document.getElementById('histCheckAll');
            if (histCheckAll) histCheckAll.checked = false;
            if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
            const dlBtn = document.getElementById('histDownloadChart');
            if (dlBtn) dlBtn.disabled = true;
        },

        // Descarga el gráfico actual como PNG con fondo blanco
        downloadChart: () => {
            if (!chartInstance) return;
            const date = new Date().toLocaleDateString('es-ES').replace(/\//g, '-');
            const tmp  = document.createElement('canvas');
            tmp.width  = chartInstance.canvas.width;
            tmp.height = chartInstance.canvas.height;
            const ctx  = tmp.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, tmp.width, tmp.height);
            ctx.drawImage(chartInstance.canvas, 0, 0);
            const a       = document.createElement('a');
            a.href        = tmp.toDataURL('image/png');
            a.download    = `Historico_NBA_${currentChart}_${date}.png`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        },
    };
})();

// core.js llama a initHistorico() al activar el módulo
window.initHistorico = () => Historico.init();
