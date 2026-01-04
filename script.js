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

    // PEMBERAT KATEGORI UNTUK SUSUNAN (SK -> SJKC -> ... -> KV)
    const CATEGORY_WEIGHTS = {
        "SK": 1,
        "SJKC": 2,
        "SJKT": 3,
        "SR SABK": 4,
        "SMK": 5,
        "SBP": 6,
        "SM SABK": 7,
        "KV": 8
    };

    const getKey = (baseId, year) => `${baseId}${year}`;
    
    // Helper: Dapatkan nilai pemberat, default ke 99 jika tiada dalam senarai
    const getCategoryWeight = (cat) => CATEGORY_WEIGHTS[cat] || 99;

    // --- MAIN FETCH ---
    fetch(DATA_URL)
        .then(response => {
            if (!response.ok) throw new Error("Gagal membaca fail JSON.");
            return response.json();
        })
        .then(data => {
            console.log("Data dimuatkan:", data.length);
            processAnalytics(data);
            setupSearchSystem(data);
        })
        .catch(error => {
            alert("Ralat: " + error.message);
            console.error(error);
        });

    // --- FUNGSI PENGISIHAN UTAMA (SORTING LOGIC) ---
    function sortSchools(schools) {
        return schools.sort((a, b) => {
            // 1. Susun ikut Kategori (Hierarki)
            const weightA = getCategoryWeight(a.kategoriSekolah);
            const weightB = getCategoryWeight(b.kategoriSekolah);
            if (weightA !== weightB) return weightA - weightB;

            // 2. Jika Kategori sama, susun ikut Jumlah Skor (Tertinggi di atas - hanya untuk sekolah aktif)
            if (a.totalScore !== undefined && b.totalScore !== undefined) {
                if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
            }

            // 3. Jika Skor sama, susun ikut Nama Sekolah (A-Z)
            return a.namaSekolah.localeCompare(b.namaSekolah);
        });
    }

    // --- CORE LOGIC ---
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

            // Kira skor untuk setiap tahun
            CONFIG.years.forEach(year => {
                scores[year] = CONFIG.activities.reduce((acc, act) => {
                    return acc + (school[getKey(act.id, year)] ? 1 : 0);
                }, 0);
                totalScore += scores[year];
            });

            // Pengasingan Data (Aktif vs Pasif)
            if (totalScore > 0) {
                stats.active++;
                // Simpan skor dalam objek sekolah untuk pengisihan nanti
                activeSchools.push({ ...school, scores, totalScore });
            } else {
                stats.zero++;
                zeroSchools.push(school); 
            }

            // Agregat Carta
            let parlimen = school.parlimen || "Lain-lain";
            stats.parlimen[parlimen] = (stats.parlimen[parlimen] || 0) + totalScore;

            let cat = school.kategoriSekolah || "Lain-lain";
            stats.kategori[cat] = (stats.kategori[cat] || 0) + totalScore;
        });

        // 1. Update UI Kad
        document.getElementById("totalSchools").innerText = stats.total;
        document.getElementById("activeSchools").innerText = stats.active;
        document.getElementById("zeroSchools").innerText = stats.zero;
        
        // Update badge bilangan
        if(document.getElementById("activeCountBadge")) {
            document.getElementById("activeCountBadge").innerText = `${activeSchools.length} Sekolah Aktif`;
        }

        // 2. Render Carta
        renderCharts(stats);

        // 3. Render Jadual (Gunakan fungsi sortSchools)
        const sortedActiveSchools = sortSchools(activeSchools);
        const sortedZeroSchools = sortSchools(zeroSchools); // Susun zon merah ikut kategori juga

        renderTopSchoolsTable(sortedActiveSchools);
        renderZeroSchoolsTable(sortedZeroSchools);

        // 4. Setup Fungsi Eksport CSV
        setupCsvExport(sortedZeroSchools);
    }

    // --- FUNGSI EKSPORT CSV ---
    function setupCsvExport(data) {
        const btn = document.getElementById("btnExportCsv");
        
        btn.onclick = () => {
            if (data.length === 0) {
                alert("Tiada data untuk dieksport.");
                return;
            }

            // Header CSV
            let csvContent = "Kod Sekolah,Nama Sekolah,Parlimen,Kategori\n";

            // Loop Data
            data.forEach(s => {
                let safeName = `"${s.namaSekolah}"`; 
                csvContent += `${s.kodSekolah},${safeName},${s.parlimen},${s.kategoriSekolah}\n`;
            });

            // Proses Download
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", "Senarai_Sekolah_Perlu_Bimbingan_PPD.csv");
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
    }

    // --- FUNGSI RENDER CARTA ---
    function renderCharts(stats) {
        const ctxParlimen = document.getElementById("parlimenChart");
        if (ctxParlimen) {
            new Chart(ctxParlimen, {
                type: 'bar',
                data: {
                    labels: Object.keys(stats.parlimen),
                    datasets: [{
                        label: 'Jumlah Penyertaan',
                        data: Object.values(stats.parlimen),
                        backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e'],
                    }]
                }
            });
        }

        const ctxCategory = document.getElementById("categoryChart");
        if (ctxCategory) {
            new Chart(ctxCategory, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(stats.kategori),
                    datasets: [{
                        data: Object.values(stats.kategori),
                        backgroundColor: ['#e74a3b', '#f6c23e', '#1cc88a', '#4e73df', '#858796', '#6f42c1', '#20c9a6', '#fd7e14'],
                    }]
                }
            });
        }
    }

    // --- FUNGSI RENDER JADUAL ---
    function renderTopSchoolsTable(schools) {
        const tbody = document.querySelector("#topSchoolsTable tbody");
        if (!tbody) return;
        
        tbody.innerHTML = "";
        
        // Loop semua sekolah aktif (tiada slice)
        schools.forEach((s, index) => {
            let scoreY1 = s.scores[CONFIG.years[0]];
            let scoreY2 = s.scores[CONFIG.years[1]];
            let trendIcon = scoreY2 >= scoreY1 
                ? '<span class="badge bg-success"><i class="fas fa-arrow-up"></i> Kekal/Naik</span>' 
                : '<span class="badge bg-warning text-dark"><i class="fas fa-arrow-down"></i> Menurun</span>';
            
            tbody.innerHTML += `<tr>
                <td class="text-center">${index + 1}</td>
                <td>${s.kodSekolah}</td>
                <td>${s.namaSekolah}</td>
                <td><span class="badge bg-info text-dark">${s.kategoriSekolah}</span></td>
                <td class="text-center">${scoreY1}</td>
                <td class="text-center fw-bold text-primary">${scoreY2}</td>
                <td>${trendIcon}</td>
            </tr>`;
        });
    }

    function renderZeroSchoolsTable(schools) {
        const tbody = document.querySelector("#zeroSchoolsTable tbody");
        if (!tbody) return;

        tbody.innerHTML = "";
        schools.forEach((s, index) => {
            tbody.innerHTML += `<tr>
                <td class="text-center">${index + 1}</td>
                <td>${s.kodSekolah}</td>
                <td>${s.namaSekolah}</td>
                <td>${s.parlimen}</td>
                <td><span class="badge bg-secondary">${s.kategoriSekolah}</span></td>
            </tr>`;
        });
    }

    // --- SISTEM CARIAN & DROPDOWN ---
    function setupSearchSystem(data) {
        const dropdown = document.getElementById("schoolDropdown");
        const searchInput = document.getElementById("searchInput");
        const resultCard = document.getElementById("schoolResultCard");

        // Susun data untuk dropdown menggunakan logik yang sama (Kategori -> Nama)
        const sortedData = sortSchools([...data]); 

        // Isi Dropdown dengan Grouping (Optional tapi lebih kemas jika nak letak optgroup)
        // Di sini kita listkan semua ikut urutan kategori
        sortedData.forEach(s => {
            let option = document.createElement("option");
            option.value = s.kodSekolah;
            // Tambah prefix kategori dalam dropdown untuk memudahkan
            option.text = `[${s.kategoriSekolah}] ${s.namaSekolah}`;
            dropdown.appendChild(option);
        });

        // Event: Dropdown
        dropdown.addEventListener("change", (e) => {
            const school = data.find(s => s.kodSekolah === e.target.value);
            if (school) showSchoolDetails(school);
        });

        // Event: Search Text
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase();
            if (query.length > 2) {
                const school = data.find(s => 
                    s.namaSekolah.toLowerCase().includes(query) || 
                    s.kodSekolah.toLowerCase().includes(query)
                );
                if (school) {
                    dropdown.value = school.kodSekolah;
                    showSchoolDetails(school);
                }
            }
        });

        function showSchoolDetails(school) {
            resultCard.classList.remove("d-none");
            document.getElementById("resultTitle").innerText = `${school.namaSekolah} (${school.kodSekolah})`;

            // Kira Skor
            let currentScores = {};
            CONFIG.years.forEach(year => {
                currentScores[year] = CONFIG.activities.reduce((acc, act) => acc + (school[getKey(act.id, year)] ? 1 : 0), 0);
            });

            // Update UI Skor
            if(document.getElementById("score2024")) document.getElementById("score2024").innerText = currentScores[2024];
            if(document.getElementById("score2025")) document.getElementById("score2025").innerText = currentScores[2025];

            // Senarai Aktiviti
            const listContainer = document.getElementById("activityList");
            listContainer.innerHTML = "";
            let anyParticipation = false;

            CONFIG.activities.forEach(act => {
                let statusHtml = CONFIG.years.map(year => {
                    let joined = school[getKey(act.id, year)];
                    if(joined) anyParticipation = true;
                    return joined 
                        ? `<span class="text-success fw-bold mx-1"><i class="fas fa-check"></i> ${year}</span>`
                        : `<span class="text-muted mx-1" style="opacity:0.5"><i class="fas fa-times"></i> ${year}</span>`;
                }).join(" | ");

                // Papar jika pernah sertai
                if(CONFIG.years.some(year => school[getKey(act.id, year)])) {
                    let li = document.createElement("li");
                    li.className = "list-group-item d-flex justify-content-between align-items-center";
                    li.innerHTML = `<span>${act.label}</span> <div>${statusHtml}</div>`;
                    listContainer.appendChild(li);
                }
            });

            if (!anyParticipation) {
                listContainer.innerHTML = '<li class="list-group-item text-danger text-center"><i class="fas fa-exclamation-circle"></i> Tiada sebarang rekod penyertaan dalam data ini.</li>';
            }
        }
    }
});