import {
    auth,
    db,
    collection,
    addDoc,
    doc,
    setDoc,
    Timestamp,
    onAuthStateChanged,
    GeoPoint
} from './firebase-config.js';

const ARCGIS_API_KEY = "AAPTxy8BH1VEsoebNVZXo8HurKyRKW0T3D3lBg7YtPpGSRQjCvrBOY6UXSxft-keBFm6o1e0npr6X7YkStQokX8eSyqhLDsn0wj7IAZOIzvdGLC6M0u-qjkhtML1gfIUUPFdXvYytz0fIbPgi_GlHHzgxKf4jtZEOgujDn7tMumLAlzOWRuyLDa856m8qrBpjedbBXSLlMBHGANuegJsqiLCOP-ddyEoiagXHp2FXcBXo9A.AT1_dliUr4kT";

let map, view, graphicsLayer, currentMarker;

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is authenticated and is a salon owner
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // Check if user has salon owner type in localStorage
        const accountType = localStorage.getItem('accountType');
        if (accountType !== 'salon') {
            alert('Această pagină este disponibilă doar pentru proprietarii de saloane.');
            window.location.href = 'index.html';
            return;
        }

        initializePage();
    });
});

function initializePage() {
    initializeMap();
    setupFormHandlers();
}

function initializeMap() {
    require([
        "esri/config",
        "esri/Map",
        "esri/views/MapView",
        "esri/layers/GraphicsLayer",
        "esri/Graphic",
        "esri/rest/locator"
    ], function (esriConfig, Map, MapView, GraphicsLayer, Graphic, locator) {

        esriConfig.apiKey = ARCGIS_API_KEY;

        graphicsLayer = new GraphicsLayer();

        map = new Map({
            basemap: "streets-navigation-vector",
            layers: [graphicsLayer]
        });

        view = new MapView({
            container: "mapDiv",
            map: map,
            center: [26.1025, 44.4268],
            zoom: 13
        });

        window.arcgisModules = { Graphic, locator };

        // Click on map to set location
        view.on("click", (event) => {
            const lat = event.mapPoint.latitude;
            const lng = event.mapPoint.longitude;

            document.getElementById('latitude').value = lat.toFixed(6);
            document.getElementById('longitude').value = lng.toFixed(6);

            addMarkerToMap(lat, lng);
        });
    });
}

function addMarkerToMap(lat, lng) {
    if (!window.arcgisModules) return;

    const { Graphic } = window.arcgisModules;

    // Remove existing marker
    if (currentMarker) {
        graphicsLayer.remove(currentMarker);
    }

    // Add new marker
    currentMarker = new Graphic({
        geometry: {
            type: "point",
            longitude: lng,
            latitude: lat
        },
        symbol: {
            type: "simple-marker",
            color: "#e91e8c",
            size: "16px",
            outline: {
                color: "white",
                width: 2
            }
        }
    });

    graphicsLayer.add(currentMarker);

    // Center map on marker
    view.goTo({
        center: [lng, lat],
        zoom: 15
    });
}

function setupFormHandlers() {
    // Add service button
    document.getElementById('addServiceBtn')?.addEventListener('click', () => {
        const container = document.getElementById('servicesContainer');
        const serviceItem = document.createElement('div');
        serviceItem.className = 'service-item';
        serviceItem.innerHTML = `
            <div class="row">
                <div class="col-md-6 mb-2">
                    <label class="form-label">Nume serviciu</label>
                    <input type="text" class="form-control service-name" placeholder="Ex: Tuns femei">
                </div>
                <div class="col-md-3 mb-2">
                    <label class="form-label">Preț (RON)</label>
                    <input type="number" class="form-control service-price" placeholder="150">
                </div>
                <div class="col-md-3 mb-2">
                    <label class="form-label">Durată (min)</label>
                    <input type="number" class="form-control service-duration" placeholder="45">
                </div>
            </div>
            <button type="button" class="btn btn-sm btn-outline-danger remove-service">
                <i class="bi bi-trash"></i> Șterge
            </button>
        `;
        container.appendChild(serviceItem);

        // Add remove handler
        serviceItem.querySelector('.remove-service')?.addEventListener('click', () => {
            serviceItem.remove();
        });
    });

    // Add image button
    let imageCount = 1;
    document.getElementById('addImageBtn')?.addEventListener('click', () => {
        imageCount++;
        const container = document.getElementById('imagesContainer');
        const imageDiv = document.createElement('div');
        imageDiv.className = 'mb-3 image-input-group';
        imageDiv.innerHTML = `
            <label class="form-label">URL Imagine ${imageCount}</label>
            <div class="input-group">
                <input type="url" class="form-control image-url" placeholder="https://...">
                <button type="button" class="btn btn-outline-danger remove-image">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(imageDiv);

        // Add remove handler
        imageDiv.querySelector('.remove-image')?.addEventListener('click', () => {
            imageDiv.remove();
        });
    });

    // Handle closed checkbox for opening hours
    const days = ['luni', 'marti', 'miercuri', 'joi', 'vineri', 'sambata', 'duminica'];
    days.forEach(day => {
        const checkbox = document.getElementById(`${day}-closed`);
        const startInput = document.getElementById(`${day}-start`);
        const endInput = document.getElementById(`${day}-end`);

        checkbox?.addEventListener('change', () => {
            if (checkbox.checked) {
                startInput.disabled = true;
                endInput.disabled = true;
            } else {
                startInput.disabled = false;
                endInput.disabled = false;
            }
        });
    });

    // Get current location
    document.getElementById('getCurrentLocation')?.addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;

                    document.getElementById('latitude').value = lat.toFixed(6);
                    document.getElementById('longitude').value = lng.toFixed(6);

                    addMarkerToMap(lat, lng);
                },
                (error) => {
                    alert('Nu s-a putut obține locația curentă: ' + error.message);
                }
            );
        } else {
            alert('Geolocalizarea nu este suportată de browser.');
        }
    });

    // Geocode address
    document.getElementById('geocodeAddress')?.addEventListener('click', async () => {
        const address = document.getElementById('salonAddress').value;

        if (!address) {
            alert('Te rog introdu o adresă.');
            return;
        }

        try {
            const { locator } = window.arcgisModules;

            const geocodeUrl = "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer";

            const params = {
                address: {
                    "SingleLine": address
                }
            };

            const results = await locator.addressToLocations(geocodeUrl, params);

            if (results.length > 0) {
                const lat = results[0].location.latitude;
                const lng = results[0].location.longitude;

                document.getElementById('latitude').value = lat.toFixed(6);
                document.getElementById('longitude').value = lng.toFixed(6);

                addMarkerToMap(lat, lng);
            } else {
                alert('Nu s-a putut găsi adresa. Verifică dacă este corectă.');
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            alert('Eroare la căutarea adresei.');
        }
    });

    // Form submission
    document.getElementById('salonSetupForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSalonSetup();
    });
}

async function handleSalonSetup() {
    const errorDiv = document.getElementById('setupError');
    const successDiv = document.getElementById('setupSuccess');
    const submitBtn = document.querySelector('button[type="submit"]');

    errorDiv.classList.add('d-none');
    successDiv.classList.add('d-none');

    // Get form data
    const salonName = document.getElementById('salonName').value.trim();
    const address = document.getElementById('salonAddress').value.trim();
    const phone = document.getElementById('salonPhone').value.trim();
    const description = document.getElementById('salonDescription').value.trim();
    const lat = parseFloat(document.getElementById('latitude').value);
    const lng = parseFloat(document.getElementById('longitude').value);

    // Get selected categories
    const categories = [];
    document.querySelectorAll('.category-checkbox .form-check-input:checked').forEach(checkbox => {
        categories.push(checkbox.value);
    });

    // Get services
    const services = [];
    document.querySelectorAll('.service-item').forEach(item => {
        const name = item.querySelector('.service-name')?.value.trim();
        const price = parseFloat(item.querySelector('.service-price')?.value);
        const duration = parseInt(item.querySelector('.service-duration')?.value);

        if (name && !isNaN(price) && !isNaN(duration)) {
            services.push({ name, price, duration });
        }
    });

    // Get opening hours
    const openingHours = {};
    const days = ['Luni', 'Marti', 'Miercuri', 'Joi', 'Vineri', 'Sambata', 'Duminica'];
    const dayIds = ['luni', 'marti', 'miercuri', 'joi', 'vineri', 'sambata', 'duminica'];

    dayIds.forEach((dayId, index) => {
        const closed = document.getElementById(`${dayId}-closed`)?.checked;
        if (closed) {
            openingHours[days[index]] = 'Inchis';
        } else {
            const start = document.getElementById(`${dayId}-start`)?.value || '09:00';
            const end = document.getElementById(`${dayId}-end`)?.value || '20:00';
            openingHours[days[index]] = `${start} - ${end}`;
        }
    });

    // Get image URLs
    const images = [];
    document.querySelectorAll('.image-url').forEach(input => {
        const url = input.value.trim();
        if (url) images.push(url);
    });

    // Validation
    if (!salonName || !address || !phone) {
        errorDiv.textContent = 'Te rog completează toate câmpurile obligatorii.';
        errorDiv.classList.remove('d-none');
        return;
    }

    if (categories.length === 0) {
        errorDiv.textContent = 'Te rog selectează cel puțin o categorie de servicii.';
        errorDiv.classList.remove('d-none');
        return;
    }

    if (services.length === 0) {
        errorDiv.textContent = 'Te rog adaugă cel puțin un serviciu.';
        errorDiv.classList.remove('d-none');
        return;
    }

    if (images.length === 0) {
        errorDiv.textContent = 'Te rog adaugă cel puțin o imagine.';
        errorDiv.classList.remove('d-none');
        return;
    }

    if (isNaN(lat) || isNaN(lng)) {
        errorDiv.textContent = 'Te rog introdu coordonate valide sau folosește butoanele pentru localizare.';
        errorDiv.classList.remove('d-none');
        return;
    }

    // Disable button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Se salvează...';

    try {
        const user = auth.currentUser;

        // Create salon document with complete structure
        const salonData = {
            name: salonName,
            address: address,
            phone: phone,
            description: description || '',
            category: categories,
            location: new GeoPoint(lat, lng),
            images: images,
            services: services,
            openingHours: openingHours,
            rating: 0,
            reviewCount: 0,
            ownerId: user.uid,
            ownerEmail: user.email,
            verified: false,
            active: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };

        console.log("📋 Salon data to be saved:", salonData);

        // Add to Firestore
        const docRef = await addDoc(collection(db, "salons"), salonData);

        console.log("✅ Salon created with ID:", docRef.id);

        // Show success
        successDiv.textContent = 'Salonul a fost creat cu succes! Vei fi redirecționat...';
        successDiv.classList.remove('d-none');

        // Clear accountType from localStorage
        localStorage.removeItem('accountType');

        // Redirect after 2 seconds
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);

    } catch (error) {
        console.error('Error creating salon:', error);
        errorDiv.textContent = 'Eroare la crearea salonului: ' + error.message;
        errorDiv.classList.remove('d-none');

        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Salvează și publică salonul';
    }
}
