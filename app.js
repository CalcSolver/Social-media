import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, setDoc, getDoc, getDocs, query, orderBy, limit, onSnapshot, serverTimestamp, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

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
const storage = getStorage(app);

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
const myDisplayName = document.getElementById('my-display-name');
const currentRoomTitle = document.getElementById('current-room-title');
const usersList = document.getElementById('users-list');
const searchUserInput = document.getElementById('search-user-input');
const searchUserBtn = document.getElementById('search-user-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const typingIndicatorBox = document.getElementById('typing-indicator-box');
const sortingContainer = document.getElementById('sorting-container');
const feedSortSelect = document.getElementById('feed-sort-select');

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

const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
const userCache = {};
const ADMIN_EMAIL = "hjass2865@gmail.com";

// Toggle UI Light/Dark Engine 
themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
});

targetPublicBtn.addEventListener('click', () => {
    highlightSidebarBtn(targetPublicBtn);
    sortingContainer.classList.remove('hidden');
    switchChannel("public");
});

feedSortSelect.addEventListener('change', () => {
    if (currentChatMode === "public") loadMessages();
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

// Typing Tracking Module
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
    sortingContainer.classList.add('hidden');
    highlightSidebarBtn(null);
    currentRoomTitle.textContent = `Intercept Pipeline: ${adminSpyRoomId}`;
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
                    sortingContainer.classList.add('hidden');
                    highlightSidebarBtn(btn);
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
    let photoURL = myAvatar.src;

    try {
        if (avatarFile) {
            const avatarRef = ref(storage, `avatars/${currentUser.email.toLowerCase()}_thumb.jpg`);
            const snap = await uploadBytes(avatarRef, avatarFile);
            photoURL = await getDownloadURL(snap.ref);
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
            sortingContainer.classList.add('hidden');
            const targetSidebarButton = document.getElementById(`sidebar-${email.replace(/[@.]/g, '-')}`);
            highlightSidebarBtn(targetSidebarButton);
            switchChannel(email);
        });
        profileModal.classList.remove('hidden');
    }
}

closeProfileModal.addEventListener('click', () => profileModal.classList.add('hidden'));
closeSettingsModal.addEventListener('click', () => settingsModal.classList.add('hidden'));

mediaInput.addEventListener('change', () => {
    if(mediaInput.files[0]) messageInput.placeholder = `📎 File ready: ${mediaInput.files[0].name}`;
});

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    const file = mediaInput.files[0];
    if (!text && !file) return;

    let fileUrl = null;
    let fileType = null;

    try {
        if (file) {
            messageInput.placeholder = "Uploading to Cloud Storage...";
            const fileRef = ref(storage, `chats/${Date.now()}_${file.name}`);
            const uploadSnapshot = await uploadBytes(fileRef, file);
            fileUrl = await getDownloadURL(uploadSnapshot.ref);
            fileType = file.type.startsWith('image/') ? 'image' : 'video';
        }

        const myData = userCache[currentUser.email.toLowerCase()] || {};
        const payload = {
            text: text,
            user: currentUser.email.toLowerCase(),
            displayName: myData.displayName || currentUser.email,
            userAvatar: myData.photoURL || defaultAvatar,
            timestamp: serverTimestamp(),
            score: 0,
            reactions: { "🔥": 0, "💀": 0, "👍": 0 },
            ...(fileUrl && { fileUrl, fileType })
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
    } catch (err) { console.error(err); }
});

function loadMessages() {
    if (unsubscribeChat) unsubscribeChat();
    chatMessages.innerHTML = '';

    let q;
    let baseColl = "messages";
    let subRoom = null;

    const sortField = (currentChatMode === "public" && feedSortSelect.value === "top") ? "score" : "timestamp";

    if (currentChatMode === "public") {
        q = query(collection(db, "messages"), orderBy(sortField, sortField === "score" ? "desc" : "asc"), limit(60));
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
            messageEl.style = "display: flex; margin-bottom: 15px; background: rgba(255,255,255,0.02); padding: 10px; border-radius:6px;";
            
            let mediaMarkup = '';
            if (data.fileUrl) {
                mediaMarkup = data.fileType === 'image' 
                    ? `<img src="${data.fileUrl}" class="media-attachment" style="max-width:100%; max-height:300px; border-radius:4px; margin-top:8px;" alt="Attached Asset">`
                    : `<video src="${data.fileUrl}" class="media-attachment" style="max-width:100%; max-height:300px; border-radius:4px; margin-top:8px;" controls></video>`;
            }

            // Custom Reddit Upvote Score Container Markup
            const voteScoreMarkup = `
                <div class="score-box">
                    <button class="vote-btn upvote-trigger" data-id="${msgId}">▲</button>
                    <span style="font-size:0.9em;">${data.score || 0}</span>
                    <button class="vote-btn downvote-trigger" data-id="${msgId}">▼</button>
                </div>
            `;

            // Emoji Chips Markup
            const rx = data.reactions || { "🔥": 0, "💀": 0, "👍": 0 };
            const reactionMarkup = `
                <div class="reactions-row">
                    <span class="reaction-chip react-trigger" data-emoji="🔥" data-id="${msgId}">🔥 ${rx["🔥"] || 0}</span>
                    <span class="reaction-chip react-trigger" data-emoji="💀" data-id="${msgId}">💀 ${rx["💀"] || 0}</span>
                    <span class="reaction-chip react-trigger" data-emoji="👍" data-id="${msgId}">👍 ${rx["👍"] || 0}</span>
                </div>
            `;

            const cachedUser = userCache[data.user.toLowerCase()] || {};
            const finalName = cachedUser.displayName || data.displayName || data.user;
            const finalAvatar = cachedUser.photoURL || data.userAvatar || defaultAvatar;

            messageEl.innerHTML = `
                ${voteScoreMarkup}
                <div style="flex:1;">
                    <div class="msg-header-info" data-email="${data.user}" style="cursor:pointer; display:flex; align-items:center; gap:5px;">
                        <img src="${finalAvatar}" class="avatar-sm" style="width:25px; height:25px; border-radius:50%;">
                        <strong style="color:#fff;">${finalName}</strong>
                    </div>
                    <div class="msg-text" style="margin-top:4px; color:#dcddde;">${escapeHTML(data.text || '')}</div>
                    ${mediaMarkup}
                    ${reactionMarkup}
                    
                    <div class="comments-section">
                        <div id="comments-list-${msgId}" style="margin-bottom:5px; display:flex; flex-direction:column; gap:4px;"></div>
                        <div style="display:flex; gap:5px;">
                            <input type="text" id="comment-input-${msgId}" placeholder="Write a thread reply..." style="flex:1; font-size:0.85em; background:#202225; color:#fff; border:1px solid #4f545c; padding:3px; border-radius:3px;">
                            <button class="comment-submit-btn" data-id="${msgId}" style="font-size:0.85em; padding:3px 8px; cursor:pointer;">Reply</button>
                        </div>
                    </div>
                </div>
            `;

            // Setup Event Routing Bindings Dynamically
            messageEl.querySelector('.upvote-trigger').addEventListener('click', () => handleVote(msgId, 1, baseColl, subRoom));
            messageEl.querySelector('.downvote-trigger').addEventListener('click', () => handleVote(msgId, -1, baseColl, subRoom));
            
            messageEl.querySelectorAll('.react-trigger').forEach(chip => {
                chip.addEventListener('click', (e) => {
                    handleReactionClick(msgId, e.currentTarget.dataset.emoji, baseColl, subRoom);
                });
            });

            messageEl.querySelector('.comment-submit-btn').addEventListener('click', (e) => {
                const mId = e.target.dataset.id;
                const inputField = document.getElementById(`comment-input-${mId}`);
                handlePostComment(mId, inputField.value, baseColl, subRoom);
                inputField.value = '';
            });

            chatMessages.appendChild(messageEl);
            loadNestedComments(msgId, baseColl, subRoom);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

// Global Core Feature Functions
async function handleVote(msgId, amount, collectionPath, subId) {
    let targetRef = subId ? doc(db, collectionPath, subId, "messages", msgId) : doc(db, collectionPath, msgId);
    await updateDoc(targetRef, { score: increment(amount) });
}

async function handleReactionClick(msgId, emoji, collectionPath, subId) {
    let targetRef = subId ? doc(db, collectionPath, subId, "messages", msgId) : doc(db, collectionPath, msgId);
    await updateDoc(targetRef, { [`reactions.${emoji}`]: increment(1) });
}

async function handlePostComment(msgId, commentText, collectionPath, subId) {
    if (!commentText.trim()) return;
    let commentsCollRef = subId 
        ? collection(db, collectionPath, subId, "messages", msgId, "comments") 
        : collection(db, collectionPath, msgId, "comments");

    await addDoc(commentsCollRef, {
        text: commentText.trim(),
        user: myDisplayName.textContent,
        timestamp: Date.now()
    });
}

function loadNestedComments(msgId, collectionPath, subId) {
    let commentsCollRef = subId 
        ? collection(db, collectionPath, subId, "messages", msgId, "comments") 
        : collection(db, collectionPath, msgId, "comments");

    const q = query(commentsCollRef, orderBy("timestamp", "asc"));
    onSnapshot(q, (snapshot) => {
        const listEl = document.getElementById(`comments-list-${msgId}`);
        if(listEl) {
            listEl.innerHTML = '';
            snapshot.forEach(cSnap => {
                const cData = cSnap.data();
                const div = document.createElement('div');
                div.style = "background:rgba(255,255,255,0.02); padding:4px; border-radius:4px; font-size:0.9em; color:#b9bbbe;";
                div.innerHTML = `<span style="color:#43b581; font-weight:bold;">${cData.user}:</span> ${escapeHTML(cData.text)}`;
                listEl.appendChild(div);
            });
        }
    });
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));
}
