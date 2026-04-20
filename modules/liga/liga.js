// ============================================================================
// modules/liga/liga.js  v3.3.0
// Toda la lógica del módulo Liga Fantasy, encapsulada en window.Liga
// Se carga dinámicamente por core.js al activar la pestaña Liga
// ============================================================================

window.Liga = (() => {

    // ── Variables privadas ────────────────────────────────────────────────────

    let playersData   = [];
    let statsData     = {};
    let allPlayerData = [];
    let activePlayers = [];
    let chartInstance = null;
    let currentChart  = 'topTotal';
    let selectedIds   = new Set();
    let playersFileDate = null;
    let statsFileDate   = null;

    let currentSortKey        = 'rankTotal';
    let sortDirection         = 'asc';
    let currentPositionFilter = 'all';
    let currentTeamFilter     = 'all';
    let currentNBATeamFilter  = 'all';
    let currentSearchText     = '';

    const SEP     = ';';
    const DEC_SEP = ',';

    const CHART_COLORS = [
        '#2563eb','#dc2626','#16a34a','#d97706','#9333ea',
        '#0891b2','#db2777','#65a30d','#ea580c','#7c3aed',
        '#0284c7','#b91c1c','#15803d','#b45309','#7e22ce',
        '#0369a1','#991b1b','#166534','#92400e','#6b21a8',
    ];

    const FILTERED_FANTASY_NAMES = ['waiver', 'waivers'];
    const FILTERED_NBA_NAMES     = ['free agent', 'fa'];

    // ── Helpers ───────────────────────────────────────────────────────────────

    function t() { return getTranslations(); }

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
        const raw = getTeamCode(team).replace(/\./g,'').replace(/\s+/g,'-').replace(/\//g,'-').replace(/[^a-zA-Z0-9\-]/g,'');
        return `assets/team-icons/${raw.toUpperCase()}.png`;
    }
    function getFantasyIconUrl(name) {
        if (!name || name.toLowerCase().includes('waiver')) return '';
        return `assets/fantasy-icons/${getTeamCode(name).substring(0,4).toUpperCase()}.svg`;
    }
    function isFilteredFantasyName(name) { return FILTERED_FANTASY_NAMES.some(f => name.toLowerCase().includes(f)); }
    function isFilteredNBAName(name)     { return FILTERED_NBA_NAMES.some(f => getShortName(name).toLowerCase().includes(f)); }

    function fmtNum(v, dec = 2) {
        if (v === null || v === undefined) return '—';
        return typeof v === 'number' ? v.toFixed(dec).replace('.', ',') : v;
    }
    function fmtWithRank(val, rank, dec = 2) {
        if (val === null || val === undefined) return '—';
        const numStr = typeof val === 'number' ? val.toFixed(dec).replace('.', ',') : val;
        return rank !== null && rank !== undefined ? `${numStr} (${rank})` : numStr;
    }

    function getTendencia(rankSemana, rank2Semanas, rankMes, rankTotal) {
        if (rankTotal === null || rankTotal === undefined) return null;
        let score = 0, weight = 0;
        if (rankSemana   != null) { score += (rankTotal - rankSemana)   * 0.5; weight += 0.5; }
        if (rank2Semanas != null) { score += (rankTotal - rank2Semanas) * 0.3; weight += 0.3; }
        if (rankMes      != null) { score += (rankTotal - rankMes)      * 0.2; weight += 0.2; }
        if (weight === 0) return null;
        const diff   = score / weight;
        const detail = `sem:${rankSemana ?? '—'} 2sem:${rank2Semanas ?? '—'} mes:${rankMes ?? '—'} total:${rankTotal}`;
        if (diff >= 50)  return { icon:'↑↑', color:'#15803d', title:`Muy en racha (${detail})` };
        if (diff >= 10)  return { icon:'↑',  color:'#16a34a', title:`En racha (${detail})` };
        if (diff >= -10) return { icon:'--', color:'#6b7280', title:`Estable (${detail})` };
        if (diff >= -50) return { icon:'↓',  color:'#ea580c', title:`Bajando (${detail})` };
        return                   { icon:'↓↓', color:'#ef4444', title:`Muy por debajo (${detail})` };
    }

    function getPartidoHoy(juegaHoy, injuryStatus) {
        if (juegaHoy === null) return null;
        const inj = (injuryStatus || '').toUpperCase();
        if (inj === 'OUT')          return { text:'OUT', color:'#ef4444', title:'Lesionado — fuera' };
        if (inj === 'DAY_TO_DAY')   return { text:'DTD', color:'#ea580c', title:'Day-To-Day' };
        if (inj === 'QUESTIONABLE') return { text:'Q',   color:'#d97706', title:'Questionable' };
        if (juegaHoy === 1)         return { text:'🏀',  color:'',        title:'Juega hoy' };
        return                               { text:'',   color:'',        title:'No juega hoy' };
    }

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

    // ── CSV parse ─────────────────────────────────────────────────────────────

    function parsePlayersCSV(text) {
        const lines = text.trim().split('\n');
        const data  = [];
        for (let i = 1; i < lines.length; i++) {
            const v = lines[i].split(SEP);
            if (v.length >= 5) data.push({
                id:          v[0].trim(),
                name:        v[1].trim(),
                fantasyTeam: v[2].trim(),
                team:        v[3].trim(),
                position:    v[4].trim().toUpperCase(),
                espnLink:    v[5]?.trim() || '',
            });
        }
        return data;
    }

    function parseStatsCSV(text) {
        const lines = text.trim().split('\n');
        const data  = {};
        const pf = (v, idx) => { const s=(v[idx]||'').trim(); if(!s) return null; const n=parseFloat(s.replace(DEC_SEP,'.')); return isNaN(n)?null:n; };
        const pi = (v, idx) => { const s=(v[idx]||'').trim(); if(!s) return null; const n=parseInt(s); return isNaN(n)?null:n; };
        const header = (lines[0]||'').toLowerCase();
        const isExtended = header.includes('rank_pos');
        for (let i = 1; i < lines.length; i++) {
            const v  = lines[i].split(SEP);
            const id = v[0]?.trim();
            if (!id) continue;
            if (isExtended) {
                data[id] = { ptsTotal:pf(v,1), ptsAvg:pf(v,2), partidos:pi(v,3), rankPos:pi(v,4), rankTotal:pi(v,5), ptsSemana:pf(v,6), rankSemana:pi(v,7), pts2Semanas:pf(v,8), rank2Semanas:pi(v,9), ptsMes:pf(v,10), rankMes:pi(v,11), juegaHoy:pi(v,12), injuryStatus:v[13]?.trim()||'ACTIVE' };
            } else {
                data[id] = { fantasyTeam:v[1]?.trim()||'', ptsTotal:pf(v,2), ptsAvg:pf(v,3), partidos:pi(v,4), rankPos:null, rankTotal:pi(v,5), ptsSemana:pf(v,6), rankSemana:null, pts2Semanas:pf(v,7), rank2Semanas:null, ptsMes:pf(v,8), rankMes:null };
            }
        }
        return data;
    }

    // ── Proceso y arranque ────────────────────────────────────────────────────

    function checkAndProcess() {
        if (!playersData.length || !Object.keys(statsData).length) return;
        try {
            allPlayerData = playersData.map(p => {
                const s = statsData[p.id] || {};
                const fantasyTeam = p.fantasyTeam || '';
                return { id:p.id, name:p.name, fantasyTeam, team:p.team, position:p.position, espnLink:p.espnLink,
                    ptsTotal:s.ptsTotal??0, ptsAvg:s.ptsAvg??0, partidos:s.partidos??0,
                    rankPos:s.rankPos??null, rankTotal:s.rankTotal??null,
                    ptsSemana:s.ptsSemana??null, rankSemana:s.rankSemana??null,
                    pts2Semanas:s.pts2Semanas??null, rank2Semanas:s.rank2Semanas??null,
                    ptsMes:s.ptsMes??null, rankMes:s.rankMes??null,
                    juegaHoy:s.juegaHoy??null, injuryStatus:s.injuryStatus||null };
            });
            if (!allPlayerData.length) { alert('No se pudieron combinar los datos. Verifica que los IDs coincidan.'); return; }
            initializeApp(allPlayerData);
        } catch (err) {
            alert('Error al procesar los datos: ' + err.message);
        }
    }

    function initializeApp(data) {
        loadState();
        const nSel = document.getElementById('nbaTeamSelector');
        nSel.innerHTML = `<option value="all">${t().filter_all_nba}</option>`;
        const allNBATeams  = Array.from(new Set(data.map(p => p.team)));
        const realNBATeams = allNBATeams.filter(x => !isFilteredNBAName(x)).sort((a,b) => getShortName(a).localeCompare(getShortName(b)));
        const freeAgents   = allNBATeams.filter(x =>  isFilteredNBAName(x));
        realNBATeams.forEach(x => { const o=document.createElement('option'); o.value=x; o.textContent=getShortName(x); nSel.appendChild(o); });
        if (freeAgents.length) { const sep=document.createElement('option'); sep.disabled=true; sep.textContent='──────────────'; nSel.appendChild(sep); freeAgents.forEach(x => { const o=document.createElement('option'); o.value=x; o.textContent=`— ${getShortName(x)} —`; nSel.appendChild(o); }); }
        nSel.value = currentNBATeamFilter; nSel.disabled = false;

        const fSel = document.getElementById('fantasyTeamSelector');
        fSel.innerHTML = `<option value="all">${t().filter_all_fantasy}</option>`;
        const allFantasyTeams = Array.from(new Set(data.map(p => p.fantasyTeam)));
        const realTeams   = allFantasyTeams.filter(x => !isFilteredFantasyName(x)).sort((a,b) => getShortName(a).localeCompare(getShortName(b)));
        const waiverTeams = allFantasyTeams.filter(x =>  isFilteredFantasyName(x));
        realTeams.forEach(x => { const o=document.createElement('option'); o.value=x; o.textContent=getShortName(x); fSel.appendChild(o); });
        if (waiverTeams.length) { const sep=document.createElement('option'); sep.disabled=true; sep.textContent='──────────────'; fSel.appendChild(sep); waiverTeams.forEach(x => { const o=document.createElement('option'); o.value=x; o.textContent=`— ${getShortName(x)} —`; fSel.appendChild(o); }); }
        fSel.value = currentTeamFilter; fSel.disabled = false;

        document.querySelectorAll('.filter-btn').forEach(btn => {
            const m = btn.getAttribute('onclick')?.match(/filterPlayersByPosition\('([^']+)'/);
            if (m) { const active = m[1] === currentPositionFilter; btn.classList.toggle('active', active); btn.setAttribute('aria-pressed', active); }
        });

        const checkAll = document.getElementById('checkAll');
        if (checkAll) checkAll.addEventListener('change', function () {
            if (this.checked) activePlayers.forEach(p => selectedIds.add(p.id)); else selectedIds.clear();
            renderTable(activePlayers);
            if (currentChart === 'compare') renderCompareChart();
        });

        document.getElementById('downloadChart').disabled = false;
        applyFiltersAndSort();
    }

    // ── Filtros ───────────────────────────────────────────────────────────────

    function applyFiltersAndSort() {
        let filtered = allPlayerData;
        if (currentNBATeamFilter  !== 'all') filtered = filtered.filter(p => p.team === currentNBATeamFilter);
        if (currentTeamFilter     !== 'all') filtered = filtered.filter(p => p.fantasyTeam === currentTeamFilter);
        if (currentPositionFilter !== 'all') filtered = filtered.filter(p => p.position.includes(currentPositionFilter));
        if (currentSearchText)               filtered = filtered.filter(p => p.name.toLowerCase().includes(currentSearchText) || (p.fantasyTeam||'').toLowerCase().includes(currentSearchText) || (p.team||'').toLowerCase().includes(currentSearchText));
        activePlayers = filtered;
        sortData(activePlayers, currentSortKey, sortDirection);
        renderTable(activePlayers);
        updateCurrentChart();
    }

    function sortData(arr, key, dir) {
        arr.sort((a, b) => {
            let va = a[key], vb = b[key];
            if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
            if (va === null || va === undefined) return 1;
            if (vb === null || vb === undefined) return -1;
            if (va < vb) return dir === 'asc' ? -1 : 1;
            if (va > vb) return dir === 'asc' ?  1 : -1;
            return 0;
        });
    }

    function saveState(opts = {}) {
        localStorage.setItem('ligaState', JSON.stringify({ sortKey:currentSortKey, sortDir:sortDirection, posFilter:opts.posFilter||currentPositionFilter, teamFilter:opts.teamFilter||currentTeamFilter, nbaTeamFilter:opts.nbaTeamFilter||currentNBATeamFilter }));
    }
    function loadState() {
        const s = JSON.parse(localStorage.getItem('ligaState') || '{}');
        currentSortKey = s.sortKey || 'rankTotal'; sortDirection = s.sortDir || 'asc';
        currentPositionFilter = s.posFilter || 'all'; currentTeamFilter = s.teamFilter || 'all'; currentNBATeamFilter = s.nbaTeamFilter || 'all';
    }

    // ── Tabla ─────────────────────────────────────────────────────────────────

    function renderTable(players) {
        const body = document.getElementById('playerTableBody');
        body.innerHTML = '';
        const visible = players.filter(p => (p.ptsTotal || 0) !== 0);
        if (!visible.length) { body.innerHTML = `<tr><td colspan="14">${t().table_no_results}</td></tr>`; return; }
        visible.forEach(p => {
            const row = body.insertRow();
            const chkCell = row.insertCell();
            const chk = document.createElement('input'); chk.type='checkbox'; chk.checked=selectedIds.has(p.id);
            chk.addEventListener('change', () => { if(chk.checked) selectedIds.add(p.id); else selectedIds.delete(p.id); if(currentChart==='compare') renderCompareChart(); });
            chkCell.appendChild(chk);

            const nc  = row.insertCell();
            const ndiv = document.createElement('div'); ndiv.style.cssText='display:flex;align-items:center;gap:4px;';
            const nspan = document.createElement('span'); nspan.textContent = p.name; ndiv.appendChild(nspan);
            if (p.espnLink) { const a=document.createElement('a'); a.href=p.espnLink; a.target='_blank'; a.className='espn-link'; a.innerHTML='🔗'; a.title='Ver en ESPN'; ndiv.appendChild(a); }
            nc.appendChild(ndiv);

            makeIconCell(row, getNBAIconUrl(p.team), p.team, getShortName(p.team));
            makeIconCell(row, getFantasyIconUrl(p.fantasyTeam), p.fantasyTeam, getShortName(p.fantasyTeam));
            row.insertCell().textContent = p.position;
            row.insertCell().textContent = p.rankPos ?? '—';
            row.insertCell().textContent = fmtWithRank(p.ptsTotal, p.rankTotal);
            row.insertCell().textContent = fmtNum(p.ptsAvg);
            row.insertCell().textContent = p.partidos || '—';
            row.insertCell().textContent = fmtWithRank(p.ptsSemana, p.rankSemana);
            row.insertCell().textContent = fmtWithRank(p.pts2Semanas, p.rank2Semanas);
            row.insertCell().textContent = fmtWithRank(p.ptsMes, p.rankMes);

            const tendCell = row.insertCell(); tendCell.style.cssText='text-align:center;font-weight:600;cursor:default;white-space:nowrap;';
            const tend = getTendencia(p.rankSemana, p.rank2Semanas, p.rankMes, p.rankTotal);
            if (tend) { tendCell.textContent=tend.icon; tendCell.style.color=tend.color; tendCell.title=tend.title; }

            const hoyCell = row.insertCell(); hoyCell.style.cssText='text-align:center;font-weight:600;cursor:default;';
            const hoy = getPartidoHoy(p.juegaHoy, p.injuryStatus);
            if (hoy !== null) { hoyCell.textContent=hoy.text; if(hoy.color) hoyCell.style.color=hoy.color; hoyCell.title=hoy.title; }
        });
    }

    // ── Gráficos ──────────────────────────────────────────────────────────────

    function getChartCanvas() { return document.getElementById('ligaPointsChart'); }

    function renderBarChartPlayers(field, limitVal) {
        const label = field === 'ptsTotal' ? t().col_pts_total.replace(' ⇅','') : t().col_pts_avg.replace(' ⇅','');
        const limit = limitVal === 'all' ? null : parseInt(limitVal);
        let sorted = [...activePlayers].sort((a,b) => b[field]-a[field]);
        if (limit) sorted = sorted.slice(0, limit);
        buildChart({ title:label, labels:sorted.map(p=>p.name), datasets:[{ label, data:sorted.map(p=>p[field]||0), backgroundColor:sorted.map((_,i)=>CHART_COLORS[i%CHART_COLORS.length]), borderRadius:4 }], indexAxis:'y', xTitle:label });
    }

    function renderGroupChart(groupBy, metric, limitVal) {
        const label = metric === 'total' ? t().col_pts_total.replace(' ⇅','') : t().col_pts_avg.replace(' ⇅','');
        const groupMap = {};
        activePlayers.forEach(p => {
            const rawKey = groupBy === 'fantasy' ? p.fantasyTeam : p.team;
            if (groupBy==='fantasy' && isFilteredFantasyName(rawKey)) return;
            if (groupBy==='nba'     && isFilteredNBAName(rawKey))     return;
            const key = getShortName(rawKey);
            if (!groupMap[key]) groupMap[key] = { total:0, partidos:0 };
            groupMap[key].total    += p.ptsTotal || 0;
            groupMap[key].partidos += p.partidos || 0;
        });
        let entries = Object.entries(groupMap);
        if (metric === 'total') entries.sort((a,b) => b[1].total - a[1].total);
        else entries.sort((a,b) => { const avgA=a[1].partidos>0?a[1].total/a[1].partidos:0; const avgB=b[1].partidos>0?b[1].total/b[1].partidos:0; return avgB-avgA; });
        const limit = limitVal === 'all' ? null : parseInt(limitVal);
        if (limit) entries = entries.slice(0, limit);
        const values = entries.map(e => metric==='total' ? Math.round(e[1].total*100)/100 : e[1].partidos>0?Math.round(e[1].total/e[1].partidos*100)/100:0);
        buildChart({ title:label, labels:entries.map(e=>e[0]), datasets:[{ label, data:values, backgroundColor:entries.map((_,i)=>CHART_COLORS[i%CHART_COLORS.length]), borderRadius:4 }], indexAxis:'y', xTitle:label });
    }

    function renderCompareChart() {
        const selected = allPlayerData.filter(p => selectedIds.has(p.id));
        if (!selected.length) { clearChart(); return; }
        const withRanks = selected.filter(p => p.rankTotal!==null||p.rankMes!==null||p.rank2Semanas!==null||p.rankSemana!==null);
        if (!withRanks.length) { clearChart(); return; }
        const labels = ['Rank Total','Rank Mes','Rank 2 Sem','Rank Sem'];
        const datasets = withRanks.map((p,i) => ({ label:p.name, data:[p.rankTotal,p.rankMes,p.rank2Semanas,p.rankSemana], borderColor:CHART_COLORS[i%CHART_COLORS.length], backgroundColor:CHART_COLORS[i%CHART_COLORS.length], borderWidth:2, pointRadius:6, pointHoverRadius:8, tension:0, fill:false, spanGaps:true }));
        const canvas = getChartCanvas();
        const ctx    = canvas.getContext('2d');
        if (chartInstance) chartInstance.destroy();
        const allRanks = withRanks.flatMap(p => [p.rankTotal,p.rankMes,p.rank2Semanas,p.rankSemana].filter(v=>v!==null));
        const maxRank  = allRanks.length ? Math.max(...allRanks)+10 : 100;
        chartInstance = new Chart(ctx, { type:'line', data:{labels,datasets}, options:{ responsive:true, maintainAspectRatio:false, layout:{padding:{bottom:20,top:10}}, plugins:{ title:{display:true,text:t().tab_compare,font:{size:14,weight:'bold'},padding:{bottom:10}}, legend:{position:'top',labels:{boxWidth:20}}, tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: #${ctx.parsed.y}`}} }, scales:{ x:{}, y:{reverse:true,min:1,max:maxRank,title:{display:true,text:'Ranking (↑ mejor)'},ticks:{stepSize:Math.ceil(maxRank/10)}} } } });
    }

    function buildChart({ title='', labels, datasets, indexAxis='x', xTitle='' }) {
        const ctx = getChartCanvas().getContext('2d');
        if (chartInstance) chartInstance.destroy();
        chartInstance = new Chart(ctx, { type:'bar', data:{labels,datasets}, options:{ responsive:true, maintainAspectRatio:false, indexAxis, layout:{padding:{bottom:20,top:10}}, plugins:{ title:{display:!!title,text:title,font:{size:14,weight:'bold'},padding:{bottom:10}}, legend:{position:datasets.length>1?'top':'none',labels:{boxWidth:20}}, tooltip:{mode:'index',intersect:false} }, scales:{ x:{title:{display:!!xTitle,text:xTitle},beginAtZero:true}, y:{beginAtZero:true} } } });
    }

    function clearChart() {
        if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
        const canvas = getChartCanvas();
        if (canvas) canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
    }

    function updateCurrentChart() {
        if (!allPlayerData.length) return;
        const limit = document.getElementById('chartLimitSelector')?.value;
        switch (currentChart) {
            case 'topTotal':       renderBarChartPlayers('ptsTotal', limit); break;
            case 'topAvg':         renderBarChartPlayers('ptsAvg',   limit); break;
            case 'byFantasyTotal': renderGroupChart('fantasy','total',limit); break;
            case 'byFantasyAvg':   renderGroupChart('fantasy','avg',  limit); break;
            case 'byNBATotal':     renderGroupChart('nba','total',    limit); break;
            case 'byNBAAvg':       renderGroupChart('nba','avg',      limit); break;
            case 'compare':        renderCompareChart(); break;
        }
    }

    function updateCreditDate() {
        const el = document.getElementById('currentDatePlaceholder');
        if (!el) return;
        if (!playersFileDate && !statsFileDate) { el.textContent = t().credit_no_data; return; }
        const d = (playersFileDate && statsFileDate) ? (playersFileDate>statsFileDate?playersFileDate:statsFileDate) : (playersFileDate||statsFileDate);
        el.textContent = d.toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    }

    function resetData() {
        allPlayerData = []; activePlayers = []; selectedIds.clear();
        const body = document.getElementById('playerTableBody');
        if (body) body.innerHTML = `<tr><td colspan="14">${t().table_empty_initial}</td></tr>`;
        clearChart();
        const dlBtn = document.getElementById('downloadChart'); if (dlBtn) dlBtn.disabled = true;
        const fSel = document.getElementById('fantasyTeamSelector'); if (fSel) { fSel.innerHTML=`<option value="all">${t().filter_all_fantasy}</option>`; fSel.disabled=true; }
        const nSel = document.getElementById('nbaTeamSelector');     if (nSel) { nSel.innerHTML=`<option value="all">${t().filter_all_nba}</option>`;     nSel.disabled=true; }
        document.querySelectorAll('#module-liga .filter-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
        const allBtn = document.querySelector("#module-liga .filter-btn[onclick*=\"'all'\"]");
        if (allBtn) { allBtn.classList.add('active'); allBtn.setAttribute('aria-pressed','true'); }
        const si = document.getElementById('searchInput'); if (si) si.value='';
        currentSortKey='rankTotal'; sortDirection='asc'; currentPositionFilter='all'; currentTeamFilter='all'; currentNBATeamFilter='all'; currentSearchText='';
    }

    // ── Init (llamado por core.js al activar el módulo) ───────────────────────

    function init() {
        // Registrar listeners de archivo solo la primera vez
        const csvPlayers = document.getElementById('csvPlayers');
        const csvStats   = document.getElementById('csvStats');
        if (csvPlayers && !csvPlayers.dataset.ligaBound) {
            csvPlayers.dataset.ligaBound = '1';
            csvPlayers.addEventListener('change', function (e) {
                const file = e.target.files[0]; if (!file) return;
                playersFileDate = new Date(file.lastModified);
                const reader = new FileReader();
                reader.onload = ev => { resetData(); playersData=parsePlayersCSV(ev.target.result); const s=document.getElementById('playersFileStatus'); s.textContent=`✓ ${file.name}`; s.classList.add('loaded'); updateCreditDate(); checkAndProcess(); };
                reader.readAsText(file, 'UTF-8');
            });
        }
        if (csvStats && !csvStats.dataset.ligaBound) {
            csvStats.dataset.ligaBound = '1';
            csvStats.addEventListener('change', function (e) {
                const file = e.target.files[0]; if (!file) return;
                statsFileDate = new Date(file.lastModified);
                const reader = new FileReader();
                reader.onload = ev => { resetData(); statsData=parseStatsCSV(ev.target.result); const s=document.getElementById('statsFileStatus'); s.textContent=`✓ ${file.name}`; s.classList.add('loaded'); updateCreditDate(); checkAndProcess(); };
                reader.readAsText(file, 'UTF-8');
            });
        }
        updateCreditDate();
        // Re-aplicar traducciones al HTML recién inyectado
        applyTranslationsToDOM();
    }

    // ── API pública ───────────────────────────────────────────────────────────

    return {
        init,
        filterBySearch:          (v) => { currentSearchText=v.toLowerCase().trim(); saveState(); applyFiltersAndSort(); },
        filterPlayersByNBATeam:  (v) => { currentNBATeamFilter=v; saveState({nbaTeamFilter:v}); applyFiltersAndSort(); },
        filterPlayersByFantasyTeam:(v)=> { currentTeamFilter=v; saveState({teamFilter:v}); applyFiltersAndSort(); },
        filterPlayersByPosition: (pos, btn) => {
            currentPositionFilter=pos;
            document.querySelectorAll('#module-liga .filter-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
            btn.classList.add('active'); btn.setAttribute('aria-pressed','true');
            saveState({posFilter:pos}); applyFiltersAndSort();
        },
        sortTable: (key, th) => {
            if (currentSortKey===key) sortDirection=sortDirection==='asc'?'desc':'asc'; else { currentSortKey=key; sortDirection=['rankTotal','rankPos','rankSemana','rank2Semanas','rankMes'].includes(key)?'asc':'desc'; }
            saveState(); applyFiltersAndSort();
            document.querySelectorAll('.player-table th[onclick]').forEach(t=>t.removeAttribute('aria-sort'));
            th.setAttribute('aria-sort', sortDirection==='asc'?'ascending':'descending');
        },
        switchChart: (type, btn) => {
            currentChart=type;
            document.querySelectorAll('#module-liga .chart-tab').forEach(b=>b.classList.remove('active'));
            btn.classList.add('active'); updateCurrentChart();
        },
        updateCurrentChart,
        clearChartBtn: () => { clearChart(); document.querySelectorAll('#module-liga .chart-tab').forEach(b=>b.classList.remove('active')); currentChart=''; },
        downloadChartImage: () => {
            if (!chartInstance) { alert('No hay gráfico para descargar.'); return; }
            const date = new Date().toLocaleDateString('es-ES').replace(/\//g,'-');
            const tmp=document.createElement('canvas'); tmp.width=chartInstance.canvas.width; tmp.height=chartInstance.canvas.height;
            const ctx=tmp.getContext('2d'); ctx.fillStyle='#FFFFFF'; ctx.fillRect(0,0,tmp.width,tmp.height); ctx.drawImage(chartInstance.canvas,0,0);
            const a=document.createElement('a'); a.href=tmp.toDataURL('image/png'); a.download=`Grafico_Fantasy_${currentChart}_${date}.png`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
        },
    };
})();

// core.js llama a initLiga() al cargar el módulo
window.initLiga = () => Liga.init();
