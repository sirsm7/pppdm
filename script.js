document.addEventListener("DOMContentLoaded", function () {
    // URL ke fail JSON tempatan
    const DATA_URL = "data.json";

    // Kunci Data untuk 2024 dan 2025
    const keys2024 = [
        "digitalStoryTellingAnimation2024", "myRoboticChallengeRekaedukit2024",
        "myRoboticChallengeMikrobotik2024", "myRoboticChallengeAiRobotik2024",
        "myCyberHero2024", "minecraftEducationChallenge2024",
        "droneEduchallengeIR402024", "cabaranKeselamatanSiberNasional2024",
        "pertandinganPembangunanAplikasiAndroid2024"
    ];

    const keys2025 = [
        "digitalStoryTellingAnimation2025", "myRoboticChallengeRekaedukit2025",
        "myRoboticChallengeMikrobotik2025", "myRoboticChallengeAiRobotik2025",
        "myCyberHero2025", "minecraftEducationChallenge2025",
        "droneEduchallengeIR402025", "cabaranKeselamatanSiberNasional2025",
        "pertandinganPembangunanAplikasiAndroid2025"
    ];

    // Mula Fetch Data
    fetch(DATA_URL)
        .then(response => {
            if (!response.ok) throw new Error("Gagal membaca fail JSON. Pastikan menggunakan Live Server.");
            return response.json();
        })
        .then(data => {
            console.log("Data berjaya dimuatkan:", data.length, "rekod.");
            processAnalytics(data);
            setupSearchSystem(data);
        })
        .catch(error => {
            alert("Ralat: " + error.message + "\nSila buka console (F12) untuk maklumat lanjut.");
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
            // Kira skor 2024
            let score24 = keys2024.reduce((acc, key) => acc + (school[key] ? 1 : 0), 0);
            // Kira skor 2025
            let score25 = keys2025.reduce((acc, key) => acc + (school[key] ? 1 : 0), 0);
            let totalScore = score24 + score25;

            // Update Statistik Keseluruhan
            if (totalScore > 0) stats.active++;
            else {
                stats.zero++;
                zeroSchools.push(school);
            }

            // Statistik Parlimen
            let parlimen = school.parlimen || "Lain-lain";
            stats.parlimen[parlimen] = (stats.parlimen[parlimen] || 0) + totalScore;

            // Statistik Kategori
            let cat = school.kategoriSekolah || "Lain-lain";
            stats.kategori[cat] = (stats.kategori[cat] || 0) + totalScore;

            // Simpan Data Sekolah Aktif untuk Ranking
            if (totalScore > 0) {
                topSchools.push({
                    ...school,
                    score24: score24,
                    score25: score25,
                    totalScore: totalScore
                });
            }
        });

        // 1. Render Kad KPI
        document.getElementById("totalSchools").innerText = stats.total;
        document.getElementById("activeSchools").innerText = stats.active;
        document.getElementById("zeroSchools").innerText = stats.zero;

        // 2. Render Carta Chart.js
        renderCharts(stats);

        // 3. Render Jadual Top Schools (Sort by Total Score)
        topSchools.sort((a, b) => b.totalScore - a.totalScore);
        renderTopSchoolsTable(topSchools.slice(0, 10)); // Top 10 sahaja

        // 4. Render Jadual Zero Schools
        renderZeroSchoolsTable(zeroSchools);
    }

    // --- FUNGSI RENDER CARTA ---
    function renderCharts(stats) {
        // Carta Parlimen (Bar)
        new Chart(document.getElementById("parlimenChart"), {
            type: 'bar',
            data: {
                labels: Object.keys(stats.parlimen),
                datasets: [{
                    label: 'Jumlah Penyertaan Aktiviti',
                    data: Object.values(stats.parlimen),
                    backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc'],
                }]
            }
        });

        // Carta Kategori (Doughnut)
        new Chart(document.getElementById("categoryChart"), {
            type: 'doughnut',
            data: {
                labels: Object.keys(stats.kategori),
                datasets: [{
                    data: Object.values(stats.kategori),
                    backgroundColor: ['#e74a3b', '#f6c23e', '#1cc88a', '#4e73df', '#858796'],
                }]
            }
        });
    }

    // --- FUNGSI RENDER JADUAL ---
    function renderTopSchoolsTable(schools) {
        const tbody = document.querySelector("#topSchoolsTable tbody");
        tbody.innerHTML = "";
        schools.forEach(s => {
            let trendIcon = s.score25 >= s.score24 
                ? '<span class="badge bg-success"><i class="fas fa-arrow-up"></i> Meningkat/Kekal</span>' 
                : '<span class="badge bg-warning text-dark"><i class="fas fa-arrow-down"></i> Menurun</span>';
            
            let row = `<tr>
                <td>${s.kodSekolah}</td>
                <td>${s.namaSekolah}</td>
                <td>${s.kategoriSekolah}</td>
                <td class="text-center">${s.score24}</td>
                <td class="text-center fw-bold text-primary">${s.score25}</td>
                <td>${trendIcon}</td>
            </tr>`;
            tbody.innerHTML += row;
        });
    }

    function renderZeroSchoolsTable(schools) {
        const tbody = document.querySelector("#zeroSchoolsTable tbody");
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

        // Event Listener: Dropdown Change
        dropdown.addEventListener("change", (e) => {
            const selectedCode = e.target.value;
            const school = data.find(s => s.kodSekolah === selectedCode);
            if (school) showSchoolDetails(school);
        });

        // Event Listener: Search Input
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

            // Kira Skor Semasa
            let score24 = keys2024.reduce((acc, key) => acc + (school[key] ? 1 : 0), 0);
            let score25 = keys2025.reduce((acc, key) => acc + (school[key] ? 1 : 0), 0);

            document.getElementById("score2024").innerText = score24;
            document.getElementById("score2025").innerText = score25;

            // Senaraikan Aktiviti
            const listContainer = document.getElementById("activityList");
            listContainer.innerHTML = "";

            // Gabung key untuk paparan
            const allKeys = [...keys2024, ...keys2025];
            // Filter unique names base (buang '2024'/'2025' suffix untuk label cantik)
            let activities = [
                { key24: "digitalStoryTellingAnimation2024", key25: "digitalStoryTellingAnimation2025", label: "Digital Storytelling" },
                { key24: "myRoboticChallengeRekaedukit2024", key25: "myRoboticChallengeRekaedukit2025", label: "Robotik: Reka Edukit" },
                { key24: "myRoboticChallengeMikrobotik2024", key25: "myRoboticChallengeMikrobotik2025", label: "Robotik: Mikrobotik" },
                { key24: "minecraftEducationChallenge2024", key25: "minecraftEducationChallenge2025", label: "Minecraft Education" },
                { key24: "droneEduchallengeIR402024", key25: "droneEduchallengeIR402025", label: "Drone Edu Challenge" }
                // Tambah lagi jika perlu...
            ];

            activities.forEach(act => {
                let status24 = school[act.key24] ? '<span class="text-success"><i class="fas fa-check"></i> 2024</span>' : '<span class="text-muted"><i class="fas fa-times"></i> 2024</span>';
                let status25 = school[act.key25] ? '<span class="text-success fw-bold"><i class="fas fa-check"></i> 2025</span>' : '<span class="text-muted"><i class="fas fa-times"></i> 2025</span>';
                
                if(school[act.key24] || school[act.key25]) { // Papar jika pernah masuk salah satu tahun
                    let li = document.createElement("li");
                    li.className = "list-group-item d-flex justify-content-between align-items-center";
                    li.innerHTML = `<span>${act.label}</span> <div>${status24} | ${status25}</div>`;
                    listContainer.appendChild(li);
                }
            });

            if (score24 === 0 && score25 === 0) {
                listContainer.innerHTML = '<li class="list-group-item text-danger text-center">Tiada rekod penyertaan dalam data ini.</li>';
            }
        }
    }
});