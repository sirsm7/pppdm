document.addEventListener("DOMContentLoaded", function () {
    const DATA_URL = "data.json";

    // --- CONFIGURATION ZONE (EASY TO UPDATE) ---
    // Tambah tahun baharu di sini jika perlu (Contoh: tambah 2026)
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

    // Helper: Jana kunci JSON (Contoh: "myCyberHero" + "2024" -> "myCyberHero2024")
    const getKey = (baseId, year) => `${baseId}${year}`;

    // --- MAIN EXECUTION ---
    fetch(DATA_URL)
        .then(response => {
            if (!response.ok) throw new Error("Gagal membaca fail JSON.");
            return response.json();
        })
        .then(data => {
            console.log("Data berjaya dimuatkan:", data.length, "rekod.");
            processAnalytics(data);
            setupSearchSystem(data);
        })
        .catch(error => {
            alert("Ralat: " + error.message);
            console.error(error);
        });

    // --- FUNGSI PROSES DATA ---
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

            // Kira skor berdasarkan Config Tahun
            CONFIG.years.forEach(year => {
                scores[year] = CONFIG.activities.reduce((acc, act) => {
                    return acc + (school[getKey(act.id, year)] ? 1 : 0);
                }, 0);
                totalScore += scores[year];
            });

            // Update Statistik
            if (totalScore > 0) stats.active++;
            else {
                stats.zero++;
                zeroSchools.push(school);
            }

            // Agregat Data Carta
            let parlimen = school.parlimen || "Lain-lain";
            stats.parlimen[parlimen] = (stats.parlimen[parlimen] || 0) + totalScore;

            let cat = school.kategoriSekolah || "Lain-lain";
            stats.kategori[cat] = (stats.kategori[cat] || 0) + totalScore;

            // Simpan untuk Top Schools
            if (totalScore > 0) {
                topSchools.push({
                    ...school,
                    scores: scores, // Simpan skor mengikut tahun
                    totalScore: totalScore
                });
            }
        });

        // Render UI Dashboard
        document.getElementById("totalSchools").innerText = stats.total;
        document.getElementById("activeSchools").innerText = stats.active;
        document.getElementById("zeroSchools").innerText = stats.zero;

        renderCharts(stats);

        // Render Jadual
        topSchools.sort((a, b) => b.totalScore - a.totalScore);
        renderTopSchoolsTable(topSchools.slice(0, 10)); // Top 10
        renderZeroSchoolsTable(zeroSchools);
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
                        label: 'Jumlah Penyertaan Aktiviti',
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
        schools.forEach(s => {
            // Ambil skor dinamik dari tahun pertama dan kedua dalam config
            let scoreY1 = s.scores[CONFIG.years[0]];
            let scoreY2 = s.scores[CONFIG.years[1]];

            let trendIcon = scoreY2 >= scoreY1 
                ? '<span class="badge bg-success"><i class="fas fa-arrow-up"></i> Meningkat/Kekal</span>' 
                : '<span class="badge bg-warning text-dark"><i class="fas fa-arrow-down"></i> Menurun</span>';
            
            let row = `<tr>
                <td>${s.kodSekolah}</td>
                <td>${s.namaSekolah}</td>
                <td>${s.kategoriSekolah}</td>
                <td class="text-center">${scoreY1}</td>
                <td class="text-center fw-bold text-primary">${scoreY2}</td>
                <td>${trendIcon}</td>
            </tr>`;
            tbody.innerHTML += row;
        });
    }

    function renderZeroSchoolsTable(schools) {
        const tbody = document.querySelector("#zeroSchoolsTable tbody");
        if (!tbody) return;

        tbody.innerHTML = "";
        schools.forEach(s => {
            let row = `<tr>
                <td>${s.kodSekolah}</td>
                <td>${s.namaSekolah}</td>
                <td>${s.parlimen}</td>
                <td><span class="badge bg-secondary">${s.kategoriSekolah}</span></td>
            </tr>`;
            tbody.innerHTML += row;
        });
    }

    // --- SISTEM CARIAN & DROPDOWN ---
    function setupSearchSystem(data) {
        const dropdown = document.getElementById("schoolDropdown");
        const searchInput = document.getElementById("searchInput");
        const resultCard = document.getElementById("schoolResultCard");

        // Isi Dropdown
        data.sort((a, b) => a.namaSekolah.localeCompare(b.namaSekolah));
        data.forEach(s => {
            let option = document.createElement("option");
            option.value = s.kodSekolah;
            option.text = s.namaSekolah;
            dropdown.appendChild(option);
        });

        // Event Listeners
        dropdown.addEventListener("change", (e) => {
            const selectedCode = e.target.value;
            const school = data.find(s => s.kodSekolah === selectedCode);
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

            // Kira skor dinamik
            let totalScores = {};
            CONFIG.years.forEach(year => {
                totalScores[year] = CONFIG.activities.reduce((acc, act) => acc + (school[getKey(act.id, year)] ? 1 : 0), 0);
            });

            // Papar Skor (Hardcoded ID untuk 2024/2025 buat masa ini mengikut HTML)
            // Jika tahun berubah, anda perlu update ID HTML 'score2024'/'score2025' atau jadikan HTML dinamik juga.
            if(document.getElementById("score2024")) document.getElementById("score2024").innerText = totalScores[2024] || 0;
            if(document.getElementById("score2025")) document.getElementById("score2025").innerText = totalScores[2025] || 0;

            // Jana Senarai Aktiviti
            const listContainer = document.getElementById("activityList");
            listContainer.innerHTML = "";

            let hasParticipation = false;

            CONFIG.activities.forEach(act => {
                // Bina HTML status untuk setiap tahun dalam config
                let statusHtml = CONFIG.years.map(year => {
                    let isJoin = school[getKey(act.id, year)];
                    if (isJoin) hasParticipation = true;
                    
                    return isJoin 
                        ? `<span class="text-success fw-bold mx-1"><i class="fas fa-check"></i> ${year}</span>`
                        : `<span class="text-muted mx-1" style="opacity:0.5"><i class="fas fa-times"></i> ${year}</span>`;
                }).join(" | ");

                // Papar baris hanya jika pernah sertai mana-mana tahun
                let everJoined = CONFIG.years.some(year => school[getKey(act.id, year)]);

                if(everJoined) {
                    let li = document.createElement("li");
                    li.className = "list-group-item d-flex justify-content-between align-items-center";
                    li.innerHTML = `<span>${act.label}</span> <div>${statusHtml}</div>`;
                    listContainer.appendChild(li);
                }
            });

            // Mesej jika tiada penyertaan langsung
            if (!hasParticipation) {
                listContainer.innerHTML = '<li class="list-group-item text-danger text-center"><i class="fas fa-exclamation-circle"></i> Tiada sebarang rekod penyertaan dalam data ini.</li>';
            }
        }
    }
});