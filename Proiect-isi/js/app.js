import { db, auth, collection, getDocs, onAuthStateChanged, signOut } from './firebase-config.js';

const ARCGIS_API_KEY = "AAPTxy8BH1VEsoebNVZXo8HurKyRKW0T3D3lBg7YtPpGSRQjCvrBOY6UXSxft-keBFm6o1e0npr6X7YkStQokX8eSyqhLDsn0wj7IAZOIzvdGLC6M0u-qjkhtML1gfIUUPFdXvYytz0fIbPgi_GlHHzgxKf4jtZEOgujDn7tMumLAlzOWRuyLDa856m8qrBpjedbBXSLlMBHGANuegJsqiLCOP-ddyEoiagXHp2FXcBXo9A.AT1_dliUr4kT";

let map, view, graphicsLayer;
let salonsData = [];
let selectedCategories = [];
let mapReady = false;

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 App starting...");
    initializeApp();
});

async function initializeApp() {
    try {
        onAuthStateChanged(auth, handleAuthStateChange);
        initializeMap();
        await loadSalons();
        setupEventListeners();
    } catch (error) {
        console.error("❌ Init error:", error);
    }
}

function handleAuthStateChange(user) {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');

    if (user) {
        authButtons?.classList.add('d-none');
        userMenu?.classList.remove('d-none');
        if (userName) userName.textContent = user.displayName || user.email?.split('@')[0];
    } else {
        authButtons?.classList.remove('d-none');
        userMenu?.classList.add('d-none');
    }
}

function initializeMap() {
    console.log("🗺️ Initializing map...");

    require([
        "esri/config",
        "esri/Map",
        "esri/views/MapView",
        "esri/layers/GraphicsLayer",
        "esri/Graphic",
        "esri/symbols/SimpleMarkerSymbol",
        "esri/PopupTemplate",
        "esri/widgets/Locate"
    ], function (esriConfig, Map, MapView, GraphicsLayer, Graphic, SimpleMarkerSymbol, PopupTemplate, Locate) {

        esriConfig.apiKey = ARCGIS_API_KEY;

        graphicsLayer = new GraphicsLayer();

        map = new Map({
            basemap: "streets-navigation-vector",
            layers: [graphicsLayer]
        });

        view = new MapView({
            container: "viewDiv",
            map: map,
            center: [26.1025, 44.4268],
            zoom: 13
        });

        window.arcgisModules = { Graphic, SimpleMarkerSymbol, PopupTemplate };

        const locateWidget = new Locate({ view: view });

        document.getElementById('locateBtn')?.addEventListener('click', () => locateWidget.locate());
        document.getElementById('zoomInBtn')?.addEventListener('click', () => { view.zoom += 1; });
        document.getElementById('zoomOutBtn')?.addEventListener('click', () => { view.zoom -= 1; });

        view.when(() => {
            console.log("✅ Map loaded!");
            mapReady = true;
            if (salonsData.length > 0) {
                addSalonsToMap(salonsData);
            }
        }).catch(err => {
            console.error("❌ Map error:", err);
        });
    });
}

async function loadSalons() {
    console.log("📍 Loading salons from Firebase...");
    try {
        const querySnapshot = await getDocs(collection(db, "salons"));

        if (querySnapshot.empty) {
            console.log("⚠️ DB empty, using demo data");
            salonsData = getDemoSalons();
        } else {
            salonsData = querySnapshot.docs.map(doc => {
                const data = doc.data();
                let location = null;

                if (data.location) {
                    const lat = data.location.latitude ?? data.location._lat;
                    const lng = data.location.longitude ?? data.location._long;
                    if (lat && lng) {
                        location = { latitude: lat, longitude: lng };
                    }
                }

                console.log(`  → Found: ${data.name}`, location);
                return { id: doc.id, ...data, location };
            });
        }

        console.log(`✅ Total salons: ${salonsData.length}`);
        renderSalonList(salonsData);
        updateSalonCount(salonsData.length);

        if (mapReady && graphicsLayer) {
            addSalonsToMap(salonsData);
        }

    } catch (error) {
        console.error("❌ Firebase error:", error);
        salonsData = getDemoSalons();
        renderSalonList(salonsData);
        updateSalonCount(salonsData.length);
    }
}

function getDemoSalons() {
    return [
        { id: "1", name: "Glow Beauty Salon", address: "Str. Victoriei 45, București", category: "Coafor", rating: 4.8, phone: "0721123456", location: { latitude: 44.4378, longitude: 26.0946 }, images: ["https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400"] },
        { id: "2", name: "Nails & Beauty", address: "Bd. Unirii 23, București", category: "Nails", rating: 4.6, phone: "0722234567", location: { latitude: 44.4268, longitude: 26.1025 }, images: ["https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400"] },
        { id: "3", name: "Barber Kings", address: "Str. Lipscani 12, București", category: "Barber", rating: 4.9, phone: "0723345678", location: { latitude: 44.4312, longitude: 26.0987 }, images: ["https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400"] },
        { id: "4", name: "Zen Spa", address: "Calea Dorobanți 88, București", category: "Spa", rating: 4.7, phone: "0724456789", location: { latitude: 44.4512, longitude: 26.0856 }, images: ["https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400"] },
        { id: "5", name: "Perfect Makeup", address: "Str. Franceza 28, București", category: "Makeup", rating: 4.5, phone: "0725567890", location: { latitude: 44.4289, longitude: 26.1089 }, images: ["https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400"] },
        { id: "6", name: "Skin Care Expert", address: "Bd. Magheru 35, București", category: "Cosmetica", rating: 4.8, phone: "0726678901", location: { latitude: 44.4398, longitude: 26.0967 }, images: ["https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400"] }
    ];
}

function addSalonsToMap(salons) {
    if (!graphicsLayer || !window.arcgisModules) {
        console.warn("Map not ready");
        return;
    }

    const { Graphic, SimpleMarkerSymbol, PopupTemplate } = window.arcgisModules;
    graphicsLayer.removeAll();

    const colors = {
        'Coafor': '#e91e8c',
        'Nails': '#ff6b6b',
        'Barber': '#4ecdc4',
        'Spa': '#45b7d1',
        'Makeup': '#f7dc6f',
        'Cosmetica': '#bb8fce',
        'Beauty salon': '#e91e8c'
    };

    let added = 0;
    salons.forEach(salon => {
        if (!salon.location || !salon.location.latitude || !salon.location.longitude) {
            console.warn(`Skipping ${salon.name} - no location`);
            return;
        }

        const lat = salon.location.latitude;
        const lng = salon.location.longitude;
        const categoryColor = colors[salon.category] || '#e91e8c';
        const imageUrl = salon.images?.[0] || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400';

        const graphic = new Graphic({
            geometry: {
                type: "point",
                longitude: lng,
                latitude: lat
            },
            symbol: new SimpleMarkerSymbol({
                color: categoryColor,
                size: "16px",
                outline: { color: "white", width: 2 }
            }),
            attributes: salon,
            popupTemplate: new PopupTemplate({
                title: salon.name,
                content: `
                    <div class="salon-popup">
                        <div class="popup-img-container">
                            <img src="${imageUrl}" alt="${salon.name}">
                        </div>
                        <span class="popup-category" style="background:${categoryColor}">${formatCategories(salon.category)}</span>
                        <div class="popup-rating">
                            <span class="stars">${'★'.repeat(Math.floor(salon.rating || 0))}${'☆'.repeat(5 - Math.floor(salon.rating || 0))}</span>
                            <span class="rating-value">${salon.rating || 'N/A'}</span>
                        </div>
                        <p class="popup-address">
                            <i class="bi bi-geo-alt-fill"></i> ${salon.address}
                        </p>
                        ${salon.phone ? `<p class="popup-phone"><i class="bi bi-telephone-fill"></i> ${salon.phone}</p>` : ''}
                        <div class="popup-buttons">
                            <a href="tel:${salon.phone || ''}" class="popup-btn popup-btn-outline">
                                <i class="bi bi-telephone"></i> Sună
                            </a>
                            <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" class="popup-btn popup-btn-primary">
                                <i class="bi bi-signpost-2"></i> Mergi
                            </a>
                        </div>
                    </div>
                `
            })
        });

        graphicsLayer.add(graphic);
        added++;
    });

    console.log(`✅ Added ${added} markers to map`);
}

function getPlaceholderImage() {
    return 'data:image/svg+xml;base64,' + btoa(`
        <svg width="70" height="70" xmlns="http://www.w3.org/2000/svg">
            <rect width="70" height="70" fill="#e0e0e0"/>
            <text x="50%" y="50%" font-size="24" text-anchor="middle" dy=".3em" fill="#999" font-family="Arial">S</text>
        </svg>
    `);
}

function renderSalonList(salons) {
    const list = document.getElementById('salonList');
    if (!list) return;

    if (!salons || salons.length === 0) {
        list.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="bi bi-search" style="font-size:2rem"></i>
                <p class="mt-2">Nu am găsit saloane</p>
            </div>
        `;
        return;
    }

    const placeholderImg = getPlaceholderImage();
    list.innerHTML = salons.map(salon => `
        <div class="salon-card" data-id="${salon.id}">
            <div class="salon-card-header">
                <img src="${salon.images?.[0] || placeholderImg}" 
                     class="salon-image" 
                     onerror="this.src='${placeholderImg}'">
                <div class="salon-info">
                    <div class="salon-name">${salon.name}</div>
                    <span class="salon-category">${formatCategories(salon.category)}</span>
                    <div class="salon-rating">${'★'.repeat(Math.floor(salon.rating || 0))} ${salon.rating || 'N/A'}</div>
                </div>
            </div>
            <div class="salon-address"><i class="bi bi-geo-alt-fill"></i> ${salon.address}</div>
        </div>
    `).join('');

    list.querySelectorAll('.salon-card').forEach(card => {
        card.addEventListener('click', () => {
            const salon = salons.find(s => s.id === card.dataset.id);
            if (salon) {
                focusOnSalon(salon);
                list.querySelectorAll('.salon-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
            }
        });
    });
}

function focusOnSalon(salon) {
    if (!view || !salon.location) return;

    const lat = salon.location.latitude;
    const lng = salon.location.longitude;

    view.goTo({
        center: [lng, lat],
        zoom: 17
    }, { duration: 1000 }).then(() => {
        const graphic = graphicsLayer.graphics.find(g => g.attributes.id === salon.id);
        if (graphic) {
            view.popup.open({
                features: [graphic],
                location: graphic.geometry
            });
        }
    });
}

function updateSalonCount(count) {
    const el = document.getElementById('salonCount');
    if (el) el.textContent = count;
}

// Helper pentru a obține categoriile ca array
function getCategoriesArray(category) {
    if (Array.isArray(category)) {
        console.log("  📋 Category is array:", category);
        return category;
    } else if (typeof category === 'string') {
        console.log("  📝 Category is string:", category);
        return category.split(',').map(c => c.trim());
    }
    console.log("  ⚠️ Category is neither array nor string:", category, typeof category);
    return [];
}

// Helper pentru a formata categoriile pentru afișare
function formatCategories(category) {
    const categories = getCategoriesArray(category);
    return categories.join(', ');
}

function filterSalons(categories) {
    console.log("🔍 Filtering by categories:", categories);
    selectedCategories = categories;
    const filtered = !categories || categories.length === 0 ? salonsData : salonsData.filter(s => {
        // Verifică dacă salonul are TOATE categoriile selectate (intersecție)
        const salonCategories = getCategoriesArray(s.category);
        const match = categories.every(cat => salonCategories.includes(cat));
        console.log(`  ${s.name} (${formatCategories(s.category)}):`, match ? '✓' : '✗', `needs all: [${categories.join(', ')}]`);
        return match;
    });
    console.log(`📊 Filtered: ${filtered.length} salons`);
    renderSalonList(filtered);
    updateSalonCount(filtered.length);
    addSalonsToMap(filtered);
}

function searchSalons(query) {
    const term = query.toLowerCase().trim();
    if (!term) {
        filterSalons(selectedCategories);
        return;
    }

    let filtered = salonsData.filter(s => {
        const categoryText = formatCategories(s.category).toLowerCase();
        return s.name.toLowerCase().includes(term) ||
            s.address.toLowerCase().includes(term) ||
            categoryText.includes(term);
    });

    if (selectedCategories && selectedCategories.length > 0) {
        filtered = filtered.filter(s => {
            const salonCategories = getCategoriesArray(s.category);
            return selectedCategories.every(cat => salonCategories.includes(cat));
        });
    }

    renderSalonList(filtered);
    updateSalonCount(filtered.length);
    addSalonsToMap(filtered);
}

function setupEventListeners() {
    // Category filters
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;

            if (category === 'all') {
                // Dacă se apasă 'all', deselectează toate și arată tot
                document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filterSalons([]);
            } else {
                // Toggle pentru categoria specifică
                btn.classList.toggle('active');

                // Deselectează butonul 'all'
                document.querySelector('.btn-filter[data-category="all"]')?.classList.remove('active');

                // Colectează toate categoriile active
                const activeCategories = Array.from(document.querySelectorAll('.btn-filter.active'))
                    .map(b => b.dataset.category)
                    .filter(c => c !== 'all');

                // Dacă nu e nimic selectat, activează 'all'
                if (activeCategories.length === 0) {
                    document.querySelector('.btn-filter[data-category="all"]')?.classList.add('active');
                    filterSalons([]);
                } else {
                    filterSalons(activeCategories);
                }
            }
        });
    });

    // Search
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');

    searchForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        searchSalons(searchInput.value);
    });

    searchInput?.addEventListener('input', (e) => {
        if (e.target.value === '') {
            filterSalons(selectedCategories);
        }
    });

    // Sidebar toggle
    document.getElementById('toggleSidebar')?.addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        sidebar?.classList.toggle('collapsed');
    });


    // Sidebar toggle - Close button (in header)
    const sidebar = document.getElementById('sidebar');
    const toggleSidebar = document.getElementById('toggleSidebar');
    const openSidebarBtn = document.getElementById('openSidebarBtn');

    toggleSidebar?.addEventListener('click', () => {
        sidebar?.classList.add('collapsed');
        document.body.classList.add('sidebar-closed');
    });

    // Open button (fixed on left edge)
    openSidebarBtn?.addEventListener('click', () => {
        sidebar?.classList.remove('collapsed');
        document.body.classList.remove('sidebar-closed');
    });


    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);
            window.location.reload();
        } catch (error) {
            console.error("Logout error:", error);
        }
    });
}

// Export for debugging
window.glowMe = { salonsData, filterSalons, searchSalons, loadSalons };
