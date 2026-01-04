document.addEventListener("DOMContentLoaded", function () {
    const DATA_URL = "data.json";

    // --- CONFIGURATION ZONE ---
    const CONFIG = {
        years: [2024, 2025],
        activities: [
            { id: "digitalStoryTellingAnimation", label: "Digital Storytelling Animation" },
            { id: "myRoboticChallengeRekaedukit", label: "Robotik: Reka Edukit" },
            { id: "myRoboticChallengeMikrobotik", label: "Robotik: Mikrobotik" },
            { id: "myRoboticChallengeAiRobotik", label: "Robotik: AI Robotik" },
            { id: "myCyberHero", label: "My Cyber Hero" },
            { id: "minecraftEducationChallenge", label: "Minecraft Education Challenge" },
            { id: "droneEduchallengeIR40", label: "Drone Edu Challenge IR4.0" },
            { id: "cabaranKeselamatanSiberNasional", label: "Cabaran Keselamatan Siber Nasional" },
            { id: "pertandinganPembangunanAplikasiAndroid", label: "Pembangunan Aplikasi Android" }
        ]
    };

    // URUTAN KATEGORI YANG DIKEHENDAKI (STRICT ORDER)
    const CATEGORY_ORDER = ["SK", "SJKC", "SJKT", "SR SABK", "SMK", "SBP", "SM SABK", "KV"];

    // Helper: Dapatkan indeks kategori (0-7), jika tiada pulangkan 99 (paling bawah)
    const getCategoryRank = (cat) => {
        if (!cat) return 99;
        // Pastikan tiada whitespace dan uppercase untuk comparison
        const cleanCat = cat.trim().toUpperCase(); 
        const index = CATEGORY_ORDER.indexOf(cleanCat);
        return index === -1 ? 99 : index;
    };

    const getKey = (baseId, year) => `${baseId}${year}`;

    // --- MAIN FETCH ---
    fetch(DATA_URL)
        .then(response => {
            if (!response.ok) throw new Error("Gagal membaca fail JSON.");
            return response.json();
        })
        .then(data => {
            processAnalytics(data);
        })
        .catch(error => {
            console.error("Critical Error:", error);
            alert("Ralat sistem: " + error.message);
        });

    // --- LOGIC UTAMA ---
    function processAnalytics(data) {
        let stats = {
            total: data.length,
            active: 0,
            zero: 0,
            parlimen: {},
            kategori: {}
        };

        let activeSchools = [];
        let zeroSchools = [];

        data.forEach(school => {
            let scores = {};
            let totalScore = 0;

            CONFIG.years.forEach(year => {
                scores[year] = CONFIG.activities.reduce((acc, act) => {
                    return acc + (school[getKey(act.id, year)] ? 1 : 0);
                }, 0);
                totalScore += scores[year];
            });

            // Assign score calculation to school object properly
            school.computedScores = scores;
            school.computedTotal = totalScore;

            // Sort Category Data for Charts
            let p = school.parlimen || "Lain-lain";
            stats.parlimen[p] = (stats.parlimen[p] || 0) + totalScore;
            
            let c = school.kategoriSekolah || "Lain-lain";
            stats.kategori[c] = (stats.kategori[c] || 0) + totalScore;

            // Separate Active vs Zero
            if (totalScore > 0) {
                stats.active++;
                activeSchools.push(school);
            } else {
                stats.zero++;
                zeroSchools.push(school);
            }
        });

        // 1. Update UI Counts
        updateDashboardCounts(stats);

        // 2. Sorting Function (The Logic Engine)
        const masterSort = (a, b) => {
            // Priority 1: Category Order
            const rankA = getCategoryRank(a.kategoriSekolah);
            const rankB = getCategoryRank(b.kategoriSekolah);
            if (rankA !== rankB) return rankA - rankB;

            // Priority 2: Total Score (High to Low) - Only for Active List
            if (a.computedTotal !== undefined && b.computedTotal !== undefined) {
                if (b.computedTotal !== a.computedTotal) return b.computedTotal - a.computedTotal;
            }

            // Priority 3: Name (A-Z)
            return a.namaSekolah.localeCompare(b.namaSekolah);
        };

        // Apply Sorting
        activeSchools.sort(masterSort);
        zeroSchools.sort(masterSort);

        // 3. Render Tables
        renderTable("topSchoolsTable", activeSchools, true);
        renderTable("zeroSchoolsTable", zeroSchools, false);

        // 4. Render Charts
        renderCharts(stats);

        // 5. Setup Search System (Dropdown also uses Master Sort)
        setupSearchSystem(data, masterSort);

        // 6. Setup CSV Export
        setupCsvExport(zeroSchools);
    }

    // --- UI UPDATER FUNCTIONS ---
    function updateDashboardCounts(stats) {
        document.getElementById("totalSchools").innerText = stats.total;
        document.getElementById("activeSchools").innerText = stats.active;
        document.getElementById("zeroSchools").innerText = stats.zero;
        
        // Update Badge on Table Header
        const badge = document.getElementById("activeCountBadge");
        if(badge) badge.innerText = `${stats.active} Sekolah`;
    }

    // --- TABLE RENDERER (Unified) ---
    function renderTable(tableId, data, isActiveTable) {
        const tbody = document.querySelector(`#${tableId} tbody`);
        if (!tbody) return;

        let htmlContent = "";

        data.forEach((s, index) => {
            // Generate row number
            let bil = index + 1;

            if (isActiveTable) {
                let s24 = s.computedScores[2024];
                let s25 = s.computedScores[2025];
                
                // Trend Logic
                let trendBadge = "";
                if (s25 > s24) trendBadge = '<span class="badge bg-success"><i class="fas fa-arrow-up"></i> Meningkat</span>';
                else if (s25 === s24 && s25 > 0) trendBadge = '<span class="badge bg-primary"><i class="fas fa-minus"></i> Kekal</span>';
                else if (s25 < s24) trendBadge = '<span class="badge bg-warning text-dark"><i class="fas fa-arrow-down"></i> Menurun</span>';
                else trendBadge = '<span class="badge bg-secondary">Tiada</span>';

                htmlContent += `
                <tr>
                    <td class="text-center fw-bold">${bil}</td>
                    <td>${s.kodSekolah}</td>
                    <td>${s.namaSekolah}</td>
                    <td class="text-center"><span class="badge bg-info text-dark border border-dark status-badge">${s.kategoriSekolah}</span></td>
                    <td class="text-center">${s24}</td>
                    <td class="text-center fw-bold text-primary">${s25}</td>
                    <td class="text-center">${trendBadge}</td>
                </tr>`;
            } else {
                // Zero Schools Table
                htmlContent += `
                <tr>
                    <td class="text-center text-muted">${bil}</td>
                    <td>${s.kodSekolah}</td>
                    <td>${s.namaSekolah}</td>
                    <td>${s.parlimen}</td>
                    <td class="text-center"><span class="badge bg-secondary status-badge">${s.kategoriSekolah}</span></td>
                </tr>`;
            }
        });

        tbody.innerHTML = htmlContent;
    }

    // --- CHARTS ---
    function renderCharts(stats) {
        const ctxP = document.getElementById("parlimenChart");
        const ctxC = document.getElementById("categoryChart");
        
        // Destroy existing charts to prevent "Canvas is already in use" error
        if (Chart.getChart("parlimenChart")) Chart.getChart("parlimenChart").destroy();
        if (Chart.getChart("categoryChart")) Chart.getChart("categoryChart").destroy();

        if (ctxP) {
            new Chart(ctxP, {
                type: 'bar',
                data: {
                    labels: Object.keys(stats.parlimen),
                    datasets: [{
                        label: 'Skor Penglibatan',
                        data: Object.values(stats.parlimen),
                        backgroundColor: '#4e73df'
                    }]
                }
            });
        }
        if (ctxC) {
            new Chart(ctxC, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(stats.kategori),
                    datasets: [{
                        data: Object.values(stats.kategori),
                        backgroundColor: ['#e74a3b', '#f6c23e', '#1cc88a', '#4e73df', '#858796', '#6f42c1', '#20c9a6', '#5a5c69']
                    }]
                }
            });
        }
    }

    // --- SEARCH SYSTEM ---
    function setupSearchSystem(data, sortFunc) {
        const dropdown = document.getElementById("schoolDropdown");
        const searchInput = document.getElementById("searchInput");
        const resultCard = document.getElementById("schoolResultCard");

        // Prepare Dropdown Data (Sorted Copy)
        let sortedData = [...data].sort(sortFunc);

        // Reset Dropdown
        dropdown.innerHTML = '<option value="">Pilih Sekolah...</option>';
        sortedData.forEach(s => {
            let opt = document.createElement("option");
            opt.value = s.kodSekolah;
            opt.text = `[${s.kategoriSekolah}] ${s.namaSekolah}`;
            dropdown.appendChild(opt);
        });

        // Event: Dropdown Selection
        dropdown.addEventListener("change", (e) => {
            const val = e.target.value;
            if(!val) {
                resultCard.classList.add("d-none");
                return;
            }
            const found = data.find(s => s.kodSekolah === val);
            if(found) displaySchoolDetail(found);
        });

        // Event: Typing Search
        searchInput.addEventListener("input", (e) => {
            const txt = e.target.value.toLowerCase();
            if(txt.length > 2) {
                const found = data.find(s => s.namaSekolah.toLowerCase().includes(txt) || s.kodSekolah.toLowerCase().includes(txt));
                if(found) {
                    dropdown.value = found.kodSekolah;
                    displaySchoolDetail(found);
                    resultCard.classList.remove("d-none");
                }
            } else if (txt.length === 0) {
                 resultCard.classList.add("d-none");
            }
        });

        function displaySchoolDetail(s) {
            resultCard.classList.remove("d-none");
            document.getElementById("resultTitle").innerText = s.namaSekolah;
            document.getElementById("resultCode").innerText = s.kodSekolah;
            
            // Recalculate explicitly for fresh display
            let s24 = 0, s25 = 0;
            const list = document.getElementById("activityList");
            list.innerHTML = "";

            let hasActivity = false;

            CONFIG.activities.forEach(act => {
                let joined24 = s[getKey(act.id, 2024)];
                let joined25 = s[getKey(act.id, 2025)];
                
                if(joined24) s24++;
                if(joined25) s25++;

                if(joined24 || joined25) {
                    hasActivity = true;
                    // Icon logic
                    let icon24 = joined24 ? `<span class="badge bg-success me-1">2024</span>` : `<span class="badge bg-light text-muted border me-1">2024</span>`;
                    let icon25 = joined25 ? `<span class="badge bg-primary me-1">2025</span>` : `<span class="badge bg-light text-muted border me-1">2025</span>`;
                    
                    let item = `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <span>${act.label}</span>
                        <div>${icon24}${icon25}</div>
                    </li>`;
                    list.innerHTML += item;
                }
            });

            document.getElementById("score2024").innerText = s24;
            document.getElementById("score2025").innerText = s25;

            if(!hasActivity) {
                list.innerHTML = `<li class="list-group-item text-danger text-center">Tiada rekod penyertaan dalam sistem.</li>`;
            }
        }
    }

    // --- EXPORT CSV ---
    function setupCsvExport(data) {
        const btn = document.getElementById("btnExportCsv");
        if(!btn) return;
        btn.onclick = () => {
            if(data.length === 0) { alert("Tiada data!"); return; }
            let csv = "Bil,Kod Sekolah,Nama Sekolah,Kategori,Parlimen\n";
            data.forEach((s, i) => {
                let name = `"${s.namaSekolah}"`;
                csv += `${i+1},${s.kodSekolah},${name},${s.kategoriSekolah},${s.parlimen}\n`;
            });
            const blob = new Blob([csv], {type: "text/csv;charset=utf-8"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "Senarai_Zon_Merah.csv";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
    }
});