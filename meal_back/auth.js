const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { db } = require("./db");
const { authenticateToken } = require("./middleware");
const { sendVerificationEmail, verifyCode } = require("./email");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 이메일 도메인 검증
function validateEmailDomain(email) {
    const domain = email.split('@')[1];
    return domain === 'sen.go.kr';
}

// 이메일 인증 코드 발송
router.post("/send-verification", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: '이메일을 입력해주세요.' });
    }

    if (!validateEmailDomain(email)) {
        return res.status(400).json({ error: 'sen.go.kr 도메인의 이메일만 사용 가능합니다.' });
    }

    try {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const success = await sendVerificationEmail(email, code);
        
        if (success) {
            res.json({ message: '인증 코드가 이메일로 발송되었습니다.' });
        } else {
            res.status(500).json({ error: '인증 코드 발송에 실패했습니다.' });
        }
    } catch (error) {
        res.status(500).json({ error: '인증 코드 발송 중 오류가 발생했습니다.' });
    }
});

router.post("/register", async (req, res) => {
    const { username, password, email, verificationCode } = req.body;

    if (!username || !password || !email || !verificationCode) {
        return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
    }

    if (!validateEmailDomain(email)) {
        return res.status(400).json({ error: 'sen.go.kr 도메인의 이메일만 사용 가능합니다.' });
    }

    // 이메일 인증 확인
    if (!verifyCode(email, verificationCode)) {
        return res.status(400).json({ error: '유효하지 않은 인증 코드입니다.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (username, password, email) VALUES (?, ?, ?)', 
            [username, hashedPassword, email], 
            function (err) {
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

router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) return res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
        if (!user) return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });

        try {
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });

            const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
            res.json({ token, user: { id: user.id, username: user.username } });
        } catch (error) {
            res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
        }
    });
});

router.get("/profile", authenticateToken, (req, res) => {
    res.json({ id: req.user.id, username: req.user.username });
});

module.exports = router;
