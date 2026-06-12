/* ═══════════════════════════════════════════════════════════════
   app.js — Lógica interactiva del Dashboard Financiero
   Proyecto Final — Finanzas Corporativas
   Isaac Cabrera & Javier Sierra
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ─── Datos Históricos ────────────────────────────────────────────
const HIST = {
    years: ['2022', '2023', '2024'],
    financieros: {
        'Ingresos Operacionales':       [3413.80, 3630.91, 3161.20],
        'Costo de Ventas':              [3116.46, 3314.53, 2840.18],
        'Ganancia Bruta':               [297.34,  316.38,  321.02],
        'Gastos Adm.':                  [82.50,   75.60,   69.78],
        'Gastos de Ventas':             [74.00,   66.20,   60.84],
        'EBIT (Gan. Operacional)':      [108.80,  200.02,  189.31],
        'Costos Financieros':           [35.00,   32.00,   29.62],
        'Ganancia Neta':                [61.60,   121.20,  126.15],
        'Total Activos':                [1020.10, 942.80,  998.31],
        'Total Pasivos':                [649.80,  477.06,  442.22],
        'Patrimonio Total':             [370.30,  465.74,  556.09],
        'Activos Corrientes':           [612.06,  565.68,  605.50],
        'Pasivos Corrientes':           [604.31,  469.90,  435.58],
        'Flujo de Caja Operacional':    [68.50,   142.50,  227.01],
    }
};

const RATIOS_LIQ = {
    'Razón Corriente (x)':              [1.01,   1.20,   1.39],
    'Capital de Trabajo (MM COP)':      [7.75,   95.78,  169.92],
    'Endeudamiento Total (%)':          [63.70,  50.60,  44.30],
    'Estructura D/E (x)':              [1.76,   1.02,   0.80],
    'Cobertura Intereses (x)':         [3.11,   6.25,   6.39],
};

const RATIOS_RENT = {
    'Margen Bruto (%)':                [8.71,   8.71,   10.16],
    'Margen EBITDA (%)':               [4.90,   6.27,   6.59],
    'Margen Operacional (%)':          [3.19,   5.51,   5.99],
    'Margen Neto (%)':                 [1.80,   3.34,   3.99],
    'ROA (%)':                         [6.04,   12.85,  12.64],
    'ROE (%)':                         [16.64,  26.03,  22.69],
    'Rotación Activos (x)':            [3.35,   3.85,   3.17],
    'Costo / Ingresos (%)':            [91.29,  91.29,  89.84],
};

const RATIOS_CAJA = {
    'FCO (MM COP)':          { v: [68.50,   142.50,  227.01], note: 'Fuerte recuperación en 2024 (+59.3%)' },
    'FCO / Ingreso (%)':     { v: [2.01,    3.93,    7.18],   note: 'Mejora sostenida en conversión de caja' },
    'FCO / EBIT (x)':        { v: [0.63,    0.71,    1.20],   note: '>1.0x en 2024: caja supera utilidad operativa' },
};

// ─── Parámetros Base (Supuestos Reglamentarios) ──────────────────
const BASE = {
    Rf:       0.045,
    MRP:      0.060,
    CRP:      0.050,
    Beta:     2.00,
    T:        0.35,
    Kd:       0.115,
    g:        0.030,
    growth:   0.060,
    ebitM:    0.060,
    // Estructura de capital 2024
    We:       556.09 / 998.31,
    Wd:       442.22 / 998.31,
    // Datos adicionales
    deudaNeta:  442.22 - 60.55,
    ingBase:    3161.20,
    ktnoBase:   3161.20 * 0.050,
    daP:        0.010,
    capexP:     0.012,
    ktnoP:      0.050,
};

// ─── Estado de la Aplicación ─────────────────────────────────────
const state = {
    Rf:     BASE.Rf,
    MRP:    BASE.MRP,
    CRP:    BASE.CRP,
    Beta:   BASE.Beta,
    T:      BASE.T,
    g:      BASE.g,
    growth: BASE.growth,
};

// ─── Funciones Financieras ────────────────────────────────────────
function computeKe(s) { return s.Rf + s.Beta * s.MRP + s.CRP; }

function computeWACC(s) {
    const Ke = computeKe(s);
    return Ke * BASE.We + BASE.Kd * (1 - s.T) * BASE.Wd;
}

function projectFCFF(growth, ebitM, wacc, periodos = 5) {
    const fcffs = [];
    let ing = BASE.ingBase;
    let ktno = BASE.ktnoBase;
    for (let i = 0; i < periodos; i++) {
        ing *= (1 + growth);
        const ebit  = ing * ebitM;
        const nopat = ebit * (1 - BASE.T);
        const da    = ing * BASE.daP;
        const capex = ing * BASE.capexP;
        const newKtno = ing * BASE.ktnoP;
        const dktno = newKtno - ktno;
        const fcff  = nopat + da - capex - dktno;
        fcffs.push({ ing: ing, ebit: ebit, nopat: nopat, da: da, capex: capex, dktno: dktno, fcff: fcff });
        ktno = newKtno;
    }
    return fcffs;
}

function valueDCF(growth, ebitM, wacc, g) {
    const rows = projectFCFF(growth, ebitM, wacc);
    let sumPV = 0;
    const pvArr = [];
    for (let i = 0; i < rows.length; i++) {
        const pv = rows[i].fcff / Math.pow(1 + wacc, i + 1);
        pvArr.push(pv);
        sumPV += pv;
    }
    const fcffLast = rows[rows.length - 1].fcff;
    const tv    = (fcffLast * (1 + g)) / (wacc - g);
    const pvTv  = tv / Math.pow(1 + wacc, rows.length);
    const ev    = sumPV + pvTv;
    const equity = ev - BASE.deudaNeta;
    return { rows, pvArr, sumPV, tv, pvTv, ev, equity };
}

function fmt(v, dp = 2) { return v.toLocaleString('es-CO', { minimumFractionDigits: dp, maximumFractionDigits: dp }); }
function pct(v, dp = 2) { return (v * 100).toFixed(dp) + '%'; }

// ─── Gráficos ─────────────────────────────────────────────────────
let charts = {};

function makeChart(id, config) {
    if (charts[id]) charts[id].destroy();
    const ctx = document.getElementById(id);
    if (!ctx) return;
    charts[id] = new Chart(ctx, config);
}

function darkDefaults() {
    return {
        plugins: {
            legend: {
                labels: { color: '#94A3B8', font: { family: 'Inter', size: 11 }, boxWidth: 12 }
            },
            tooltip: {
                backgroundColor: '#1E293B', titleColor: '#F1F5F9', bodyColor: '#94A3B8',
                borderColor: 'rgba(59,130,246,0.3)', borderWidth: 1,
                padding: 10, cornerRadius: 8
            }
        },
        scales: {
            x: { ticks: { color: '#94A3B8', font: { family: 'Inter', size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { ticks: { color: '#94A3B8', font: { family: 'Inter', size: 11 } }, grid: { color: 'rgba(255,255,255,0.06)' } }
        },
        animation: { duration: 400, easing: 'easeOutCubic' }
    };
}

// Chart TRM
function renderTRMChart() {
    const trmYears = ['2022', '2023', '2024', '2025F', '2026F', '2027F'];
    const trmData  = [4257.94, 4325.26, 4057.28, 4200, 4350, 4480];
    const ingData  = [3413.80, 3630.91, 3161.20, null, null, null];
    makeChart('trmChart', {
        type: 'line',
        data: {
            labels: trmYears,
            datasets: [
                {
                    label: 'TRM Promedio (COP/USD)',
                    data: trmData,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59,130,246,0.08)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    yAxisID: 'y1'
                },
                {
                    label: 'Ingresos Operacionales (MM COP)',
                    data: ingData,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16,185,129,0)',
                    borderDash: [5,4],
                    tension: 0.3,
                    pointRadius: 5,
                    yAxisID: 'y2'
                }
            ]
        },
        options: {
            ...darkDefaults(),
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(255,255,255,0.04)' } },
                y1: { type: 'linear', position: 'left', ticks: { color: '#3B82F6' }, grid: { color: 'rgba(255,255,255,0.06)' }, title: { display: true, text: 'TRM (COP)', color: '#3B82F6' } },
                y2: { type: 'linear', position: 'right', ticks: { color: '#10B981' }, grid: { drawOnChartArea: false }, title: { display: true, text: 'Ingresos (MM)', color: '#10B981' } }
            }
        }
    });
}

// Chart Benchmark
function renderBenchmarkChart() {
    const peers = ['ITALCOL SA', 'ITALCOL OCC.', 'Solla SA', 'MIZOOCO', 'C. Espartaco'];
    const mOp   = [6.0, 8.3, 7.2, 25.1, 8.2];
    const mNet  = [4.0, 5.4, 5.3, 16.2, 4.9];
    makeChart('benchmarkChart', {
        type: 'bar',
        data: {
            labels: peers,
            datasets: [
                { label: 'Margen Operacional %', data: mOp, backgroundColor: ['rgba(59,130,246,0.8)', 'rgba(71,85,105,0.7)', 'rgba(71,85,105,0.7)', 'rgba(71,85,105,0.7)', 'rgba(71,85,105,0.7)'], borderRadius: 4 },
                { label: 'Margen Neto %', data: mNet, backgroundColor: ['rgba(16,185,129,0.7)', 'rgba(71,85,105,0.5)', 'rgba(71,85,105,0.5)', 'rgba(71,85,105,0.5)', 'rgba(71,85,105,0.5)'], borderRadius: 4 }
            ]
        },
        options: { ...darkDefaults(), barPercentage: 0.65 }
    });
}

// Chart FCF (dinámico)
function renderFCFChart(s) {
    const wacc = computeWACC(s);
    const g    = s.g;
    const rPes = valueDCF(0.020, 0.048, wacc + 0.02, g);
    const rBase= valueDCF(s.growth, 0.060, wacc, g);
    const rOpt = valueDCF(0.090, 0.075, Math.max(wacc - 0.015, 0.08), g);
    const years = [2025, 2026, 2027, 2028, 2029];
    makeChart('fcfChart', {
        type: 'bar',
        data: {
            labels: years,
            datasets: [
                { label: 'Pesimista', data: rPes.rows.map(r => +r.fcff.toFixed(2)), backgroundColor: 'rgba(239,68,68,0.75)', borderRadius: 3 },
                { label: 'Base',      data: rBase.rows.map(r => +r.fcff.toFixed(2)), backgroundColor: 'rgba(59,130,246,0.8)',  borderRadius: 3 },
                { label: 'Optimista', data: rOpt.rows.map(r => +r.fcff.toFixed(2)), backgroundColor: 'rgba(16,185,129,0.75)', borderRadius: 3 },
                { label: 'PV Base',   data: rBase.pvArr.map(v => +v.toFixed(2)), type: 'line', borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0)', tension: 0.4, pointRadius: 5, borderWidth: 2 }
            ]
        },
        options: { ...darkDefaults(), barPercentage: 0.7 }
    });
    return { rPes, rBase, rOpt };
}

// ─── Matrices de Sensibilidad ─────────────────────────────────────
function buildSensMatrix(s) {
    const wacc = computeWACC(s);
    const g    = s.g;
    const waccRange = [-0.03, -0.02, -0.01, 0, 0.01, 0.02, 0.03].map(d => wacc + d);
    const gRange    = [-0.015, -0.010, -0.005, 0, 0.005, 0.010].map(d => Math.max(g + d, 0.005));

    const baseRow = projectFCFF(s.growth, 0.060, wacc);
    const fcffs = baseRow.map(r => r.fcff);

    const header = document.getElementById('sensitivity-header');
    const body   = document.getElementById('sensitivity-body');
    if (!header || !body) return;

    header.innerHTML = '<th>WACC \\ g</th>' + gRange.map(gv => `<th>${(gv*100).toFixed(2)}%</th>`).join('');

    let rows = '';
    waccRange.forEach(wv => {
        if (wv <= g + 0.005) return;
        let cells = `<td><strong>${(wv*100).toFixed(2)}%</strong></td>`;
        gRange.forEach(gv => {
            if (gv >= wv) { cells += '<td>—</td>'; return; }
            let sumPV = 0;
            fcffs.forEach((f, i) => { sumPV += f / Math.pow(1 + wv, i + 1); });
            const tv   = (fcffs[4] * (1 + gv)) / (wv - gv);
            const pvTv = tv / Math.pow(1 + wv, 5);
            const eq   = (sumPV + pvTv) - BASE.deudaNeta;
            const isBase = Math.abs(wv - wacc) < 0.005 && Math.abs(gv - g) < 0.003;
            const maxEq = 1600, minEq = 0;
            const norm = Math.max(0, Math.min(1, (eq - minEq) / (maxEq - minEq)));
            const r = Math.round(239 + (16 - 239) * norm);
            const gb = Math.round(68 + (185 - 68) * norm);
            const b  = Math.round(68 + (129 - 68) * norm);
            cells += `<td class="${isBase ? 'sens-base' : ''}" style="background:rgba(${r},${gb},${b},0.18)">${fmt(eq, 0)}${isBase ? ' ★' : ''}</td>`;
        });
        rows += `<tr>${cells}</tr>`;
    });
    body.innerHTML = rows;
}

// ─── Tablas HTML ──────────────────────────────────────────────────
function buildHistTable() {
    const body = document.getElementById('hist-body');
    if (!body) return;
    const order = ['Ingresos Operacionales','Costo de Ventas','Ganancia Bruta','Gastos Adm.','Gastos de Ventas','EBIT (Gan. Operacional)','Costos Financieros','Ganancia Neta','Total Activos','Total Pasivos','Patrimonio Total','Activos Corrientes','Pasivos Corrientes','Flujo de Caja Operacional'];
    const separators = new Set(['Ganancia Neta', 'Pasivos Corrientes']);
    body.innerHTML = order.map(key => {
        if (!HIST.financieros[key]) return '';
        const [v22, v23, v24] = HIST.financieros[key];
        const change = ((v24 / v23) - 1) * 100;
        const cls = change >= 0 ? 'positive' : 'negative';
        const sep = separators.has(key) ? 'style="border-bottom:2px solid rgba(59,130,246,0.2)"' : '';
        return `<tr ${sep}><td>${key}</td><td class="text-right">${fmt(v22)}</td><td class="text-right">${fmt(v23)}</td><td class="text-right">${fmt(v24)}</td><td class="text-right" style="color:var(--${cls === 'positive' ? 'success' : 'danger'}-color)">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</td></tr>`;
    }).join('');
}

function buildRatiosTables() {
    const bodyLiq = document.getElementById('ratios-liquidez-body');
    if (bodyLiq) {
        bodyLiq.innerHTML = Object.entries(RATIOS_LIQ).map(([k, v]) => {
            return `<tr><td>${k}</td><td class="text-center">${fmt(v[0])}</td><td class="text-center">${fmt(v[1])}</td><td class="text-center">${fmt(v[2])}</td></tr>`;
        }).join('');
    }
    const bodyRent = document.getElementById('ratios-renta-body');
    if (bodyRent) {
        bodyRent.innerHTML = Object.entries(RATIOS_RENT).map(([k, v]) => {
            return `<tr><td>${k}</td><td class="text-center">${fmt(v[0])}</td><td class="text-center">${fmt(v[1])}</td><td class="text-center">${fmt(v[2])}</td></tr>`;
        }).join('');
    }
    const bodyCaja = document.getElementById('ratios-caja-body');
    if (bodyCaja) {
        bodyCaja.innerHTML = Object.entries(RATIOS_CAJA).map(([k, d]) => {
            return `<tr><td>${k}</td><td class="text-center">${fmt(d.v[0])}</td><td class="text-center">${fmt(d.v[1])}</td><td class="text-center">${fmt(d.v[2])}</td><td style="font-size:0.78rem;color:var(--text-muted)">${d.note}</td></tr>`;
        }).join('');
    }
}

function buildProjTable(s) {
    const wacc = computeWACC(s);
    const rows = projectFCFF(s.growth, 0.060, wacc);
    const years = [2025, 2026, 2027, 2028, 2029];
    const labels = ['Ingresos', 'EBIT', 'EBITDA', 'NOPAT', 'DA', 'CAPEX', 'ΔKTNO', 'FCFF'];
    const body = document.getElementById('proj-body');
    if (!body) return;
    body.innerHTML = labels.map(label => {
        const vals = rows.map(r => {
            if (label === 'EBITDA') return r.ebit + r.da;
            return r[label.toLowerCase().replace('δ','d')] ?? r[label] ?? 0;
        });
        const key = label === 'EBITDA' ? null : label.toLowerCase().replace('δ','d');
        const rowVals = rows.map((r, i) => {
            const v = label === 'EBITDA' ? r.ebit + r.da : (r[label] ?? r[label.toLowerCase()] ?? 0);
            return `<td class="text-right">${fmt(v)}</td>`;
        }).join('');
        const isBold = ['Ingresos','FCFF','EBITDA'].includes(label);
        return `<tr${isBold ? ' class="highlight-row"' : ''}><td>${isBold ? '<strong>' + label + '</strong>' : label}</td>${rowVals}</tr>`;
    }).join('');
}

// ─── Función Principal de Actualización ──────────────────────────
function update(s) {
    const Ke   = computeKe(s);
    const wacc = computeWACC(s);
    const g    = s.g;

    // CAPM / WACC displays
    document.getElementById('ke-display').textContent  = pct(Ke);
    document.getElementById('wacc-display').textContent= pct(wacc);
    document.getElementById('kpi-wacc').textContent    = pct(wacc);

    // Valoración base
    const rBase = valueDCF(s.growth, 0.060, wacc, g);
    const rPes  = valueDCF(0.020, 0.048, wacc + 0.02, g);
    const rOpt  = valueDCF(0.090, 0.075, Math.max(wacc - 0.015, 0.08), g);

    document.getElementById('kpi-equity').textContent  = fmt(rBase.equity) + ' MM COP';
    document.getElementById('kpi-ev').textContent      = fmt(rBase.ev) + ' MM COP';

    // Tab Resumen — escenarios
    const safeS = v => (v < 0 ? '<span style="color:var(--danger-color)">' + fmt(v) + '</span>' : fmt(v));
    document.getElementById('s-pes').innerHTML  = safeS(rPes.equity);
    document.getElementById('s-base').innerHTML = fmt(rBase.equity);
    document.getElementById('s-opt').innerHTML  = fmt(rOpt.equity);

    // Tab Valoración
    document.getElementById('param-rf').textContent   = pct(s.Rf);
    document.getElementById('param-mrp').textContent  = pct(s.MRP);
    document.getElementById('param-crp').textContent  = pct(s.CRP);
    document.getElementById('param-beta').textContent = s.Beta.toFixed(2) + 'x';
    document.getElementById('param-g').textContent    = pct(s.g);
    document.getElementById('param-ke').textContent   = pct(Ke);
    document.getElementById('param-wacc').textContent = pct(wacc);

    document.getElementById('val-sum-pv').textContent = fmt(rBase.sumPV) + ' MM COP';
    document.getElementById('val-tv').textContent     = fmt(rBase.tv) + ' MM COP';
    document.getElementById('val-pv-tv').textContent  = fmt(rBase.pvTv) + ' MM COP';
    document.getElementById('val-ev').textContent     = fmt(rBase.ev) + ' MM COP';
    document.getElementById('val-equity').textContent = fmt(rBase.equity) + ' MM COP';
    document.getElementById('wacc-proj-display').textContent = pct(wacc);

    // Tab Sensibilidad — escenarios
    document.getElementById('base-wacc').textContent = pct(wacc);
    document.getElementById('pes-wacc').textContent  = pct(wacc + 0.02);
    document.getElementById('opt-wacc').textContent  = pct(Math.max(wacc - 0.015, 0.08));
    document.getElementById('pes-eq').textContent   = fmt(rPes.equity);
    document.getElementById('base-eq').textContent  = fmt(rBase.equity);
    document.getElementById('opt-eq').textContent   = fmt(rOpt.equity);
    document.getElementById('pes-ev').textContent   = fmt(rPes.ev);
    document.getElementById('base-ev').textContent  = fmt(rBase.ev);
    document.getElementById('opt-ev').textContent   = fmt(rOpt.ev);

    // Tab Conclusión
    const cPes  = document.getElementById('conc-pes');
    const cBase = document.getElementById('conc-base');
    const cOpt  = document.getElementById('conc-opt');
    const cBI   = document.getElementById('conc-base-inline');
    if (cPes)  cPes.textContent  = 'COP ' + fmt(rPes.equity) + ' MM';
    if (cBase) cBase.textContent = 'COP ' + fmt(rBase.equity) + ' MM';
    if (cOpt)  cOpt.textContent  = 'COP ' + fmt(rOpt.equity) + ' MM';
    if (cBI)   cBI.textContent   = 'COP ' + fmt(rBase.equity) + ' MM';

    // Proyecciones table
    buildProjTable(s);

    // FCF Chart
    renderFCFChart(s);

    // Sensibility matrix
    buildSensMatrix(s);
}

// ─── Sliders ──────────────────────────────────────────────────────
function bindSlider(id, key, displayId, fmtFn) {
    const slider = document.getElementById(id);
    const display = document.getElementById(displayId);
    if (!slider || !display) return;
    slider.addEventListener('input', () => {
        const v = parseFloat(slider.value);
        state[key] = (key === 'Beta') ? v : v / 100;
        display.textContent = fmtFn(v);
        update(state);
    });
}

// ─── Tabs ─────────────────────────────────────────────────────────
function initTabs() {
    const btns = document.querySelectorAll('.tab-btn');
    const panes = document.querySelectorAll('.tab-pane');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            btns.forEach(b => b.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const pane = document.getElementById(tab);
            if (pane) {
                pane.classList.add('active');
                // Render charts on visible pane
                if (tab === 'cambiario')    renderTRMChart();
                if (tab === 'benchmark')    renderBenchmarkChart();
            }
        });
    });
}

// ─── Tema Claro/Oscuro ────────────────────────────────────────────
function initThemeToggle() {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    const sun = btn.querySelector('.sun-icon');
    const moon = btn.querySelector('.moon-icon');
    btn.addEventListener('click', () => {
        const isDark = document.body.dataset.theme === 'dark';
        document.body.dataset.theme = isDark ? 'light' : 'dark';
        sun.style.display  = isDark ? 'block' : 'none';
        moon.style.display = isDark ? 'none'  : 'block';
    });
}

// ─── Inicialización ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initThemeToggle();

    bindSlider('rf-slider',     'Rf',     'rf-val',   v => v.toFixed(1) + '%');
    bindSlider('mrp-slider',    'MRP',    'mrp-val',  v => v.toFixed(1) + '%');
    bindSlider('crp-slider',    'CRP',    'crp-val',  v => v.toFixed(1) + '%');
    bindSlider('g-slider',      'g',      'g-val',    v => v.toFixed(1) + '%');
    bindSlider('growth-slider', 'growth', 'growth-val', v => v.toFixed(1) + '%');
    bindSlider('tax-slider',    'T',      'tax-val',  v => v.toFixed(0) + '%');

    // Beta slider (no divide por 100)
    const betaSlider = document.getElementById('beta-slider');
    if (betaSlider) {
        betaSlider.addEventListener('input', () => {
            const v = parseFloat(betaSlider.value);
            state.Beta = v;
            document.getElementById('beta-val').textContent = v.toFixed(2) + 'x';
            update(state);
        });
    }

    // Render static tables
    buildHistTable();
    buildRatiosTables();

    // Initial update
    update(state);

    // Render charts for active tab (resumen)
    // TRM & Benchmark will load when tabs are clicked
});
