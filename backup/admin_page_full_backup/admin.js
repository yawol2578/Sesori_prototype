const express = require("express");
const { db } = require("./db");
const { authenticateToken } = require("./middleware");

const router = express.Router();

// 관리자 권한 체크 미들웨어
function isAdmin(req, res, next) {
    if (req.user?.username !== "null4u") {
        return res.status(403).json({ error: "관리자만 접근 가능합니다." });
    }
    next();
}

// 전체 신고 목록 조회
router.get("/reports", authenticateToken, isAdmin, (req, res) => {
    db.all(`
        SELECT review_id, reporter_username, reported_ip, created_at
        FROM reports
        ORDER BY created_at DESC
    `, (err, rows) => {
        if (err) return res.status(500).json({ error: "신고 내역 조회 실패" });
        res.json(rows);
    });
});

// 밴된 IP 해제
router.delete("/banned/:ip", authenticateToken, isAdmin, (req, res) => {
    const ip = req.params.ip;
    db.run("DELETE FROM banned_ips WHERE ip = ?", [ip], function (err) {
        if (err) return res.status(500).json({ error: "IP 해제 실패" });
        res.json({ message: `IP ${ip} 해제 완료` });
    });
});

module.exports = router;
