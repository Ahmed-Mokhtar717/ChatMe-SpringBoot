'use strict';

const usernamePage = document.querySelector('#username-page');
const chatPage = document.querySelector('#chat-page');
const usernameForm = document.querySelector('#usernameForm');
const messageForm = document.querySelector('#messageForm');
const messageInput = document.querySelector('#message');
const fileInput = document.querySelector('#fileInput');
const connectingElement = document.querySelector('.connecting');
const chatArea = document.querySelector('#chat-messages');
const logout = document.querySelector('#logout');

let stompClient = null;
let nickname = null;
let fullname = null;
let selectedUserId = null;

function connect(event) {
    nickname = document.querySelector('#nickname').value.trim();
    fullname = document.querySelector('#fullname').value.trim();

    if (nickname && fullname) {
        usernamePage.classList.add('hidden');
        chatPage.classList.remove('hidden');

        const socket = new SockJS('/ws');
        stompClient = Stomp.over(socket);

        stompClient.connect({}, onConnected, onError);
    }
    event.preventDefault();
}

function onUserEvent(payload) {
    console.log('User event received:', payload);
    findAndDisplayConnectedUsers().then();
}

function onConnected() {
    stompClient.subscribe(`/user/${nickname}/queue/messages`, onMessageReceived);
    
    stompClient.subscribe(`/topic/public`, onUserEvent);
    stompClient.subscribe(`/user/${nickname}/queue/files`, onFileReceived);

    // register the connected user
    stompClient.send("/app/user.addUser",
        {},
        JSON.stringify({nickName: nickname, fullName: fullname, status: 'ONLINE'})
    );
    document.querySelector('#connected-user-fullname').textContent = fullname;
    findAndDisplayConnectedUsers().then();
}

async function findAndDisplayConnectedUsers() {
    const connectedUsersResponse = await fetch('/users');
    let connectedUsers = await connectedUsersResponse.json();
    connectedUsers = connectedUsers.filter(user => user.nickName !== nickname);
    const connectedUsersList = document.getElementById('connectedUsers');
    connectedUsersList.innerHTML = '';

    connectedUsers.forEach(user => {
        appendUserElement(user, connectedUsersList);
        if (connectedUsers.indexOf(user) < connectedUsers.length - 1) {
            const separator = document.createElement('li');
            separator.classList.add('separator');
            connectedUsersList.appendChild(separator);
        }
    });
}

function appendUserElement(user, connectedUsersList) {
    const listItem = document.createElement('li');
    listItem.classList.add('user-item');
    listItem.id = user.nickName;

    const userImage = document.createElement('img');
    userImage.src = '../img/user_icon.png';
    userImage.alt = user.fullName;

    const usernameSpan = document.createElement('span');
    usernameSpan.textContent = user.fullName;

    const receivedMsgs = document.createElement('span');
    receivedMsgs.textContent = '0';
    receivedMsgs.classList.add('nbr-msg', 'hidden');

    listItem.appendChild(userImage);
    listItem.appendChild(usernameSpan);
    listItem.appendChild(receivedMsgs);

    listItem.addEventListener('click', userItemClick);

    connectedUsersList.appendChild(listItem);
}

function userItemClick(event) {
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('active');
    });
    messageForm.classList.remove('hidden');

    const clickedUser = event.currentTarget;
    clickedUser.classList.add('active');

    selectedUserId = clickedUser.getAttribute('id');
    fetchAndDisplayUserChat().then();

    const nbrMsg = clickedUser.querySelector('.nbr-msg');
    nbrMsg.classList.add('hidden');
    nbrMsg.textContent = '0';

}

function displayMessage(senderId, content) {
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message');
    if (senderId === nickname) {
        messageContainer.classList.add('sender');
    } else {
        messageContainer.classList.add('receiver');
    }
    const message = document.createElement('p');
    message.textContent = content;
    messageContainer.appendChild(message);
    chatArea.appendChild(messageContainer);
}

async function fetchAndDisplayUserChat() {
    chatArea.innerHTML = '';

    // 1. جلب الرسائل
    const messagesResponse = await fetch(`/messages/${nickname}/${selectedUserId}`);
    const messages = await messagesResponse.json();

    // 2. جلب الملفات
    const filesResponse = await fetch(`/api/files/${nickname}/${selectedUserId}`);
    const files = await filesResponse.json();

    // 3. تحويل الرسائل والملفات إلى نفس الهيكل مع حقل timestamp
    const combined = [
        ...messages.map(msg => ({
            type: 'message',
            senderId: msg.senderId,
            content: msg.content,
            timestamp: new Date(msg.timestamp)
        })),
        ...files.map(file => ({
            type: 'file',
            senderId: file.senderId,
            file: file,
            timestamp: new Date(file.uploadTime)
        }))
    ];
    console.log("Combined before sort:", combined);
    // 4. فرز الكل حسب التوقيت
    combined.sort((a, b) => a.timestamp - b.timestamp);

    console.log("Combined before sort:", combined);
    // 5. عرض العناصر بترتيب زمني
    combined.forEach(item => {
        if (item.type === 'message') {
            displayMessage(item.senderId, item.content);
        } else if (item.type === 'file') {
            displayFile(item.file, item.senderId);
        }
    });

    chatArea.scrollTop = chatArea.scrollHeight;
}



function onError() {
    connectingElement.textContent = 'Could not connect to WebSocket server. Please refresh this page to try again!';
    connectingElement.style.color = 'red';
}


async function sendMessage(event) {
    event.preventDefault();
    const messageContent = messageInput.value.trim();
    const file = fileInput.files[0];

    if (!messageContent && !file) return;

    if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('senderId', nickname);
        formData.append('recipientId', selectedUserId);

        try {
            const response = await fetch('/api/files/upload', {
                method: 'POST',
                body: formData
            });
            const savedFile = await response.json();
            displayFile(savedFile, nickname);
        } catch (error) {
            console.error("Error uploading file:", error);
        }

        fileInput.value = '';
    }

    if (messageContent && stompClient) {
        const chatMessage = {
            senderId: nickname,
            recipientId: selectedUserId,
            content: messageContent,
            timestamp: new Date()
        };
        stompClient.send("/app/chat", {}, JSON.stringify(chatMessage));
        displayMessage(nickname, messageContent);
        messageInput.value = '';
    }

    chatArea.scrollTop = chatArea.scrollHeight;
}

function displayFile(file, senderId) {
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message');
    if (senderId === nickname) {
        messageContainer.classList.add('sender');
    } else {
        messageContainer.classList.add('receiver');
    }

    const fileType = file.fileType || 'application/octet-stream';
    const fileName = file.fileName || 'file';
    const base64Data = file.data; // الـ data هنا Base64 جاهز
    const fileUrl = `data:${fileType};base64,${base64Data}`;

    // مساعدة لإنشاء Lightbox عند الضغط على الصورة/الفيديو
    function openLightbox(content) {
        // إنشاء Overlay
        const overlay = document.createElement('div');
        overlay.classList.add('lightbox-overlay');

        // عند الضغط على الـ overlay نغلقه
        overlay.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });

        // إضافة المحتوى (صورة أو فيديو مكبر)
        overlay.appendChild(content);
        document.body.appendChild(overlay);
    }

    if (fileType.startsWith("image/")) {
        const img = document.createElement('img');
        img.src = fileUrl;
        img.alt = fileName;
        img.classList.add('chat-image');

        img.addEventListener('click', () => {
            // نسخة مكبرة
            const largeImg = document.createElement('img');
            largeImg.src = fileUrl;
            largeImg.classList.add('large-image');
            openLightbox(largeImg);
        });

        messageContainer.appendChild(img);

    } else if (fileType.startsWith("video/")) {
        const video = document.createElement('video');
        video.src = fileUrl;
        video.controls = true;
        video.classList.add('chat-video');

        // عند الضغط على الفيديو، نفتح نسخة مكبرة في Lightbox مع تشغيل الفيديو
        video.addEventListener('click', () => {
            const largeVideo = document.createElement('video');
            largeVideo.src = fileUrl;
            largeVideo.controls = true;
            largeVideo.autoplay = true;
            largeVideo.classList.add('large-video');
            openLightbox(largeVideo);
        });

        messageContainer.appendChild(video);

    } else if (fileType === "application/pdf") {
        // عرض بسيط ثابت (صورة أول صفحة PDF عبر object)
        const object = document.createElement('object');
        object.data = fileUrl;
        object.type = 'application/pdf';
        object.classList.add('chat-pdf-object');

        // تغليف العنصر بـ div يتولى التفاعل (click)
        const wrapper = document.createElement('div');
        wrapper.style.cursor = 'pointer';
        wrapper.style.overflow = 'hidden'; // إخفاء التمرير
        wrapper.appendChild(object);

        // عند الضغط نفتح الملف في تبويب جديد
        wrapper.addEventListener('click', () => {
            const newTab = window.open();
            newTab.document.write(`
            <html>
              <head><title>${fileName}</title></head>
              <body style="margin:0">
                <embed width="100%" height="100%" src="${fileUrl}" type="application/pdf" />
              </body>
            </html>
        `);
        });

        // اسم الملف أسفل المعاينة
        const fileLabel = document.createElement('div');
        fileLabel.textContent = fileName;
        fileLabel.classList.add('file-label');

        messageContainer.appendChild(wrapper);
        messageContainer.appendChild(fileLabel);
    } else {
        // ملفات أخرى: مربع مع أيقونة واسم الملف في شريط سفلي

        const fileBox = document.createElement('div');
        fileBox.classList.add('file-box');

        // أيقونة ملف عامة (يمكنك تغيير الرابط إلى أيقونة أخرى)
        const icon = document.createElement('img');
        icon.src = '../img/file_icon.png';  // ضع مسار أيقونة ملف عام مناسبة
        icon.alt = 'File Icon';
        icon.style.width = '48px';
        icon.style.height = '48px';
        icon.style.marginBottom = '8px';

        // اسم الملف أسفل الأيقونة
        const fileLabel = document.createElement('div');
        fileLabel.textContent = fileName;
        fileLabel.classList.add('file-label');

        fileBox.appendChild(icon);
        fileBox.appendChild(fileLabel);

        // عند الضغط، نبدأ تحميل الملف
        fileBox.addEventListener('click', () => {
            const link = document.createElement('a');
            link.href = fileUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });

        messageContainer.appendChild(fileBox);
    }

    chatArea.appendChild(messageContainer);
}

async function onMessageReceived(payload) {
    await findAndDisplayConnectedUsers();
    console.log('Message received', payload);
    const message = JSON.parse(payload.body);
    if (selectedUserId && selectedUserId === message.senderId) {
        displayMessage(message.senderId, message.content);
        chatArea.scrollTop = chatArea.scrollHeight;
    }

    if (selectedUserId) {
        document.querySelector(`#${selectedUserId}`).classList.add('active');
    } else {
        messageForm.classList.add('hidden');
    }

    const notifiedUser = document.querySelector(`#${message.senderId}`);
    if (notifiedUser && !notifiedUser.classList.contains('active')) {
        const nbrMsg = notifiedUser.querySelector('.nbr-msg');
        nbrMsg.classList.remove('hidden');
        nbrMsg.textContent = '';
    }
}

function onFileReceived(payload) {
    console.log("File received via WebSocket:", payload);
    const file = JSON.parse(payload.body);
    displayFile(file, file.senderId);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function onLogout() {
    stompClient.send("/app/user.disconnect",
        {},
        JSON.stringify({nickName: nickname, fullName: fullname, status: 'OFFLINE'})
    );
    window.location.reload();
}

usernameForm.addEventListener('submit', connect, true); // step 1
messageForm.addEventListener('submit', sendMessage, true);
logout.addEventListener('click', onLogout, true);
window.onbeforeunload = () => onLogout();