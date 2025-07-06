// Inisialisasi peta Leaflet
const map = L.map('map').setView([-7.553083, 110.197472], 13);

// Tambahkan Tile Layer OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 25
}).addTo(map);

// Definisikan warna default untuk 'pl_ar.json' berdasarkan properti 'KETERANGAN'
const plArColors = {
    "Tempat Tinggal": "#f4b8b0",
    "Pekarangan": "#bec0c0",
    "Industri dan Perdagangan": "#f29560",
    "Peribadatan": "#c4a0d4",
    "Tempat Menarik / Pariwisata": "#dcb0ff",
    "Pemakaman": "#5a5a5a",
    "Transportasi": "#6b7c93",
    "Perkebunan": "#b3e6b3",
    "Sawah": "#a0e0e0",
    "Tegalan / Ladang": "#feffaa",
    "Kebun Campur": "#bbdf7b",
    "Rumput": "#8acd6b",
    "Semak Belukar": "#e74c3c",
    "Vegetasi Non Budidaya Lainnya": "#c4d8a8",
    "Lahan Terbuka (Tanah Kosong)": "#ecf0f1",
    "Sungai": "#a5f0fa" // Warna khusus untuk "Sungai" di pl_ar.json (polygon)
};

// Struktur konfigurasi data GeoJSON dan urutan tampil
const config = {
    polygon: {
        path: "data/polygon/", // Path ke folder data polygon
        files: [
            { name: "teluk.json", identitas: null }, // Teluk.json tidak punya identitas khusus, akan jadi satu layer
            { name: "pl_ar.json", identitas: "KETERANGAN", defaultColors: plArColors }, // pl_ar.json dikelompokkan berdasarkan 'KETERANGAN'
            { name: "bangunan.json", identitas: null } // Bangunan.json tidak punya identitas khusus
        ]
    },
    garis: {
        path: "data/garis/", // Path ke folder data garis
        files: [
            { name: "jaringan_jalan.json", identitas: "KETERANGAN" }, // Jaringan jalan dikelompokkan
            { name: "jembatan.json", identitas: "KETERANGAN" }, // Jembatan dikelompokkan
            { name: "sungai.json", identitas: "KETERANGAN" } // Sungai (garis) dikelompokkan
        ]
    },
    titik: {
        path: "data/titik/", // Path ke folder data titik
        files: [
            { name: "industri.json", identitas: null },
            { name: "masjid.json", identitas: null },
            { name: "pemakaman.json", identitas: null },
            { name: "tempat_menarik.json", identitas: null }
        ]
    }
};

// Map untuk menyimpan referensi layer Leaflet dan propertinya
const layerMap = new Map();
let layerCounter = 0; // Counter untuk ID layer unik

// Fungsi untuk menghasilkan kunci unik untuk localStorage
// Ini penting agar warna dan visibilitas tersimpan per layer unik (misal: pl_ar_Tempat_Tinggal)
function getLayerStorageKey(groupKey, fileName, layerName) {
    return `webgis_color_${groupKey}_${fileName.replace('.json', '')}_${layerName.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

// Fungsi untuk membuat konten popup dari properti GeoJSON
function makePopup(properties) {
    return Object.entries(properties).map(([k, v]) =>
        `<strong>${k}</strong>: ${v}<br>`).join('');
}

// Fungsi untuk menghasilkan warna heksadesimal acak
function randomColor() {
    return "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
}

// Fungsi untuk membuat item legenda (checkbox, color picker/display, label)
function createLegendItem(name, layerObj, groupContainer, groupKey, fileName) {
    const row = document.createElement("div");
    row.className = "legend-entry d-flex align-items-center mb-1";
    row.dataset.layerId = layerObj.id; // Simpan ID layer di elemen DOM

    // Checkbox untuk mengaktifkan/menonaktifkan layer
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true; // Defaultnya layer aktif saat pertama kali dimuat
    checkbox.className = "form-check-input me-2";
    checkbox.addEventListener("change", () => {
        checkbox.checked ? map.addLayer(layerObj.layer) : map.removeLayer(layerObj.layer);
        updateLayerOrder(); // Perbarui urutan Z-index setelah perubahan visibilitas
        // Simpan status visibilitas ke localStorage
        localStorage.setItem(`webgis_visibility_${groupKey}_${fileName.replace('.json', '')}_${name.replace(/[^a-zA-Z0-9]/g, '_')}`, checkbox.checked);
    });

    // Muat status visibilitas awal dari localStorage (jika ada)
    const storedVisibility = localStorage.getItem(`webgis_visibility_${groupKey}_${fileName.replace('.json', '')}_${name.replace(/[^a-zA-Z0-9]/g, '_')}`);
    if (storedVisibility !== null) {
        checkbox.checked = JSON.parse(storedVisibility);
        if (!checkbox.checked) {
            map.removeLayer(layerObj.layer); // Jika tersimpan 'false', hapus layer dari peta
        }
    }

    // Elemen untuk menampilkan warna (color picker atau kotak statis)
    let colorDisplayElement;

    if (fileName === "teluk.json") {
        // Untuk teluk.json, tampilkan kotak dengan outline kuning (fixed)
        colorDisplayElement = document.createElement("div");
        colorDisplayElement.className = "legend-color-box teluk-outline-display mx-2";
        // Tidak ada event listener karena warnanya fixed
    } else {
        // Untuk layer lain, tampilkan color picker yang bisa diubah
        colorDisplayElement = document.createElement("input");
        colorDisplayElement.type = "color";
        colorDisplayElement.value = layerObj.color; // Set nilai awal dari warna layerObj
        colorDisplayElement.className = "form-control-color mx-2";
        colorDisplayElement.addEventListener("input", () => {
            const newColor = colorDisplayElement.value;
            layerObj.color = newColor; // Perbarui warna di objek layer
            // Terapkan style baru ke layer Leaflet
            // Penting: pastikan fillOpacity disesuaikan dengan tipe geometri saat setStyle
            const currentStyle = layerObj.layer.options.style;
            layerObj.layer.setStyle({
                color: newColor,
                fillColor: newColor,
                weight: currentStyle.weight,
                fillOpacity: currentStyle.fillOpacity
            });
            // Simpan warna baru ke localStorage
            const storageKey = getLayerStorageKey(groupKey, fileName, name);
            localStorage.setItem(storageKey, newColor);
        });
    }

    // Label teks untuk nama layer
    const label = document.createElement("span");
    label.textContent = name;

    // Masukkan elemen-elemen ke dalam baris legenda
    row.appendChild(checkbox);
    row.appendChild(colorDisplayElement);
    row.appendChild(label);
    groupContainer.appendChild(row);
}

// Fungsi utama untuk memuat data GeoJSON
async function loadGeoJSON(path, fileObj, groupKey, groupContainer) {
    const { name, identitas, defaultColors } = fileObj;
    
    console.log(`Attempting to load: ${path}${name}`); // Log file yang sedang dimuat

    const res = await fetch(path + name);
    if (!res.ok) {
        console.error(`Failed to load ${path}${name}: ${res.statusText}`);
        return; // Hentikan jika gagal memuat file
    }
    const data = await res.json();

    const grouped = {};
    if (identitas) {
        // Jika ada 'identitas' (properti untuk pengelompokan), kelompokkan fitur
        data.features.forEach(f => {
            const val = f.properties[identitas] && f.properties[identitas] !== "" ? f.properties[identitas] : "Tidak Diketahui";
            if (!grouped[val]) grouped[val] = [];
            grouped[val].push(f);
        });
    } else {
        // Jika tidak ada 'identitas', semua fitur jadi satu kelompok
        const simpleName = name.replace(".json", "").replaceAll("_", " ");
        grouped[simpleName] = data.features;
    }

    // Iterasi setiap kelompok (layer individual) yang ditemukan
    for (const [key, features] of Object.entries(grouped)) {
        const storageKey = getLayerStorageKey(groupKey, name, key);
        let color = localStorage.getItem(storageKey); // Coba ambil warna dari localStorage

        let finalColor;
        let finalFillOpacity;
        let finalWeight = 2; // Berat garis default

        if (name === "teluk.json") {
            // Logika khusus untuk teluk.json: warna kuning, tanpa fill
            finalColor = "#FFFF00";
            finalFillOpacity = 0;
            finalWeight = 3; // Sedikit lebih tebal
            // Pastikan warna ini selalu digunakan dan tersimpan di localStorage
            localStorage.setItem(storageKey, finalColor);
            console.log(`Teluk.json loaded. Color: ${finalColor}, Fill Opacity: ${finalFillOpacity}`);
        } else if (!color) { 
            // Jika tidak ada warna di localStorage untuk layer ini:
            if (defaultColors && defaultColors[key]) {
                finalColor = defaultColors[key]; // Coba pakai warna default dari config
            } else {
                finalColor = randomColor(); // Jika tidak ada default, pakai warna acak
            }
            // Tentukan fillOpacity berdasarkan tipe geometri fitur pertama (asumsi seragam)
            if (features.length > 0 && features[0].geometry.type.includes("Polygon")) {
                 finalFillOpacity = 0.7; // Polygon ada fill
            } else {
                finalFillOpacity = 0; // Garis/titik tidak ada fill
            }
            // Simpan warna awal ini ke localStorage
            localStorage.setItem(storageKey, finalColor);
        } else { 
            // Jika ada warna di localStorage, gunakan warna tersebut
            finalColor = color;
            // Tentukan fillOpacity berdasarkan tipe geometri (konsisten)
            if (features.length > 0 && features[0].geometry.type.includes("Polygon")) {
                finalFillOpacity = 0.7;
            } else {
                finalFillOpacity = 0;
            }
        }
        
        // Buat layer GeoJSON Leaflet
        const layer = L.geoJSON(features, {
            style: { 
                color: finalColor, 
                fillColor: finalColor, 
                weight: finalWeight, 
                fillOpacity: finalFillOpacity 
            },
            pointToLayer: (f, latlng) => L.circleMarker(latlng, { // Untuk fitur titik
                radius: 5, color: finalColor, fillColor: finalColor, weight: 1, opacity: 1, fillOpacity: 0.8
            }),
            onEachFeature: (f, l) => l.bindPopup(makePopup(f.properties)) // Tambahkan popup
        }).addTo(map); // Langsung tambahkan ke peta

        const id = `layer-${layerCounter++}`;
        const layerObj = { layer, color: finalColor, id }; // Simpan objek layer dan warnanya
        layerMap.set(id, layerObj); // Simpan ke Map global
        // Buat item legenda untuk layer ini
        createLegendItem(key, layerObj, groupContainer, groupKey, name);
    }
}

// Fungsi inisialisasi utama aplikasi
async function init() {
    // --- PENTING! Baris ini DIHAPUS agar warna dan visibilitas tersimpan di localStorage ---
    // localStorage.clear(); 
    // Jika Anda ingin membersihkan semua data tersimpan untuk pengujian baru, 
    // Anda bisa mengaktifkan baris di atas SEMENTARA, lalu hapus lagi.
    // ------------------------------------------------------------------------------------

    const legend = document.getElementById("legend-content");

    // Definisikan urutan grup layer
    const groupOrder = ["polygon", "garis", "titik"];
    const groupLabels = { polygon: "Polygon", garis: "Garis", titik: "Titik" };
    const groups = {};

    // Buat wadah grup di legenda sesuai urutan
    for (const groupKey of groupOrder) {
        const wrapper = document.createElement("div");
        wrapper.className = "legend-group";
        wrapper.dataset.group = groupKey; // Simpan tipe grup di dataset

        const title = document.createElement("div");
        title.className = "legend-group-title";
        title.textContent = groupLabels[groupKey];
        wrapper.appendChild(title);

        const container = document.createElement("div");
        container.className = "sortable-group"; // Kelas untuk Sortable.js
        wrapper.appendChild(container);

        legend.appendChild(wrapper);
        groups[groupKey] = container; // Simpan referensi container grup
    }

    // Muat layer GeoJSON sesuai urutan grup
    for (const fileObj of config.polygon.files) {
        await loadGeoJSON(config.polygon.path, fileObj, "polygon", groups.polygon);
    }
    for (const fileObj of config.garis.files) {
        await loadGeoJSON(config.garis.path, fileObj, "garis", groups.garis);
    }
    for (const fileObj of config.titik.files) {
        await loadGeoJSON(config.titik.path, fileObj, "titik", groups.titik);
    }

    // Sesuaikan batas peta setelah semua layer dimuat
    const allLayers = Array.from(layerMap.values()).map(obj => obj.layer);
    if (allLayers.length > 0) {
        const featureGroup = L.featureGroup(allLayers);
        map.fitBounds(featureGroup.getBounds());
    } else {
        // Fallback view jika tidak ada layer yang dimuat
        map.setView([-7.553083, 110.197472], 13);
    }

    // Inisialisasi Sortable.js untuk setiap grup
    document.querySelectorAll(".sortable-group").forEach(container => {
        new Sortable(container, {
            animation: 150,
            onEnd: updateLayerOrder // Panggil fungsi updateLayerOrder setelah drag-and-drop
        });
    });

    // Inisialisasi Sortable.js untuk drag antar grup
    new Sortable(document.getElementById("legend-content"), {
        animation: 150,
        handle: ".legend-group-title", // Bagian yang bisa di-drag untuk grup
        onEnd: updateLayerOrder
    });

    updateLayerOrder(); // Panggil pertama kali untuk mengatur urutan awal
}

// Fungsi untuk memperbarui urutan Z-index layer di peta
function updateLayerOrder() {
    const groupElems = document.querySelectorAll("#legend-content .legend-group");
    const layersByGroup = { polygon: [], garis: [], titik: [] };

    groupElems.forEach(group => {
        const groupType = group.dataset.group;
        const entries = group.querySelectorAll(".legend-entry");
        entries.forEach(entry => {
            const id = entry.dataset.layerId;
            const obj = layerMap.get(id);
            // Hanya sertakan layer yang saat ini aktif di peta
            if (obj && map.hasLayer(obj.layer)) { 
                layersByGroup[groupType].push(obj.layer);
            }
        });
    });

    // Terapkan urutan Z-index: polygon di bawah, garis di tengah, titik di atas
    [
        ...layersByGroup.polygon,
        ...layersByGroup.garis,
        ...layersByGroup.titik
    ].forEach(layer => layer.bringToFront()); // Bawa layer ke depan (di atas layer lain)
}

// Panggil fungsi inisialisasi saat DOM siap
init();

// Logika untuk tombol toggle legenda
const legend = document.getElementById("legend");
const toggleBtn = document.getElementById("toggle-legend");
const mapElement = document.getElementById("map"); // Mengambil elemen peta

// Memindahkan tombol toggle ke dalam Leaflet control container
// Lakukan ini setelah Leaflet control container dibuat oleh Leaflet
map.on('load', function() {
    const leafletZoomControl = document.querySelector('.leaflet-control-zoom');
    if (leafletZoomControl && leafletZoomControl.parentElement) {
        // Tambahkan tombol toggle ke parent dari kontrol zoom Leaflet
        // Ini memastikan mereka berada di area kontrol kanan atas yang sama
        leafletZoomControl.parentElement.appendChild(toggleBtn);
        
        // Atur kelas untuk posisi awal tombol toggle di desktop
        // (CSS akan mengatur posisi pastinya relatif terhadap kontrol zoom)
        toggleBtn.classList.remove('hidden-left');
    }
});


toggleBtn.addEventListener("click", () => {
    // Untuk tampilan mobile (lebar layar <= 768px)
    if (window.innerWidth <= 768) {
        legend.classList.toggle("hidden-mobile-show"); // Toggle class untuk mobile
        const isHidden = !legend.classList.contains("hidden-mobile-show");
        // Ubah ikon tombol
        toggleBtn.innerHTML = isHidden ? "<i class='fas fa-sliders'></i>" : "<i class='fas fa-times'></i>";
        // Sesuaikan posisi peta dan tombol agar tidak tumpang tindih dengan legenda
        // Di mobile, peta harus bergeser ke bawah jika legenda terbuka
        mapElement.style.top = isHidden ? "77px" : `${legend.offsetHeight + 77}px`;
        // Tombol toggle akan menyesuaikan posisinya di bawah legenda atau kembali ke posisi default
        if (isHidden) {
            toggleBtn.style.bottom = '20px'; // Kembali ke posisi default
        } else {
            toggleBtn.style.bottom = `${legend.offsetHeight + 30}px`; // Naik di atas legenda
        }
    } else {
        // Untuk tampilan desktop
        const isHidden = legend.classList.toggle("hidden"); // Toggle class 'hidden'
        toggleBtn.classList.toggle("hidden-left", isHidden); // Geser tombol ke kiri jika legenda tersembunyi
        // Ubah simbol tombol
        toggleBtn.innerHTML = isHidden ? "⮞" : "⮜"; 
        // Sesuaikan posisi peta
        mapElement.style.left = isHidden ? "0" : "320px";
        // Posisi tombol toggle di desktop akan diatur oleh CSS relatif terhadap kontrol zoom
        // (tidak perlu mengubah style.left langsung di JS lagi untuk desktop)
    }
});

// Atur status awal tombol toggle legenda saat halaman dimuat
// Ini perlu dipanggil setelah Leaflet selesai merender kontrolnya
map.on('load', function() {
    if (window.innerWidth <= 768) {
        toggleBtn.innerHTML = "<i class='fas fa-sliders'></i>";
        legend.classList.add("hidden"); // Pastikan legenda tersembunyi secara default di mobile
        mapElement.style.top = '77px'; // Pastikan peta di posisi normal jika legenda tersembunyi
    } else {
        toggleBtn.innerHTML = "⮜"; // Default simbol untuk desktop
        legend.classList.remove("hidden"); // Pastikan legenda terlihat di desktop
        mapElement.style.left = "320px"; // Pastikan peta bergeser
        toggleBtn.classList.remove('hidden-left'); // Pastikan tombol di posisi normal
    }
});