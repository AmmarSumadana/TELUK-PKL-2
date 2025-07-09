// Konfigurasi file data
const config = {
    polygon: { path: "data/polygon/", files: [{ name: "pl_ar.json", identitas: "KETERANGAN" }] },
    garis: { path: "data/garis/", files: [{ name: "jaringan_jalan.json" }, { name: "jembatan.json" }, { name: "sungai.json" }] },
    titik: { path: "data/titik/", files: [{ name: "industri.json" }, { name: "masjid.json" }, { name: "pemakaman.json" }, { name: "tempat_menarik.json" }] },
    demografi: { path: "data/demografi.json" }
};

// State management untuk tabel
const tableState = {
    poligon: { data: [], currentPage: 1, rowsPerPage: 5, sortColumn: 'kategori', sortDir: 'asc', columns: { kategori: 'Kategori', luas: 'Total Luas (Hektar)' } },
    garis: { data: [], currentPage: 1, rowsPerPage: 5, sortColumn: 'kategori', sortDir: 'asc', columns: { kategori: 'Kategori', panjang: 'Total Panjang (km)' } },
    titik: { data: [], currentPage: 1, rowsPerPage: 5, sortColumn: 'kategori', sortDir: 'asc', columns: { kategori: 'Kategori', jumlah: 'Jumlah' } }
};

// --- Helper & Fungsi Rendering Tabel (Tidak ada perubahan) ---
const formatLabel = (fileName) => fileName.replace('.json', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
const formatNumber = (num, decimals = 2) => num.toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
function renderTable(tableId) {
    const state = tableState[tableId];
    const tableBody = document.getElementById(`stats-${tableId}`);
    const paginationContainer = document.getElementById(`pagination-${tableId}`);
    if (!state || state.data.length === 0) { tableBody.innerHTML = `<tr><td colspan="${Object.keys(state.columns).length}" class="text-center">Tidak ada data.</td></tr>`; paginationContainer.innerHTML = ''; return; }
    const sortedData = [...state.data].sort((a, b) => { const valA = a[state.sortColumn]; const valB = b[state.sortColumn]; if (valA < valB) return state.sortDir === 'asc' ? -1 : 1; if (valA > valB) return state.sortDir === 'asc' ? 1 : -1; return 0; });
    const startIndex = (state.currentPage - 1) * state.rowsPerPage;
    const paginatedData = sortedData.slice(startIndex, startIndex + state.rowsPerPage);
    tableBody.innerHTML = paginatedData.map(row => `<tr>${Object.keys(state.columns).map(colKey => `<td>${typeof row[colKey] === 'number' ? formatNumber(row[colKey]) : row[colKey]}</td>`).join('')}</tr>`).join('');
    renderPagination(tableId, sortedData.length);
    updateSortIcons(tableId);
}
function renderPagination(tableId, totalRows) {
    const state = tableState[tableId];
    const paginationContainer = document.getElementById(`pagination-${tableId}`);
    const totalPages = Math.ceil(totalRows / state.rowsPerPage);
    if (totalPages <= 1) { paginationContainer.innerHTML = ''; return; }
    let paginationHTML = '<ul class="pagination pagination-sm">';
    paginationHTML += `<li class="page-item ${state.currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${state.currentPage - 1}">‹</a></li>`;
    for (let i = 1; i <= totalPages; i++) { paginationHTML += `<li class="page-item ${state.currentPage === i ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`; }
    paginationHTML += `<li class="page-item ${state.currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${state.currentPage + 1}">›</a></li>`;
    paginationHTML += '</ul>';
    paginationContainer.innerHTML = paginationHTML;
    paginationContainer.querySelectorAll('.page-link').forEach(link => { link.addEventListener('click', (e) => { e.preventDefault(); const page = parseInt(e.target.dataset.page); if (page && page !== state.currentPage) { state.currentPage = page; renderTable(tableId); } }); });
}
function updateSortIcons(tableId) {
    const state = tableState[tableId];
    document.getElementById(`header-${tableId}`).querySelectorAll('th').forEach(th => { th.querySelector('.sort-icon').innerHTML = (th.dataset.sort === state.sortColumn) ? (state.sortDir === 'asc' ? '▲' : '▼') : ''; });
}
function setupEventListeners() {
    Object.keys(tableState).forEach(tableId => {
        document.getElementById(`header-${tableId}`).querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const state = tableState[tableId];
                const sortKey = th.dataset.sort;
                state.sortDir = (state.sortColumn === sortKey && state.sortDir === 'asc') ? 'desc' : 'asc';
                state.sortColumn = sortKey;
                state.currentPage = 1;
                renderTable(tableId);
            });
        });
    });
}

// --- Fungsi Utama (Stabil & Bersih) ---
async function main() {
    Object.keys(tableState).forEach(id => {
        const tableBody = document.getElementById(`stats-${id}`);
        if (tableBody) {
             tableBody.innerHTML = `<tr><td colspan="${Object.keys(tableState[id].columns).length}" class="text-center"><div class="spinner-border spinner-border-sm"></div> Memuat...</td></tr>`;
        }
    });

    try {
        for (const fileObj of config.titik.files) {
            const res = await fetch(config.titik.path + fileObj.name);
            if (!res.ok) throw new Error(`Gagal memuat ${fileObj.name}`);
            const data = await res.json();
            tableState.titik.data.push({ kategori: formatLabel(fileObj.name), jumlah: data.features.length });
        }
        for (const fileObj of config.garis.files) {
            const res = await fetch(config.garis.path + fileObj.name);
            if (!res.ok) throw new Error(`Gagal memuat ${fileObj.name}`);
            const data = await res.json();
            tableState.garis.data.push({ kategori: formatLabel(fileObj.name), panjang: data.features.reduce((sum, feat) => sum + turf.length(feat, { units: 'kilometers' }), 0) });
        }
        const plArFile = config.polygon.files[0];
        const resPolygon = await fetch(config.polygon.path + plArFile.name);
        if (!resPolygon.ok) throw new Error(`Gagal memuat ${plArFile.name}`);
        const dataPolygon = await resPolygon.json();
        const polygonAggregates = dataPolygon.features.reduce((acc, feature) => {
            const category = feature.properties[plArFile.identitas] || 'Tidak Diketahui';
            acc[category] = (acc[category] || 0) + (turf.area(feature) / 10000);
            return acc;
        }, {});
        tableState.poligon.data = Object.entries(polygonAggregates).map(([k, v]) => ({ kategori: k, luas: v }));
        const resDemog = await fetch(config.demografi.path);
        if (!resDemog.ok) throw new Error(`Gagal memuat demografi.json`);
        const demoData = await resDemog.json();
        
        // Mengisi kartu ringkasan demografi
        const { total_penduduk, jumlah_kk, laki_laki, perempuan } = demoData.ringkasan;
        document.getElementById('total-penduduk').textContent = total_penduduk.toLocaleString('id-ID');
        document.getElementById('jumlah-kk').textContent = jumlah_kk.toLocaleString('id-ID');
        document.getElementById('rasio-gender').textContent = ((laki_laki / perempuan) * 100).toFixed(1);

        Object.keys(tableState).forEach(id => renderTable(id));
        setupEventListeners();
        const pointStats = tableState.titik.data.reduce((acc, curr) => ({ ...acc, [curr.kategori]: curr.jumlah }), {});
        renderCharts(polygonAggregates, pointStats, demoData);
    
    } catch (error) {
        console.error("Kesalahan fatal saat memuat data:", error);
        Object.keys(tableState).forEach(id => {
            const tableBody = document.getElementById(`stats-${id}`);
            if(tableBody) {
                tableBody.innerHTML = `<tr><td colspan="${Object.keys(tableState[id].columns).length}" class="text-danger text-center"><strong>Gagal Memuat Data.</strong><br><small>${error.message}</small></td></tr>`;
            }
        });
    }
}

// --- Fungsi Render Grafik ---
function renderCharts(polygonStats, pointStats, demografiData) {
    if(window.myCharts) { Object.values(window.myCharts).forEach(chart => chart.destroy()); }
    window.myCharts = {};
    const chartColors = ['#4a90e2', '#50e3c2', '#f5a623', '#f8e71c', '#bd10e0', '#9013fe', '#417505', '#d0021b', '#b8e986', '#7ed321', '#c4a0d4', '#bec0c0'];
    window.myCharts.penggunaanLahan = new Chart(document.getElementById('penggunaanLahanChart').getContext('2d'), { type: 'pie', data: { labels: Object.keys(polygonStats), datasets: [{ data: Object.values(polygonStats), backgroundColor: chartColors, borderColor: '#fff', borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } } });
    window.myCharts.fasilitas = new Chart(document.getElementById('fasilitasChart').getContext('2d'), { type: 'bar', data: { labels: Object.keys(pointStats), datasets: [{ label: 'Jumlah Unit', data: Object.values(pointStats), backgroundColor: '#4a90e2' }] }, options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } } });
    window.myCharts.piramida = new Chart(document.getElementById('piramidaPendudukChart').getContext('2d'), { type: 'bar', data: { labels: demografiData.piramida.map(d => d.kelompok_usia), datasets: [{ label: 'Laki-laki', data: demografiData.piramida.map(d => -d.laki_laki), backgroundColor: 'rgba(74, 144, 226, 0.8)' }, { label: 'Perempuan', data: demografiData.piramida.map(d => d.perempuan), backgroundColor: 'rgba(245, 166, 35, 0.8)' }] }, options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { y: { stacked: true }, x: { stacked: true, ticks: { callback: value => Math.abs(value) } } }, plugins: { tooltip: { callbacks: { label: context => `${context.dataset.label}: ${Math.abs(context.raw)}` } } } } });
    window.myCharts.pendidikan = new Chart(document.getElementById('pendidikanChart').getContext('2d'), { type: 'doughnut', data: { labels: Object.keys(demografiData.pendidikan), datasets: [{ data: Object.values(demografiData.pendidikan), backgroundColor: chartColors.slice(0, 5), borderColor: '#fff', borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } });
}

document.addEventListener('DOMContentLoaded', main);