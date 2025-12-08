import {
    db,
    collection,
    addDoc,
    getDocs,
    GeoPoint,
    Timestamp
} from './firebase-config.js';

// Demo salons data
const demoSalons = [
    {
        name: "Glow Beauty Salon",
        address: "Str. Victoriei 45, București",
        location: new GeoPoint(44.4378, 26.0946),
        category: ["Coafor", "Makeup"],
        rating: 4.8,
        phone: "0721 123 456",
        website: "https://glowbeauty.ro",
        images: ["https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400"],
        openingHours: {
            "Luni": "09:00-20:00",
            "Marți": "09:00-20:00",
            "Miercuri": "09:00-20:00",
            "Joi": "09:00-20:00",
            "Vineri": "09:00-20:00",
            "Sâmbătă": "10:00-18:00",
            "Duminică": "Închis"
        },
        services: [
            { name: "Tuns damă", price: 50, duration: 30 },
            { name: "Vopsit", price: 150, duration: 90 },
            { name: "Coafat", price: 80, duration: 45 },
            { name: "Tratament păr", price: 100, duration: 60 }
        ],
        createdAt: Timestamp.now()
    },
    {
        name: "Nails & Beauty Studio",
        address: "Bd. Unirii 23, București",
        location: new GeoPoint(44.4268, 26.1025),
        category: ["Nails", "Cosmetica"],
        rating: 4.6,
        phone: "0722 234 567",
        website: "https://nailsbeauty.ro",
        images: ["https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400"],
        openingHours: {
            "Luni": "10:00-19:00",
            "Marți": "10:00-19:00",
            "Miercuri": "10:00-19:00",
            "Joi": "10:00-19:00",
            "Vineri": "10:00-19:00",
            "Sâmbătă": "10:00-16:00",
            "Duminică": "Închis"
        },
        services: [
            { name: "Manichiură simplă", price: 40, duration: 30 },
            { name: "Manichiură cu gel", price: 80, duration: 60 },
            { name: "Pedichiură", price: 70, duration: 45 },
            { name: "Nail art", price: 50, duration: 30 }
        ],
        createdAt: Timestamp.now()
    },
    {
        name: "Barber Kings",
        address: "Str. Lipscani 12, București",
        location: new GeoPoint(44.4312, 26.0987),
        category: ["Barber"],
        rating: 4.9,
        phone: "0723 345 678",
        website: "https://barberkings.ro",
        images: ["https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400"],
        openingHours: {
            "Luni": "09:00-21:00",
            "Marți": "09:00-21:00",
            "Miercuri": "09:00-21:00",
            "Joi": "09:00-21:00",
            "Vineri": "09:00-21:00",
            "Sâmbătă": "10:00-20:00",
            "Duminică": "11:00-18:00"
        },
        services: [
            { name: "Tuns bărbați", price: 40, duration: 25 },
            { name: "Bărbierit clasic", price: 30, duration: 20 },
            { name: "Tuns + Bărbierit", price: 60, duration: 40 },
            { name: "Aranjare barbă", price: 25, duration: 15 }
        ],
        createdAt: Timestamp.now()
    },
    {
        name: "Zen Spa & Wellness",
        address: "Calea Dorobanți 88, București",
        location: new GeoPoint(44.4512, 26.0856),
        category: ["Spa", "Cosmetica"],
        rating: 4.7,
        phone: "0724 456 789",
        website: "https://zenspa.ro",
        images: ["https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400"],
        openingHours: {
            "Luni": "10:00-22:00",
            "Marți": "10:00-22:00",
            "Miercuri": "10:00-22:00",
            "Joi": "10:00-22:00",
            "Vineri": "10:00-22:00",
            "Sâmbătă": "10:00-22:00",
            "Duminică": "10:00-20:00"
        },
        services: [
            { name: "Masaj relaxare", price: 150, duration: 60 },
            { name: "Masaj terapeutic", price: 180, duration: 60 },
            { name: "Saună + Jacuzzi", price: 100, duration: 90 },
            { name: "Împachetări corporale", price: 200, duration: 75 }
        ],
        createdAt: Timestamp.now()
    },
    {
        name: "Perfect Makeup Studio",
        address: "Str. Franceza 28, București",
        location: new GeoPoint(44.4289, 26.1089),
        category: ["Makeup", "Coafor"],
        rating: 4.5,
        phone: "0725 567 890",
        website: "https://perfectmakeup.ro",
        images: ["https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400"],
        openingHours: {
            "Luni": "09:00-19:00",
            "Marți": "09:00-19:00",
            "Miercuri": "09:00-19:00",
            "Joi": "09:00-19:00",
            "Vineri": "09:00-19:00",
            "Sâmbătă": "09:00-17:00",
            "Duminică": "Închis"
        },
        services: [
            { name: "Machiaj de zi", price: 100, duration: 45 },
            { name: "Machiaj de seară", price: 150, duration: 60 },
            { name: "Machiaj mireasă", price: 300, duration: 90 },
            { name: "Curs machiaj", price: 500, duration: 180 }
        ],
        createdAt: Timestamp.now()
    },
    {
        name: "Skin Care Expert",
        address: "Bd. Magheru 35, București",
        location: new GeoPoint(44.4398, 26.0967),
        category: ["Cosmetica"],
        rating: 4.8,
        phone: "0726 678 901",
        website: "https://skincareexpert.ro",
        images: ["https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400"],
        openingHours: {
            "Luni": "10:00-20:00",
            "Marți": "10:00-20:00",
            "Miercuri": "10:00-20:00",
            "Joi": "10:00-20:00",
            "Vineri": "10:00-20:00",
            "Sâmbătă": "10:00-17:00",
            "Duminică": "Închis"
        },
        services: [
            { name: "Tratament facial", price: 120, duration: 60 },
            { name: "Curățare ten", price: 80, duration: 45 },
            { name: "Peeling chimic", price: 200, duration: 30 },
            { name: "Microdermabraziune", price: 250, duration: 45 }
        ],
        createdAt: Timestamp.now()
    }
];

// Demo categories
const demoCategories = [
    { name: "Coafor", icon: "bi-scissors", description: "Saloane de coafură și hair styling" },
    { name: "Nails", icon: "bi-hand-index", description: "Manichiură, pedichiură și nail art" },
    { name: "Barber", icon: "bi-person", description: "Frizerii și barber shop-uri" },
    { name: "Spa", icon: "bi-droplet", description: "Spa, masaj și wellness" },
    { name: "Makeup", icon: "bi-palette", description: "Studiouri de machiaj profesional" },
    { name: "Cosmetica", icon: "bi-brush", description: "Tratamente cosmetice și dermato-cosmetice" }
];

// Populate salons
async function populateSalons() {
    console.log("🔄 Checking existing salons...");

    const salonsRef = collection(db, 'salons');
    const snapshot = await getDocs(salonsRef);

    if (!snapshot.empty) {
        console.log(`⚠️ Database already has ${snapshot.size} salons. Skipping...`);
        return;
    }

    console.log("📝 Adding demo salons...");

    for (const salon of demoSalons) {
        try {
            const docRef = await addDoc(salonsRef, salon);
            console.log(`✅ Added: ${salon.name} (${docRef.id})`);
        } catch (error) {
            console.error(`❌ Error adding ${salon.name}:`, error);
        }
    }

    console.log("✅ Salons populated successfully!");
}

// Populate categories
async function populateCategories() {
    console.log("🔄 Checking existing categories...");

    const categoriesRef = collection(db, 'categories');
    const snapshot = await getDocs(categoriesRef);

    if (!snapshot.empty) {
        console.log(`⚠️ Database already has ${snapshot.size} categories. Skipping...`);
        return;
    }

    console.log("📝 Adding categories...");

    for (const category of demoCategories) {
        try {
            const docRef = await addDoc(categoriesRef, category);
            console.log(`✅ Added category: ${category.name} (${docRef.id})`);
        } catch (error) {
            console.error(`❌ Error adding ${category.name}:`, error);
        }
    }

    console.log("✅ Categories populated successfully!");
}

// Main populate function
async function populateDatabase() {
    console.log("🚀 Starting database population...\n");

    await populateSalons();
    console.log("");
    await populateCategories();

    console.log("\n🎉 Database population complete!");
}

// Run if loaded directly
populateDatabase();

// Export for use in console
window.populateDatabase = populateDatabase;
