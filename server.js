// server.js (Backend - Node.js + Express + Socket.io للدردشة الفورية)
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // للـ Replit، يسمح للجميع
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
app.use(express.static('.')); // خدمة الملفات الثابتة
app.use(express.json());

// مجلد البيانات
const dataDir = path.join(__dirname, 'data');
const usersFile = path.join(dataDir, 'users.json');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// API لليوزرات (مشتركة)
app.get('/api/users/:username', (req, res) => {
  const username = req.params.username;
  let users = [];
  if (fs.existsSync(usersFile)) {
    const data = fs.readFileSync(usersFile, 'utf8');
    users = JSON.parse(data || '[]');
  }
  const exists = users.includes(username);
  res.json({ exists });
});

app.post('/api/users', (req, res) => {
  const { username } = req.body;
  let users = [];
  if (fs.existsSync(usersFile)) {
    const data = fs.readFileSync(usersFile, 'utf8');
    users = JSON.parse(data || '[]');
  }
  if (!users.includes(username)) {
    users.push(username);
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

// Socket.io للدردشة الفورية (مشتركة للجميع)
io.on('connection', (socket) => {
  console.log('مستخدم جديد متصل!');

  // إرسال الرسائل الحالية للمستخدم الجديد
  socket.emit('loadMessages', messages || []);

  // استقبال رسالة جديدة
  socket.on('sendMessage', (msg) => {
    const newMsg = {
      id: Date.now(), // ID بسيط
      text: msg.text,
      type: 'me', // يمكن تخصيص حسب اليوزر
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      username: msg.username || 'غير معروف'
    };
    messages.push(newMsg);
    io.emit('newMessage', newMsg); // إرسال للجميع
  });

  socket.on('disconnect', () => {
    console.log('مستخدم انفصل.');
  });
});

// تشغيل السيرفر
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
