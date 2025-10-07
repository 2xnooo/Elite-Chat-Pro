// script.js
let username = localStorage.getItem('eliteUsername') || '';
let messages = []; // الرسائل المشتركة (تُحمل من السيرفر)
let messageId = 0;
let currentTheme = localStorage.getItem('eliteTheme') || 'dark';
let searchTerm = '';
let socket; // Socket.io

// تهيئة Socket.io
socket = io();

// استقبال الرسائل من السيرفر
socket.on('loadMessages', (loadedMessages) => {
  messages = loadedMessages;
  rebuildMessages();
});

socket.on('newMessage', (newMsg) => {
  messages.push(newMsg);
  addMessage(newMsg);
  scrollToBottom();
});

// تطبيق الثيم
document.body.className = currentTheme === 'light' ? 'light-theme' : '';

// تحميل الدردشة إذا كان هناك اسم
if (username) {
  loadChat();
}

// دوال الأزرار
function toggleSearch() {
  const searchBox = document.getElementById('searchBox');
  searchBox.style.display = searchBox.style.display === 'block' ? 'none' : 'block';
  if (searchBox.style.display === 'block') document.getElementById('searchInput').focus();
  else {
    searchTerm = '';
    rebuildMessages();
  }
}

function exportChat() {
  if (!username) return alert('ادخل اسمك أولاً!');
  const dataStr = JSON.stringify(messages, null, 2);
  const dataBlob = new Blob([dataStr], {type: 'application/json'});
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `elite_chat_${username}_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.body.className = currentTheme === 'light' ? 'light-theme' : '';
  localStorage.setItem('eliteTheme', currentTheme);
}

function openMedia() {
  if (!username) return alert('ادخل اسمك أولاً!');
  document.getElementById('mediaInput').click();
}

function searchMessages() {
  searchTerm = document.getElementById('searchInput').value.toLowerCase();
  highlightSearch();
}

function rebuildMessages() {
  const messagesDiv = document.getElementById('messages');
  if (!messagesDiv) return;
  messagesDiv.innerHTML = '';
  messages.forEach(addMessage);
}

function highlightSearch() {
  if (searchTerm === '') {
    rebuildMessages();
    return;
  }
  const msgs = document.querySelectorAll('.msg span');
  msgs.forEach(span => {
    let text = span.innerHTML;
    text = text.replace(/<mark class="highlighted">|<\/mark>/g, '');
    const highlighted = text.replace(new RegExp(`(${searchTerm})`, 'gi'), '<mark class="highlighted">$1</mark>');
    span.innerHTML = highlighted;
  });
}

function handleMediaUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    alert('الملف كبير جداً!');
    event.target.value = '';
    return;
  }

  const loadingId = Date.now();
  const loadingMsg = {
    id: loadingId,
    text: `${username}: جاري التحميل... 💫`,
    type: 'me',
    time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    timestamp: Date.now(),
    isLoading: true
  };
  messages.push(loadingMsg);
  addMessage(loadingMsg);

  const reader = new FileReader();
  reader.onload = (e) => {
    const index = messages.findIndex(m => m.id === loadingId);
    const mediaType = file.type.startsWith('image/') ? 'image' : 'video';
    const newMsg = {
      id: Date.now(),
      text: `${username}: ${mediaType === 'image' ? '🖼️ صورة فاخرة' : '🎥 فيديو مميز'}`,
      type: 'me',
      media: e.target.result,
      mediaType: mediaType,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      username: username
    };
    messages[index] = newMsg;
    socket.emit('sendMessage', newMsg); // إرسال للسيرفر للمشاركة
    event.target.value = '';
  };
  reader.readAsDataURL(file);
}

function enterChat() {
  const input = document.getElementById('username');
  const userName = input.value.trim();
  if (userName === '') {
    alert('أدخل اسمك الفاخر أولاً! 👑');
    return;
  }

  // استدعاء API للتحقق
  fetch(`/api/users/${userName}`)
    .then(res => res.json())
    .then(data => {
      if (data.exists) {
        alert(`اسم المستخدم "${userName}" مستخدم حاليًا! اختر اسمًا آخر. 👑`);
        return;
      }

      // إضافة اليوزر
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userName })
      }).then(res => res.json()).then(data => {
        if (data.success) {
          username = userName;
          localStorage.setItem('eliteUsername', username);
          document.getElementById('usernameBox').style.display = 'none';
          document.getElementById('messages').style.display = 'flex';
          document.getElementById('inputs').style.display = 'flex';
          document.querySelectorAll('#header-controls .control-btn').forEach(btn => btn.style.display = 'flex');
          addSystemMessage(`مرحباً بـ ${username} في الغرفة الملكية! 👑✨`);
          saveData();
        } else {
          alert(data.message);
        }
      }).catch(err => alert('خطأ في التسجيل!'));
    }).catch(err => alert('خطأ في الاتصال!'));
}

function sendMessage() {
  const msgBox = document.getElementById('msg');
  const text = msgBox.value.trim();
  if (text === '' || !username) {
    alert('أدخل اسمك أولاً للإرسال! 👑');
    return;
  }
  const newMsg = {
    id: Date.now(),
    text: `${username}: ${text}`,
    type: 'me',
    time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    timestamp: Date.now(),
    username: username
  };
  socket.emit('sendMessage', newMsg); // إرسال للسيرفر
  msgBox.value = '';
  msgBox.style.height = 'auto';
}

function addMessage(msgObj) {
  const messagesDiv = document.getElementById('messages');
  if (!messagesDiv) return;
  const div = document.createElement('div');
  div.className = `msg ${msgObj.type}`;
  div.id = `msg-${msgObj.id}`;
  let contentHTML = msgObj.text;
  if (msgObj.media) {
    const mediaElement = msgObj.mediaType === 'image' 
      ? `<img src="${msgObj.media}" alt="صورة" class="media-container" loading="lazy">`
      : `<video src="${msgObj.media}" controls class="media-container" preload="metadata"></video>`;
    contentHTML += mediaElement;
  } else if (msgObj.isLoading) {
    contentHTML += '<div class="video-loading"></div>';
  }
  div.innerHTML = `
    <div class="msg-actions">
      ${msgObj.username === username && !msgObj.media && !msgObj.isLoading ? `
        <button class="msg-action" onclick="editMessage(${msgObj.id})" title="تعديل"><i class="fas fa-edit"></i></button>
        <button class="msg-action" onclick="deleteMessage(${msgObj.id})" title="حذف"><i class="fas fa-trash"></i></button>
      ` : ''}
    </div>
    <span>${contentHTML}</span>
    <time>${msgObj.time}</time>
  `;
  messagesDiv.appendChild(div);
  scrollToBottom();
}

function addSystemMessage(text) {
  const msgObj = {
    id: Date.now(),
    text,
    type: 'system',
    time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    timestamp: Date.now()
  };
  addMessage(msgObj);
}

function editMessage(id) {
  const msg = messages.find(m => m.id === id);
  if (!msg || msg.username !== username || msg.media || msg.isLoading) return alert('لا يمكن التعديل!');
  const newText = prompt('عدل الرسالة:', msg.text.replace(`${username}: `, ''));
  if (newText && newText.trim()) {
    msg.text = `${username}: ${newText.trim()}`;
    addMessage(msg); // إعادة إضافة المعدلة
    socket.emit('sendMessage', msg); // تحديث للآخرين
  }
}

function deleteMessage(id) {
  if (confirm('حذف الرسالة؟')) {
    messages = messages.filter(m => m.id !== id);
    rebuildMessages();
  }
}

function scrollToBottom() {
  const messagesEl = document.getElementById('messages');
  if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
}

function clearChat() {
  if (confirm('مسح الدردشة؟')) {
    messages = [];
    document.getElementById('messages').innerHTML = '';
    addSystemMessage('تم المسح! جاهز للجديد. ✨');
  }
}

function saveData() {
  localStorage.setItem('eliteMessages', JSON.stringify(messages)); // حفظ محلي للرسائل (اختياري)
  localStorage.setItem('eliteMessageId', messageId.toString());
}

function loadChat() {
  document.getElementById('usernameBox').style.display = 'none';
  document.getElementById('messages').style.display = 'flex';
  document.getElementById('inputs').style.display = 'flex';
  document.querySelectorAll('#header-controls .control-btn').forEach(btn => btn.style.display = 'flex');
  rebuildMessages();
  if (messages.length === 0) addSystemMessage(`مرحباً بـ ${username}! 👑`);
  scrollToBottom();
}

// تحسين التمرير
document.addEventListener('DOMContentLoaded', () => {
  const msgInput = document.getElementById('msg');
  if (msgInput) {
    msgInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    msgInput.addEventListener('input', () => {
      msgInput.style.height = 'auto';
      msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + 'px';
    });
  }

  if (username) {
    document.getElementById('inputs').style.display = 'flex';
  }
  console.log('JS محمل! الدردشة المشتركة جاهزة.');
});
