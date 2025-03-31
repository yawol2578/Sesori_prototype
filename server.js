require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const API_KEY = process.env.API_KEY;
const ATPT_OFCDC_SC_CODE = process.env.ATPT_OFCDC_SC_CODE;
const SD_SCHUL_CODE = process.env.SD_SCHUL_CODE;

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// SQLite 데이터베이스 연결
const db = new sqlite3.Database('database.sqlite', (err) => {
    if (err) {
        console.error('데이터베이스 연결 실패:', err);
    } else {
        console.log('데이터베이스 연결 성공');
        // 테이블 생성
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            rating INTEGER NOT NULL,
            comment TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);
    }
});

// JWT 토큰 검증 미들웨어
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
        }
        req.user = user;
        next();
    });
};

// 오늘 날짜를 YYYYMMDD 형식으로 반환하는 함수
const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
};

// API 호출 함수
const fetchData = async (dateStr) => {
    try {
        const response = await fetch(`https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&pIndex=1&pSize=100&ATPT_OFCDC_SC_CODE=B10&SD_SCHUL_CODE=7010537&MLSV_YMD=${dateStr}`);
        const data = await response.json();

        if (data.mealServiceDietInfo && data.mealServiceDietInfo.length > 1) {
            const mealInfo = data.mealServiceDietInfo[1].row[0];
            const cleanedMenu = mealInfo.DDISH_NM
                .replace(/<br\/>/g, "\n")
                .replace(/\s*\([\d.]+\)/g, "")
                .trim();

            return {
                date: mealInfo.MLSV_YMD,
                menu: cleanedMenu
            };
        } else {
            return { error: "급식 정보가 없습니다." };
        }
    } catch (error) {
        console.error("API 요청 중 오류 발생:", error);
        return { error: "API 요청 실패" };
    }
};

// 회원가입 엔드포인트
app.post("/register", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run('INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hashedPassword],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
                    }
                    return res.status(500).json({ error: '회원가입 중 오류가 발생했습니다.' });
                }
                res.status(201).json({ message: '회원가입이 완료되었습니다.' });
            });
    } catch (error) {
        res.status(500).json({ error: '회원가입 중 오류가 발생했습니다.' });
    }
});

// 로그인 엔드포인트
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
        }

        if (!user) {
            return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }

        try {
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
            }

            const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
            res.json({ token, user: { id: user.id, username: user.username } });
        } catch (error) {
            res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
        }
    });
});

// 프로필 조회 엔드포인트
app.get("/profile", authenticateToken, (req, res) => {
    res.json({ id: req.user.id, username: req.user.username });
});

// 리뷰 작성 엔드포인트
app.post("/reviews", authenticateToken, (req, res) => {
    const { date, rating, comment } = req.body;
    const userId = req.user.id;

    if (!date || !rating) {
        return res.status(400).json({ error: '날짜와 평점을 입력해주세요.' });
    }

    db.run('INSERT INTO reviews (user_id, date, rating, comment) VALUES (?, ?, ?, ?)',
        [userId, date, rating, comment],
        function(err) {
            if (err) {
                return res.status(500).json({ error: '리뷰 작성 중 오류가 발생했습니다.' });
            }
            res.status(201).json({ message: '리뷰가 작성되었습니다.' });
        });
});

// 리뷰 조회 엔드포인트
app.get("/reviews/:date", (req, res) => {
    const { date } = req.params;
    
    db.all('SELECT r.*, u.username FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.date = ? ORDER BY r.created_at DESC',
        [date],
        (err, reviews) => {
            if (err) {
                return res.status(500).json({ error: '리뷰 조회 중 오류가 발생했습니다.' });
            }
            res.json(reviews);
        });
});

// 급식 정보 API
app.get('/api', authenticateToken, async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0].replace(/-/g, '');
        const response = await fetch(`https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=${API_KEY}&Type=json&pIndex=1&pSize=100&ATPT_OFCDC_SC_CODE=${ATPT_OFCDC_SC_CODE}&SD_SCHUL_CODE=${SD_SCHUL_CODE}&MLSV_YMD=${date}`);
        const data = await response.json();
        
        if (data.RESULT) {
            res.json({ error: '급식 정보를 찾을 수 없습니다.', hasMeal: false });
            return;
        }

        const mealInfo = data.mealServiceDietInfo[1].row[0];
        // 알레르기 정보 제거
        const menu = mealInfo.DDISH_NM
            .split('<br/>')
            .map(item => item.replace(/\s*\([\d.]+\)/g, '').trim())
            .join('\n');
        res.json({ menu, hasMeal: true });
    } catch (error) {
        console.error('급식 정보 조회 실패:', error);
        res.json({ error: '급식 정보를 불러오는데 실패했습니다.', hasMeal: false });
    }
});

// 루트 경로에서 index.html 제공
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 서버 실행
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
