// script.js
let username = localStorage.getItem('eliteUsername') || '';
let users = JSON.parse(localStorage.getItem('eliteUsers')) || []; // قاعدة بيانات المستخدمين
let messages = JSON.parse(localStorage.getItem('eliteMessages')) || [];
let messageId = parseInt(localStorage.getItem('eliteMessageId')) || 0;
let currentTheme = localStorage.getItem('eliteTheme') || 'dark';
let searchTerm = '';

// تطبيق الثيم
document.body.className = currentTheme === 'light' ? 'light-theme' : '';

// تحميل الدردشة إذا كان هناك اسم
if (username) {
  loadChat();
}

// دوال مباشرة للأزرار (للعمل الفوري)
function toggleSearch() {
  const searchBox = document.getElementById('searchBox');
  searchBox.style.display = searchBox.style.display === 'block' ? 'none' : 'block';
  if (searchBox.style.display === 'block') {
    document.getElementById('searchInput').focus();
  } else {
    searchTerm = '';
    rebuildMessages();
  }
}

function exportChat() {
  if (!username) return alert('ادخل اسمك أولاً!');
  const dataStr = JSON.stringify(messages, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
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
  
  // رسالة تحميل فاخرة
  const loadingId = ++messageId;
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
    messages[index] = {
      id: loadingId,
      text: `${username}: ${mediaType === 'image' ? '🖼️ صورة فاخرة' : '🎥 فيديو مميز'}`,
      type: 'me',
      media: e.target.result,
      mediaType: mediaType,
      time: loadingMsg.time,
      timestamp: loadingMsg.timestamp
    };
    rebuildMessages();
    scrollToBottom();
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function enterChat() {
  const input = document.getElementById('username');
  const userName = input.value.trim();
  if (userName === '') {
    alert('أدخل اسمك الفاخر أولاً! 👑');
    return;
  }
  
  // تحقق من قاعدة البيانات للمستخدمين
  if (users.includes(userName)) {
    alert(`اسم المستخدم "${userName}" مستخدم حاليًا! اختر اسمًا آخر. 👑`);
    return;
  }
  
  // إضافة إلى قاعدة البيانات
  users.push(userName);
  localStorage.setItem('eliteUsers', JSON.stringify(users));
  
  username = userName;
  localStorage.setItem('eliteUsername', username);
  document.getElementById('usernameBox').style.display = 'none';
  document.getElementById('messages').style.display = 'flex';
  document.getElementById('inputs').style.display = 'flex';
  document.querySelectorAll('#header-controls .control-btn').forEach(btn => btn.style.display = 'flex');
  addSystemMessage(`مرحباً بـ ${username} في الغرفة الملكية! 👑✨`);
  saveData();
}

function sendMessage() {
  const msgBox = document.getElementById('msg');
  const text = msgBox.value.trim();
  if (text === '' || !username) {
    alert('أدخل اسمك أولاً للإرسال! 👑');
    return;
  }
  const msgObj = {
    id: ++messageId,
    text: `${username}: ${text}`,
    type: 'me',
    time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    timestamp: Date.now()
  };
  messages.push(msgObj);
  addMessage(msgObj);
  msgBox.value = '';
  msgBox.style.height = 'auto';
  saveData();
}

function addMessage(msgObj) {
  const messagesDiv = document.getElementById('messages');
  if (!messagesDiv) return;
  const div = document.createElement('div');
  div.className = `msg ${msgObj.type}`;
  div.id = `msg-${msgObj.id}`;
  let contentHTML = msgObj.text;
  if (msgObj.media) {
    const mediaElement = msgObj.mediaType === 'image' ?
      `<img src="${msgObj.media}" alt="صورة" class="media-container" loading="lazy">` :
      `<video src="${msgObj.media}" controls class="media-container" preload="metadata"></video>`;
    contentHTML += mediaElement;
  } else if (msgObj.isLoading) {
    contentHTML += '<div class="video-loading"></div>';
  }
  div.innerHTML = `
    <div class="msg-actions">
      ${msgObj.type === 'me' && !msgObj.media && !msgObj.isLoading ? `
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
    id: ++messageId,
    text,
    type: 'system',
    time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    timestamp: Date.now()
  };
  messages.push(msgObj);
  addMessage(msgObj);
}

function editMessage(id) {
  const msg = messages.find(m => m.id === id);
  if (!msg || msg.type !== 'me' || msg.media || msg.isLoading) return alert('لا يمكن التعديل!');
  const newText = prompt('عدل الرسالة:', msg.text.replace(`${username}: `, ''));
  if (newText && newText.trim()) {
    msg.text = `${username}: ${newText.trim()}`;
    rebuildMessages();
    saveData();
  }
}

function deleteMessage(id) {
  if (confirm('حذف الرسالة؟')) {
    messages = messages.filter(m => m.id !== id);
    rebuildMessages();
    saveData();
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
    messageId = 0;
    localStorage.removeItem('eliteMessageId');
    saveData();
    addSystemMessage('تم المسح! جاهز للجديد. ✨');
  }
}

function saveData() {
  localStorage.setItem('eliteMessages', JSON.stringify(messages));
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

// تحسين التمرير للجوال
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
  
  const messagesEl = document.getElementById('messages');
  if (messagesEl) {
    messagesEl.addEventListener('touchstart', () => {}, { passive: true }); // تحسين اللمس
    messagesEl.addEventListener('scroll', () => {
      if (messagesEl.scrollTop + messagesEl.clientHeight < messagesEl.scrollHeight - 100) {
        // إظهار زر التمرير إلى الأسفل إذا لزم
      }
    });
  }
  
  if (username) {
    document.getElementById('inputs').style.display = 'flex';
  }
  console.log('JS محمل! الأزرار جاهزة.'); // للتصحيح
});