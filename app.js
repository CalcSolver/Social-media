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

// Target Bindings
const targetPublicBtn = document.getElementById('target-public');
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const messagingContainer = document.getElementById('messaging-container');
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
const usersList = document.getElementById('users-list');
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
let adminSpyRoomId = null;
let unsubscribeChat = null;
let unsubscribePresence = null;
let typingTimeout = null;

// Video Calling Global Tracking States
let myPeerInstance = null;
let currentMediaConnection = null;
let localMediaStream = null;

const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
const userCache = {};
const ADMIN_EMAIL = "hjass2865@gmail.com";

// Streamlined Cloudinary Engine for heavy files (Videos)
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
        console.error("Cloudinary Error:", err);
        return null;
    }
}

// PeerJS Initialization Function
function buildRealTimePeerConnection(userEmailCleaned) {
    if (myPeerInstance) return;

    // We instantiate Peer connection named uniquely by the user's logged email
    myPeerInstance = new Peer(userEmailCleaned);

    // Listen for incoming calls from other users
    myPeerInstance.on('call', async (incomingCall) => {
        if (confirm(`Incoming video call from another participant. Answer?`)) {
            try {
                localMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                localVideo.srcObject = localMediaStream;
                videoCallModal.classList.remove('hidden');

                incomingCall.answer(localMediaStream);
                currentMediaConnection = incomingCall;

                incomingCall.on('stream', (incomingStream) => {
                    remoteVideo.srcObject = incomingStream;
                });
            } catch (err) {
                alert("Could not access camera/microphone metadata setup.");
            }
        } else {
            incomingCall.close();
        }
    });
}

// Event Bindings for Audio/Video Pipeline
callBtn.addEventListener('click', async () => {
    if (currentChatMode === "public" || currentChatMode.startsWith("spy_")) return;
    
    const cleaningTarget = currentChatMode.replace(/[@.]/g, '_');
    
    try {
        localMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localMediaStream;
        videoCallModal.classList.remove('hidden');

        // Fire call targeting the peer node of your chat partner
        const outboundCall = myPeerInstance.call(cleaningTarget, localMediaStream);
        currentMediaConnection = outboundCall;

        outboundCall.on('stream', (incomingStream) => {
            remoteVideo.srcObject = incomingStream;
        });
    } catch (err) {
        alert("Camera initialization blocked. Check user preferences/permissions.");
    }
});

endCallBtn.addEventListener('click', () => {
    if (currentMediaConnection) currentMediaConnection.close();
    if (localMediaStream) {
        localMediaStream.getTracks().forEach(track => track.stop());
    }
    videoCallModal.classList.add('hidden');
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
});

themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
});

targetPublicBtn.addEventListener('click', () => {
    highlightSidebarBtn(targetPublicBtn);
    callBtn.classList.add('hidden'); // No calls in public channels
    switchChannel("public");
});

toggleLink.addEventListener('click', () => {
    isSignUpMode = !isSignUpMode;
    submitBtn.textContent = isSignUpMode ? "Sign Up" : "Login";
    document.getElementById('toggle-auth').innerHTML = isSignUpMode 
        ? 'Already have an account? <span id="toggle-link">Login</span>'
        : 'Don\'t have an account? <span id="toggle-link">Sign Up</span>';
    document.getElementById('toggle-link').addEventListener('click', () => toggleLink.click());
});

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

logoutBtn.addEventListener('click', async () => {
    if (currentUser) {
        await updateDoc(doc(db, "users", currentUser.email.toLowerCase()), { online: false });
    }
    if (myPeerInstance) myPeerInstance.destroy();
    signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        
        if (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
            adminMonitorPanel.classList.remove('hidden');
        } else {
            adminMonitorPanel.classList.add('hidden');
        }

        const userDoc = await getDoc(doc(db, "users", user.email.toLowerCase()));
        if (userDoc.exists()) {
            const data = userDoc.data();
            myDisplayName.textContent = data.displayName || user.email;
            myAvatar.src = data.photoURL || defaultAvatar;
            userCache[user.email.toLowerCase()] = data;
        }

        // Connect the client to Peer infrastructure instantly
        buildRealTimePeerConnection(user.email.toLowerCase().replace(/[@.]/g, '_'));

        targetPublicBtn.click(); 
        listenForUserPresence();
    } else {
        currentUser = null;
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
        if (unsubscribeChat) unsubscribeChat();
        if (unsubscribePresence) unsubscribePresence();
    }
});

messageInput.addEventListener('input', () => {
    if (!currentUser) return;
    const roomPath = currentChatMode === "public" ? "global" : getDMId(currentUser.email, currentChatMode);
    
    setDoc(doc(db, "typing", roomPath), {
        [currentUser.email.replace(/[@.]/g, '_')]: true,
        displayName: myDisplayName.textContent
    }, { merge: true });

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        setDoc(doc(db, "typing", roomPath), {
            [currentUser.email.replace(/[@.]/g, '_')]: false
        }, { merge: true });
    }, 2000);
});

function listenForTypingIndicators(roomPath) {
    onSnapshot(doc(db, "typing", roomPath), (snapshot) => {
        if (!snapshot.exists()) { typingIndicatorBox.textContent = ""; return; }
        const data = snapshot.data();
        let typers = [];
        for (let key in data) {
            if (key !== "displayName" && data[key] === true && key !== currentUser.email.replace(/[@.]/g, '_')) {
                typers.push(data.displayName || "Someone");
            }
        }
        typingIndicatorBox.textContent = typers.length > 0 ? `${typers.join(', ')} is typing...` : "";
    });
}

adminSpyBtn.addEventListener('click', () => {
    const targetRoomInput = adminRoomInput.value.trim();
    if (!targetRoomInput) return;
    adminSpyRoomId = targetRoomInput.toLowerCase();
    currentChatMode = "spy_" + adminSpyRoomId;
    highlightSidebarBtn(null);
    callBtn.classList.add('hidden');
    currentRoomTitle.textContent = `Intercept: ${adminSpyRoomId}`;
    loadMessages();
});

searchUserBtn.addEventListener('click', async () => {
    const searchEmail = searchUserInput.value.trim().toLowerCase();
    if (!searchEmail || searchEmail === currentUser.email.toLowerCase()) return;
    await showUserProfile(searchEmail);
});

function getDMId(userA, userB) {
    return [userA.toLowerCase(), userB.toLowerCase()].sort().join("-v-").replace(/[@.]/g, '_');
}

function listenForUserPresence() {
    if (unsubscribePresence) unsubscribePresence();
    unsubscribePresence = onSnapshot(collection(db, "users"), (snapshot) => {
        usersList.innerHTML = '';
        snapshot.forEach((docSnap) => {
            const userData = docSnap.data();
            userCache[userData.email.toLowerCase()] = userData;
            
            if (userData.email.toLowerCase() !== currentUser.email.toLowerCase()) {
                const btn = document.createElement('button');
                btn.className = 'target-btn';
                btn.id = `sidebar-${userData.email.toLowerCase().replace(/[@.]/g, '-')}`;
                
                const statusClass = userData.online ? 'status-online' : 'status-offline';
                btn.innerHTML = `
                    <span class="status-dot ${statusClass}"></span>
                    <img src="${userData.photoURL || defaultAvatar}" class="avatar-sm"> 
                    ${userData.displayName || userData.email}
                `;
                btn.addEventListener('click', () => {
                    highlightSidebarBtn(btn);
                    callBtn.classList.remove('hidden'); // Expose Calling on Direct Chats
                    switchChannel(userData.email.toLowerCase());
                });
                usersList.appendChild(btn);
            }
        });
    });
}

function highlightSidebarBtn(activeButton) {
    document.querySelectorAll('.target-btn').forEach(b => b.classList.remove('active'));
    if (activeButton) activeButton.classList.add('active');
}

function switchChannel(mode) {
    currentChatMode = mode.toLowerCase();
    currentRoomTitle.textContent = mode === "public" ? "Global Chat" : `Direct Message: ${mode}`;
    loadMessages();
    const roomPath = currentChatMode === "public" ? "global" : getDMId(currentUser.email, currentChatMode);
    listenForTypingIndicators(roomPath);
}

myProfileDisplay.addEventListener('click', async () => {
    const userDoc = await getDoc(doc(db, "users", currentUser.email.toLowerCase()));
    if (userDoc.exists()) {
        const data = userDoc.data();
        settingsNameInput.value = data.displayName || '';
        settingsStatusInput.value = data.status || '';
    }
    settingsModal.classList.remove('hidden');
});

settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = settingsNameInput.value.trim();
    const newStatus = settingsStatusInput.value.trim();
    const avatarFile = settingsAvatarInput.files[0];
    
    try {
        let photoURL = myAvatar.src;
        if (avatarFile) {
            photoURL = await uploadToCloudinary(avatarFile) || myAvatar.src;
        }

        await updateProfile(auth.currentUser, { displayName: newName, photoURL: photoURL });
        const userPayload = { displayName: newName, status: newStatus, photoURL: photoURL, email: currentUser.email.toLowerCase() };
        await setDoc(doc(db, "users", currentUser.email.toLowerCase()), userPayload, { merge: true });
        
        myAvatar.src = photoURL;
        myDisplayName.textContent = newName;
        settingsModal.classList.add('hidden');
        settingsForm.reset();
    } catch (err) { alert(err.message); }
});

async function showUserProfile(email) {
    email = email.toLowerCase();
    let data = userCache[email];
    if (data) {
        viewProfileAvatar.src = data.photoURL || defaultAvatar;
        viewProfileName.textContent = data.displayName || email;
        viewProfileEmail.textContent = email;
        viewProfileStatus.textContent = data.status || "No status set.";
        
        const newDmBtn = dmStartBtn.cloneNode(true);
        dmStartBtn.parentNode.replaceChild(newDmBtn, dmStartBtn);
        newDmBtn.addEventListener('click', () => {
            profileModal.classList.add('hidden');
            searchUserInput.value = '';
            const targetSidebarButton = document.getElementById(`sidebar-${email.replace(/[@.]/g, '-')}`);
            highlightSidebarBtn(targetSidebarButton);
            callBtn.classList.remove('hidden');
            switchChannel(email);
        });
        profileModal.classList.remove('hidden');
    }
}

closeProfileModal.addEventListener('click', () => profileModal.classList.add('hidden'));
closeSettingsModal.addEventListener('click', () => settingsModal.classList.add('hidden'));

mediaInput.addEventListener('change', () => {
    if(mediaInput.files[0]) messageInput.placeholder = `📎 Ready: ${mediaInput.files[0].name}`;
});

// HYBRID PROCESSING HANDLER: Base64 for Images, Cloudinary for Videos
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    const file = mediaInput.files[0];
    if (!text && !file) return;

    messageInput.placeholder = "Processing asset payload...";

    try {
        let finalUrl = null;
        let fileType = null;

        if (file) {
            if (file.type.startsWith('image/')) {
                messageInput.placeholder = "Encoding image to text string...";
                finalUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = (err) => reject(err);
                    reader.readAsDataURL(file);
                });
                fileType = 'image';
            } else if (file.type.startsWith('video/')) {
                messageInput.placeholder = "Streaming video file asset to Cloudinary...";
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
            reactions: { "🔥": 0, "💀": 0, "👍": 0 },
            ...(finalUrl && { fileUrl: finalUrl, fileType: fileType })
        };

        if (currentChatMode === "public") {
            await addDoc(collection(db, "messages"), payload);
        } else if (currentChatMode.startsWith("spy_")) {
            await addDoc(collection(db, "direct_messages", adminSpyRoomId, "messages"), payload);
        } else {
            const combinedRoomId = getDMId(currentUser.email, currentChatMode);
            await addDoc(collection(db, "direct_messages", combinedRoomId, "messages"), payload);
        }

        chatForm.reset();
        messageInput.placeholder = "Type a message or drop a file...";
    } catch (err) { 
        console.error(err); 
        messageInput.placeholder = "Error parsing attached file asset...";
    }
});

async function handleModifyMessage(msgId, action, collectionPath, subId = null) {
    let targetRef = subId ? doc(db, collectionPath, subId, "messages", msgId) : doc(db, collectionPath, msgId);
    if (action === 'delete') {
        if (confirm("Delete this message?")) await deleteDoc(targetRef);
    }
}

function loadMessages() {
    if (unsubscribeChat) unsubscribeChat();
    chatMessages.innerHTML = '';

    let q;
    let baseColl = "messages";
    let subRoom = null;

    if (currentChatMode === "public") {
        q = query(collection(db, "messages"), orderBy("timestamp", "asc"), limit(60));
    } else if (currentChatMode.startsWith("spy_")) {
        baseColl = "direct_messages"; subRoom = adminSpyRoomId;
        q = query(collection(db, "direct_messages", adminSpyRoomId, "messages"), orderBy("timestamp", "asc"));
    } else {
        baseColl = "direct_messages"; subRoom = getDMId(currentUser.email, currentChatMode);
        q = query(collection(db, "direct_messages", subRoom, "messages"), orderBy("timestamp", "asc"));
    }

    unsubscribeChat = onSnapshot(q, (snapshot) => {
        chatMessages.innerHTML = '';
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const msgId = docSnap.id;
            const messageEl = document.createElement('div');
            const isSentByMe = data.user === currentUser.email.toLowerCase();
            const isLoggedAsAdmin = currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
            
            messageEl.className = "msg-wrapper";
            messageEl.style = "display: flex; gap: 10px; margin-bottom: 12px; padding: 6px; border-radius:4px;";
            
            let mediaMarkup = '';
            if (data.fileUrl) {
                const isVideo = data.fileType === 'video' || data.fileUrl.match(/\.(mp4|webm|ogg|mov)$/i);
                mediaMarkup = isVideo 
                    ? `<video src="${data.fileUrl}" class="media-attachment" controls></video>`
                    : `<img src="${data.fileUrl}" class="media-attachment" alt="Embedded Asset Link">`;
            }

            const rx = data.reactions || { "🔥": 0, "💀": 0, "👍": 0 };
            const reactionMarkup = `
                <div class="reactions-row">
                    <span class="reaction-chip react-trigger" data-emoji="🔥" data-id="${msgId}">🔥 ${rx["🔥"] || 0}</span>
                    <span class="reaction-chip react-trigger" data-emoji="💀" data-id="${msgId}">💀 ${rx["💀"] || 0}</span>
                    <span class="reaction-chip react-trigger" data-emoji="👍" data-id="${msgId}">👍 ${rx["👍"] || 0}</span>
                </div>
            `;

            const actionControlsMarkup = (isSentByMe || isLoggedAsAdmin) ? `
                <span class="msg-actions">
                    <button class="action-btn del delete-trigger" data-id="${msgId}">❌</button>
                </span>
            ` : '';

            const cachedUser = userCache[data.user.toLowerCase()] || {};
            const finalName = cachedUser.displayName || data.displayName || data.user;
            const finalAvatar = cachedUser.photoURL || data.userAvatar || defaultAvatar;

            messageEl.innerHTML = `
                <img src="${finalAvatar}" class="avatar-sm" style="width:36px; height:36px; border-radius:50%; margin-top:3px;">
                <div style="flex:1;">
                    <div style="display:flex; align-items:center; justify-content:space-between;">
                        <strong style="color:#fff;">${finalName}</strong>
                        ${actionControlsMarkup}
                    </div>
                    <div style="margin-top:2px; color:#dcddde; word-break: break-word;">${escapeHTML(data.text || '')}</div>
                    ${mediaMarkup}
                    ${reactionMarkup}
                </div>
            `;

            if (isSentByMe || isLoggedAsAdmin) {
                messageEl.querySelector('.delete-trigger').addEventListener('click', () => {
                    handleModifyMessage(msgId, 'delete', baseColl, subRoom);
                });
            }

            messageEl.querySelectorAll('.react-trigger').forEach(chip => {
                chip.addEventListener('click', (e) => {
                    handleReactionClick(msgId, e.currentTarget.dataset.emoji, baseColl, subRoom);
                });
            });

            chatMessages.appendChild(messageEl);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

async function handleReactionClick(msgId, emoji, collectionPath, subId) {
    let targetRef = subId ? doc(db, collectionPath, subId, "messages", msgId) : doc(db, collectionPath, msgId);
    await updateDoc(targetRef, { [`reactions.${emoji}`]: increment(1) });
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));
}
