import { db, auth, collection, getDocs, onAuthStateChanged, signOut } from './firebase-config.js';

const ARCGIS_API_KEY = "AAPTxy8BH1VEsoebNVZXo8HurKyRKW0T3D3lBg7YtPpGSRQjCvrBOY6UXSxft-keBFm6o1e0npr6X7YkStQokX8eSyqhLDsn0wj7IAZOIzvdGLC6M0u-qjkhtML1gfIUUPFdXvYytz0fIbPgi_GlHHzgxKf4jtZEOgujDn7tMumLAlzOWRuyLDa856m8qrBpjedbBXSLlMBHGANuegJsqiLCOP-ddyEoiagXHp2FXcBXo9A.AT1_dliUr4kT";

let map, view, heatmapLayer, graphicsLayer;
let salonsData = [];
let categoryChart, ratingChart;

document.addEventListener('DOMContentLoaded', () => {
    console.log("📊 Dashboard starting...");
    initializeDashboard();
});

async function initializeDashboard() {
    try {
        onAuthStateChanged(auth, handleAuthStateChange);
        await loadSalonsData();
        initializeMap();
        initializeCharts();
        calculateOpportunities();
        setupEventListeners();
    } catch (error) {
        console.error("❌ Dashboard init error:", error);
    }
}

async function handleAuthStateChange(user) {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const addSalonMenuItem = document.getElementById('addSalonMenuItem');
    const menuDivider = document.getElementById('menuDivider');

    if (user) {
        authButtons?.classList.add('d-none');
        userMenu?.classList.remove('d-none');
        if (userName) userName.textContent = user.displayName || user.email?.split('@')[0];

        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('uid', '==', user.uid));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data();
                if (userData.accountType === 'salon') {
                    addSalonMenuItem?.classList.remove('d-none');
                    if (menuDivider) menuDivider.style.display = 'block';
                }
            }
        } catch (error) {
            console.error("Error checking user type:", error);
        }
    } else {
        authButtons?.classList.remove('d-none');
        userMenu?.classList.add('d-none');
    }

    // Logout handler
    document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            console.error("Logout error:", error);
        }
    });
}

async function loadSalonsData() {
    console.log("📍 Loading salons data...");
    try {
        const querySnapshot = await getDocs(collection(db, "salons"));

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

            return { id: doc.id, ...data, location };
        }).filter(salon => salon.location);

        console.log(`✅ Loaded ${salonsData.length} salons`);
        updateStats();
    } catch (error) {
        console.error("❌ Error loading salons:", error);
    }
}

function updateStats() {
    // Total salons
    document.getElementById('totalSalons').textContent = salonsData.length;

    // Average rating
    const avgRating = salonsData.reduce((sum, s) => sum + (s.rating || 0), 0) / salonsData.length;
    document.getElementById('avgRating').textContent = avgRating.toFixed(1);

    // Unique categories
    const categories = [...new Set(salonsData.map(s => s.category))];
    document.getElementById('totalCategories').textContent = categories.length;

    // Zones covered (simplified - count unique approximate areas)
    const zones = new Set();
    salonsData.forEach(s => {
        if (s.location) {
            const zoneKey = `${Math.floor(s.location.latitude * 100)}_${Math.floor(s.location.longitude * 100)}`;
            zones.add(zoneKey);
        }
    });
    document.getElementById('totalZones').textContent = zones.size;
}

function initializeMap() {
    console.log("🗺️ Initializing heatmap...");

    require([
        "esri/config",
        "esri/Map",
        "esri/views/MapView",
        "esri/layers/FeatureLayer",
        "esri/renderers/HeatmapRenderer",
        "esri/layers/GraphicsLayer",
        "esri/Graphic"
    ], function (esriConfig, Map, MapView, FeatureLayer, HeatmapRenderer, GraphicsLayer, Graphic) {

        esriConfig.apiKey = ARCGIS_API_KEY;

        graphicsLayer = new GraphicsLayer();

        map = new Map({
            basemap: "gray-vector",
            layers: [graphicsLayer]
        });

        view = new MapView({
            container: "heatmapDiv",
            map: map,
            center: [26.1025, 44.4268], // Bucharest
            zoom: 12
        });

        window.esriModules = { FeatureLayer, HeatmapRenderer, Graphic };

        view.when(() => {
            console.log("✅ Heatmap ready!");
            applyHeatmap('density');
        }).catch(err => {
            console.error("❌ Map error:", err);
        });
    });
}

function applyHeatmap(type) {
    if (!window.esriModules || !view) {
        console.warn("Map not ready yet");
        return;
    }

    const { FeatureLayer, HeatmapRenderer, Graphic } = window.esriModules;
    const category = document.getElementById('categoryFilter').value;
    const intensity = parseInt(document.getElementById('intensitySlider').value);

    // Filter salons
    let filteredSalons = salonsData;
    if (category !== 'all') {
        filteredSalons = salonsData.filter(s => s.category === category);
    }

    // Create graphics for heatmap
    const features = filteredSalons.map(salon => {
        return new Graphic({
            geometry: {
                type: "point",
                longitude: salon.location.longitude,
                latitude: salon.location.latitude
            },
            attributes: {
                name: salon.name,
                category: salon.category,
                rating: salon.rating || 0,
                weight: type === 'opportunity' ? calculateOpportunityScore(salon) : 1
            }
        });
    });

    // Remove old heatmap layer
    if (heatmapLayer) {
        map.remove(heatmapLayer);
    }

    // Create heatmap renderer
    const heatmapRenderer = new HeatmapRenderer({
        field: "weight",
        colorStops: type === 'opportunity' ? [
            { color: [255, 0, 0, 0.7], ratio: 0 },      // Red - low opportunity
            { color: [255, 165, 0, 0.7], ratio: 0.3 },  // Orange
            { color: [255, 255, 0, 0.7], ratio: 0.6 },  // Yellow
            { color: [0, 255, 0, 0.7], ratio: 1 }       // Green - high opportunity
        ] : [
            { color: [0, 255, 0, 0], ratio: 0 },        // Transparent
            { color: [255, 255, 0, 0.7], ratio: 0.4 },  // Yellow
            { color: [255, 165, 0, 0.7], ratio: 0.7 },  // Orange
            { color: [255, 0, 0, 0.7], ratio: 1 }       // Red - high density
        ],
        radius: 20 + (intensity * 2),
        maxDensity: 0.01,
        minDensity: 0
    });

    // Create feature layer with heatmap
    heatmapLayer = new FeatureLayer({
        source: features,
        objectIdField: "ObjectID",
        fields: [
            { name: "ObjectID", type: "oid" },
            { name: "name", type: "string" },
            { name: "category", type: "string" },
            { name: "rating", type: "double" },
            { name: "weight", type: "double" }
        ],
        renderer: heatmapRenderer,
        popupEnabled: false
    });

    map.add(heatmapLayer);
    console.log(`✅ Heatmap applied: ${type}, ${filteredSalons.length} points`);
}

function calculateOpportunityScore(salon) {
    // Algorithm for opportunity score
    // Score = Distance to nearest competitor * 30 + (5 - avg rating in area) * 30 + category scarcity * 40

    const nearestDistance = findNearestCompetitorDistance(salon);
    const areaRating = calculateAreaAverageRating(salon);
    const categoryScarcity = calculateCategoryScarcity(salon);

    const distanceScore = Math.min(nearestDistance / 2, 30); // Max 30 points
    const ratingScore = (5 - areaRating) * 6; // Max 30 points
    const scarcityScore = categoryScarcity * 40; // Max 40 points

    return Math.min(distanceScore + ratingScore + scarcityScore, 100);
}

function findNearestCompetitorDistance(salon) {
    let minDistance = Infinity;

    salonsData.forEach(other => {
        if (other.id === salon.id || other.category !== salon.category) return;

        const distance = calculateDistance(
            salon.location.latitude, salon.location.longitude,
            other.location.latitude, other.location.longitude
        );

        if (distance < minDistance) {
            minDistance = distance;
        }
    });

    return minDistance === Infinity ? 5 : minDistance; // Default 5km if no competitors
}

function calculateAreaAverageRating(salon, radius = 2) {
    const nearbySlons = salonsData.filter(other => {
        if (other.category !== salon.category) return false;

        const distance = calculateDistance(
            salon.location.latitude, salon.location.longitude,
            other.location.latitude, other.location.longitude
        );

        return distance <= radius;
    });

    if (nearbySlons.length === 0) return 3; // Default average

    const avgRating = nearbySlons.reduce((sum, s) => sum + (s.rating || 0), 0) / nearbySlons.length;
    return avgRating;
}

function calculateCategoryScarcity(salon) {
    const categoryCount = salonsData.filter(s => s.category === salon.category).length;
    const totalCount = salonsData.length;

    // Less salons in category = higher scarcity (0 to 1)
    return 1 - (categoryCount / totalCount);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function calculateOpportunities() {
    console.log("🎯 Calculating opportunities...");

    // Create grid of points across Bucharest
    const minLat = 44.35, maxLat = 44.52;
    const minLng = 25.95, maxLng = 26.25;
    const gridSize = 0.02; // ~2km grid

    const opportunities = [];

    for (let lat = minLat; lat < maxLat; lat += gridSize) {
        for (let lng = minLng; lng < maxLng; lng += gridSize) {
            const point = {
                latitude: lat + gridSize / 2,
                longitude: lng + gridSize / 2,
                location: { latitude: lat + gridSize / 2, longitude: lng + gridSize / 2 }
            };

            // Calculate metrics for this point
            const nearestSalons = findNearestSalons(point, 3);
            if (nearestSalons.length === 0) continue;

            const avgDistance = nearestSalons.reduce((sum, s) => sum + s.distance, 0) / nearestSalons.length;
            const avgRating = nearestSalons.reduce((sum, s) => sum + (s.salon.rating || 0), 0) / nearestSalons.length;
            const categories = [...new Set(nearestSalons.map(s => s.salon.category))];

            // Opportunity score
            const distanceScore = Math.min(avgDistance * 15, 40);
            const ratingScore = (5 - avgRating) * 10;
            const diversityScore = (6 - categories.length) * 5;

            const score = distanceScore + ratingScore + diversityScore;

            if (score > 30) {
                opportunities.push({
                    location: point,
                    score: score,
                    avgDistance: avgDistance.toFixed(2),
                    avgRating: avgRating.toFixed(1),
                    nearbyCategories: categories,
                    recommendation: getRecommendation(categories)
                });
            }
        }
    }

    // Sort by score
    opportunities.sort((a, b) => b.score - a.score);

    displayOpportunities(opportunities.slice(0, 10));
}

function findNearestSalons(point, count) {
    const distances = salonsData.map(salon => ({
        salon: salon,
        distance: calculateDistance(
            point.latitude, point.longitude,
            salon.location.latitude, salon.location.longitude
        )
    }));

    distances.sort((a, b) => a.distance - b.distance);
    return distances.slice(0, count);
}

function getRecommendation(existingCategories) {
    const allCategories = ['Coafor', 'Nails', 'Barber', 'Spa', 'Makeup', 'Cosmetica'];
    const missing = allCategories.filter(c => !existingCategories.includes(c));

    if (missing.length > 0) {
        return `Lipsește: ${missing.join(', ')}`;
    }
    return 'Toate categoriile prezente';
}

function displayOpportunities(opportunities) {
    const container = document.getElementById('opportunityList');

    if (opportunities.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Nu s-au găsit zone cu oportunități semnificative.</p>';
        return;
    }

    let html = '';
    opportunities.forEach((opp, index) => {
        const level = opp.score > 60 ? 'high' : (opp.score > 40 ? 'medium' : 'low');
        const badgeClass = opp.score > 60 ? 'success' : (opp.score > 40 ? 'warning' : 'danger');

        html += `
            <div class="opportunity-card opportunity-${level} card p-3">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <h6 class="mb-1">
                            <i class="bi bi-geo-alt-fill me-2"></i>
                            Zona ${index + 1} - Lat: ${opp.location.latitude.toFixed(4)}, Lng: ${opp.location.longitude.toFixed(4)}
                        </h6>
                        <span class="badge bg-${badgeClass}">Scor: ${opp.score.toFixed(0)}/100</span>
                    </div>
                </div>
                <div class="row small">
                    <div class="col-md-4">
                        <strong><i class="bi bi-rulers me-1"></i>Distanță medie:</strong> ${opp.avgDistance} km
                    </div>
                    <div class="col-md-4">
                        <strong><i class="bi bi-star-fill me-1"></i>Rating mediu zonă:</strong> ${opp.avgRating}/5
                    </div>
                    <div class="col-md-4">
                        <strong><i class="bi bi-tags-fill me-1"></i>Categorii apropiate:</strong> ${opp.nearbyCategories.length}
                    </div>
                </div>
                <div class="mt-2 small">
                    <strong><i class="bi bi-lightbulb-fill me-1"></i>Recomandare:</strong> ${opp.recommendation}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function initializeCharts() {
    createCategoryChart();
    createRatingChart();
}

function createCategoryChart() {
    const ctx = document.getElementById('categoryChart').getContext('2d');

    // Count salons by category
    const categoryCounts = {};
    salonsData.forEach(salon => {
        categoryCounts[salon.category] = (categoryCounts[salon.category] || 0) + 1;
    });

    const labels = Object.keys(categoryCounts);
    const data = Object.values(categoryCounts);

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(255, 159, 64, 0.8)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: false
                }
            }
        }
    });
}

function createRatingChart() {
    const ctx = document.getElementById('ratingChart').getContext('2d');

    // Get top 10 salons by rating
    const topSalons = [...salonsData]
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 10);

    const labels = topSalons.map(s => s.name.length > 20 ? s.name.substring(0, 20) + '...' : s.name);
    const data = topSalons.map(s => s.rating || 0);

    ratingChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Rating',
                data: data,
                backgroundColor: 'rgba(54, 162, 235, 0.8)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true,
                    max: 5
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function setupEventListeners() {
    // Apply heatmap button
    document.getElementById('applyHeatmap')?.addEventListener('click', () => {
        const type = document.querySelector('input[name="heatmapType"]:checked').value;
        applyHeatmap(type);
    });

    // Category filter change
    document.getElementById('categoryFilter')?.addEventListener('change', () => {
        const type = document.querySelector('input[name="heatmapType"]:checked').value;
        applyHeatmap(type);
    });

    // Intensity slider
    document.getElementById('intensitySlider')?.addEventListener('change', () => {
        const type = document.querySelector('input[name="heatmapType"]:checked').value;
        applyHeatmap(type);
    });

    // Heatmap type radio buttons
    document.querySelectorAll('input[name="heatmapType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            applyHeatmap(e.target.value);
        });
    });
}
