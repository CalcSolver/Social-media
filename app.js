import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, setDoc, getDoc, getDocs, query, orderBy, limit, onSnapshot, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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
const searchUserInput = document.getElementById('search-user-input');
const searchUserBtn = document.getElementById('search-user-btn');

// View Panel Switching Components
const viewChatBtn = document.getElementById('view-chat-btn');
const viewFeedBtn = document.getElementById('view-feed-btn');
const messagingContainer = document.getElementById('messaging-container');
const memeFeedContainer = document.getElementById('meme-feed-container');

// Feed Elements
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
let unsubscribeChat = null;
let unsubscribeFeed = null;

// Stable, high-uptime placeholder asset fallback link
const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
const userCache = {};

// View Switching Handlers
viewChatBtn.addEventListener('click', () => {
    viewChatBtn.classList.add('active');
    viewFeedBtn.classList.remove('active');
    messagingContainer.style.display = "flex";
    memeFeedContainer.classList.add('hidden');
    if (currentChatMode === "public") {
        currentRoomTitle.textContent = "Global Chat";
    } else {
        currentRoomTitle.textContent = `Direct Message: ${currentChatMode}`;
    }
});

viewFeedBtn.addEventListener('click', () => {
    viewFeedBtn.classList.add('active');
    viewChatBtn.classList.remove('active');
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

        switchChannel("public");
        loadActiveDMList();
    } else {
        currentUser = null;
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
        if (unsubscribeChat) unsubscribeChat();
        if (unsubscribeFeed) unsubscribeFeed();
    }
});

// Sidebar Explicit Email Search Interface Execution
searchUserBtn.addEventListener('click', async () => {
    const searchEmail = searchUserInput.value.trim().toLowerCase();
    if (!searchEmail) return;
    if (searchEmail === currentUser.email.toLowerCase()) {
        alert("You cannot search for yourself!");
        return;
    }
    await showUserProfile(searchEmail);
});

// Helper: Generates a deterministic combined key string skipping index operations
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
                    viewChatBtn.click(); // Ensure messaging tab opens
                    highlightSidebarBtn(btn);
                    switchChannel(userData.email.toLowerCase());
                });
                usersList.appendChild(btn);
            }
        });
    } catch (err) {
        console.error("Error building dashboard: ", err);
    }
}

function highlightSidebarBtn(activeButton) {
    document.querySelectorAll('.target-btn').forEach(b => b.classList.remove('active'));
    if (activeButton) activeButton.classList.add('active');
}

targetPublicBtn.addEventListener('click', () => {
    viewChatBtn.click();
    highlightSidebarBtn(targetPublicBtn);
    switchChannel("public");
});

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
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, 120, 120);
                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
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
            const avatarRef = ref(storage, `avatars/${currentUser.email.toLowerCase()}_thumb.jpg`);
            const snap = await uploadBytes(avatarRef, compressedBlob);
            photoURL = await getDownloadURL(snap.ref);
        }

        await updateProfile(auth.currentUser, { displayName: newName, photoURL: photoURL });
        
        const userPayload = {
            displayName: newName,
            status: newStatus,
            photoURL: photoURL,
            email: currentUser.email.toLowerCase(),
            uid: currentUser.uid
        };

        await setDoc(doc(db, "users", currentUser.email.toLowerCase()), userPayload, { merge: true });
        userCache[currentUser.email.toLowerCase()] = userPayload;

        myAvatar.src = photoURL;
        myDisplayName.textContent = newName;
        settingsModal.classList.add('hidden');
        settingsForm.reset();
        loadActiveDMList(); 
        loadMessages(); 
    } catch (err) {
        alert("Error saving settings: " + err.message);
    }
});

async function showUserProfile(email) {
    email = email.toLowerCase();
    let data = userCache[email];

    if (!data) {
        const userDoc = await getDoc(doc(db, "users", email));
        if (userDoc.exists()) {
            data = userDoc.data();
            userCache[email] = data;
        } else {
            alert("No student registered with that email address!");
            return;
        }
    }

    if (data) {
        viewProfileAvatar.src = data.photoURL || defaultAvatar;
        viewProfileName.textContent = data.displayName || email;
        viewProfileEmail.textContent = email;
        viewProfileStatus.textContent = data.status || "No status set.";
        
        const newDmBtn = dmStartBtn.cloneNode(true);
        dmStartBtn.parentNode.replaceChild(newDmBtn, dmStartBtn);
        
        // Context profile action connector router
        newDmBtn.addEventListener('click', () => {
            profileModal.classList.add('hidden');
            searchUserInput.value = '';
            viewChatBtn.click(); // Bring messaging into clear workspace view frame
            
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

// Main Message Submitter Panel Router
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

// Stream Processor: Messages Framework Pipeline
function loadMessages() {
    if (unsubscribeChat) unsubscribeChat();
    chatMessages.innerHTML = '';

    let q;
    if (currentChatMode === "public") {
        q = query(collection(db, "messages"), orderBy("timestamp", "asc"), limit(60));
    } else {
        const combinedRoomId = getDMId(currentUser.email, currentChatMode);
        q = query(collection(db, "direct_messages", combinedRoomId, "messages"), orderBy("timestamp", "asc"));
    }

    unsubscribeChat = onSnapshot(q, (snapshot) => {
        chatMessages.innerHTML = '';
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const messageEl = document.createElement('div');
            const isSentByMe = data.user === currentUser.email.toLowerCase();
            messageEl.className = `msg ${isSentByMe ? 'sent' : 'received'}`;
            
            let mediaMarkup = '';
            if (data.fileUrl) {
                mediaMarkup = data.fileType === 'image' 
                    ? `<img src="${data.fileUrl}" class="media-attachment" alt="Meme Attachment">`
                    : `<video src="${data.fileUrl}" class="media-attachment" controls></video>`;
            }

            const cachedUser = userCache[data.user.toLowerCase()] || {};
            const finalName = cachedUser.displayName || data.displayName || data.user;
            const finalAvatar = cachedUser.photoURL || data.userAvatar || defaultAvatar;

            messageEl.innerHTML = `
                <div class="msg-header-info" data-email="${data.user}">
                    <img src="${finalAvatar}" class="avatar-sm">
                    <span class="msg-user">${finalName}</span>
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
    }, (error) => {
        console.error("Snapshot error: ", error);
    });
}

// Feed Submitter Handler Module
feedPostForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const caption = postCaptionInput.value.trim();
    const file = feedMediaInput.files[0];
    if (!file) return;

    try {
        postCaptionInput.placeholder = "Uploading to public feed...";
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
    } catch (err) {
        alert("Error creating feed post: " + err.message);
    }
});

// Stream Processor: Chronological Public Feed Pipeline
function loadMemeFeed() {
    if (unsubscribeFeed) unsubscribeFeed();
    
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"), limit(25));
    
    unsubscribeFeed = onSnapshot(q, (snapshot) => {
        feedPostsStream.innerHTML = '';
        snapshot.forEach((docSnap) => {
            const post = docSnap.data();
            const postCard = document.createElement('div');
            postCard.className = 'meme-post-card';
            postCard.style = "background: white; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 20px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);";

            const cachedUser = userCache[post.user.toLowerCase()] || {};
            const finalName = cachedUser.displayName || post.displayName || post.user;
            const finalAvatar = cachedUser.photoURL || post.userAvatar || defaultAvatar;

            postCard.innerHTML = `
                <div class="post-user-header" style="display:flex; align-items:center; margin-bottom:10px; cursor:pointer;" data-email="${post.user}">
                    <img src="${finalAvatar}" class="avatar-sm" style="margin-right:10px; width:35px; height:35px; border-radius:50%;">
                    <strong>${finalName}</strong>
                </div>
                <p class="post-caption" style="margin-top:0; margin-bottom:12px; font-size:1.05em; color:#222;">${escapeHTML(post.caption)}</p>
                <img src="${post.imageUrl}" style="width:100%; max-height:450px; object-fit:contain; border-radius:6px; background:#fafafa; border: 1px solid #eaeaea;">
            `;

            postCard.querySelector('.post-user-header').addEventListener('click', (e) => {
                showUserProfile(e.currentTarget.getAttribute('data-email'));
            });

            feedPostsStream.appendChild(postCard);
        });
    }, (error) => {
        console.error("Feed pipeline connection error: ", error);
    });
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));
}
