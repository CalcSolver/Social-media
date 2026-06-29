import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, setDoc, getDoc, getDocs, query, orderBy, limit, onSnapshot, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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

// DOM Elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submit-btn');
const toggleLink = document.getElementById('toggle-link');
const logoutBtn = document.getElementById('logout-btn');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const mediaInput = document.getElementById('media-input');
const chatMessages = document.getElementById('chat-messages');
const myProfileDisplay = document.getElementById('my-profile-display');
const myAvatar = document.getElementById('my-avatar');
const myDisplayName = document.getElementById('my-display-name');
const currentRoomTitle = document.getElementById('current-room-title');
const targetPublicBtn = document.getElementById('target-public');
const usersList = document.getElementById('users-list');

// Modals
const profileModal = document.getElementById('profile-modal');
const closeProfileModal = document.getElementById('close-profile-modal');
const viewProfileAvatar = document.getElementById('view-profile-avatar');
const viewProfileName = document.getElementById('view-profile-name');
const viewProfileEmail = document.getElementById('view-profile-email');
const viewProfileStatus = document.getElementById('view-profile-status');
const dmStartBtn = document.getElementById('dm-start-btn');

const settingsModal = document.getElementById('settings-modal');
const closeSettingsModal = document.getElementById('close-settings-modal');
const settingsForm = document.getElementById('settings-form');
const settingsAvatarInput = document.getElementById('settings-avatar-input');
const settingsNameInput = document.getElementById('settings-name-input');
const settingsStatusInput = document.getElementById('settings-status-input');

let isSignUpMode = false;
let currentUser = null;
let currentChatMode = "public"; 
let unsubscribeChat = null;
const defaultAvatar = "https://via.placeholder.com/100";

// Toggle Login / Signup UI layout
toggleLink.addEventListener('click', () => {
    isSignUpMode = !isSignUpMode;
    submitBtn.textContent = isSignUpMode ? "Sign Up" : "Login";
    document.getElementById('toggle-auth').innerHTML = isSignUpMode 
        ? 'Already have an account? <span id="toggle-link">Login</span>'
        : 'Don\'t have an account? <span id="toggle-link">Sign Up</span>';
    document.getElementById('toggle-link').addEventListener('click', () => toggleLink.click());
});

// Auth Operations
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
        if (isSignUpMode) {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const fallbackName = email.split('@')[0];
            await updateProfile(userCredential.user, { displayName: fallbackName, photoURL: defaultAvatar });
            await setDoc(doc(db, "users", email), {
                uid: userCredential.user.uid,
                displayName: fallbackName,
                email: email,
                photoURL: defaultAvatar,
                status: "Hey there! I am using AcmeMes."
            });
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (err) {
        alert(err.message);
    }
});

logoutBtn.addEventListener('click', () => signOut(auth));

// Session State Tracking Channel
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        
        const userDoc = await getDoc(doc(db, "users", user.email));
        if (userDoc.exists()) {
            const data = userDoc.data();
            myDisplayName.textContent = data.displayName || user.email;
            myAvatar.src = data.photoURL || defaultAvatar;
        }

        switchChannel("public");
        loadUsersDirectory();
    } else {
        currentUser = null;
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
        if (unsubscribeChat) unsubscribeChat();
    }
});

// Load Sidebar Directory List
async function loadUsersDirectory() {
    usersList.innerHTML = '';
    const querySnapshot = await getDocs(collection(db, "users"));
    querySnapshot.forEach((docSnap) => {
        const userData = docSnap.data();
        if (userData.email !== currentUser.email) {
            const btn = document.createElement('button');
            btn.className = 'target-btn';
            btn.id = `sidebar-${userData.email.replace(/[@.]/g, '-')}`;
            btn.innerHTML = `<img src="${userData.photoURL || defaultAvatar}" class="avatar-sm"> ${userData.displayName || userData.email}`;
            btn.addEventListener('click', () => {
                highlightSidebarBtn(btn);
                switchChannel(userData.email);
            });
            usersList.appendChild(btn);
        }
    });
}

function highlightSidebarBtn(activeButton) {
    document.querySelectorAll('.target-btn').forEach(b => b.classList.remove('active'));
    if (activeButton) activeButton.classList.add('active');
}

targetPublicBtn.addEventListener('click', () => {
    highlightSidebarBtn(targetPublicBtn);
    switchChannel("public");
});

function switchChannel(mode) {
    currentChatMode = mode;
    currentRoomTitle.textContent = mode === "public" ? "Global Chat" : `Direct Message: ${mode}`;
    loadMessages();
}

// Settings Modal Management Panels
myProfileDisplay.addEventListener('click', async () => {
    const userDoc = await getDoc(doc(db, "users", currentUser.email));
    if (userDoc.exists()) {
        const data = userDoc.data();
        settingsNameInput.value = data.displayName || '';
        settingsStatusInput.value = data.status || '';
    }
    settingsModal.classList.remove('hidden');
});

// Canvas Image Compressor Function
function compressAvatar(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 120;
                canvas.height = 120;
                const ctx = canvas.getContext('2d'); // Fixed from '2m'
                ctx.drawImage(img, 0, 0, 120, 120);
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.7);
            };
        };
    });
}

settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = settingsNameInput.value.trim();
    const newStatus = settingsStatusInput.value.trim();
    const avatarFile = settingsAvatarInput.files[0];
    
    let photoURL = myAvatar.src;

    try {
        if (avatarFile) {
            const compressedBlob = await compressAvatar(avatarFile);
            const avatarRef = ref(storage, `avatars/${currentUser.email}_thumb.jpg`);
            const snap = await uploadBytes(avatarRef, compressedBlob);
            photoURL = await getDownloadURL(snap.ref);
        }

        await updateProfile(auth.currentUser, { displayName: newName, photoURL: photoURL });
        
        await setDoc(doc(db, "users", currentUser.email), {
            displayName: newName,
            status: newStatus,
            photoURL: photoURL,
            email: currentUser.email,
            uid: currentUser.uid
        }, { merge: true });

        myAvatar.src = photoURL;
        myDisplayName.textContent = newName;
        settingsModal.classList.add('hidden');
        settingsForm.reset();
        loadUsersDirectory(); 
        loadMessages(); 
    } catch (err) {
        alert("Error saving settings: " + err.message);
    }
});

// Profile Modal View Setup
async function showUserProfile(email) {
    const userDoc = await getDoc(doc(db, "users", email));
    if (userDoc.exists()) {
        const data = userDoc.data();
        viewProfileAvatar.src = data.photoURL || defaultAvatar;
        viewProfileName.textContent = data.displayName || email;
        viewProfileEmail.textContent = email;
        viewProfileStatus.textContent = data.status || "No status set.";
        
        // Clear previous event listeners
        const newDmBtn = dmStartBtn.cloneNode(true);
        dmStartBtn.parentNode.replaceChild(newDmBtn, dmStartBtn);
        
        // Setup direct context click router action to open DM channel instantly
        newDmBtn.addEventListener('click', () => {
            profileModal.classList.add('hidden');
            const targetBtnId = `sidebar-${email.replace(/[@.]/g, '-')}`;
            const targetSidebarButton = document.getElementById(targetBtnId);
            highlightSidebarBtn(targetSidebarButton);
            switchChannel(email);
        });

        profileModal.classList.remove('hidden');
    }
}

closeProfileModal.addEventListener('click', () => profileModal.classList.add('hidden'));
closeSettingsModal.addEventListener('click', () => settingsModal.classList.add('hidden'));

mediaInput.addEventListener('change', () => {
    if(mediaInput.files[0]) messageInput.placeholder = `📎 File: ${mediaInput.files[0].name}`;
});

// Message Submission Channel Router
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    const file = mediaInput.files[0];
    if (!text && !file) return;

    let fileUrl = null;
    let fileType = null;

    try {
        if (file) {
            messageInput.placeholder = "Uploading file asset...";
            const fileRef = ref(storage, `chats/${Date.now()}_${file.name}`);
            const uploadSnapshot = await uploadBytes(fileRef, file);
            fileUrl = await getDownloadURL(uploadSnapshot.ref);
            fileType = file.type.startsWith('image/') ? 'image' : 'video';
        }

        const myDoc = await getDoc(doc(db, "users", currentUser.email));
        const myData = myDoc.exists() ? myDoc.data() : {};

        const payload = {
            text: text,
            user: currentUser.email,
            displayName: myData.displayName || currentUser.email,
            userAvatar: myData.photoURL || defaultAvatar,
            timestamp: serverTimestamp(),
            ...(fileUrl && { fileUrl, fileType })
        };

        if (currentChatMode === "public") {
            await addDoc(collection(db, "messages"), payload);
        } else {
            payload.participants = [currentUser.email, currentChatMode];
            await addDoc(collection(db, "direct_messages"), payload);
        }

        chatForm.reset();
        messageInput.placeholder = "Type a message or attach a file...";
    } catch (err) {
        console.error(err);
    }
});

// Live Data Pipeline Listener Room
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
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (currentChatMode !== "public" && !data.participants.includes(currentChatMode)) return;

            const messageEl = document.createElement('div');
            const isSentByMe = data.user === currentUser.email;
            messageEl.className = `msg ${isSentByMe ? 'sent' : 'received'}`;
            
            let mediaMarkup = '';
            if (data.fileUrl) {
                mediaMarkup = data.fileType === 'image' 
                    ? `<img src="${data.fileUrl}" class="media-attachment" alt="Attached Image">`
                    : `<video src="${data.fileUrl}" class="media-attachment" controls></video>`;
            }

            messageEl.innerHTML = `
                <div class="msg-header-info" data-email="${data.user}">
                    <img src="${data.userAvatar || defaultAvatar}" class="avatar-sm">
                    <span class="msg-user">${data.displayName || data.user}</span>
                </div>
                <span class="msg-text">${escapeHTML(data.text || '')}</span>
                ${mediaMarkup}
            `;

            messageEl.querySelector('.msg-header-info').addEventListener('click', (e) => {
                showUserProfile(e.currentTarget.getAttribute('data-email'));
            });

            chatMessages.appendChild(messageEl);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));
}
