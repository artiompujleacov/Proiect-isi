import { 
    auth, 
    db,
    googleProvider,
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signInWithPopup,
    updateProfile,
    collection,
    addDoc,
    doc,
    getDoc,
    Timestamp
} from './firebase-config.js';

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    setupLoginForm();
    setupRegisterForm();
    setupPasswordToggle();
    setupGoogleAuth();
});

// ===== LOGIN FORM =====
function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        
        // Disable button and show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Se conectează...';
        errorDiv.classList.add('d-none');
        
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log("✅ Login successful:", userCredential.user.email);
            
            // Redirect to home
            window.location.href = 'index.html';
            
        } catch (error) {
            console.error("Login error:", error);
            
            let errorMessage = 'A apărut o eroare la conectare.';
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'Nu există un cont cu această adresă de email.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Parola introdusă este incorectă.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Adresa de email nu este validă.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Prea multe încercări. Încearcă din nou mai târziu.';
                    break;
                case 'auth/invalid-credential':
                    errorMessage = 'Email sau parolă incorectă.';
                    break;
            }
            
            errorDiv.textContent = errorMessage;
            errorDiv.classList.remove('d-none');
            
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Conectare';
        }
    });
}

// ===== REGISTER FORM =====
function setupRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;
    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone')?.value || '';
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const errorDiv = document.getElementById('registerError');
        const successDiv = document.getElementById('registerSuccess');
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        
        // Reset messages
        errorDiv.classList.add('d-none');
        successDiv.classList.add('d-none');
        
        // Validate passwords match
        if (password !== confirmPassword) {
            errorDiv.textContent = 'Parolele nu coincid.';
            errorDiv.classList.remove('d-none');
            return;
        }
        
        // Validate password length
        if (password.length < 6) {
            errorDiv.textContent = 'Parola trebuie să aibă cel puțin 6 caractere.';
            errorDiv.classList.remove('d-none');
            return;
        }
        
        // Disable button and show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Se creează contul...';
        
        try {
            // Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Update profile with name
            await updateProfile(user, {
                displayName: name
            });
            
            // Save user data to Firestore
            await addDoc(collection(db, 'users'), {
                uid: user.uid,
                name: name,
                email: email,
                phone: phone,
                photo: '',
                favoriteSalons: [],
                createdAt: Timestamp.now()
            });
            
            console.log("✅ Registration successful:", user.email);
            
            // Show success message
            successDiv.textContent = 'Cont creat cu succes! Vei fi redirecționat...';
            successDiv.classList.remove('d-none');
            
            // Redirect after 2 seconds
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            
        } catch (error) {
            console.error("Registration error:", error);
            
            let errorMessage = 'A apărut o eroare la înregistrare.';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Există deja un cont cu această adresă de email.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Adresa de email nu este validă.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Parola este prea slabă. Folosește cel puțin 6 caractere.';
                    break;
            }
            
            errorDiv.textContent = errorMessage;
            errorDiv.classList.remove('d-none');
            
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-person-plus me-2"></i>Creează cont';
        }
    });
}

// ===== PASSWORD TOGGLE =====
function setupPasswordToggle() {
    const toggleBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    if (!toggleBtn || !passwordInput) return;
    
    toggleBtn.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        
        const icon = toggleBtn.querySelector('i');
        icon.classList.toggle('bi-eye');
        icon.classList.toggle('bi-eye-slash');
    });
}

// ===== GOOGLE AUTH =====
function setupGoogleAuth() {
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const googleRegisterBtn = document.getElementById('googleRegisterBtn');
    
    const handleGoogleAuth = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            
            console.log("✅ Google auth successful:", user.email);
            
            // Check if user exists in Firestore, if not create
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('uid', '==', user.uid));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                // Create user document
                await addDoc(collection(db, 'users'), {
                    uid: user.uid,
                    name: user.displayName || '',
                    email: user.email,
                    phone: user.phoneNumber || '',
                    photo: user.photoURL || '',
                    favoriteSalons: [],
                    createdAt: Timestamp.now()
                });
            }
            
            // Redirect to home
            window.location.href = 'index.html';
            
        } catch (error) {
            console.error("Google auth error:", error);
            
            const errorDiv = document.getElementById('loginError') || document.getElementById('registerError');
            if (errorDiv) {
                errorDiv.textContent = 'Eroare la autentificarea cu Google. Încearcă din nou.';
                errorDiv.classList.remove('d-none');
            }
        }
    };
    
    googleLoginBtn?.addEventListener('click', handleGoogleAuth);
    googleRegisterBtn?.addEventListener('click', handleGoogleAuth);
}

// Import missing functions
import { query, where, getDocs } from './firebase-config.js';
