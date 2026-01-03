let allData = [];
let trendChartInstance = null;
let parlimenChartInstance = null;

const colors = {
    blue: 'rgba(59, 130, 246, 0.8)',
    red: 'rgba(239, 68, 68, 0.8)',
    green: 'rgba(16, 185, 129, 0.8)',
    purple: 'rgba(139, 92, 246, 0.8)',
    orange: 'rgba(245, 158, 11, 0.8)'
};

// --- FUNGSI UTAMA: BACA & PROSES CSV ---
// Pastikan nama fail CSV anda ialah 'data.csv'
fetch('data.csv')
    .then(response => response.text())
    .then(csvText => {
        allData = processStackedCSV(csvText);
        console.log(`Data berjaya dimuatkan: ${allData.length} rekod.`);
        initApp();
    })
    .catch(err => console.error("Gagal membaca fail CSV. Pastikan nama fail ialah 'data.csv'", err));

function processStackedCSV(text) {
    const lines = text.split('\n');
    const records = [];
    let currentCompetition = "Tiada Nama";
    let headers = [];
    let isHeaderNext = false;

    lines.forEach(line => {
        const cleanLine = line.trim();
        if (!cleanLine) return;

        // 1. Kesan Nama Pertandingan
        if (cleanLine.startsWith("NAMA PERTANDINGAN")) {
            const parts = cleanLine.split(':');
            if (parts.length > 1) {
                // Buang koma berlebihan di hujung nama
                currentCompetition = parts[1].replace(/,/g, '').trim();
            }
            return;
        }

        // 2. Kesan Header Column
        if (cleanLine.startsWith("KOD SEKOLAH")) {
            headers = cleanLine.split(',').map(h => h.trim());
            return;
        }

        // 3. Proses Data Row
        if (headers.length > 0 && currentCompetition) {
            const values = cleanLine.split(',');
            
            // Validasi asas (abaikan baris header yang berulang)
            if (values[0] === 'KOD SEKOLAH') return;

            // Pastikan baris ada data yang cukup
            if (values.length >= headers.length) {
                let record = {};
                let isValid = false;

                headers.forEach((header, index) => {
                    // Bersihkan data (buang \r, whitespace)
                    let val = values[index] ? values[index].trim() : "";
                    record[header] = val;
                });

                // Pastikan rekod sah (ada kod sekolah)
                if (record['KOD SEKOLAH'] && record['KOD SEKOLAH'].length > 2) {
                    // Tambah medan 'NAMA_PERTANDINGAN'
                    record['NAMA_PERTANDINGAN'] = currentCompetition;

                    // Bersihkan Status 2024/2025 (Standardize ADA/TIADA)
                    record['2024'] = record['2024'].toUpperCase().includes('ADA') ? 'ADA' : 'TIADA';
                    record['2025'] = record['2025'].toUpperCase().includes('ADA') ? 'ADA' : 'TIADA';

                    records.push(record);
                }
            }
        }
    });
    return records;
}
// --- TAMAT FUNGSI CSV ---

function initApp() {
    // Populate Dropdown
    // Dapatkan senarai pertandingan unik
    const competitions = [...new Set(allData.map(d => d.NAMA_PERTANDINGAN))].sort();
    const select = document.getElementById('compSelect');
    
    select.innerHTML = ''; // Reset
    competitions.forEach(comp => {
        const option = document.createElement('option');
        option.value = comp;
        option.textContent = comp;
        select.appendChild(option);
    });

    // Default Selection & Listeners
    if (competitions.length > 0) updateDashboard(competitions[0]);
    select.addEventListener('change', (e) => updateDashboard(e.target.value));
    
    // Carian Sekolah
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
}

function updateDashboard(compName) {
    const dataset = allData.filter(d => d.NAMA_PERTANDINGAN === compName);
    
    // Kira Statistik
    const ada2024 = dataset.filter(d => d['2024'] === 'ADA').length;
    const ada2025 = dataset.filter(d => d['2025'] === 'ADA').length;
    
    // Logik Konsisten: Mesti ADA 2024 & ADA 2025
    const kekalList = dataset.filter(d => d['2024'] === 'ADA' && d['2025'] === 'ADA');
    
    const cicir = dataset.filter(d => d['2024'] === 'ADA' && d['2025'] === 'TIADA').length;
    const baru = dataset.filter(d => d['2024'] === 'TIADA' && d['2025'] === 'ADA').length;

    // Update DOM KPI
    document.getElementById('kpi-total').textContent = ada2025;
    document.getElementById('kpi-kekal').textContent = kekalList.length;
    document.getElementById('kpi-cicir').textContent = cicir;
    document.getElementById('kpi-baru').textContent = baru;

    // Kira % Pertumbuhan
    let growth = 0;
    if(ada2024 > 0) growth = ((ada2025 - ada2024) / ada2024) * 100;
    const growthEl = document.getElementById('kpi-growth');
    growthEl.textContent = `${growth > 0 ? '+' : ''}${growth.toFixed(1)}% berbanding 2024`;
    growthEl.className = `text-sm mt-2 font-medium ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`;

    updateCharts(ada2024, ada2025, dataset);
    updateConsistentList(kekalList);
}

function updateCharts(count24, count25, dataset) {
    const ctxTrend = document.getElementById('trendChart').getContext('2d');
    const ctxParlimen = document.getElementById('parlimenChart').getContext('2d');

    // Chart 1: Trend
    if (trendChartInstance) trendChartInstance.destroy();
    trendChartInstance = new Chart(ctxTrend, {
        type: 'bar',
        data: {
            labels: ['2024', '2025'],
            datasets: [{
                label: 'Jumlah Sekolah',
                data: [count24, count25],
                backgroundColor: [colors.blue, colors.green],
                borderRadius: 6,
                barThickness: 50
            }]
        },
        options: { 
            plugins: { legend: { display: false } }, 
            scales: { y: { beginAtZero: true, grid: { display: true, drawBorder: false } } },
            maintainAspectRatio: false
        }
    });

    // Chart 2: Parlimen (Hanya sekolah yang sertai 2025)
    const parlimenCounts = {};
    dataset.filter(d => d['2025'] === 'ADA').forEach(d => {
        let p = d['PARLIMEN'] ? d['PARLIMEN'].trim() : 'LAIN-LAIN';
        if(p === "") p = "TIDAK DINYATAKAN";
        parlimenCounts[p] = (parlimenCounts[p] || 0) + 1;
    });

    if (parlimenChartInstance) parlimenChartInstance.destroy();
    parlimenChartInstance = new Chart(ctxParlimen, {
        type: 'doughnut',
        data: {
            labels: Object.keys(parlimenCounts),
            datasets: [{
                data: Object.values(parlimenCounts),
                backgroundColor: [colors.blue, colors.red, colors.green, colors.purple, colors.orange],
                borderWidth: 0
            }]
        },
        options: {
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } }
        }
    });
}

function updateConsistentList(schoolList) {
    const tbody = document.getElementById('consistentListBody');
    tbody.innerHTML = '';
    
    // Sort ikut nama sekolah
    schoolList.sort((a, b) => a['NAMA SEKOLAH'].localeCompare(b['NAMA SEKOLAH']));

    schoolList.forEach(s => {
        const row = `<tr class="border-b hover:bg-gray-50 transition">
            <td class="p-3 font-medium text-gray-800 text-xs md:text-sm">${s['NAMA SEKOLAH']}</td>
            <td class="p-3 text-gray-500 text-xs">${s['PARLIMEN']}</td>
            <td class="p-3 text-center"><span class="badge-ada text-xs">Kekal</span></td>
        </tr>`;
        tbody.innerHTML += row;
    });
}

function toggleConsistentList() {
    const list = document.getElementById('consistentListContainer');
    list.classList.toggle('hidden');
}

// --- FUNGSI CARIAN & PROFIL ---
function handleSearch(query) {
    const suggestionsBox = document.getElementById('searchSuggestions');
    suggestionsBox.innerHTML = '';
    suggestionsBox.classList.add('hidden');
    document.getElementById('schoolProfile').classList.add('hidden');

    if (!query || query.length < 2) return;

    query = query.toUpperCase();
    
    // Cari sekolah yang padan
    const matches = allData.filter(d => 
        (d['NAMA SEKOLAH'] && d['NAMA SEKOLAH'].includes(query)) || 
        (d['KOD SEKOLAH'] && d['KOD SEKOLAH'].includes(query))
    );
    
    // Dapatkan senarai unik kod sekolah
    const uniqueCodes = [...new Set(matches.map(s => s['KOD SEKOLAH']))].slice(0, 10);

    if (uniqueCodes.length > 0) {
        suggestionsBox.classList.remove('hidden');
        uniqueCodes.forEach(code => {
            const school = matches.find(s => s['KOD SEKOLAH'] === code);
            const div = document.createElement('div');
            div.className = 'p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 transition';
            div.innerHTML = `<div class="font-bold text-gray-800 text-sm">${school['NAMA SEKOLAH']}</div>
                             <div class="text-xs text-gray-500">${school['KOD SEKOLAH']} • ${school['PARLIMEN']}</div>`;
            div.onclick = () => showSchoolProfile(code);
            suggestionsBox.appendChild(div);
        });
    }
}

function showSchoolProfile(schoolCode) {
    document.getElementById('searchSuggestions').classList.add('hidden');
    
    // Ambil semua rekod pertandingan untuk sekolah ini
    const records = allData.filter(d => d['KOD SEKOLAH'] === schoolCode);
    if(records.length === 0) return;

    const info = records[0]; // Ambil maklumat asas dari rekod pertama

    // Isi Info Header
    document.getElementById('profileName').textContent = info['NAMA SEKOLAH'];
    document.getElementById('profileCode').textContent = info['KOD SEKOLAH'];
    document.getElementById('profileCategory').textContent = info['KATEGORI SEKOLAH'];
    document.getElementById('profileParlimen').textContent = info['PARLIMEN'];

    // Isi Jadual Sejarah
    const tbody = document.getElementById('schoolHistoryBody');
    tbody.innerHTML = '';

    records.forEach(rec => {
        let status24 = rec['2024'] === 'ADA';
        let status25 = rec['2025'] === 'ADA';
        
        let trendHTML = '';
        if(status24 && status25) trendHTML = '<span class="text-green-600 font-bold text-xs">⭐ Kekal</span>';
        else if(!status24 && status25) trendHTML = '<span class="text-blue-600 font-bold text-xs">📈 Baru</span>';
        else if(status24 && !status25) trendHTML = '<span class="text-red-600 font-bold text-xs">📉 Cicir</span>';
        else trendHTML = '<span class="text-gray-400 text-xs">-</span>';

        const row = `<tr class="border-b">
            <td class="p-3 font-medium text-sm text-gray-700">${rec['NAMA_PERTANDINGAN']}</td>
            <td class="p-3 text-center text-xs">${status24 ? '<span class="badge-ada">ADA</span>' : '<span class="badge-tiada">TIADA</span>'}</td>
            <td class="p-3 text-center text-xs">${status25 ? '<span class="badge-ada">ADA</span>' : '<span class="badge-tiada">TIADA</span>'}</td>
            <td class="p-3 text-center">${trendHTML}</td>
        </tr>`;
        tbody.innerHTML += row;
    });

    document.getElementById('schoolProfile').classList.remove('hidden');
}