import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, setDoc, getDoc, getDocs, query, orderBy, limit, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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

// DOM Navigation Buttons
const targetPublicBtn = document.getElementById('target-public');
const targetFeedBtn = document.getElementById('target-feed');

// Main Containers
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const messagingContainer = document.getElementById('messaging-container');
const memeFeedContainer = document.getElementById('meme-feed-container');

// Core Dom Bindings
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

// Admin Elements
const adminMonitorPanel = document.getElementById('admin-monitor-panel');
const adminRoomInput = document.getElementById('admin-room-input');
const adminSpyBtn = document.getElementById('admin-spy-btn');

// Feed Form Elements
const feedPostForm = document.getElementById('feed-post-form');
const postCaptionInput = document.getElementById('post-caption-input');
const feedMediaInput = document.getElementById('feed-media-input');
const feedFileChosen = document.getElementById('feed-file-chosen');
const feedPostsStream = document.getElementById('feed-posts-stream');

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
let unsubscribeFeed = null;

const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
const userCache = {};
const ADMIN_EMAIL = "hjass2865@gmail.com";

// Click Handlers for Sidebar Channel Navigation Buttons
targetPublicBtn.addEventListener('click', () => {
    highlightSidebarBtn(targetPublicBtn);
    messagingContainer.style.display = "flex";
    memeFeedContainer.classList.add('hidden');
    switchChannel("public");
});

targetFeedBtn.addEventListener('click', () => {
    highlightSidebarBtn(targetFeedBtn);
    messagingContainer.style.display = "none";
    memeFeedContainer.classList.remove('hidden');
    currentRoomTitle.textContent = "Public Meme Feed";
    loadMemeFeed();
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
        } else {
            myDisplayName.textContent = user.email;
            myAvatar.src = defaultAvatar;
        }

        targetPublicBtn.click(); 
        loadActiveDMList();
    } else {
        currentUser = null;
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
        if (unsubscribeChat) unsubscribeChat();
        if (unsubscribeFeed) unsubscribeFeed();
    }
});

adminSpyBtn.addEventListener('click', () => {
    const targetRoomInput = adminRoomInput.value.trim();
    if (!targetRoomInput) return;
    
    adminSpyRoomId = targetRoomInput.toLowerCase().replace(/[@.]/g, '_');
    currentChatMode = "spy_" + adminSpyRoomId;
    
    messagingContainer.style.display = "flex";
    memeFeedContainer.classList.add('hidden');
    highlightSidebarBtn(null);
    currentRoomTitle.textContent = `Admin Intercept: ${adminSpyRoomId}`;
    loadMessages();
});

searchUserBtn.addEventListener('click', async () => {
    const searchEmail = searchUserInput.value.trim().toLowerCase();
    if (!searchEmail) return;
    if (searchEmail === currentUser.email.toLowerCase()) {
        alert("You cannot search for yourself!");
        return;
    }
    await showUserProfile(searchEmail);
});

function getDMId(userA, userB) {
    return [userA.toLowerCase(), userB.toLowerCase()].sort().join("__").replace(/[@.]/g, '_');
}

async function loadActiveDMList() {
    usersList.innerHTML = '';
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        querySnapshot.forEach((docSnap) => {
            const userData = docSnap.data();
            userCache[userData.email.toLowerCase()] = userData;
            
            if (userData.email.toLowerCase() !== currentUser.email.toLowerCase()) {
                const btn = document.createElement('button');
                btn.className = 'target-btn';
                btn.id = `sidebar-${userData.email.toLowerCase().replace(/[@.]/g, '-')}`;
                btn.innerHTML = `<img src="${userData.photoURL || defaultAvatar}" class="avatar-sm"> ${userData.displayName || userData.email}`;
                btn.addEventListener('click', () => {
                    messagingContainer.style.display = "flex";
                    memeFeedContainer.classList.add('hidden');
                    highlightSidebarBtn(btn);
                    switchChannel(userData.email.toLowerCase());
                });
                usersList.appendChild(btn);
            }
        });
    } catch (err) {
        console.error(err);
    }
}

function highlightSidebarBtn(activeButton) {
    document.querySelectorAll('.target-btn').forEach(b => b.classList.remove('active'));
    if (activeButton) activeButton.classList.add('active');
}

function switchChannel(mode) {
    currentChatMode = mode.toLowerCase();
    currentRoomTitle.textContent = mode === "public" ? "Global Chat" : `Direct Message: ${mode}`;
    loadMessages();
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
        const userPayload = { displayName: newName, status: newStatus, photoURL: photoURL, email: currentUser.email.toLowerCase(), uid: currentUser.uid };
        await setDoc(doc(db, "users", currentUser.email.toLowerCase()), userPayload, { merge: true });
        userCache[currentUser.email.toLowerCase()] = userPayload;

        myAvatar.src = photoURL;
        myDisplayName.textContent = newName;
        settingsModal.classList.add('hidden');
        settingsForm.reset();
        loadActiveDMList(); 
        loadMessages(); 
    } catch (err) {
        alert(err.message);
    }
});

async function showUserProfile(email) {
    email = email.toLowerCase();
    let data = userCache[email];
    if (!data) {
        const userDoc = await getDoc(doc(db, "users", email));
        if (userDoc.exists()) { data = userDoc.data(); userCache[email] = data; }
        else { alert("No student registered with that email address!"); return; }
    }

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
            messagingContainer.style.display = "flex";
            memeFeedContainer.classList.add('hidden');
            
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

feedMediaInput.addEventListener('change', () => {
    if(feedMediaInput.files[0]) feedFileChosen.textContent = feedMediaInput.files[0].name;
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
            messageInput.placeholder = "Uploading file asset...";
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
        messageInput.placeholder = "Type a message or attach a file...";
    } catch (err) {
        console.error(err);
    }
});

async function handleModifyMessage(msgId, currentText, action, collectionPath, subId = null) {
    let targetRef = subId ? doc(db, collectionPath, subId, "messages", msgId) : doc(db, collectionPath, msgId);

    if (action === 'delete') {
        if (confirm("Are you sure you want to delete this message?")) {
            await deleteDoc(targetRef);
        }
    } else if (action === 'edit') {
        const newText = prompt("Edit your message:", currentText);
        if (newText && newText.trim() !== currentText) {
            await updateDoc(targetRef, { text: newText.trim() });
        }
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
        baseColl = "direct_messages";
        subRoom = adminSpyRoomId;
        q = query(collection(db, "direct_messages", adminSpyRoomId, "messages"), orderBy("timestamp", "asc"));
    } else {
        baseColl = "direct_messages";
        subRoom = getDMId(currentUser.email, currentChatMode);
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
            
            messageEl.className = `msg ${isSentByMe ? 'sent' : 'received'}`;
            
            let mediaMarkup = '';
            if (data.fileUrl) {
                mediaMarkup = data.fileType === 'image' 
                    ? `<img src="${data.fileUrl}" class="media-attachment" alt="Meme Attachment">`
                    : `<video src="${data.fileUrl}" class="media-attachment" controls></video>`;
            }

            const actionControlsMarkup = (isSentByMe || isLoggedAsAdmin) ? `
                <span class="msg-actions">
                    ${isSentByMe ? `<button class="action-btn edit-trigger" data-id="${msgId}" data-text="${escapeHTML(data.text || '')}">✏️</button>` : ''}
                    <button class="action-btn del delete-trigger" data-id="${msgId}">❌</button>
                </span>
            ` : '';

            const cachedUser = userCache[data.user.toLowerCase()] || {};
            const finalName = cachedUser.displayName || data.displayName || data.user;
            const finalAvatar = cachedUser.photoURL || data.userAvatar || defaultAvatar;

            messageEl.innerHTML = `
                <div class="msg-header-info" data-email="${data.user}">
                    <img src="${finalAvatar}" class="avatar-sm">
                    <span class="msg-user">${finalName}</span>
                    ${actionControlsMarkup}
                </div>
                <span class="msg-text">${escapeHTML(data.text || '')}</span>
                ${mediaMarkup}
            `;

            if (isSentByMe) {
                const editBtn = messageEl.querySelector('.edit-trigger');
                if (editBtn) editBtn.addEventListener('click', (e) => {
                    handleModifyMessage(e.target.dataset.id, e.target.dataset.text, 'edit', baseColl, subRoom);
                });
            }
            if (isSentByMe || isLoggedAsAdmin) {
                messageEl.querySelector('.delete-trigger').addEventListener('click', (e) => {
                    handleModifyMessage(e.target.dataset.id, null, 'delete', baseColl, subRoom);
                });
            }

            messageEl.querySelector('.msg-header-info').addEventListener('click', (e) => {
                showUserProfile(e.currentTarget.getAttribute('data-email'));
            });

            chatMessages.appendChild(messageEl);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, (error) => {
        console.error(error);
    });
}

feedPostForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const caption = postCaptionInput.value.trim();
    const file = feedMediaInput.files[0];
    if (!file) return;

    try {
        const submitButton = feedPostForm.querySelector('button[type="submit"]');
        submitButton.textContent = "Uploading to Cloud Storage...";
        submitButton.disabled = true;

        const storageRef = ref(storage, `feeds/${Date.now()}_${file.name}`);
        const snap = await uploadBytes(storageRef, file);
        const imageUrl = await getDownloadURL(snap.ref);

        const myData = userCache[currentUser.email.toLowerCase()] || {};
        await addDoc(collection(db, "posts"), {
            caption: caption,
            imageUrl: imageUrl,
            user: currentUser.email.toLowerCase(),
            displayName: myData.displayName || currentUser.email,
            userAvatar: myData.photoURL || defaultAvatar,
            timestamp: serverTimestamp(),
            likes: 0
        });

        feedPostForm.reset();
        feedFileChosen.textContent = "No file selected";
        submitButton.textContent = "Publish Post";
        submitButton.disabled = false;
    } catch (err) {
        alert("Upload Error: " + err.message);
    }
});

function loadMemeFeed() {
    if (unsubscribeFeed) unsubscribeFeed();
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"), limit(25));
    
    unsubscribeFeed = onSnapshot(q, (snapshot) => {
        feedPostsStream.innerHTML = '';
        snapshot.forEach((docSnap) => {
            const post = docSnap.data();
            const postId = docSnap.id;
            const postCard = document.createElement('div');
            const isMyPost = post.user === currentUser.email.toLowerCase();
            const isLoggedAsAdmin = currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

            postCard.className = 'meme-post-card';
            postCard.style = "background: white; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 20px; padding: 15px; position: relative; box-shadow: 0 4px 6px rgba(0,0,0,0.05);";

            const cachedUser = userCache[post.user.toLowerCase()] || {};
            const finalName = cachedUser.displayName || post.displayName || post.user;
            const finalAvatar = cachedUser.photoURL || post.userAvatar || defaultAvatar;

            const deletePostMarkup = (isMyPost || isLoggedAsAdmin) ? `
                <button class="delete-post-btn" data-id="${postId}" style="position: absolute; top: 15px; right: 15px; background: none; border: none; cursor: pointer; color: #dc3545; font-size: 1.2em;">❌</button>
            ` : '';

            postCard.innerHTML = `
                <div class="post-user-header" style="display:flex; align-items:center; margin-bottom:10px; cursor:pointer;" data-email="${post.user}">
                    <img src="${finalAvatar}" class="avatar-sm" style="margin-right:10px; width:35px; height:35px; border-radius:50%;">
                    <strong>${finalName}</strong>
                </div>
                ${deletePostMarkup}
                <p class="post-caption" style="margin-top:0; margin-bottom:12px; font-size:1.1em; color:#111; font-weight: 500;">${escapeHTML(post.caption)}</p>
                <img src="${post.imageUrl}" style="width:100%; max-height:500px; object-fit:contain; border-radius:6px; background:#fafafa; border: 1px solid #eaeaea;">
            `;

            if (isMyPost || isLoggedAsAdmin) {
                postCard.querySelector('.delete-post-btn').addEventListener('click', async (e) => {
                    if (confirm("Delete this meme from public feed?")) {
                        await deleteDoc(doc(db, "posts", e.target.closest('.delete-post-btn').dataset.id));
                    }
                });
            }

            postCard.querySelector('.post-user-header').addEventListener('click', (e) => {
                showUserProfile(e.currentTarget.getAttribute('data-email'));
            });

            feedPostsStream.appendChild(postCard);
        });
    });
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));
}
