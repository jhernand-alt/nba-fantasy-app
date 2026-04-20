// ============================================================================
// modules/historico/historico.js  v1.0.0
// Módulo Histórico NBA: carga nba_fantasy_historico.csv, tabla + gráficas
// ============================================================================

window.Historico = (() => {

    // ── Estado ────────────────────────────────────────────────────────────────

    let allData      = [];   // array de objetos { JUGADOR, PTSTOT_2025, PJ_2025, PTSAVG_2025, ... }
    let filteredData = [];   // tras búsqueda
    let años         = [];   // [2023, 2024, 2025, ...]
    let chartInstance = null;
    let currentChart  = 'total';
    let selectedPlayers = new Set();   // nombres seleccionados para graficar
    let currentSearchText = '';
    let metricaActiva = 'PTSTOT'; // PTSTOT | PJ | PTSAVG
    let currentSortKey    = '';
    let sortDirection     = 'desc';

    const CHART_COLORS = [
        '#2563eb','#dc2626','#16a34a','#d97706','#9333ea',
        '#0891b2','#db2777','#65a30d','#ea580c','#7c3aed',
        '#0284c7','#b91c1c','#15803d','#b45309','#7e22ce',
        '#0369a1','#991b1b','#166534','#92400e','#6b21a8',
    ];

    // ── CSV parse ─────────────────────────────────────────────────────────────

    function parseCSV(text) {
        // Detectar separador (; o ,)
        const firstLine = text.split('\n')[0];
        const sep = firstLine.includes(';') ? ';' : ',';

        const lines = text.trim().split('\n');
        const headers = lines[0].split(sep).map(h => h.trim().replace(/^\uFEFF/, ''));

        // Extraer años de las columnas PTSTOT_XXXX
        const añosDetectados = headers
            .filter(h => h.startsWith('PTSTOT_'))
            .map(h => parseInt(h.split('_')[1]))
            .sort((a, b) => a - b);

        años = añosDetectados;
        if (!años.length) { alert('No se encontraron columnas PTSTOT_XXXX en el CSV.'); return []; }

        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const vals = lines[i].split(sep);
            if (!vals[0]?.trim()) continue;
            const row = { JUGADOR: vals[0].trim() };
            headers.forEach((h, idx) => {
                if (h !== 'JUGADOR') {
                    const raw = (vals[idx] || '').trim().replace(',', '.');
                    row[h] = raw === '' || raw === '0' ? 0 : parseFloat(raw) || 0;
                }
            });
            data.push(row);
        }
        // Filtrar jugadores sin puntos en ninguna temporada
        return data.filter(p =>
            años.some(a => (p[`PTSTOT_${a}`] || 0) > 0)
        );
    }

    // ── Tabla ─────────────────────────────────────────────────────────────────

    function buildTableHeader() {
        const tr = document.querySelector('#histTableHeader tr');
        tr.innerHTML = '';

        // Checkbox
        const thChk = document.createElement('th');
        thChk.className = 'col-check';
        thChk.innerHTML = '<input type="checkbox" id="histCheckAll" title="Seleccionar todos">';
        tr.appendChild(thChk);

        // Jugador
        const thName = document.createElement('th');
        thName.textContent = 'Jugador ⇅';
        thName.style.cursor = 'pointer';
        thName.style.textAlign = 'left';
        thName.onclick = () => sortBy('JUGADOR');
        tr.appendChild(thName);

        // Solo columnas de la métrica activa, de más reciente a más antiguo
        const labels = { PTSTOT: yy => `PTTO${yy}`, PJ: yy => `PJ${yy}`, PTSAVG: yy => `AVG${yy}` };
        [...años].reverse().forEach(a => {
            const yy = String(a).slice(-2);
            const key = `${metricaActiva}_${a}`;
            const th  = document.createElement('th');
            th.textContent = labels[metricaActiva](yy) + ' ⇅';
            th.style.cursor = 'pointer';
            th.onclick = () => sortBy(key);
            tr.appendChild(th);
        });

        // Listener checkAll
        document.getElementById('histCheckAll').addEventListener('change', function () {
            if (this.checked) filteredData.forEach(p => selectedPlayers.add(p.JUGADOR));
            else selectedPlayers.clear();
            renderTable(filteredData);
            updateSelectedCount();
        });
    }

    function renderTable(data) {
        const body = document.getElementById('histTableBody');
        body.innerHTML = '';
        if (!data.length) {
            body.innerHTML = '<tr><td colspan="100">No hay resultados.</td></tr>';
            return;
        }
        data.forEach(p => {
            const row = body.insertRow();

            // Checkbox
            const chkCell = row.insertCell();
            const chk = document.createElement('input'); chk.type = 'checkbox'; chk.checked = selectedPlayers.has(p.JUGADOR);
            chk.addEventListener('change', () => {
                if (chk.checked) selectedPlayers.add(p.JUGADOR); else selectedPlayers.delete(p.JUGADOR);
                updateSelectedCount();
            });
            chkCell.appendChild(chk);

            // Nombre
            const tdNombre = row.insertCell();
            tdNombre.textContent = p.JUGADOR;
            tdNombre.style.textAlign = 'left';

            // Solo columna de la métrica activa, de más reciente a más antiguo
            [...años].reverse().forEach(a => {
                const key = `${metricaActiva}_${a}`;
                const val = p[key];
                const td  = row.insertCell();
                td.textContent = val ? (metricaActiva === 'PJ' ? val : val.toFixed(2).replace('.',',')) : '—';
                td.style.textAlign = 'right';
                if (!val) td.style.color = 'var(--text-secondary)';
            });
        });
    }

    function sortBy(key) {
        if (currentSortKey === key) sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        else { currentSortKey = key; sortDirection = key === 'JUGADOR' ? 'asc' : 'desc'; }
        filteredData.sort((a, b) => {
            const va = a[key], vb = b[key];
            if (typeof va === 'string') return sortDirection === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
            if (va === 0 && vb !== 0) return 1;
            if (vb === 0 && va !== 0) return -1;
            return sortDirection === 'asc' ? va - vb : vb - va;
        });
        renderTable(filteredData);
    }

    function updateSelectedCount() {
        const el = document.getElementById('histSelectedCount');
        if (el) el.textContent = selectedPlayers.size > 0 ? `${selectedPlayers.size} seleccionados` : '';
    }

    function updatePlayerCount() {
        const el = document.getElementById('histPlayerCount');
        if (el) el.textContent = `${filteredData.length} jugadores`;
    }

    // ── Gráficas ──────────────────────────────────────────────────────────────

    function buildChart() {
        const canvas = document.getElementById('histChart');
        if (!canvas || !selectedPlayers.size) return;

        const players = allData.filter(p => selectedPlayers.has(p.JUGADOR));
        const etiquetas = años.map(a => `${a-1}-${String(a).slice(-2)}`);
        const metrica   = currentChart === 'total' ? 'PTSTOT' : 'PTSAVG';
        const titulo    = currentChart === 'total' ? 'Puntos Fantasy Totales' : 'Promedio de Puntos Fantasy por Partido';

        const datasets = players.map((p, i) => {
            const valores = años.map(a => p[`${metrica}_${a}`] || null);
            // Recortar ceros en extremos
            let first = valores.findIndex(v => v && v > 0);
            let last  = [...valores].reverse().findIndex(v => v && v > 0);
            if (first === -1) return null;
            const slice = valores.slice(first, valores.length - last);
            const labels = etiquetas.slice(first, etiquetas.length - last);

            return {
                label:           p.JUGADOR,
                data:            labels.map((lbl, idx) => ({ x: lbl, y: slice[idx] })),
                borderColor:     CHART_COLORS[i % CHART_COLORS.length],
                backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                borderWidth:     2,
                pointRadius:     4,
                pointHoverRadius:6,
                tension:         0.4,
                fill:            false,
                spanGaps:        false,
            };
        }).filter(Boolean);

        if (chartInstance) chartInstance.destroy();
        chartInstance = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels: etiquetas, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top:10, bottom:10 } },
                plugins: {
                    title:   { display: true, text: titulo, font: { size:14, weight:'bold' }, padding: { bottom:10 } },
                    legend:  { position: 'top', labels: { boxWidth:20 } },
                    tooltip: { mode: 'index', intersect: false },
                },
                scales: {
                    x: { title: { display: true, text: 'Temporada' } },
                    y: { title: { display: true, text: currentChart==='total' ? 'Puntos totales' : 'Pts/partido' }, beginAtZero: false },
                },
            },
        });

        const dlBtn = document.getElementById('histDownloadChart');
        if (dlBtn) dlBtn.disabled = false;
    }

    // ── Init ──────────────────────────────────────────────────────────────────

    function init() {
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

                    // Ordenar por temporada más reciente por defecto
                    const defaultSort = `PTSTOT_${años[años.length - 1]}`;
                    currentSortKey = defaultSort;
                    filteredData = [...allData].sort((a, b) => (b[defaultSort]||0) - (a[defaultSort]||0));

                    buildTableHeader();
                    renderTable(filteredData);
                    updatePlayerCount();

                    // Mostrar secciones
                    document.getElementById('histFilterRow').style.display      = '';
                    document.getElementById('histMetricSelector').style.display = '';
                    document.getElementById('histTableSection').style.display   = '';
                    document.getElementById('histChartSection').style.display   = '';
                    document.getElementById('histCredit').style.display         = '';

                    const status = document.getElementById('historicoFileStatus');
                    status.textContent = `✓ ${file.name}  (${allData.length} jugadores, ${años.length} temporadas)`;
                    status.classList.add('loaded');
                };
                reader.readAsText(file, 'UTF-8');
            });
        }
        applyTranslationsToDOM();
    }

    // ── API pública ───────────────────────────────────────────────────────────

    return {
        init,
        switchMetrica: (tipo, btn) => {
            metricaActiva = tipo;
            document.querySelectorAll('.hist-metric-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            buildTableHeader();
            renderTable(filteredData);
        },
        filterBySearch: (text) => {
            currentSearchText = text.toLowerCase().trim();
            filteredData = currentSearchText
                ? allData.filter(p => p.JUGADOR.toLowerCase().includes(currentSearchText))
                : [...allData];
            if (currentSortKey) sortBy(currentSortKey);
            else renderTable(filteredData);
            updatePlayerCount();
        },
        switchChart: (type, btn) => {
            currentChart = type;
            document.querySelectorAll('#module-historico .chart-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            buildChart();
        },
        addSelectedToChart: () => {
            if (!selectedPlayers.size) { alert('Selecciona al menos un jugador en la tabla.'); return; }
            buildChart();
        },
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
        downloadChart: () => {
            if (!chartInstance) return;
            const date = new Date().toLocaleDateString('es-ES').replace(/\//g,'-');
            const tmp  = document.createElement('canvas');
            tmp.width  = chartInstance.canvas.width;
            tmp.height = chartInstance.canvas.height;
            const ctx  = tmp.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, tmp.width, tmp.height);
            ctx.drawImage(chartInstance.canvas, 0, 0);
            const a = document.createElement('a');
            a.href     = tmp.toDataURL('image/png');
            a.download = `Historico_NBA_${currentChart}_${date}.png`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        },
    };
})();

window.initHistorico = () => Historico.init();
