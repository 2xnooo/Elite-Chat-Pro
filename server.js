const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.static('.')); // لخدمة HTML/CSS/JS
app.use(express.json()); // للـ JSON requests

const dataDir = path.join(__dirname, 'data');
const usersFile = path.join(dataDir, 'users.json');

// إنشاء المجلد إذا غير موجود
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// API للتحقق من يوزر وإضافته
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

  // إذا غير موجود، أضفه (يشمل إنشاء الملف إذا أول مرة)
  if (!users.includes(username)) {
    users.push(username);
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    res.json({ success: true, message: 'يوزر مضاف!' });
  } else {
    res.json({ success: false, message: 'يوزر موجود!' });
  }
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});