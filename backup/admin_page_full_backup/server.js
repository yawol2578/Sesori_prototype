require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken"); // ✅ 추가

const { setupWebSocket } = require("./websocket");
const authRoutes = require("./auth");
const reviewRoutes = require("./reviews");
const mealRoutes = require("./meals");
const { initDB } = require("./db");
const adminRoutes = require('./admin');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // ✅ 추가

setupWebSocket();
initDB();

app.use(cors());
app.use(express.json());

// ✅ 관리자만 접근 가능한 admin.html 보호
app.get('/admin.html', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).send('Admin 페이지는 접근이 불가능합니다.');
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.username !== 'null4u') {
            return res.status(403).send('관리자만 접근할 수 있습니다.');
        }

        res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    } catch (error) {
        return res.status(403).send('유효하지 않은 토큰입니다.');
    }
});

app.use(express.static(path.join(__dirname, 'public')));

app.use("/", authRoutes);
app.use("/reviews", reviewRoutes);
app.use("/api", mealRoutes);
app.use('/admin', adminRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://null4u.net:${PORT}`);
});