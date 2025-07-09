document.addEventListener('DOMContentLoaded', function() {
    // === DATA DUMMY POTENSI DUSUN ===
    const potensiItems = [
        {
            id: 'potensi-1',
            nama: 'Kolam Wisata Teluk Asri',
            kategori: 'Wisata',
            deskripsi: 'Nikmati suasana sejuk dan pemandangan indah di kolam pemancingan dan wisata air kebanggaan Dusun Teluk. Cocok untuk rekreasi keluarga di akhir pekan.',
            gambar: 'image/sarpras.jpg',
            kontak_nama: 'Pokdarwis Teluk',
            kontak_telp: '0812-1111-2222',
            koordinat: [-7.5545, 110.1980]
        },
        {
            id: 'potensi-2',
            nama: 'Warung Makan Bu Jumi',
            kategori: 'Kuliner',
            deskripsi: 'Menyajikan masakan tradisional khas Magelang dengan resep turun-temurun. Menu andalan mangut lele dan sayur lodeh.',
            gambar: 'image/kegiatan1.jpg',
            kontak_nama: 'Ibu Jumi',
            kontak_telp: '0856-3333-4444',
            koordinat: [-7.5520, 110.1965]
        },
        {
            id: 'potensi-3',
            nama: 'Kerajinan Bambu Pak Karto',
            kategori: 'Kerajinan',
            deskripsi: 'Produk kerajinan tangan dari bambu berkualitas, seperti kursi, meja, hingga hiasan dinding unik dan artistik.',
            gambar: 'image/kegiatan2.jpg',
            kontak_nama: 'Bapak Karto',
            kontak_telp: '0877-5555-6666',
            koordinat: [-7.5535, 110.2000]
        }
    ];

    // === ELEMEN DOM & STATE ===
    const mapContainer = document.getElementById('potensi-map');
    const filtersContainer = document.getElementById('potensi-filters');
    const gridContainer = document.getElementById('potensi-grid');
    const locationStatus = document.getElementById('location-status');

    let userLocation = null;
    let routingControl = null; // Variabel untuk menyimpan kontrol rute

    // === INISIALISASI PETA LEAFLET ===
    const map = L.map(mapContainer).setView([-7.553083, 110.197472], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const markerGroup = L.layerGroup().addTo(map);

    // === FUNGSI RENDER KARTU ===
    function renderCards(filter = 'all') {
        gridContainer.innerHTML = '';
        const filteredItems = filter === 'all' ? potensiItems : potensiItems.filter(item => item.kategori === filter);

        if (filteredItems.length === 0) {
            gridContainer.innerHTML = '<div class="col-12"><p class="text-center text-muted">Tidak ada potensi dalam kategori ini.</p></div>';
            return;
        }

        filteredItems.forEach(item => {
            const card = document.createElement('div');
            card.className = 'col-md-6 col-lg-4';
            // Tombol diubah menjadi "Dapatkan Rute" dan dinonaktifkan secara default
            card.innerHTML = `
                <div class="card card-potensi h-100 shadow-sm">
                    <img src="${item.gambar}" class="card-img-top" alt="${item.nama}">
                    <div class="card-body d-flex flex-column">
                        <span class="badge bg-primary align-self-start mb-2">${item.kategori}</span>
                        <h5 class="card-title">${item.nama}</h5>
                        <p class="card-text text-muted small">${item.deskripsi}</p>
                        <div class="mt-auto">
                            <p class="mb-1 small"><strong>Kontak:</strong> ${item.kontak_nama} (${item.kontak_telp})</p>
                            <button class="btn btn-sm btn-success w-100 btn-get-route" 
                                    data-lat="${item.koordinat[0]}" 
                                    data-lng="${item.koordinat[1]}"
                                    disabled
                                    title="Izinkan akses lokasi untuk mengaktifkan fitur ini">
                                <i class="fas fa-directions me-2"></i>Dapatkan Rute
                            </button>
                        </div>
                    </div>
                </div>
            `;
            gridContainer.appendChild(card);
        });
    }

    // === FUNGSI RENDER MARKER TITIK POTENSI ===
    function renderMarkers() {
        markerGroup.clearLayers();
        potensiItems.forEach(item => {
            L.marker(item.koordinat)
             .addTo(markerGroup)
             .bindPopup(`<b>${item.nama}</b><br>${item.kategori}`);
        });
    }
    
    // === FUNGSI GEOLOKASI & RUTE ===
    function handleLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(onLocationFound, onLocationError);
        } else {
            locationStatus.className = 'alert alert-danger text-center';
            locationStatus.innerHTML = 'Geolocation tidak didukung oleh browser ini.';
        }
    }

    function onLocationFound(position) {
        userLocation = L.latLng(position.coords.latitude, position.coords.longitude);
        locationStatus.className = 'alert alert-success text-center';
        locationStatus.innerHTML = '<i class="fas fa-check-circle me-2"></i>Lokasi Anda ditemukan! Anda sekarang dapat menggunakan fitur rute.';

        // Tambahkan marker untuk lokasi pengguna
        const userIcon = L.divIcon({
            className: 'user-location-icon',
            html: '<div style="background-color: #4a90e2; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>',
            iconSize: [22, 22]
        });
        L.marker(userLocation, { icon: userIcon }).addTo(map).bindPopup('<b>Lokasi Anda</b>');
        map.flyTo(userLocation, 15);

        // Aktifkan semua tombol rute
        document.querySelectorAll('.btn-get-route').forEach(button => {
            button.disabled = false;
            button.title = 'Dapatkan rute dari lokasi Anda ke tempat ini';
        });
    }

    function onLocationError(error) {
        locationStatus.className = 'alert alert-danger text-center';
        if (error.code === 1) { // PERMISSION_DENIED
            locationStatus.innerHTML = '<i class="fas fa-times-circle me-2"></i>Akses lokasi ditolak. Fitur rute tidak dapat digunakan.';
        } else {
            locationStatus.innerHTML = `<i class="fas fa-times-circle me-2"></i>Tidak dapat menemukan lokasi Anda (Error: ${error.message}).`;
        }
    }

    // === EVENT LISTENERS ===
    filtersContainer.addEventListener('click', function(e) {
        if (e.target.tagName === 'BUTTON') {
            document.querySelector('#potensi-filters .btn.active').classList.remove('active');
            e.target.classList.add('active');
            renderCards(e.target.dataset.filter);
            // Setelah render ulang, aktifkan tombol jika lokasi sudah ditemukan
            if (userLocation) {
                 document.querySelectorAll('.btn-get-route').forEach(button => {
                    button.disabled = false;
                    button.title = 'Dapatkan rute dari lokasi Anda ke tempat ini';
                });
            }
        }
    });

    gridContainer.addEventListener('click', function(e) {
        const button = e.target.closest('.btn-get-route');
        if (button && !button.disabled) {
            const lat = parseFloat(button.dataset.lat);
            const lng = parseFloat(button.dataset.lng);
            const destination = L.latLng(lat, lng);

            // Hapus rute lama jika ada
            if (routingControl) {
                map.removeControl(routingControl);
            }

            // Buat rute baru
            routingControl = L.Routing.control({
                waypoints: [
                    L.latLng(userLocation),
                    destination
                ],
                routeWhileDragging: false,
                addWaypoints: false, // Sembunyikan tombol untuk menambah titik baru
                lineOptions: {
                    styles: [{ color: '#4a90e2', opacity: 0.8, weight: 6 }]
                },
                // Atur agar tidak otomatis memfokuskan ke rute, kita akan lakukan manual
                fitSelectedRoutes: true,
                showAlternatives: false // Tampilkan hanya 1 rute terbaik
            }).addTo(map);

            // Beri pesan kepada pengguna
            alert('Rute sedang dibuat di peta. Silakan periksa peta di atas.');
        }
    });

    // === INISIALISASI HALAMAN ===
    renderCards();
    renderMarkers();
    handleLocation(); // Panggil fungsi untuk mendapatkan lokasi pengguna
});