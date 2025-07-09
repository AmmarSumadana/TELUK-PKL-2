document.addEventListener('DOMContentLoaded', function() {
    // === DATA KONFIGURASI ===
    // Ganti dengan path gambar Anda yang sebenarnya.
    // Pastikan gambar-gambar ini sudah dioptimalkan (dikompres & di-resize).
    const galleryItems = [
        { src: 'image/dusun-teluk.jpg', title: 'Pemandangan Umum Dusun Teluk', category: 'pemandangan' },
        { src: 'image/sarpras.jpg', title: 'Jembatan Penghubung Utama', category: 'infrastruktur' },
        { src: 'image/kegiatan1.jpg', title: 'Kerja Bakti Membersihkan Saluran Irigasi', category: 'kegiatan' },
        { src: 'image/penggunaanlahan.jpg', title: 'Hamparan Sawah Hijau', category: 'pemandangan' },
        { src: 'image/batasdusun.jpg', title: 'Tugu Batas Dusun', category: 'infrastruktur' },
        { src: 'image/kegiatan2.jpg', title: 'Rapat Warga di Balai Dusun', category: 'kegiatan' },
        { src: 'image/pemandangan2.jpg', title: 'Matahari Terbenam di Atas Perbukitan', category: 'pemandangan' },
        { src: 'image/kegiatan3.jpg', title: 'Anak-anak Bermain di Lapangan', category: 'kegiatan' }
    ];

    const newsItems = [
        { 
            title: 'Program Digitalisasi Dusun Teluk Resmi Diluncurkan', 
            date: '15 Oktober 2024', 
            excerpt: 'Dengan peluncuran WebGIS ini, Dusun Teluk melangkah maju dalam pemanfaatan teknologi untuk transparansi data dan perencanaan pembangunan yang lebih baik.' 
        },
        { 
            title: 'Perbaikan Jalan Utama Selesai, Akses Warga Semakin Lancar', 
            date: '02 Oktober 2024', 
            excerpt: 'Proyek perbaikan jalan sepanjang 1.2 km telah rampung, memberikan kemudahan akses transportasi bagi warga dan distribusi hasil panen.' 
        },
        { 
            title: 'Jadwal Kerja Bakti Rutin Akhir Pekan', 
            date: '28 September 2024', 
            excerpt: 'Diinformasikan kepada seluruh warga untuk berpartisipasi dalam kegiatan kerja bakti pembersihan lingkungan yang akan diadakan hari Minggu pagi.' 
        }
    ];

    // === ELEMEN DOM ===
    const galleryGrid = document.getElementById('gallery-grid');
    const newsList = document.getElementById('news-list');
    const filterControls = document.getElementById('gallery-controls');
    const galleryModal = new bootstrap.Modal(document.getElementById('galleryModal'));
    const modalImage = document.getElementById('modal-img');
    const modalTitle = document.getElementById('galleryModalLabel');

    // === LOGIKA LAZY LOADING ===
    const lazyLoadObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            // Jika elemen (gambar) masuk ke dalam viewport
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.getAttribute('data-src');
                
                // Ganti src placeholder dengan src gambar asli
                img.setAttribute('src', src);
                img.classList.remove('lazy'); // Hapus class placeholder
                
                // Tambahkan class 'loaded' setelah gambar selesai dimuat untuk efek transisi
                img.onload = () => {
                    img.classList.add('loaded');
                };

                // Berhenti mengamati gambar ini karena sudah dimuat
                observer.unobserve(img);
            }
        });
    }, { 
        // Mulai memuat gambar 200px sebelum ia masuk ke layar
        rootMargin: '0px 0px 200px 0px' 
    });

    // === FUNGSI RENDER ===
    function renderGallery(filter = 'all') {
        galleryGrid.innerHTML = '';
        const filteredItems = filter === 'all' ? galleryItems : galleryItems.filter(item => item.category === filter);

        if (filteredItems.length === 0) {
            galleryGrid.innerHTML = '<div class="col-12"><p class="text-center text-muted">Tidak ada gambar dalam kategori ini.</p></div>';
            return;
        }

        filteredItems.forEach(item => {
            const col = document.createElement('div');
            col.className = 'col-lg-3 col-md-4 col-sm-6';
            
            // Atur HTML dengan src placeholder dan data-src gambar asli
            col.innerHTML = `
                <div class="gallery-item shadow-sm">
                    <img src="image/placeholder.gif" 
                         data-src="${item.src}" 
                         alt="${item.title}" 
                         class="gallery-img lazy">
                    <div class="gallery-overlay">
                        <h6 class="gallery-title">${item.title}</h6>
                        <button class="btn-zoom" data-src="${item.src}" data-title="${item.title}">
                            <i class="fas fa-search-plus"></i>
                        </button>
                    </div>
                </div>
            `;
            galleryGrid.appendChild(col);
        });

        // Terapkan observer ke semua gambar yang baru di-render
        const lazyImages = galleryGrid.querySelectorAll('.lazy');
        lazyImages.forEach(img => lazyLoadObserver.observe(img));
    }

    function renderNews() {
        newsList.innerHTML = '';
        newsItems.forEach(news => {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4';
            col.innerHTML = `
                <div class="card news-item h-100 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title">${news.title}</h5>
                        <p class="card-subtitle mb-2 text-muted news-date">${news.date}</p>
                        <p class="card-text">${news.excerpt}</p>
                        <a href="#" class="btn btn-sm btn-outline-primary disabled" aria-disabled="true">Baca Selengkapnya</a>
                    </div>
                </div>
            `;
            newsList.appendChild(col);
        });
    }

    // === EVENT LISTENERS ===
    filterControls.addEventListener('click', function(e) {
        if (e.target.tagName === 'BUTTON') {
            document.querySelector('#gallery-controls .btn.active').classList.remove('active');
            e.target.classList.add('active');
            renderGallery(e.target.dataset.filter);
        }
    });

    galleryGrid.addEventListener('click', function(e) {
        const zoomButton = e.target.closest('.btn-zoom');
        if (zoomButton) {
            const src = zoomButton.dataset.src;
            const title = zoomButton.dataset.title;
            modalImage.src = src; // Modal akan memuat gambar versi penuh
            modalTitle.textContent = title;
            galleryModal.show();
        }
    });

    // === INISIALISASI HALAMAN ===
    renderGallery();
    renderNews();
});