// 1. Direct CDN Imports (Required for GitHub Pages)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 2. Your exact Firebase configuration keys
const firebaseConfig = {
  apiKey: "AIzaSyCVF-wL74rBralgDJhxATWFmDoyWcHRrro",
  authDomain: "acmemes-2a69e.firebaseapp.com",
  projectId: "acmemes-2a69e",
  storageBucket: "acmemes-2a69e.firebasestorage.app",
  messagingSenderId: "547265374331",
  appId: "1:547265374331:web:68c981e74fb208c2121ade",
  measurementId: "G-RMFPJWJ2V1"
};

// 3. Initialize Firebase Services using your keys
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================================
// 4. UI Logic (DOM Elements)
// ==========================================
const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submit-btn');
const toggleLink = document.getElementById('toggle-link');
const logoutBtn = document.getElementById('logout-btn');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const chatMessages = document.getElementById('chat-messages');

let isSignUpMode = false;
let currentUser = null;

// --- Authentication UI Toggling ---
toggleLink.addEventListener('click', () => {
    isSignUpMode = !isSignUpMode;
    submitBtn.textContent = isSignUpMode ? "Sign Up" : "Login";
    document.getElementById('toggle-auth').innerHTML = isSignUpMode 
        ? 'Already have an account? <span id="toggle-link">Login</span>'
        : 'Don\'t have an account? <span id="toggle-link">Sign Up</span>';
    document.getElementById('toggle-link').addEventListener('click', () => toggleLink.click());
});

// --- Auth Operations ---
authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;

    if (isSignUpMode) {
        createUserWithEmailAndPassword(auth, email, password).catch(err => alert(err.message));
    } else {
        signInWithEmailAndPassword(auth, email, password).catch(err => alert(err.message));
    }
});

logoutBtn.addEventListener('click', () => signOut(auth));

// --- Monitor Auth State Change ---
let unsubscribeChat = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');
        authForm.reset();
        loadMessages();
    } else {
        currentUser = null;
        authContainer.classList.remove('hidden');
        chatContainer.classList.add('hidden');
        if (unsubscribeChat) unsubscribeChat();
        chatMessages.innerHTML = '';
    }
});

// --- Send Messages ---
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;

    try {
        await addDoc(collection(db, "messages"), {
            text: text,
            user: currentUser.email,
            timestamp: serverTimestamp()
        });
        chatForm.reset();
    } catch (err) {
        console.error("Error sending message: ", err);
    }
});

// --- Read Messages in Realtime ---
function loadMessages() {
    const q = query(collection(db, "messages"), orderBy("timestamp", "asc"), limit(50));
    
    unsubscribeChat = onSnapshot(q, (snapshot) => {
        chatMessages.innerHTML = '';
        snapshot.forEach((doc) => {
            const data = doc.data();
            const messageEl = document.createElement('div');
            
            const isSentByMe = data.user === currentUser.email;
            messageEl.className = `msg ${isSentByMe ? 'sent' : 'received'}`;
            
            messageEl.innerHTML = `
                <span class="msg-user">${data.user}</span>
                <span class="msg-text">${escapeHTML(data.text || '')}</span>
            `;
            chatMessages.appendChild(messageEl);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

// Simple security helper to escape text input
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}
