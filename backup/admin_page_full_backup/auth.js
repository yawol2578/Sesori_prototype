const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { db } = require("./db");
const { authenticateToken } = require("./middleware");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

router.post("/register", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function (err) {
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
