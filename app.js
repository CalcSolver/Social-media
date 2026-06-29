import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, setDoc, getDocs, query, orderBy, limit, onSnapshot, serverTimestamp, where, or } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Your exact configuration block
const firebaseConfig = {
  apiKey: "AIzaSyCVF-wL74rBralgDJhxATWFmDoyWcHRrro",
  authDomain: "acmemes-2a69e.firebaseapp.com",
  projectId: "acmemes-2a69e",
  storageBucket: "acmemes-2a69e.firebasestorage.app",
  messagingSenderId: "547265374331",
  appId: "1:547265374331:web:68c981e74fb208c2121ade",
  measurementId: "G-RMFPJWJ2V1"
};

// Initialization
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM Mapping
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authForm = document.getElementById('auth-form');
const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submit-btn');
const toggleLink = document.getElementById('toggle-link');
const logoutBtn = document.getElementById('logout-btn');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const mediaInput = document.getElementById('media-input');
const chatMessages = document.getElementById('chat-messages');
const myDisplayName = document.getElementById('my-display-name');
const currentRoomTitle = document.getElementById('current-room-title');
const targetPublicBtn = document.getElementById('target-public');
const usersList = document.getElementById('users-list');

let isSignUpMode = false;
let currentUser = null;
let currentChatMode = "public"; // Can be "public" or an email address string for DMs
let unsubscribeChat = null;

// Toggle Login / Signup UI view
toggleLink.addEventListener('click', () => {
    isSignUpMode = !isSignUpMode;
    submitBtn.textContent = isSignUpMode ? "Sign Up" : "Login";
    usernameInput.style.display = isSignUpMode ? "block" : "none";
    document.getElementById('toggle-auth').innerHTML = isSignUpMode 
        ? 'Already have an account? <span id="toggle-link">Login</span>'
        : 'Don\'t have an account? <span id="toggle-link">Sign Up</span>';
    document.getElementById('toggle-link').addEventListener('click', () => toggleLink.click());
});

// Authentication handlers
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const name = usernameInput.value.trim();

    try {
        if (isSignUpMode) {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: name || email.split('@')[0] });
            // Save profile details in Firestore
            await setDoc(doc(db, "users", userCredential.user.uid), {
                uid: userCredential.user.uid,
                displayName: userCredential.user.displayName,
                email: email
            });
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (err) {
        alert(err.message);
    }
});

logoutBtn.addEventListener('click', () => signOut(auth));

// Handle Session State Channels
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        myDisplayName.textContent = user.displayName || user.email;
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        switchChannel("public");
        loadUsersDirectory();
    } else {
        currentUser = null;
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
        if (unsubscribeChat) unsubscribeChat();
    }
});

// Load all system users to generate the side DM list
async function loadUsersDirectory() {
    usersList.innerHTML = '';
    const querySnapshot = await getDocs(collection(db, "users"));
    querySnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.email !== currentUser.email) {
            const btn = document.createElement('button');
            btn.className = 'target-btn';
            btn.textContent = `💬 ${userData.displayName || userData.email}`;
            btn.addEventListener('click', () => {
                document.querySelectorAll('.target-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                switchChannel(userData.email);
            });
            usersList.appendChild(btn);
        }
    });
}

targetPublicBtn.addEventListener('click', () => {
    document.querySelectorAll('.target-btn').forEach(b => b.classList.remove('active'));
    targetPublicBtn.classList.add('active');
    switchChannel("public");
});

function switchChannel(mode) {
    currentChatMode = mode;
    currentRoomTitle.textContent = mode === "public" ? "Global Chat" : `Direct Message: ${mode}`;
    loadMessages();
}

// Media Upload Listener Alert feedback
mediaInput.addEventListener('change', () => {
    if(mediaInput.files[0]) {
        messageInput.placeholder = `📎 File attached: ${mediaInput.files[0].name}`;
    }
});

// Dispatch Messaging & File Storage Routing
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    const file = mediaInput.files[0];
    if (!text && !file) return;

    let fileUrl = null;
    let fileType = null;

    try {
        if (file) {
            messageInput.placeholder = "Uploading file, please wait...";
            const fileRef = ref(storage, `chats/${Date.now()}_${file.name}`);
            const uploadSnapshot = await uploadBytes(fileRef, file);
            fileUrl = await getDownloadURL(uploadSnapshot.ref);
            fileType = file.type.startsWith('image/') ? 'image' : 'video';
        }

        const payload = {
            text: text,
            user: currentUser.email,
            displayName: currentUser.displayName || currentUser.email,
            timestamp: serverTimestamp(),
            ...(fileUrl && { fileUrl, fileType })
        };

        if (currentChatMode === "public") {
            await addDoc(collection(db, "messages"), payload);
        } else {
            // Private DM routing setup mapping participants array
            payload.participants = [currentUser.email, currentChatMode];
            await addDoc(collection(db, "direct_messages"), payload);
        }

        chatForm.reset();
        messageInput.placeholder = "Type a message or attach a file...";
    } catch (err) {
        console.error("Error context dispatched: ", err);
    }
});

// Unified Dynamic Query Downloader Room Listener
function loadMessages() {
    if (unsubscribeChat) unsubscribeChat();
    chatMessages.innerHTML = '';

    let q;
    if (currentChatMode === "public") {
        q = query(collection(db, "messages"), orderBy("timestamp", "asc"), limit(60));
    } else {
        q = query(
            collection(db, "direct_messages"), 
            where("participants", "array-contains", currentUser.email),
            orderBy("timestamp", "asc")
        );
    }

    unsubscribeChat = onSnapshot(q, (snapshot) => {
        chatMessages.innerHTML = '';
        snapshot.forEach((doc) => {
            const data = doc.data();
            
            // Client side sorting confirmation fallback layer for DM streams
            if (currentChatMode !== "public" && !data.participants.includes(currentChatMode)) return;

            const messageEl = document.createElement('div');
            const isSentByMe = data.user === currentUser.email;
            messageEl.className = `msg ${isSentByMe ? 'sent' : 'received'}`;
            
            let mediaMarkup = '';
            if (data.fileUrl) {
                mediaMarkup = data.fileType === 'image' 
                    ? `<img src="${data.fileUrl}" class="media-attachment" alt="Image File">`
                    : `<video src="${data.fileUrl}" class="media-attachment" controls></video>`;
            }

            messageEl.innerHTML = `
                <span class="msg-user">${data.displayName || data.user}</span>
                <span class="msg-text">${escapeHTML(data.text || '')}</span>
                ${mediaMarkup}
            `;
            chatMessages.appendChild(messageEl);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));
}
