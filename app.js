import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, setDoc, getDoc, query, orderBy, limit, onSnapshot, serverTimestamp, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCVF-wL74rBralgDJhxATWFmDoyWcHRrro",
  authDomain: "acmemes-2a69e.firebaseapp.com",
  projectId: "acmemes-2a69e",
  storageBucket: "acmemes-2a69e.firebasestorage.app",
  messagingSenderId: "547265374331",
  appId: "1:547265374331:web:68c981e74fb208c2121ade",
  measurementId: "G-RMFPJWJ2V1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// GIPHY API Engine Configuration
const GIPHY_API_KEY = "dc6zaTOxFJmzC"; // Public beta key for development & deployment testing
const giphyToggleBtn = document.getElementById('giphy-toggle-btn');
const giphyDrawer = document.getElementById('giphy-drawer');
const giphyResultsContainer = document.getElementById('giphy-results-container');

if (typeof window !== "undefined" && "Notification" in window) {
    Notification.requestPermission();
}

// Target Bindings
const targetPublicBtn = document.getElementById('target-public');
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
const myDisplayName = document.getElementById('my-displayName');
const currentRoomTitle = document.getElementById('current-room-title');
const serverAdminIndicator = document.getElementById('server-admin-indicator');
const usersList = document.getElementById('users-list');
const serversList = document.getElementById('servers-list');
const newServerInput = document.getElementById('new-server-input');
const createServerBtn = document.getElementById('create-server-btn');
const searchUserInput = document.getElementById('search-user-input');
const searchUserBtn = document.getElementById('search-user-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const typingIndicatorBox = document.getElementById('typing-indicator-box');

// Call / FaceTime UI Nodes
const callBtn = document.getElementById('call-btn');
const videoCallModal = document.getElementById('video-call-modal');
const endCallBtn = document.getElementById('end-call-btn');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');

// Notification UI Nodes
const notiToggleBtn = document.getElementById('noti-toggle-btn');
const notiBadge = document.getElementById('noti-badge');
const notiDropdown = document.getElementById('noti-dropdown');
const notiList = document.getElementById('noti-list');

// Disappearing Settings Node
const disappearToggleBtn = document.getElementById('disappear-toggle-btn');

// Admin Elements
const adminMonitorPanel = document.getElementById('admin-monitor-panel');
const adminRoomInput = document.getElementById('admin-room-input');
const adminSpyBtn = document.getElementById('admin-spy-btn');

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
let activeServerId = null;
let adminSpyRoomId = null;
let unsubscribeChat = null;
let unsubscribePresence = null;
let unsubscribeServers = null;
let typingTimeout = null;
let giphySearchTimeout = null;
let unreadNotificationsCount = 0;
let disappearModeActive = false;

let myPeerInstance = null;
let currentMediaConnection = null;
let localMediaStream = null;

const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
const userCache = {};
const serverCache = {};
const ADMIN_EMAIL = "hjass2865@gmail.com";

function playNotificationSound(type = 'message') {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        if (type === 'call') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.setValueAtTime(800, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } else {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, ctx.currentTime);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        }
    } catch (e) {}
}

function addAlertNotification(titleText, bodyText) {
    playNotificationSound('message');
    unreadNotificationsCount++;
    if (notiBadge) {
        notiBadge.textContent = unreadNotificationsCount;
        notiBadge.style.display = "inline-block";
    }
    if (Notification.permission === "granted") {
        new Notification(titleText, { body: bodyText });
    }
    
    const alertRow = document.createElement('div');
    alertRow.style = "padding: 8px; border-bottom: 1px solid #333; color: #fff; font-size: 11px; text-align: left;";
    alertRow.innerHTML = `<strong>${escapeHTML(titleText)}</strong><br><span style="color:#b9bbbe;">${escapeHTML(bodyText)}</span>`;
    
    if (notiList.textContent === "No new notifications") {
        notiList.innerHTML = "";
    }
    notiList.insertBefore(alertRow, notiList.firstChild);
}

// GIPHY Drawer Open / Close Processing
if (giphyToggleBtn && giphyDrawer) {
    giphyToggleBtn.addEventListener('click', () => {
        giphyDrawer.classList.toggle('hidden');
        if (!giphyDrawer.classList.contains('hidden')) {
            fetchGiphyMemes("trending memes");
        }
    });
}

// Intercepts input actions on message bar to feed GIPHY dynamic searches
if (messageInput) {
    messageInput.addEventListener('input', () => {
        if (giphyDrawer && !giphyDrawer.classList.contains('hidden')) {
            clearTimeout(giphySearchTimeout);
            giphySearchTimeout = setTimeout(() => {
                const searchVal = messageInput.value.trim();
                fetchGiphyMemes(searchVal || "trending memes");
            }, 500);
        }
    });
}

async function fetchGiphyMemes(searchQuery) {
    if (!giphyResultsContainer) return;
    try {
        const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchQuery)}&limit=12&rating=g`;
        const res = await fetch(url);
        const json = await res.json();
        
        giphyResultsContainer.innerHTML = "";
        if (json.data && json.data.length > 0) {
            json.data.forEach(gifObj => {
                const gifUrl = gifObj.images.fixed_height_small.url;
                const originalUrl = gifObj.images.original.url;
                
                const img = document.createElement('img');
                img.src = gifUrl;
                img.style = "height: 80px; border-radius: 4px; cursor: pointer; border: 1px solid #444; object-fit: cover;";
                img.alt = "Meme Element";
                
                // Selects the image immediately and drops it into Firebase
                img.addEventListener('click', () => {
                    executeDirectImagePost(originalUrl, 'image');
                    giphyDrawer.classList.add('hidden');
                    if (messageInput) messageInput.value = "";
                });
                giphyResultsContainer.appendChild(img);
            });
        } else {
            giphyResultsContainer.innerHTML = `<span style="color: #b9bbbe; font-size:12px; padding:10px;">No memes found...</span>`;
        }
    } catch (err) {
        console.error("Giphy Search Failed", err);
    }
}

// Direct submission script pipeline for fast-sending custom web attachments (GIPHY memes)
async function executeDirectImagePost(urlPath, assetType) {
    if (!verifyMessageRateLimit() || !currentUser) return;
    try {
        const myData = userCache[currentUser.email.toLowerCase()] || {};
        const payload = {
            text: "",
            user: currentUser.email.toLowerCase(),
            displayName: myData.displayName || currentUser.email,
            userAvatar: myData.photoURL || defaultAvatar,
            timestamp: serverTimestamp(),
            disappearing: disappearModeActive,
            fileUrl: urlPath,
            fileType: assetType
        };

        if (currentChatMode === "public") {
            await addDoc(collection(db, "messages"), payload);
        } else if (currentChatMode === "server") {
            await addDoc(collection(db, "servers", activeServerId, "messages"), payload);
        } else if (currentChatMode === "spy_") {
            await addDoc(collection(db, "direct_messages", adminSpyRoomId, "messages"), payload);
        } else {
            const combinedRoomId = getDMId(currentUser.email, activeServerId);
            await addDoc(collection(db, "direct_messages", combinedRoomId, "messages"), payload);
        }
    } catch (e) {
        console.error(e);
    }
}

if (notiToggleBtn) {
    notiToggleBtn.addEventListener('click', () => {
        if (notiDropdown) {
            notiDropdown.classList.toggle('hidden');
            unreadNotificationsCount = 0;
            if (notiBadge) notiBadge.style.display = "none";
        }
    });
}

if (disappearToggleBtn) {
    disappearToggleBtn.addEventListener('click', () => {
        disappearModeActive = !disappearModeActive;
        if (disappearModeActive) {
            disappearToggleBtn.textContent = "⏱️ Poof: 10s Active";
            disappearToggleBtn.style.background = "#f57731";
        } else {
            disappearToggleBtn.textContent = "⏱️ Poof: OFF";
            disappearToggleBtn.style.background = "#4f545c";
        }
    });
}

function verifyMessageRateLimit() {
    const todayStr = new Date().toISOString().split('T')[0];
    const storageKey = `msg_quota_${todayStr}`;
    let currentCount = parseInt(localStorage.getItem(storageKey) || "0", 10);
    if (currentCount >= 100) {
        alert("You have reached your limit of 100 messages for today.");
        return false;
    }
    localStorage.setItem(storageKey, (currentCount + 1).toString());
    return true;
}

if (createServerBtn) {
    createServerBtn.addEventListener('click', async () => {
        const name = newServerInput.value.trim();
        if (!name || !currentUser) return;
        const serverId = "srv_" + Date.now();
        await setDoc(doc(db, "servers", serverId), {
            id: serverId,
            name: name,
            owner: currentUser.email.toLowerCase(),
            created: serverTimestamp()
        });
        newServerInput.value = '';
    });
}

async function uploadToCloudinary(fileObj) {
    if (!fileObj) return null;
    const cloudName = "ddvsercvm"; 
    const uploadPreset = "my_preset"; 
    const formData = new FormData();
    formData.append("file", fileObj);
    formData.append("upload_preset", uploadPreset);
    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
            method: "POST",
            body: formData
        });
        if (!response.ok) throw new Error("Cloudinary upload failed");
        const data = await response.json();
        return data.secure_url; 
    } catch (err) {
        return null;
    }
}

function buildRealTimePeerConnection(userEmailCleaned) {
    if (myPeerInstance) return;
    myPeerInstance = new Peer(userEmailCleaned);
    myPeerInstance.on('call', async (incomingCall) => {
        playNotificationSound('call');
        addAlertNotification("Incoming Call", "FaceTime video connection pending payload approval...");
        if (confirm(`Incoming FaceTime request. Answer?`)) {
            try {
                localMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (localVideo) localVideo.srcObject = localMediaStream;
                if (videoCallModal) videoCallModal.classList.remove('hidden');
                incomingCall.answer(localMediaStream);
                currentMediaConnection = incomingCall;
                incomingCall.on('stream', (incomingStream) => {
                    if (remoteVideo) {
                        remoteVideo.srcObject = incomingStream;
                        remoteVideo.play().catch(e => {});
                    }
                });
            } catch (err) {
                alert("Could not access recording mechanics.");
            }
        } else {
            incomingCall.close();
        }
    });
}

if (callBtn) {
    callBtn.addEventListener('click', async () => {
        if (currentChatMode !== "dm") return;
        const cleaningTarget = activeServerId.replace(/[@.]/g, '_');
        try {
            localMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (localVideo) localVideo.srcObject = localMediaStream;
            if (videoCallModal) videoCallModal.classList.remove('hidden');
            const outboundCall = myPeerInstance.call(cleaningTarget, localMediaStream);
            currentMediaConnection = outboundCall;
            outboundCall.on('stream', (incomingStream) => {
                if (remoteVideo) {
                    remoteVideo.srcObject = incomingStream;
                    remoteVideo.play().catch(e => {});
                }
            });
        } catch (err) {
            alert("Camera device access denied.");
        }
    });
}

if (endCallBtn) {
    endCallBtn.addEventListener('click', () => {
        if (currentMediaConnection) currentMediaConnection.close();
        if (localMediaStream) {
            localMediaStream.getTracks().forEach(track => track.stop());
        }
        if (videoCallModal) videoCallModal.classList.add('hidden');
        if (localVideo) localVideo.srcObject = null;
        if (remoteVideo) remoteVideo.srcObject = null;
    });
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
    });
}

if (targetPublicBtn) {
    targetPublicBtn.addEventListener('click', () => {
        highlightSidebarBtn(targetPublicBtn);
        if (callBtn) callBtn.classList.add('hidden'); 
        switchChannel("public", null);
    });
}

if (toggleLink) {
    toggleLink.addEventListener('click', () => {
        isSignUpMode = !isSignUpMode;
        if (submitBtn) submitBtn.textContent = isSignUpMode ? "Sign Up" : "Login";
        const toggleAuthContainer = document.getElementById('toggle-auth');
        if (toggleAuthContainer) {
            toggleAuthContainer.innerHTML = isSignUpMode 
                ? 'Already have an account? <span id="toggle-link">Login</span>'
                : 'Don\'t have an account? <span id="toggle-link">Sign Up</span>';
            const newToggleLink = document.getElementById('toggle-link');
            if (newToggleLink) newToggleLink.addEventListener('click', () => toggleLink.click());
        }
    });
}

if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim().toLowerCase();
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
                    status: "Hey there! Let's chat.",
                    online: true
                });
            } else {
                await signInWithEmailAndPassword(auth, email, password);
                await updateDoc(doc(db, "users", email), { online: true });
            }
        } catch (err) { alert(err.message); }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        if (currentUser) {
            await updateDoc(doc(db, "users", currentUser.email.toLowerCase()), { online: false });
        }
        if (myPeerInstance) { myPeerInstance.destroy(); myPeerInstance = null; }
        signOut(auth);
    });
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        if (adminMonitorPanel) {
            adminMonitorPanel.className = (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) ? "" : "hidden";
        }
        const userDoc = await getDoc(doc(db, "users", user.email.toLowerCase()));
        if (userDoc.exists() && myDisplayName && myAvatar) {
            const data = userDoc.data();
            myDisplayName.textContent = data.displayName || user.email;
            myAvatar.src = data.photoURL || defaultAvatar;
            userCache[user.email.toLowerCase()] = data;
        }
        buildRealTimePeerConnection(user.email.toLowerCase().replace(/[@.]/g, '_'));
        if (authContainer) authContainer.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');
        if (targetPublicBtn) targetPublicBtn.click(); 
        listenForUserPresence();
        listenForServersList();
    } else {
        currentUser = null;
        if (appContainer) appContainer.classList.add('hidden');
        if (authContainer) authContainer.classList.remove('hidden');
        if (unsubscribeChat) unsubscribeChat();
        if (unsubscribePresence) unsubscribePresence();
        if (unsubscribeServers) unsubscribeServers();
    }
});

function listenForServersList() {
    if (unsubscribeServers) unsubscribeServers();
    unsubscribeServers = onSnapshot(collection(db, "servers"), (snapshot) => {
        if (!serversList) return;
        serversList.innerHTML = '';
        snapshot.forEach((docSnap) => {
            const sData = docSnap.data();
            serverCache[sData.id] = sData;
            const btn = document.createElement('button');
            btn.className = 'target-btn';
            btn.style = "width: 100%; padding: 8px; background: #40444b; border: none; color: #fff; text-align: left; cursor: pointer; border-radius: 4px;";
            btn.textContent = `📁 ${sData.name}`;
            btn.addEventListener('click', () => {
                highlightSidebarBtn(btn);
                if (callBtn) callBtn.classList.add('hidden');
                switchChannel("server", sData.id);
            });
            serversList.appendChild(btn);
        });
    });
}

if (messageInput) {
    messageInput.addEventListener('input', () => {
        if (!currentUser) return;
        const roomPath = currentChatMode === "public" ? "global" : (currentChatMode === "server" ? activeServerId : getDMId(currentUser.email, activeServerId));
        setDoc(doc(db, "typing", roomPath), {
            [currentUser.email.replace(/[@.]/g, '_')]: true,
            displayName: myDisplayName ? myDisplayName.textContent : "Someone"
        }, { merge: true });

        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            setDoc(doc(db, "typing", roomPath), { [currentUser.email.replace(/[@.]/g, '_')]: false }, { merge: true });
        }, 2000);
    });
}

function listenForUserPresence() {
    if (unsubscribePresence) unsubscribePresence();
    unsubscribePresence = onSnapshot(collection(db, "users"), (snapshot) => {
        if (!usersList) return;
        usersList.innerHTML = '';
        snapshot.forEach((docSnap) => {
            const userData = docSnap.data();
            userCache[userData.email.toLowerCase()] = userData;
            if (userData.email.toLowerCase() !== currentUser.email.toLowerCase()) {
                const btn = document.createElement('button');
                btn.className = 'target-btn';
                btn.style = "width: 100%; padding: 6px; background: none; border: none; color: #b9bbbe; text-align: left; cursor: pointer; display: flex; align-items: center; gap: 8px;";
                const statusColor = userData.online ? '#3ba55d' : '#747f8d';
                btn.innerHTML = `
                    <span style="width:8px; height:8px; background:${statusColor}; border-radius:50%; display:inline-block;"></span>
                    <img src="${userData.photoURL || defaultAvatar}" style="width:24px; height:24px; border-radius:50%; object-fit:cover;"> 
                    <span>${userData.displayName || userData.email}</span>
                `;
                btn.addEventListener('click', () => {
                    highlightSidebarBtn(btn);
                    if (callBtn) callBtn.classList.remove('hidden'); 
                    switchChannel("dm", userData.email.toLowerCase());
                });
                usersList.appendChild(btn);
            }
        });
    });
}

function highlightSidebarBtn(activeButton) {
    document.querySelectorAll('.target-btn').forEach(b => b.style.background = 'none');
    if (activeButton) activeButton.style.background = '#4f545c';
}

function switchChannel(mode, id) {
    currentChatMode = mode;
    activeServerId = id;
    if (serverAdminIndicator) serverAdminIndicator.textContent = "";
    if (giphyDrawer) giphyDrawer.classList.add('hidden');

    if (mode === "public") {
        currentRoomTitle.textContent = "Global Chat";
    } else if (mode === "server") {
        const sData = serverCache[id] || {};
        currentRoomTitle.textContent = `Server: ${sData.name || 'Group'}`;
        if (serverAdminIndicator) serverAdminIndicator.textContent = `👑 Owner: ${sData.owner.split('@')[0]}`;
    } else {
        currentRoomTitle.textContent = `DM: ${id}`;
    }
    loadMessages();
}

if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!verifyMessageRateLimit()) return;
        const text = messageInput.value.trim();
        const file = mediaInput.files[0];
        if (!text && !file) return;

        try {
            let finalUrl = null; let fileType = null;
            if (file) {
                if (file.type.startsWith('image/')) {
                    finalUrl = await new Promise((resolve) => {
                        const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(file);
                    });
                    fileType = 'image';
                } else if (file.type.startsWith('video/')) {
                    finalUrl = await uploadToCloudinary(file);
                    fileType = 'video';
                }
            }

            const myData = userCache[currentUser.email.toLowerCase()] || {};
            const payload = {
                text: text,
                user: currentUser.email.toLowerCase(),
                displayName: myData.displayName || currentUser.email,
                userAvatar: myData.photoURL || defaultAvatar,
                timestamp: serverTimestamp(),
                disappearing: disappearModeActive,
                ...(finalUrl && { fileUrl: finalUrl, fileType: fileType })
            };

            if (currentChatMode === "public") {
                await addDoc(collection(db, "messages"), payload);
            } else if (currentChatMode === "server") {
                await addDoc(collection(db, "servers", activeServerId, "messages"), payload);
            } else if (currentChatMode === "spy_") {
                await addDoc(collection(db, "direct_messages", adminSpyRoomId, "messages"), payload);
            } else {
                const combinedRoomId = getDMId(currentUser.email, activeServerId);
                await addDoc(collection(db, "direct_messages", combinedRoomId, "messages"), payload);
            }
            chatForm.reset();
        } catch (err) { console.error(err); }
    });
}

function loadMessages() {
    if (unsubscribeChat) unsubscribeChat();
    if (!chatMessages) return;
    chatMessages.innerHTML = '';

    let q; let baseColl = "messages"; let subRoom = null;
    if (currentChatMode === "public") {
        q = query(collection(db, "messages"), orderBy("timestamp", "asc"), limit(60));
    } else if (currentChatMode === "server") {
        baseColl = "servers"; subRoom = activeServerId;
        q = query(collection(db, "servers", activeServerId, "messages"), orderBy("timestamp", "asc"));
    } else if (currentChatMode.startsWith("spy_")) {
        baseColl = "direct_messages"; subRoom = adminSpyRoomId;
        q = query(collection(db, "direct_messages", adminSpyRoomId, "messages"), orderBy("timestamp", "asc"));
    } else {
        baseColl = "direct_messages"; subRoom = getDMId(currentUser.email, activeServerId);
        q = query(collection(db, "direct_messages", subRoom, "messages"), orderBy("timestamp", "asc"));
    }

    let initialLoadComplete = false;
    unsubscribeChat = onSnapshot(q, (snapshot) => {
        chatMessages.innerHTML = '';
        let newMessagesDetected = false;

        snapshot.forEach((docSnap) => {
            const data = docSnap.data(); const msgId = docSnap.id;
            if (data.disappearing && data.timestamp) {
                const msgTime = data.timestamp.toDate().getTime();
                const nowTime = Date.now();
                if (nowTime - msgTime > 10000) {
                    handleModifyMessage(msgId, 'delete', baseColl, subRoom); return; 
                } else {
                    setTimeout(() => { handleModifyMessage(msgId, 'delete', baseColl, subRoom); }, 10000 - (nowTime - msgTime));
                }
            }
            if (initialLoadComplete && data.user !== currentUser.email.toLowerCase()) { newMessagesDetected = true; }

            const messageEl = document.createElement('div');
            const isSentByMe = data.user === currentUser.email.toLowerCase();
            const serverContext = serverCache[activeServerId] || {};
            const isServerOwner = currentChatMode === "server" && serverContext.owner === currentUser.email.toLowerCase();
            const isLoggedAsAdmin = currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
            
            messageEl.style = "display: flex; gap: 10px; margin-bottom: 12px; padding: 4px;";
            let mediaMarkup = '';
            if (data.fileUrl) {
                mediaMarkup = data.fileType === 'video'
                    ? `<video src="${data.fileUrl}" style="max-width:250px; border-radius:4px;" controls></video>`
                    : `<img src="${data.fileUrl}" style="max-width:250px; border-radius:4px;">`;
            }

            const actionControlsMarkup = (isSentByMe || isServerOwner || isLoggedAsAdmin) ? `
                <button class="delete-trigger" style="background:none; border:none; color:#ed4245; cursor:pointer; font-size:11px;">❌</button>
            ` : '';

            const cachedUser = userCache[data.user.toLowerCase()] || {};
            messageEl.innerHTML = `
                <img src="${cachedUser.photoURL || defaultAvatar}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">
                <div style="flex:1;">
                    <div style="display:flex; justify-content:space-between;">
                        <strong style="color:#fff; font-size:13px;">${cachedUser.displayName || data.displayName || data.user}</strong>
                        ${actionControlsMarkup}
                    </div>
                    <div style="color:#dcddde; font-size:14px; margin-top:2px;">${escapeHTML(data.text || '')}</div>
                    ${mediaMarkup}
                </div>
            `;
            if (isSentByMe || isServerOwner || isLoggedAsAdmin) {
                const delBtn = messageEl.querySelector('.delete-trigger');
                if (delBtn) delBtn.addEventListener('click', () => handleModifyMessage(msgId, 'delete', baseColl, subRoom));
            }
            chatMessages.appendChild(messageEl);
        });

        if (initialLoadComplete && newMessagesDetected) {
            addAlertNotification("Channel Update", "A new text post or group file payload arrived.");
        }
        initialLoadComplete = true;
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

async function handleModifyMessage(msgId, action, collectionPath, subId = null) {
    let targetRef = subId ? doc(db, collectionPath, subId, "messages", msgId) : doc(db, collectionPath, msgId);
    if (action === 'delete') await deleteDoc(targetRef);
}
function getDMId(userA, userB) { return [userA.toLowerCase(), userB.toLowerCase()].sort().join("-v-").replace(/[@.]/g, '_'); }
function escapeHTML(str) { return str.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t)); }
