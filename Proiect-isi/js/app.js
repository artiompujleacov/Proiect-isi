import { db, auth, collection, getDocs, onAuthStateChanged, signOut, query, where, addDoc, updateDoc, doc, Timestamp } from './firebase-config.js';

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

async function handleAuthStateChange(user) {
    console.log("🚀 handleAuthStateChange called with user:", user ? user.uid : "null");

    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const addSalonMenuItem = document.getElementById('addSalonMenuItem');
    const menuDivider = document.getElementById('menuDivider');

    if (user) {
        authButtons?.classList.add('d-none');
        userMenu?.classList.remove('d-none');
        if (userName) userName.textContent = user.displayName || user.email?.split('@')[0];

        // Check if user is salon owner
        try {
            console.log("🔍 Checking user type for UID:", user.uid);
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('uid', '==', user.uid));
            const querySnapshot = await getDocs(q);

            console.log("📊 Query results:", querySnapshot.size, "documents found");

            if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data();
                console.log("👤 User data:", userData);
                console.log("👤 User type:", userData.accountType);

                if (userData.accountType === 'salon') {
                    console.log("✅ User is salon owner - showing button");
                    addSalonMenuItem?.classList.remove('d-none');
                    if (menuDivider) menuDivider.style.display = 'block';
                } else {
                    console.log("❌ User is NOT salon owner - hiding button");
                    addSalonMenuItem?.classList.add('d-none');
                    if (menuDivider) menuDivider.style.display = 'none';
                }
            } else {
                console.log("⚠️ No user document found in database");
            }
        } catch (error) {
            console.error("❌ Error checking user type:", error);
        }
    } else {
        authButtons?.classList.remove('d-none');
        userMenu?.classList.add('d-none');
        addSalonMenuItem?.classList.add('d-none');
        if (menuDivider) menuDivider.style.display = 'none';
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
    list.innerHTML = salons.map(salon => {
        const rating = typeof salon.rating === 'string' ? parseFloat(salon.rating) : (salon.rating || 0);
        const reviewCount = salon.reviewCount || 0;
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let starsHtml = '★'.repeat(fullStars);
        if (hasHalfStar) starsHtml += '⯨';
        starsHtml += '☆'.repeat(emptyStars);

        return `
        <div class="salon-card" data-id="${salon.id}">
            <div class="salon-card-header">
                <img src="${salon.images?.[0] || placeholderImg}" 
                     class="salon-image" 
                     onerror="this.src='${placeholderImg}'">
                <div class="salon-info">
                    <div class="salon-name">${salon.name}</div>
                    <span class="salon-category">${formatCategories(salon.category)}</span>
                    <div class="salon-rating">
                        <span class="stars">${starsHtml}</span>
                        <span class="rating-value">${rating.toFixed(1)}</span>
                        <span class="review-count">(${reviewCount})</span>
                    </div>
                </div>
            </div>
            <div class="salon-address"><i class="bi bi-geo-alt-fill"></i> ${salon.address}</div>
            <button class="btn btn-sm btn-outline-primary w-100 mt-2 view-details-btn" data-salon-id="${salon.id}">
                <i class="bi bi-info-circle me-1"></i>Vezi detalii
            </button>
        </div>
    `;
    }).join('');

    list.querySelectorAll('.salon-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.view-details-btn')) {
                const salonId = card.dataset.id;

                // If in route mode, toggle selection
                if (routeMode) {
                    toggleSalonForRoute(salonId);
                } else {
                    // Normal behavior - focus on salon
                    const salon = salons.find(s => s.id === salonId);
                    if (salon) {
                        focusOnSalon(salon);
                        list.querySelectorAll('.salon-card').forEach(c => c.classList.remove('active'));
                        card.classList.add('active');
                    }
                }
            }
        });
    });

    // Add click handlers for view details buttons
    list.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const salonId = btn.dataset.salonId;
            const salon = salons.find(s => s.id === salonId);
            if (salon) {
                showSalonModal(salon);
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

    // Setup route planning listeners
    setupRouteListeners();
}

// Show salon modal with details and reviews
async function showSalonModal(salon) {
    const modal = new bootstrap.Modal(document.getElementById('salonModal'));
    const modalTitle = document.getElementById('salonModalTitle');
    const modalBody = document.getElementById('salonModalBody');

    modalTitle.textContent = salon.name;

    // Load reviews
    const reviews = await loadSalonReviews(salon.id);

    const rating = typeof salon.rating === 'string' ? parseFloat(salon.rating) : (salon.rating || 0);
    const reviewCount = salon.reviewCount || 0;
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let starsHtml = '★'.repeat(fullStars);
    if (hasHalfStar) starsHtml += '⯨';
    starsHtml += '☆'.repeat(emptyStars);

    const user = auth.currentUser;
    const userHasReviewed = reviews.some(r => r.userId === user?.uid);

    // Check if user is a salon owner
    let isSalonOwner = false;
    if (user) {
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('uid', '==', user.uid));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data();
                isSalonOwner = userData.accountType === 'salon';
            }
        } catch (error) {
            console.error('Error checking user type:', error);
        }
    }

    modalBody.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <img src="${salon.images?.[0] || getPlaceholderImage()}" class="img-fluid rounded mb-3" alt="${salon.name}">
                <p><strong><i class="bi bi-geo-alt-fill me-2"></i>Adresă:</strong> ${salon.address}</p>
                <p><strong><i class="bi bi-telephone-fill me-2"></i>Telefon:</strong> ${salon.phone || 'N/A'}</p>
                <p><strong><i class="bi bi-tags-fill me-2"></i>Categorii:</strong> ${formatCategories(salon.category)}</p>
                ${salon.description ? `<p><strong>Descriere:</strong> ${salon.description}</p>` : ''}
            </div>
            <div class="col-md-6">
                <h6>Program:</h6>
                <ul class="list-unstyled">
                    ${Object.entries(salon.openingHours || {}).map(([day, hours]) =>
        `<li><strong>${day}:</strong> ${hours}</li>`
    ).join('')}
                </ul>
                
                <h6 class="mt-3">Servicii:</h6>
                <ul class="list-unstyled">
                    ${(salon.services || []).map(service =>
        `<li>${service.name} - ${service.price} RON (${service.duration} min)</li>`
    ).join('')}
                </ul>
            </div>
        </div>
        
        <hr class="my-4">
        
        <div class="reviews-section">
            <h5 class="mb-3">
                <i class="bi bi-star-fill me-2"></i>Recenzii
                <span class="badge bg-primary ms-2">${rating.toFixed(1)} ${starsHtml} (${reviewCount})</span>
            </h5>
            
            ${user && !userHasReviewed && !isSalonOwner ? `
                <div class="card mb-4 bg-light">
                    <div class="card-body">
                        <h6>Adaugă o recenzie</h6>
                        <form id="addReviewForm">
                            <div class="mb-3">
                                <label class="form-label">Rating:</label>
                                <div class="star-rating-input">
                                    ${[5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5].map(value => `
                                        <input type="radio" name="rating" value="${value}" id="star${value}" required>
                                        <label for="star${value}" title="${value} stele">${value >= 1 ? '★' : '⯨'}</label>
                                    `).join('')}
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Comentariu (opțional):</label>
                                <textarea class="form-control" id="reviewComment" rows="3"></textarea>
                            </div>
                            <button type="submit" class="btn btn-primary">
                                <i class="bi bi-send me-2"></i>Trimite recenzia
                            </button>
                        </form>
                    </div>
                </div>
            ` : isSalonOwner ? `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Proprietarii de saloane nu pot lăsa recenzii.
                </div>
            ` : !user ? `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    Trebuie să fii autentificat pentru a lăsa o recenzie.
                    <a href="login.html" class="alert-link">Autentifică-te aici</a>
                </div>
            ` : `
                <div class="alert alert-success">
                    <i class="bi bi-check-circle me-2"></i>
                    Ai lăsat deja o recenzie pentru acest salon.
                </div>
            `}
            
            <div id="reviewsList">
                ${reviews.length > 0 ? reviews.map(review => {
        const reviewRating = parseFloat(review.rating);
        const reviewFullStars = Math.floor(reviewRating);
        const reviewHasHalfStar = reviewRating % 1 >= 0.5;
        const reviewEmptyStars = 5 - reviewFullStars - (reviewHasHalfStar ? 1 : 0);
        let reviewStarsHtml = '★'.repeat(reviewFullStars);
        if (reviewHasHalfStar) reviewStarsHtml += '⯨';
        reviewStarsHtml += '☆'.repeat(reviewEmptyStars);

        const date = review.createdAt?.toDate ? review.createdAt.toDate() : new Date(review.createdAt);

        return `
                        <div class="card mb-2">
                            <div class="card-body">
                                <div class="d-flex justify-content-between">
                                    <strong>${review.userName || 'Anonim'}</strong>
                                    <span class="text-warning">${reviewStarsHtml} ${reviewRating.toFixed(1)}</span>
                                </div>
                                ${review.comment ? `<p class="mb-1 mt-2">${review.comment}</p>` : ''}
                                <small class="text-muted">${date.toLocaleDateString('ro-RO')}</small>
                            </div>
                        </div>
                    `;
    }).join('') : '<p class="text-muted">Încă nu există recenzii pentru acest salon.</p>'}
            </div>
        </div>
    `;

    modal.show();

    // Add form submit handler
    const form = document.getElementById('addReviewForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleAddReview(salon.id, form);
        });
    }
}

// Load reviews for a salon
async function loadSalonReviews(salonId) {
    try {
        const reviewsRef = collection(db, 'reviews');
        const q = query(reviewsRef, where('salonId', '==', salonId), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error loading reviews:', error);
        return [];
    }
}

// Handle adding a review
async function handleAddReview(salonId, form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const user = auth.currentUser;

    if (!user) {
        alert('Trebuie să fii autentificat pentru a lăsa o recenzie.');
        return;
    }

    const rating = parseFloat(form.querySelector('input[name="rating"]:checked')?.value);
    const comment = document.getElementById('reviewComment').value.trim();

    if (!rating) {
        alert('Te rog selectează un rating.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Se trimite...';

    try {
        // Add review to Firestore
        const reviewData = {
            salonId: salonId,
            userId: user.uid,
            userName: user.displayName || user.email.split('@')[0],
            rating: rating,
            comment: comment || '',
            createdAt: Timestamp.now()
        };

        await addDoc(collection(db, 'reviews'), reviewData);

        // Recalculate salon rating
        await updateSalonRating(salonId);

        // Reload salon data
        await loadSalons();

        // Close and reopen modal with updated data
        const modal = bootstrap.Modal.getInstance(document.getElementById('salonModal'));
        modal.hide();

        // Find updated salon
        const updatedSalon = salonsData.find(s => s.id === salonId);
        if (updatedSalon) {
            setTimeout(() => showSalonModal(updatedSalon), 300);
        }

    } catch (error) {
        console.error('Error adding review:', error);
        alert('Eroare la adăugarea recenziei: ' + error.message);

        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-send me-2"></i>Trimite recenzia';
    }
}

// Update salon rating based on all reviews
async function updateSalonRating(salonId) {
    try {
        const reviewsRef = collection(db, 'reviews');
        const q = query(reviewsRef, where('salonId', '==', salonId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            // No reviews, set rating to 0
            const salonRef = doc(db, 'salons', salonId);
            await updateDoc(salonRef, {
                rating: 0,
                reviewCount: 0,
                updatedAt: Timestamp.now()
            });
            return;
        }

        // Calculate average rating
        let totalRating = 0;
        snapshot.docs.forEach(doc => {
            const rating = parseFloat(doc.data().rating);
            totalRating += rating;
        });

        const averageRating = totalRating / snapshot.size;
        const reviewCount = snapshot.size;

        // Update salon document
        const salonRef = doc(db, 'salons', salonId);
        await updateDoc(salonRef, {
            rating: parseFloat(averageRating.toFixed(1)),
            reviewCount: reviewCount,
            updatedAt: Timestamp.now()
        });

        console.log(`✅ Updated salon ${salonId} rating: ${averageRating.toFixed(1)} (${reviewCount} reviews)`);

    } catch (error) {
        console.error('Error updating salon rating:', error);
        throw error;
    }
}

// Export for debugging
window.glowMe = { salonsData, filterSalons, searchSalons, loadSalons, showSalonModal };

// ==================== ROUTE PLANNING FUNCTIONALITY ====================

let routeMode = false;
let selectedSalonsForRoute = [];
let routeLayer = null;

function setupRouteListeners() {
    // Start route planning
    document.getElementById('startRouteBtn')?.addEventListener('click', () => {
        activateRouteMode();
    });

    // Cancel route planning
    document.getElementById('cancelRouteBtn')?.addEventListener('click', () => {
        deactivateRouteMode();
    });

    // Calculate route
    document.getElementById('calculateRouteBtn')?.addEventListener('click', () => {
        calculateOptimalRoute();
    });

    // Clear route
    document.getElementById('clearRouteBtn')?.addEventListener('click', () => {
        clearRoute();
    });
}

function activateRouteMode() {
    routeMode = true;
    selectedSalonsForRoute = [];

    document.getElementById('startRouteBtn').classList.add('d-none');
    document.getElementById('routeMode').classList.remove('d-none');
    document.getElementById('routeStats').classList.add('d-none');

    updateSelectedSalonsList();

    // Update salon cards to show selection mode
    document.querySelectorAll('.salon-card').forEach(card => {
        card.style.cursor = 'pointer';
        card.style.border = '2px solid transparent';
    });

    console.log('✅ Route mode activated');
}

function deactivateRouteMode() {
    routeMode = false;
    selectedSalonsForRoute = [];

    document.getElementById('startRouteBtn').classList.remove('d-none');
    document.getElementById('routeMode').classList.add('d-none');

    // Reset salon cards
    document.querySelectorAll('.salon-card').forEach(card => {
        card.style.border = '';
        card.classList.remove('route-selected');
    });

    clearRoute();
    console.log('✅ Route mode deactivated');
}

function toggleSalonForRoute(salonId) {
    if (!routeMode) return;

    const salon = salonsData.find(s => s.id === salonId);
    if (!salon) return;

    const index = selectedSalonsForRoute.findIndex(s => s.id === salonId);

    if (index > -1) {
        // Deselect
        selectedSalonsForRoute.splice(index, 1);
    } else {
        // Select (max 8 salons)
        if (selectedSalonsForRoute.length >= 8) {
            alert('Poți selecta maxim 8 saloane pentru traseu!');
            return;
        }
        selectedSalonsForRoute.push(salon);
    }

    updateSelectedSalonsList();
    updateSalonCardStyles();

    // Enable/disable calculate button
    const calculateBtn = document.getElementById('calculateRouteBtn');
    calculateBtn.disabled = selectedSalonsForRoute.length < 2;
}

function updateSelectedSalonsList() {
    // Update counter in the info alert
    const counterElement = document.getElementById('selectedCount');
    if (counterElement) {
        counterElement.textContent = selectedSalonsForRoute.length;
    }

    // Update salon card numbers to show selection order
    updateSalonCardStyles();
}

function updateSalonCardStyles() {
    document.querySelectorAll('.salon-card').forEach(card => {
        const salonId = card.dataset.id;
        const selectedIndex = selectedSalonsForRoute.findIndex(s => s.id === salonId);
        const isSelected = selectedIndex > -1;

        // Remove existing route badge if any
        const existingBadge = card.querySelector('.route-order-badge');
        if (existingBadge) {
            existingBadge.remove();
        }

        if (isSelected) {
            card.style.border = '2px solid #0d6efd';
            card.classList.add('route-selected');

            // Add order badge
            const badge = document.createElement('span');
            badge.className = 'route-order-badge badge bg-primary position-absolute';
            badge.style.top = '5px';
            badge.style.right = '5px';
            badge.style.fontSize = '0.8rem';
            badge.textContent = selectedIndex + 1;

            card.style.position = 'relative';
            card.appendChild(badge);
        } else {
            card.style.border = '2px solid transparent';
            card.classList.remove('route-selected');
        }
    });
}

function removeSalonFromRoute(salonId) {
    const index = selectedSalonsForRoute.findIndex(s => s.id === salonId);
    if (index > -1) {
        selectedSalonsForRoute.splice(index, 1);
        updateSelectedSalonsList();
        updateSalonCardStyles();

        const calculateBtn = document.getElementById('calculateRouteBtn');
        calculateBtn.disabled = selectedSalonsForRoute.length < 2;
    }
}

async function calculateOptimalRoute() {
    if (selectedSalonsForRoute.length < 2) {
        alert('Selectează cel puțin 2 saloane pentru traseu!');
        return;
    }

    console.log('🗺️ Calculating route for', selectedSalonsForRoute.length, 'salons...');

    const calculateBtn = document.getElementById('calculateRouteBtn');
    calculateBtn.disabled = true;
    calculateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Se calculează...';

    try {
        // Load routing modules
        const modules = await new Promise((resolve, reject) => {
            require([
                "esri/rest/route",
                "esri/rest/support/RouteParameters",
                "esri/rest/support/FeatureSet",
                "esri/Graphic",
                "esri/layers/GraphicsLayer"
            ], (route, RouteParameters, FeatureSet, Graphic, GraphicsLayer) => {
                resolve({ route, RouteParameters, FeatureSet, Graphic, GraphicsLayer });
            }, reject);
        });

        const { route, RouteParameters, FeatureSet, Graphic, GraphicsLayer } = modules;

        const routeUrl = "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World";

        // Create route parameters
        const routeParams = new RouteParameters({
            stops: new FeatureSet({
                features: selectedSalonsForRoute.map(salon => {
                    return new Graphic({
                        geometry: {
                            type: "point",
                            longitude: salon.location.longitude,
                            latitude: salon.location.latitude
                        },
                        attributes: {
                            Name: salon.name
                        }
                    });
                })
            }),
            returnDirections: true,
            directionsLanguage: "ro",
            returnStops: true,
            returnRoutes: true
        });

        console.log('📍 Sending route request...');

        // Solve route
        const result = await route.solve(routeUrl, routeParams);
        console.log('✅ Route calculated:', result);

        displayRoute(result, Graphic, GraphicsLayer);

        calculateBtn.disabled = false;
        calculateBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i>Calculează';

    } catch (error) {
        console.error('❌ Route calculation failed:', error);

        let errorMsg = 'Nu s-a putut calcula traseul.';
        if (error.details && error.details.messages) {
            errorMsg += '\nDetalii: ' + error.details.messages.join(', ');
        } else if (error.message) {
            errorMsg += '\nEroare: ' + error.message;
        }

        alert(errorMsg);

        calculateBtn.disabled = false;
        calculateBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i>Calculează';
    }
}

function displayRoute(result, Graphic, GraphicsLayer) {
    if (!result || !result.routeResults || result.routeResults.length === 0) {
        alert('Nu s-a putut genera traseul.');
        return;
    }

    const routeResult = result.routeResults[0];
    const route = routeResult.route;
    const directions = routeResult.directions;

    // Remove old route layer
    if (routeLayer) {
        map.remove(routeLayer);
    }

    // Create new route layer
    routeLayer = new GraphicsLayer();

    // Array of colors for each segment between stops
    const segmentColors = [
        [34, 139, 34, 0.9],    // Verde (1→2)
        [220, 20, 60, 0.9],    // Roșu (2→3)
        [0, 0, 0, 0.9],        // Negru (3→4)
        [255, 140, 0, 0.9],    // Portocaliu (4→5)
        [138, 43, 226, 0.9],   // Mov (5→6)
        [0, 191, 255, 0.9],    // Albastru deschis (6→7)
        [255, 20, 147, 0.9],   // Roz (7→8)
        [255, 215, 0, 0.9]     // Auriu (8+)
    ];

    // Try to get route geometry and split it by stops
    if (route.geometry && route.geometry.paths && route.geometry.paths.length > 0) {
        const routePath = route.geometry.paths[0];

        // If we have stop features from directions, use them to split the route
        if (directions && directions.features && directions.features.length > 0) {
            // Group direction features by stops
            let currentSegmentIndex = 0;
            let currentSegmentPaths = [];

            directions.features.forEach((feature, idx) => {
                const maneuverType = feature.attributes?.maneuverType;

                // Add geometry paths to current segment
                if (feature.geometry && feature.geometry.paths) {
                    feature.geometry.paths.forEach(path => {
                        currentSegmentPaths.push(...path);
                    });
                }

                // Check if this is the last feature in current segment or end of route
                const isLastInSegment = (idx === directions.features.length - 1) ||
                    (maneuverType === 'esriDMTStop' || maneuverType === 'esriDMTDepart');

                if (currentSegmentPaths.length > 0 && (isLastInSegment || maneuverType === 'esriDMTStop')) {
                    // Create a line for this segment
                    const color = segmentColors[currentSegmentIndex % segmentColors.length];
                    const segmentSymbol = {
                        type: "simple-line",
                        color: color,
                        width: 6,
                        cap: "round",
                        join: "round"
                    };

                    const segmentGraphic = new Graphic({
                        geometry: {
                            type: "polyline",
                            paths: [currentSegmentPaths]
                        },
                        symbol: segmentSymbol
                    });

                    routeLayer.add(segmentGraphic);

                    // Move to next segment
                    if (maneuverType === 'esriDMTStop') {
                        currentSegmentIndex++;
                        currentSegmentPaths = [];
                    }
                }
            });
        } else {
            // Fallback: draw entire route in single color
            const routeSymbol = {
                type: "simple-line",
                color: segmentColors[0],
                width: 6
            };

            const routeGraphic = new Graphic({
                geometry: route.geometry,
                symbol: routeSymbol
            });

            routeLayer.add(routeGraphic);
        }
    }

    // Add numbered markers for stops
    selectedSalonsForRoute.forEach((salon, index) => {
        const stopSymbol = {
            type: "simple-marker",
            style: "circle",
            color: [255, 255, 255],
            size: "24px",
            outline: {
                color: [0, 112, 255],
                width: 3
            }
        };

        const stopGraphic = new Graphic({
            geometry: {
                type: "point",
                longitude: salon.location.longitude,
                latitude: salon.location.latitude
            },
            symbol: stopSymbol
        });

        routeLayer.add(stopGraphic);

        // Add number label
        const textSymbol = {
            type: "text",
            color: [0, 112, 255],
            text: (index + 1).toString(),
            font: {
                size: 14,
                weight: "bold"
            },
            yoffset: 0
        };

        const textGraphic = new Graphic({
            geometry: {
                type: "point",
                longitude: salon.location.longitude,
                latitude: salon.location.latitude
            },
            symbol: textSymbol
        });

        routeLayer.add(textGraphic);
    });

    map.add(routeLayer);

    // Zoom to route extent
    view.goTo({
        target: route.geometry,
        zoom: 13
    });

    // Display route stats
    displayRouteStats(routeResult);

    console.log('✅ Route displayed on map');
}

function displayRouteStats(routeResult) {
    const directions = routeResult.directions;

    // Calculate total distance in km
    const totalDistance = (directions.totalLength / 1000).toFixed(2); // Convert meters to km

    // Calculate total time
    const totalMinutes = Math.round(directions.totalTime);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const timeText = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;

    // Update UI
    document.getElementById('routeDistance').textContent = `${totalDistance} km`;
    document.getElementById('routeTime').textContent = timeText;
    document.getElementById('routeStops').textContent = selectedSalonsForRoute.length;
    document.getElementById('routeStats').classList.remove('d-none');

    console.log(`📊 Route: ${totalDistance}km, ${timeText}, ${selectedSalonsForRoute.length} stops`);
}

function clearRoute() {
    if (routeLayer) {
        map.remove(routeLayer);
        routeLayer = null;
    }

    document.getElementById('routeStats').classList.add('d-none');
    console.log('✅ Route cleared');
}

// Add to window.glowMe for external access
window.glowMe.removeSalonFromRoute = removeSalonFromRoute;
window.glowMe.toggleSalonForRoute = toggleSalonForRoute;
