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

    // Susunan Kategori Standard (Dikongsi antara filter dan carian)
    const categoryOrder = ["SK", "SJKC", "SJKT", "SR SABK", "SMK", "SBP", "KV", "SM SABK"];

    const getKey = (baseId, year) => `${baseId}${year}`;

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

    // --- CORE LOGIC ---
    function processAnalytics(data) {
        let stats = {
            total: data.length,
            active: 0,
            zero: 0,
            parlimen: {},
            kategori: {}
        };

        let topSchools = [];
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
                topSchools.push({ ...school, scores, totalScore });
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

        // 2. Render Carta
        renderCharts(stats);

        // 3. Render Jadual (Sort by 2025 High to Low)
        topSchools.sort((a, b) => b.scores[2025] - a.scores[2025]);
        
        // Initial Render (Semua Kategori)
        renderTopSchoolsTable(topSchools);
        renderZeroSchoolsTable(zeroSchools);

        // 4. Setup Filter Kategori
        setupCategoryFilter(topSchools);

        // 5. Setup Fungsi Eksport CSV
        setupCsvExport(zeroSchools);
    }

    // --- FUNGSI FILTER KATEGORI (NEW) ---
    function setupCategoryFilter(allSchools) {
        const filterDropdown = document.getElementById("categoryFilter");
        if(!filterDropdown) return;

        // Populate options based on categoryOrder
        categoryOrder.forEach(cat => {
            let label = cat === "SJKC" ? "SJK (Cina)" : cat;
            let option = document.createElement("option");
            option.value = cat;
            option.text = label;
            filterDropdown.appendChild(option);
        });

        // Add 'Lain-lain' if exists in data but not in standard list
        // (Optional, for robustness)

        filterDropdown.addEventListener("change", (e) => {
            const selectedCat = e.target.value;
            let filteredList;

            if (selectedCat === "all") {
                filteredList = allSchools;
            } else {
                filteredList = allSchools.filter(s => s.kategoriSekolah === selectedCat);
            }

            renderTopSchoolsTable(filteredList);
        });
    }

    // --- FUNGSI EKSPORT CSV ---
    function setupCsvExport(data) {
        const btn = document.getElementById("btnExportCsv");
        
        btn.onclick = () => {
            if (data.length === 0) {
                alert("Tiada data untuk dieksport.");
                return;
            }
            let csvContent = "Kod Sekolah,Nama Sekolah,Parlimen,Kategori\n";
            data.forEach(s => {
                let safeName = `"${s.namaSekolah}"`; 
                csvContent += `${s.kodSekolah},${safeName},${s.parlimen},${s.kategoriSekolah}\n`;
            });
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
                        backgroundColor: ['#e74a3b', '#f6c23e', '#1cc88a', '#4e73df', '#858796', '#6f42c1', '#20c9a6'],
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
        
        if (schools.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Tiada sekolah dalam kategori ini yang aktif.</td></tr>`;
            return;
        }

        schools.forEach(s => {
            let scoreY1 = s.scores[CONFIG.years[0]]; // 2024
            let scoreY2 = s.scores[CONFIG.years[1]]; // 2025
            
            let trendIcon = scoreY2 >= scoreY1 
                ? '<span class="badge bg-success"><i class="fas fa-arrow-up"></i> Kekal/Naik</span>' 
                : '<span class="badge bg-warning text-dark"><i class="fas fa-arrow-down"></i> Menurun</span>';
            
            tbody.innerHTML += `<tr>
                <td>${s.kodSekolah}</td>
                <td>${s.namaSekolah}</td>
                <td>${s.kategoriSekolah}</td>
                <td class="text-center text-muted">${scoreY1}</td>
                <td class="text-center fw-bold text-primary fs-5">${scoreY2}</td>
                <td>${trendIcon}</td>
            </tr>`;
        });
    }

    function renderZeroSchoolsTable(schools) {
        const tbody = document.querySelector("#zeroSchoolsTable tbody");
        if (!tbody) return;

        tbody.innerHTML = "";
        schools.forEach(s => {
            tbody.innerHTML += `<tr>
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

        // 1. Group data mengikut kategori
        const groupedData = data.reduce((acc, school) => {
            const cat = school.kategoriSekolah;
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(school);
            return acc;
        }, {});

        // 2. Loop ikut susunan kategori yang ditetapkan (Guna global var categoryOrder)
        categoryOrder.forEach(category => {
            if (groupedData[category] && groupedData[category].length > 0) {
                const group = document.createElement("optgroup");
                group.label = category === "SJKC" ? "SJK (Cina)" : category; 

                groupedData[category].sort((a, b) => a.namaSekolah.localeCompare(b.namaSekolah));

                groupedData[category].forEach(s => {
                    let option = document.createElement("option");
                    option.value = s.kodSekolah;
                    option.text = s.namaSekolah;
                    group.appendChild(option);
                });

                dropdown.appendChild(group);
            }
        });

        // Event: Dropdown & Search (Sama macam sebelum ini)
        dropdown.addEventListener("change", (e) => {
            const school = data.find(s => s.kodSekolah === e.target.value);
            if (school) showSchoolDetails(school);
        });

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

            let currentScores = {};
            CONFIG.years.forEach(year => {
                currentScores[year] = CONFIG.activities.reduce((acc, act) => acc + (school[getKey(act.id, year)] ? 1 : 0), 0);
            });

            if(document.getElementById("score2024")) document.getElementById("score2024").innerText = currentScores[2024];
            if(document.getElementById("score2025")) document.getElementById("score2025").innerText = currentScores[2025];

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