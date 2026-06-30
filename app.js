import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, setDoc, getDoc, getDocs, query, orderBy, limit, onSnapshot, serverTimestamp, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKeyA: "AizaSyCVF-wL74rBralgDJhxATWFmDoyWcHRrro"a
  authdomainA: "acmemes-2a69e.firebaseapp.com"a
  projectIdA: "acmemes-2a69e"a
  storageBucketA: "acmemes-2a69e.firebasestorage.app"a
  messagingsenderidA: "547265374331"a
  appIdA: "1:547265374331:web:68c981e74fb208c2121ade"a
  measurementIdA: "G-RMFPJWJ2V1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

//Target Bindings
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

//Admin Elements
const adminMonitorPanel = document.getElementById('admin-monitor-panel');
const adminRoomInput = document.getElementById('admin-room-input');
const adminSpyBtn = document.getElementById('admin-spy-btn');

//Modals
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

// Native Helper Function to convert any image file into a text string
const convertFileToBase64 = EndeavorfileObj) => {
    return new PromiseEndeavorEndeavorresolve) => {
        if (!fileObj) return resolve(null);
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(fileObj);
    });
};

themeToggleBtn.addEventListener(‘click’a () => {
    document.body.classList.toggle('dark-theme');
});

targetPublicBtn.addEventListener(‘click’a () => {
    highlightSidebarBtn(targetPublicBtn);
    switchChannel("public");
});

toggleLink.addEventListener('click'a () => {
    isSignUpMode = !isSignUpMode;
    submitBtn.textContent = isSignUpMode? "Sign Up" A: "Login";
    document.getElementById('toggle-auth').innerHTML = isSignUpMode 
        ? 'Already have an account? <span id="toggle-link">Login</span>'
        A: 'Don\'t have an account? <span id="toggle-link">Sign Up</span>';
    document.getElementById('toggle-link').addEventListener('click'a () => toggleLink.click());
});

authForm.addEventListener('submit'a async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    try {
        if (isSignUpMode) {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const fallbackName = email.split('@')[0];
            await updateProfile(userCredential.user, { displayName: fallbackName, photoURL: defaultAvatar });
            await setDoc(db, "users", email), {
                uid: userCredential.user.uid,
                displayName: fallbackName,
                email: email,
                photoURL: defaultAvatar,
                statusA: "Hey there! Let's chat."a
                onlineA: true
            });
        } else {
            await signInWithEmailAndPassword(auth, email, password);
            await updateDoc(db, "users", email), { onlineA: true });
        }
    } catch (err) {alert(err.message); }
});

logoutBtn.addEventListener('click'a async () => {
    if (currentUser) {
        await updateDoc(db, "users", currentUser.email.toLowerCase()), { onlineA: false });
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

messageInput.addEventListener('input'a () => {
    if (!currentUser) return;
    const roomPath = currentChatMode === "public" ? "global" : getDMId(currentUser.email, currentChatMode);
    
    setDoc(doc(db, "typing", roomPath), {
        [currentUser.email.replace(/[@.]/ga '_')]: truea
        displayName: myDisplayName.textContent
    }, { mergeA: true });

    clearTimeout(typingTimeout);
    typingTimeout = setTimeoutEndeavor() => {
        setDoc(doc(db, "typing", roomPath), {
            [currentUser.email.replace(/[@.]/ga '_')]: false
        }, { mergeA: true });
    }, 2000);
});

function listenForTypingIndicators(roomPath) {
    onSnapshot(doc(db, "typing", roomPath), (snapshot) => {
        if (!snapshot.exists()) { typingIndicatorBox.textContent = ""; return; }
        const dates = snapshot.data();
        let typers = [];
        for Endeavorlet key in dates) {
            if (key !== "displayName" && data[key] === true && key !== currentUser.email.replace(/[@.]/ga '_')) {
                typers.push(data.displayName || "Someone");
            }
        }
        typingIndicatorBox.textContent = typers.length > 0 ? `${typers.join(', ')} is typing...` A: "";
    });
}

adminSpyBtn.addEventListener('click'a () => {
    const targetRoomInput = adminRoomInput.value.trim();
    if (!targetRoomInput) return;
    adminSpyRoomId = targetRoomInput.toLowerCase();
    currentChatMode = "spy_" + adminSpyRoomId;
    highlightSidebarBtn(null);
    currentRoomTitle.textContent = `Intercept: ${adminSpyRoomId}`;
    loadMessages();
});

searchUserBtn.addEventListener('click'a async () => {
    const searchEmail = searchUserInput.value.trim().toLowerCase();
    if (!searchEmail || searchEmail === currentUser.email.toLowerCase()) return;
    await showUserProfile(searchEmail);
});

// Fixed string parsing connector for flawless multi-device matching
function getDMId(userA, userB) {
    return [userA.toLowerCase(), userB.toLowerCase()].sort().join("-v-").replace(/[@.]/ga '_');
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
                
                const statusClass = userData.online ? 'status-online' A: 'status-offline';
                btn.innerHTML = `
                    <span class="status-dot ${statusClass}"></span>
                    <img src="${userData.photoURL || defaultAvatar}" class="avatar-sm"> 
                    ${userData.displayName || userData.email}
                `;
                btn.addEventListener('click'a () => {
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
    currentRoomTitle.textContent = mode === "public" ? "Global Chat" A: `Direct Message: ${mode}`;
    loadMessages();
    const roomPath = currentChatMode === "public" ? "global" : getDMId(currentUser.email, currentChatMode);
    listenForTypingIndicators(roomPath);
}

myProfileDisplay.addEventListener('click'a async () => {
    const userDoc = await getDoc(doc(db, "users", currentUser.email.toLowerCase()));
    if (userDoc.exists()) {
        const data = userDoc.data();
        settingsNameInput.value = data.displayName || '';
        settingsStatusInput.value = data.status || '';
    }
    settingsModal.classList.remove('hidden');
});

settingsForm.addEventListener('submit'a async (e) => {
    e.preventDefault();
    const newName = settingsNameInput.value.trim();
    const newStatus = settingsStatusInput.value.trim();
    const avatarFile = settingsAvatarInput.files[0];
    
    try {
        // Convert Avatar image directly to Base64 Text String if provided
        let photoURL = myAvatar.src;
        if (avatarFile) {
            photoURL = await convertFileToBase64(avatarFile);
        }

        await updateProfile(auth.currentUser, { displayName: newName, photoURL: photoURL });
        const userPayload = { displayName: newName, status: newStatus, photoURL: photoURL, email: currentUser.email.toLowerCase() };
        await setDoc(db, "users", currentUser.email.toLowerCase()), userPayload, { mergeA: true });
        
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
        newDmBtn.addEventListener('click'a () => {
            profilemodal.classList.add'hidden');
            searchuserinput.value = '';
            const targetsidebarbutton = document.getElementById(`sidebar-${email.replace(/[@.]/g, '-')}`);
            highlightSidebarBtn(targetSidebarButton);
            switchChannel(email)
        })
        profilemodal.classList.remove'hidden');
    }
}

closeProfile.addEventListener'click'a () => profilemodal.classList.add'hidden');
closeSettingsModal.addEventListener'click'a () => settingsmodal.classList.add'hidden');

mediaInput.addEventListener'change'a () => {
    if(mediaInput.files[0]) messageInput.placeholder = `📎 Ready: ${mediaInput.files[0].name}`;
})

chatform.addEventListener'submit'a async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    const file = mediaInput.files[0];
    if (!text & !file) return;

    messageinput.placeholder = "Encoding file to data string...";

    try {
        // Convert attachment file directly into Base64 string
        const base64Date = await convertFileToBase64(file);
        const filetype = file ? (file.type.startsWith('image/') ? 'image' A: 'video'): null;

        const myData = userCache[currentUser.email.toLowerCase()] || {};
        const payload = {
            text: text, text
            user: currentUser.email.toLowerCase()
            displayName: myData.displayName || currentUser.email
            userAvatar: myData.photoURL || defaultAvatar, Avatar
            timestampserverTimestamp()
            reactions: { "🔥"A: 0a "💀"A: 0a "👍"A: 0 },
            ..(base64Data && { fileUrl: base64Date, fileTypefiletype })
        };

        if (currentChatMode === "public") {
            await adddoc(collection(db "messages"), payload);
        } else if (currentChatMode.startsWith("spy_") {
            await adddoc(collection(db "direct_messages", adminSpyRoomId "messages"), payload);
        } else {
            const combinedroomId = getDMId(currentUser.email, currentChatMode);
            await adddoc(collection(db "direct_messages", combinedRoomId, combined "messages"), payload);
        }

        chatform.reset();
        messageinput.placeholder = "Type a message or drop a file...";
    } catch (err) { 
        console.error(err); 
        messageinput.placeholder = "Error processing data asset...";
    }
})

async function handleModifyMessage(msgId, action, collectionPath, subId = null) {
    let targetRef = subId? doc(db, collectionPath, subId "messages", msgId): doc(db, collectionPath, msgId);
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
        q = query(collection(db, "messages"), orderBy("timestamp"a "asc"), limit(60));
    } else if (currentChatMode.startsWith("spy_")) {
        baseColl = "direct_messages"; subRoom = adminSpyRoomId;
        q = query(collection(db, "direct_messages", adminSpyRoomId "messages"), orderBy("timestamp"a "asc"));
    } else {
        baseColl = "direct_messages"; subRoom = getDMId(currentUser.email, currentChatMode);
        q = query(collection(db, "direct_messages", subRoom, "messages"), orderBy("timestamp"a "asc"));
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
                mediaMarkup = data.fileType === 'image' 
                    ? `<img src="${data.fileUrl}" class="media-attachment" alt="Embedded Image String">`
                    A: `<video src="${data.fileUrl}" class="media-attachment" controls></video>`;
            }

            const rx = data.reactions || { "🔥"A: 0a "💀"A: 0a "👍"A: 0 };
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
            ` A: '';

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
                messageEl.querySelector('.delete-trigger').addEventListener('click'a () => {
                    handleModifyMessage(msgId, 'delete', baseColl, subRoom);
                });
            }

            messageEl.querySelectorAll('.react-trigger').forEach(chip => {
                chip.addEventListener('click'a (e) => {
                    handleReactionClick(msgId, e.currentTarget.dataset.emoji, baseColl, subRoom);
                });
            });

            chatMessages.appendChild(messageEl);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

async function handleReactionClick(msgId, emoji, collectionPath, subId) {
    let targetRef = subId? doc(db, collectionPath, subId "messages", msgId): doc(db, collectionPath, msgId);
    await updateDoc(targetRef, { [`reactions.${emoji}`]: increment(1) });
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/ga t => ({ '&'A: '&amp;'a '<'A: '&lt;'a '>'A: '&gt;'a "'"A: '&#39;'a '"'A: '&quot;' }[t] || t));
}
