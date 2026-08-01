# 💄 GlowMe — Discover Nearby Beauty Salons

**GlowMe** is a web-based location platform designed to help users discover, explore, and book appointments at beauty salons near them. Built with a modern web stack and integrated with Firebase services, GlowMe offers seamless experiences for everyday clients, salon owners, and system administrators.

---

## ✨ Features

### 👤 For Clients (Users)
* **Interactive Map & Discovery:** Browse nearby beauty salons on an interactive map.
* **Filter & Search:** Filter salons by service categories (hair, nails, makeup, skincare, etc.), distance, or ratings.
* **Authentication:** Secure user signup and sign-in powered by Firebase Auth.
* **User Dashboard:** View saved favorite salons, upcoming appointments, and booking history.

### ✂️ For Salon Owners
* **Salon Onboarding & Setup (`salon-setup.html`):** Easily register your business, add location coordinates, upload photos, and list services/pricing.
* **Business Management:** Manage salon details, working hours, and incoming client requests.

### 🛡️ For Administrators (`admin.html`)
* **Admin Dashboard:** Platform-wide oversight to approve new salon listings, manage user roles, and monitor application activity.

---

## 📁 Repository Structure

```text
Proiect-isi/
├── admin.html               # Admin management interface
├── dashboard.html           # User dashboard (history, saved salons)
├── index.html               # Landing page with interactive map
├── login.html               # User authentication (Login)
├── register.html            # User authentication (Register)
├── salon-setup.html         # Business onboarding for salon owners
├── Proiect_ISI.pdf          # Project documentation / architecture overview
├── css/
│   ├── auth.css             # Styling for login & register forms
│   └── styles.css           # Global application styles
├── data/
│   └── db-schema.json       # Database schema definition
└── js/
    ├── app.js               # Main application logic & map initialization
    ├── auth.js              # Authentication state handlers
    ├── dashboard.js         # User dashboard interactions
    ├── firebase-config.js   # Firebase initialization & API credentials
    ├── populate-db.js       # Script/utility to seed mock salon data
    └── salon-setup.js       # Onboarding logic for new salons
