import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, setDoc, getDoc, query, orderBy, limit, onSnapshot, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// GIPHY Engine Keys
const GIPHY_API_KEY = "dc6zaTOxFJmzC"; 
const giphyToggleBtn = document.getElementById('giphy-toggle-btn');
const giphyDrawer = document.getElementById('giphy-drawer');
const giphyResultsContainer = document.getElementById('giphy-results-container');

// Core Nodes
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
const friendsList = document.getElementById('friends-list');
const serversList = document.getElementById('servers-list');
const newServerInput = document.getElementById('new-server-input');
const createServerBtn = document.getElementById('create-server-btn');

// Settings Modal Nodes
const settingsModal = document.getElementById('settings-modal');
const closeSettingsModal = document.getElementById('close-settings-modal');
const settingsForm = document.getElementById('settings-form');
const settingsNameInput = document.getElementById('settings-name-input');
const settingsAvatarInput = document.getElementById('settings-avatar-input'); // Handles file uploads

// Target Profile Popup Modal Nodes
const profileModal = document.getElementById('profile-modal');
const closeProfileModal = document.getElementById('close-profile-modal');
const viewProfileAvatar = document.getElementById('view-profile-avatar');
const viewProfileName = document.getElementById('view-profile-name');
const viewProfileEmail = document.getElementById('view-profile-email');
const dmStartBtn = document.getElementById('dm-start-btn');
const addFriendBtn = document.getElementById('add-friend-btn');

// Video Call Nodes
const callBtn = document.getElementById('call-btn');
const videoCallModal = document.getElementById('video-call-modal');
const endCallBtn = document.getElementById('end-call-btn');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');

const notiToggleBtn = document.getElementById('noti-toggle-btn');
const notiBadge = document.getElementById('noti-badge');
const notiDropdown = document.getElementById('noti-dropdown');
const notiList = document.getElementById('noti-list');
const disappearToggleBtn = document.getElementById('disappear-toggle-btn');

let currentUser = null;
let currentChatMode = "public"; 
let activeServerId = null;
let targetSelectedProfileEmail = null; 
let unsubscribeChat = null;
let unsubscribePresence = null;
let unsubscribeServers = null;
let unsubscribeFriends = null;
let giphySearchTimeout = null;
let unreadNotificationsCount = 0;
let disappearModeActive = false;
let isSignUpMode = false;

let myPeerInstance = null;
let currentMediaConnection = null;
let localMediaStream = null;

const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
const userCache = {};
const serverCache = {};

// --- Interactive Profile Click Inspector Logic ---
function launchUserProfileInspector(targetEmail) {
    const data = userCache[targetEmail.toLowerCase()] || {};
    targetSelectedProfileEmail = targetEmail.toLowerCase();
    
    if (viewProfileName) viewProfileName.textContent = data.displayName || targetEmail.split('@')[0];
    if (viewProfileAvatar) viewProfileAvatar.src = data.photoURL || defaultAvatar;
    if (viewProfileEmail) viewProfileEmail.textContent = data.email || targetEmail;
    
    if (currentChatMode === "server" && currentUser) {
        const sData = serverCache[activeServerId] || {};
        if (sData.owner === currentUser.email.toLowerCase()) {
            addFriendBtn.textContent = "Invite to Server ✉️";
            addFriendBtn.onclick = async () => {
                await updateDoc(doc(db, "servers", activeServerId), {
                    [`allowedMembers.${targetSelectedProfileEmail.replace(/[@.]/g, '_')}`]: true
                });
                alert(`Successfully invited ${targetSelectedProfileEmail} to this server!`);
                if (profileModal) profileModal.classList.add('hidden');
            };
        } else {
            resetDefaultFriendAction();
        }
    } else {
        resetDefaultFriendAction();
    }
    
    if (profileModal) profileModal.classList.remove('hidden');
}

function resetDefaultFriendAction() {
    addFriendBtn.textContent = "Add Friend ⭐";
    addFriendBtn.onclick = async () => {
        if (!currentUser || !targetSelectedProfileEmail) return;
        try {
            const cleanUserEmail = currentUser.email.toLowerCase();
            await setDoc(doc(db, "users", cleanUserEmail, "friends", targetSelectedProfileEmail), {
                email: targetSelectedProfileEmail,
                addedAt: serverTimestamp()
            });
            alert("Added to Friends list successfully!");
            if (profileModal) profileModal.classList.add('hidden');
        } catch (err) { console.error(err); }
    };
}

if (closeProfileModal) {
    closeProfileModal.addEventListener('click', () => {
        if (profileModal) profileModal.classList.add('hidden');
    });
}

if (dmStartBtn) {
    dmStartBtn.addEventListener('click', () => {
        if (!targetSelectedProfileEmail) return;
        if (profileModal) profileModal.classList.add('hidden');
        if (callBtn) callBtn.classList.remove('hidden'); 
        switchChannel("dm", targetSelectedProfileEmail);
    });
}

// --- Local User Settings Form Setup (Optimized Base64 System) ---
if (myProfileDisplay) {
    myProfileDisplay.addEventListener('click', () => {
        if (!currentUser) return;
        const cached = userCache[currentUser.email.toLowerCase()] || {};
        if (settingsNameInput) settingsNameInput.value = cached.displayName || currentUser.email.split('@')[0];
        if (settingsAvatarInput) settingsAvatarInput.value = ""; // Reset local upload file state
        if (settingsModal) settingsModal.classList.remove('hidden');
    });
}

if (closeSettingsModal) {
    closeSettingsModal.addEventListener('click', () => {
        if (settingsModal) settingsModal.classList.add('hidden');
    });
}

if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = settingsNameInput.value.trim();
        const avatarFile = settingsAvatarInput.files[0]; // Access local file buffer
        const cleanedEmail = currentUser.email.toLowerCase();

        try {
            let finalAvatarUrl = userCache[cleanedEmail]?.photoURL || defaultAvatar;

            // If a local image file is added, read it into a high-density Base64 string text packet
            if (avatarFile) {
                currentRoomTitle.textContent = "Processing and encoding avatar string... ⚙️";
                
                finalAvatarUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = (err) => reject(err);
                    reader.readAsDataURL(avatarFile);
                });
            }

            // Sync structural identifiers straight to Firebase
            await updateProfile(auth.currentUser, { displayName: newName, photoURL: finalAvatarUrl });
            await updateDoc(doc(db, "users", cleanedEmail), {
                displayName: newName,
                photoURL: finalAvatarUrl
            });
            
            if (myDisplayName) myDisplayName.textContent = newName;
            if (myAvatar) myAvatar.src = finalAvatarUrl;
            if (settingsModal) settingsModal.classList.add('hidden');
            
            alert("Profile successfully updated with local string encoding!");
        } catch (err) { 
            console.error(err);
            alert("Profile update failure: " + err.message); 
        } finally {
            switchChannel(currentChatMode, activeServerId);
        }
    });
}

// --- GIPHY Iframe Implementation Engine ---
if (giphyToggleBtn && giphyDrawer) {
    giphyToggleBtn.addEventListener('click', () => {
        giphyDrawer.classList.toggle('hidden');
        if (!giphyDrawer.classList.contains('hidden')) {
            fetchGiphyMemes("memes"); 
        }
    });
}

if (messageInput) {
    messageInput.addEventListener('input', () => {
        if (giphyDrawer && !giphyDrawer.classList.contains('hidden')) {
            clearTimeout(giphySearchTimeout);
            giphySearchTimeout = setTimeout(() => {
                const queryVal = messageInput.value.trim();
                fetchGiphyMemes(queryVal || "memes");
            }, 400);
        }
    });
}

async function fetchGiphyMemes(searchQuery) {
    if (!giphyResultsContainer) return;
    try {
        const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchQuery)}&limit=15&rating=g`;
        const res = await fetch(url);
        const json = await res.json();
        
        giphyResultsContainer.innerHTML = "";
        if (json.data && json.data.length > 0) {
            json.data.forEach(gifObj => {
                const gifId = gifObj.id;
                const previewImgUrl = gifObj.images.fixed_height_small.url;
                
                const img = document.createElement('img');
                img.src = previewImgUrl;
                img.style = "height: 80px; border-radius: 4px; cursor: pointer; border: 1px solid #444; min-width: 80px; object-fit: cover;";
                
                img.addEventListener('click', () => {
                    executeDirectPostPayload(gifId, 'giphy');
                    giphyDrawer.classList.add('hidden');
                    if (messageInput) messageInput.value = "";
                });
                giphyResultsContainer.appendChild(img);
            });
        } else {
            giphyResultsContainer.innerHTML = `<span style="color: #b9bbbe; font-size:11px; padding:5px;">No memes found...</span>`;
        }
    } catch (err) { console.error(err); }
}

async function executeDirectPostPayload(urlPath, assetType) {
    if (!currentUser) return;
    try {
        const myData = userCache[currentUser.email.toLowerCase()] || {};
        const payload = {
            text: "[Sent a custom media node]",
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
        } else {
            const combinedRoomId = getDMId(currentUser.email, activeServerId);
            await addDoc(collection(db, "direct_messages", combinedRoomId, "messages"), payload);
        }
    } catch (e) { console.error(e); }
}

// --- Clickable System Notification Tray ---
function addAlertNotification(senderName, textContent, targetMode, targetId) {
    unreadNotificationsCount++;
    if (notiBadge) {
        notiBadge.textContent = unreadNotificationsCount;
        notiBadge.style.display = "inline-block";
    }
    
    const alertRow = document.createElement('div');
    alertRow.style = "padding: 10px; border-bottom: 1px solid #333; color: #fff; font-size: 12px; text-align: left; cursor: pointer; transition: background 0.2s;";
    alertRow.addEventListener('mouseover', () => alertRow.style.background = "rgba(255,255,255,0.05)");
    alertRow.addEventListener('mouseout', () => alertRow.style.background = "none");
    
    alertRow.addEventListener('click', () => {
        switchChannel(targetMode, targetId);
        if (notiDropdown) notiDropdown.classList.add('hidden');
    });

    alertRow.innerHTML = `
        <div style="font-weight: bold; color: #5865f2;">💬 ${escapeHTML(senderName)}</div>
        <div style="color: #dcddde; white-space: nowrap; overflow: hidden; text-transform: none; text-overflow: ellipsis; max-width: 220px;">
            ${escapeHTML(textContent || 'Sent an attachment')}
        </div>
    `;
    
    if (notiList.textContent === "No new notifications") notiList.innerHTML = "";
    notiList.insertBefore(alertRow, notiList.firstChild);
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
        disappearToggleBtn.textContent = disappearModeActive ? "⏱️ Poof: 10s Active" : "⏱️ Poof: OFF";
        disappearToggleBtn.style.background = disappearModeActive ? "#f57731" : "#4f545c";
    });
}

// --- Create Server Setup ---
if (createServerBtn) {
    createServerBtn.addEventListener('click', async () => {
        const name = newServerInput.value.trim();
        if (!name || !currentUser) return;
        const serverId = "srv_" + Date.now();
        const myCleanEmail = currentUser.email.toLowerCase().replace(/[@.]/g, '_');
        
        await setDoc(doc(db, "servers", serverId), {
            id: serverId, 
            name: name, 
            owner: currentUser.email.toLowerCase(), 
            created: serverTimestamp(),
            allowedMembers: {
                [myCleanEmail]: true
            }
        });
        newServerInput.value = '';
    });
}

// --- FaceTime Call Logic ---
function buildRealTimePeerConnection(userEmailCleaned) {
    if (myPeerInstance) return;
    myPeerInstance = new Peer(userEmailCleaned);
    
    myPeerInstance.on('call', async (incomingCall) => {
        if (confirm(`Incoming FaceTime call. Answer?`)) {
            try {
                localMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (localVideo) localVideo.srcObject = localMediaStream;
                if (videoCallModal) videoCallModal.classList.remove('hidden');
                
                incomingCall.answer(localMediaStream);
                currentMediaConnection = incomingCall;
                
                incomingCall.on('stream', (incomingStream) => {
                    if (remoteVideo) remoteVideo.srcObject = incomingStream;
                });
            } catch (err) { alert("Device configuration error."); }
        } else { incomingCall.close(); }
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
                if (remoteVideo) remoteVideo.srcObject = incomingStream;
            });
        } catch (err) { alert("Camera device access denied."); }
    });
}

if (endCallBtn) {
    endCallBtn.addEventListener('click', () => {
        if (currentMediaConnection) currentMediaConnection.close();
        if (localMediaStream) localMediaStream.getTracks().forEach(t => t.stop());
        if (videoCallModal) videoCallModal.classList.add('hidden');
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
    });
}

if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;
        try {
            if (isSignUpMode) {
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                const fbName = email.split('@')[0];
                await updateProfile(cred.user, { displayName: fbName, photoURL: defaultAvatar });
                await setDoc(doc(db, "users", email), {
                    uid: cred.user.uid, displayName: fbName, email: email, photoURL: defaultAvatar, online: true
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
        if (currentUser) await updateDoc(doc(db, "users", currentUser.email.toLowerCase()), { online: false });
        if (myPeerInstance) { myPeerInstance.destroy(); myPeerInstance = null; }
        signOut(auth);
    });
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
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
        listenToMyFriendsDirectory();
    } else {
        currentUser = null;
        if (appContainer) appContainer.classList.add('hidden');
        if (authContainer) authContainer.classList.remove('hidden');
        if (unsubscribeChat) unsubscribeChat();
        if (unsubscribePresence) unsubscribePresence();
        if (unsubscribeServers) unsubscribeServers();
        if (unsubscribeFriends) unsubscribeFriends();
    }
});

function listenForServersList() {
    if (unsubscribeServers) unsubscribeServers();
    if (!currentUser) return;
    
    const mySanitizedFilter = currentUser.email.toLowerCase().replace(/[@.]/g, '_');
    const serverQuery = query(collection(db, "servers"), where(`allowedMembers.${mySanitizedFilter}`, "==", true));
    
    unsubscribeServers = onSnapshot(serverQuery, (snap) => {
        if (!serversList) return;
        serversList.innerHTML = '';
        snap.forEach((docSnap) => {
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

function listenForUserPresence() {
    if (unsubscribePresence) unsubscribePresence();
    unsubscribePresence = onSnapshot(collection(db, "users"), (snap) => {
        if (!usersList) return;
        usersList.innerHTML = '';
        snap.forEach((docSnap) => {
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
                    launchUserProfileInspector(userData.email);
                });
                usersList.appendChild(btn);
            }
        });
    });
}

function listenToMyFriendsDirectory() {
    if (unsubscribeFriends) unsubscribeFriends();
    const cleanEmail = currentUser.email.toLowerCase();
    
    unsubscribeFriends = onSnapshot(collection(db, "users", cleanEmail, "friends"), (snap) => {
        if (!friendsList) return;
        friendsList.innerHTML = '';
        
        snap.forEach((docSnap) => {
            const fEmail = docSnap.id;
            const friendData = userCache[fEmail] || { displayName: fEmail.split('@')[0], photoURL: defaultAvatar, online: false };
            
            const btn = document.createElement('button');
            btn.className = 'target-btn';
            btn.style = "width: 100%; padding: 6px; background: rgba(88,101,242,0.1); border: 1px solid rgba(88,101,242,0.2); color: #fff; text-align: left; cursor: pointer; display: flex; align-items: center; gap: 8px; border-radius: 4px;";
            const statusColor = friendData.online ? '#3ba55d' : '#747f8d';
            
            btn.innerHTML = `
                <span style="width:6px; height:6px; background:${statusColor}; border-radius:50%; display:inline-block;"></span>
                <img src="${friendData.photoURL || defaultAvatar}" style="width:20px; height:20px; border-radius:50%; object-fit:cover;"> 
                <span style="font-size:12px; font-weight:500;">${friendData.displayName}</span>
            `;
            
            btn.addEventListener('click', () => {
                highlightSidebarBtn(btn);
                if (callBtn) callBtn.classList.remove('hidden'); 
                switchChannel("dm", fEmail);
            });
            friendsList.appendChild(btn);
        });
        
        if(friendsList.innerHTML === '') {
            friendsList.innerHTML = `<span style="color:#747f8d; font-size:11px; padding:5px;">No friends added yet</span>`;
        }
    });
}

function highlightSidebarBtn(activeButton) {
    document.querySelectorAll('.target-btn').forEach(b => b.style.background = 'none');
    if (activeButton) activeButton.style.background = '#4f545c';
}

// --- Live Cloudinary Media Stream Engine (Hybrid Filtering Architecture) ---
if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = messageInput.value.trim();
        const file = mediaInput.files[0];
        if (!text && !file) return;

        try {
            let finalUrl = null; 
            let fileType = null;
            
            if (file) {
                fileType = file.type.startsWith('video/') ? 'video' : 'image';

                // OPTIMIZED ACTION: If it's a small standard image, process it locally as Base64 text string
                if (fileType === 'image') {
                    currentRoomTitle.textContent = "Compressing local text image string... 🗜️";
                    finalUrl = await new Promise((resolve, reject) => {
                        const r = new FileReader();
                        r.onload = () => resolve(r.result);
                        r.onerror = (err) => reject(err);
                        r.readAsDataURL(file);
                    });
                } else {
                    // LARGE MEDIA ACTION: Route videos straight into your Cloudinary engine bucket
                    currentRoomTitle.textContent = "Broadcasting video straight to global web cloud... 🌐";
                    
                    const YOUR_CLOUD_NAME = "ddvsercvm"; 
                    const YOUR_UNSIGNED_PRESET = "chat_preset";
                    
                    const targetEndpoint = `https://api.cloudinary.com/v1_1/${YOUR_CLOUD_NAME}/video/upload`;
                    
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("upload_preset", YOUR_UNSIGNED_PRESET);
                    
                    const response = await fetch(targetEndpoint, {
                        method: "POST",
                        body: formData
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error?.message || "Cloudinary upload rejected.");
                    }
                    
                    const data = await response.json();
                    finalUrl = data.secure_url;
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
            } else {
                const combinedRoomId = getDMId(currentUser.email, activeServerId);
                await addDoc(collection(db, "direct_messages", combinedRoomId, "messages"), payload);
            }
            chatForm.reset();
            mediaInput.value = "";
        } catch (err) { 
            console.error(err);
            alert("Global cloud media upload failure: " + err.message);
        } finally {
            switchChannel(currentChatMode, activeServerId);
        }
    });
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
        const targetUser = userCache[id] || {};
        currentRoomTitle.textContent = `${targetUser.displayName || id}`;
    }
    loadMessages();
}

function loadMessages() {
    if (unsubscribeChat) unsubscribeChat();
    if (!chatMessages) return;
    chatMessages.innerHTML = '';

    let q; let baseColl = "messages"; let subRoom = null;
    const initialModeSnapshot = currentChatMode;
    const initialIdSnapshot = activeServerId;

    if (currentChatMode === "public") {
        q = query(collection(db, "messages"), orderBy("timestamp", "asc"), limit(60));
    } else if (currentChatMode === "server") {
        baseColl = "servers"; subRoom = activeServerId;
        q = query(collection(db, "servers", activeServerId, "messages"), orderBy("timestamp", "asc"));
    } else {
        baseColl = "direct_messages"; subRoom = getDMId(currentUser.email, activeServerId);
        q = query(collection(db, "direct_messages", subRoom, "messages"), orderBy("timestamp", "asc"));
    }

    let initialLoadComplete = false;
    unsubscribeChat = onSnapshot(q, (snap) => {
        chatMessages.innerHTML = '';
        let lastIncomingMessage = null;

        snap.forEach((docSnap) => {
            const data = docSnap.data(); const msgId = docSnap.id;
            if (data.disappearing && data.timestamp) {
                const msgTime = data.timestamp.toDate().getTime();
                if (Date.now() - msgTime > 10000) {
                    handleModifyMessage(msgId, 'delete', baseColl, subRoom); return; 
                }
            }
            if (initialLoadComplete && data.user !== currentUser.email.toLowerCase()) { 
                lastIncomingMessage = data; 
            }

            const messageEl = document.createElement('div');
            messageEl.style = "display: flex; gap: 10px; margin-bottom: 12px; padding: 4px;";
            
            let mediaMarkup = '';
            if (data.fileUrl) {
                if (data.fileType === 'video') {
                    mediaMarkup = `
                        <div style="margin-top: 5px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); max-width: 300px;">
                            <video src="${data.fileUrl}" style="max-width:100%; border-radius:4px; background:#000;" controls playsinline></video>
                        </div>
                    `;
                } else if (data.fileType === 'giphy') {
                    mediaMarkup = `
                        <div style="margin-top: 5px; max-width: 280px; aspect-ratio: 1; border-radius: 6px; overflow: hidden;">
                            <iframe src="https://giphy.com/embed/${data.fileUrl}" width="100%" height="100%" frameBorder="0" class="giphy-embed" style="pointer-events: auto;" allowFullScreen></iframe>
                        </div>
                    `;
                } else {
                    mediaMarkup = `<img src="${data.fileUrl}" style="max-width:250px; border-radius:6px; margin-top:5px;">`;
                }
            }

            const isSentByMe = data.user === currentUser.email.toLowerCase();
            const actionControlsMarkup = isSentByMe ? `<button class="delete-trigger" style="background:none; border:none; color:#ed4245; cursor:pointer; font-size:11px;">❌</button>` : '';
            const cachedUser = userCache[data.user.toLowerCase()] || {};

            messageEl.innerHTML = `
                <img class="msg-avatar-click" src="${cachedUser.photoURL || defaultAvatar}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; cursor:pointer;">
                <div style="flex:1;">
                    <div style="display:flex; justify-content:space-between;">
                        <strong class="msg-username-click" style="color:#fff; font-size:13px; cursor:pointer;">${cachedUser.displayName || data.displayName || data.user}</strong>
                        ${actionControlsMarkup}
                    </div>
                    <div style="color:#dcddde; font-size:14px; margin-top:2px;">${escapeHTML(data.text || '')}</div>
                    ${mediaMarkup}
                </div>
            `;
            
            const avatarClick = messageEl.querySelector('.msg-avatar-click');
            const userClick = messageEl.querySelector('.msg-username-click');
            if (avatarClick) avatarClick.addEventListener('click', () => launchUserProfileInspector(data.user));
            if (userClick) userClick.addEventListener('click', () => launchUserProfileInspector(data.user));

            if (isSentByMe) {
                const delBtn = messageEl.querySelector('.delete-trigger');
                if (delBtn) delBtn.addEventListener('click', () => handleModifyMessage(msgId, 'delete', baseColl, subRoom));
            }
            chatMessages.appendChild(messageEl);
        });

        if (initialLoadComplete && lastIncomingMessage) {
            addAlertNotification(
                lastIncomingMessage.displayName || lastIncomingMessage.user, 
                lastIncomingMessage.text, 
                initialModeSnapshot, 
                initialIdSnapshot
            );
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
