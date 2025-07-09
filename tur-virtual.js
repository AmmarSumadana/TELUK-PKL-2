document.addEventListener('DOMContentLoaded', function() {

    // === ELEMEN DOM & STATE ===
    const storyContainer = document.getElementById('story-chapters-container');
    let map;
    let tourData = [];
    let tourElements = {}; 
    let activePopup = null; 

    // === INISIALISASI ===
    async function init() {
        initMap();
        await loadTourData();
        renderStoryChapters();
        createMapElements();
        setupEventListeners();
    }

    // === FUNGSI-FUNGSI ===

    function initMap() {
        map = L.map('tour-map').setView([-7.553083, 110.197472], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    }

    async function loadTourData() {
        try {
            const response = await fetch('data/tur_story.json');
            if (!response.ok) throw new Error('Gagal memuat data tur.');
            tourData = await response.json();
        } catch (error) {
            console.error(error);
            storyContainer.innerHTML = `<div class="alert alert-danger m-3">Gagal memuat data cerita.</div>`;
        }
    }

    function renderStoryChapters() {
        storyContainer.innerHTML = '';
        tourData.forEach((chapter, index) => {
            const chapterDiv = document.createElement('div');
            chapterDiv.className = 'story-chapter';
            chapterDiv.id = chapter.id;
            chapterDiv.innerHTML = `
                <h3 class="fw-bold">${index + 1}. ${chapter.judul}</h3>
                <p>${chapter.cerita}</p>
                <button class="btn-show-location" data-chapter-id="${chapter.id}">
                    <i class="fas fa-camera-retro"></i> Lihat Foto & Lokasi
                </button>
            `;
            storyContainer.appendChild(chapterDiv);
        });
    }

    function createMapElements() {
        const featureGroup = L.featureGroup().addTo(map);

        tourData.forEach(chapter => {
            const marker = L.marker(chapter.koordinat);
            featureGroup.addLayer(marker);
            const markerIcon = marker.addTo(map)._icon;
            
            const popupContent = `<img src="image/dusun-teluk.jpg" class="popover-img" alt="${chapter.judul}">`;
            
            const popup = new bootstrap.Popover(markerIcon, {
                title: chapter.judul,
                content: popupContent,
                placement: 'right', // Default, akan diubah secara dinamis
                trigger: 'manual',
                html: true,
                customClass: 'tour-popover'
            });

            tourElements[chapter.id] = { marker, popup };
        });

        if (tourData.length > 0) {
            map.fitBounds(featureGroup.getBounds().pad(0.3));
        }
    }

    function setupEventListeners() {
        storyContainer.addEventListener('click', function(e) {
            const button = e.target.closest('.btn-show-location');
            if (button) {
                showLocationDetails(button.dataset.chapterId);
            }
        });
        
        map.on('click', hideActivePopup);
        map.on('movestart', hideActivePopup);
        map.on('zoomstart', hideActivePopup);
    }
    
    function hideActivePopup() {
        if (activePopup) {
            activePopup.hide();
            activePopup = null;
        }
    }

    function showLocationDetails(chapterId) {
        hideActivePopup();

        const element = tourElements[chapterId];
        if (!element) return;

        document.querySelectorAll('.story-chapter').forEach(el => el.classList.remove('active'));
        document.getElementById(chapterId).classList.add('active');

        map.flyTo(element.marker.getLatLng(), 17, {
            animate: true,
            duration: 1.2
        });

        // Logika posisi yang disederhanakan
        setTimeout(() => {
            const markerPoint = map.latLngToContainerPoint(element.marker.getLatLng());
            const mapWidth = map.getSize().x;
            
            // Cukup tentukan 'left' atau 'right'
            const placement = (markerPoint.x < mapWidth / 2) ? 'right' : 'left';
            
            element.popup._config.placement = placement;
            element.popup.update();
            
            element.popup.show();
            activePopup = element.popup;
        }, 1000);
    }

    // Jalankan semua
    init();
});