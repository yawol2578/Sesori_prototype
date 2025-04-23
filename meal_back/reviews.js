const express = require("express");
const { db } = require("./db");
const { authenticateToken } = require("./middleware");
const { broadcast } = require("./websocket");
const xss = require("xss");

const router = express.Router();

function sanitizeInput(str) {
    return xss(str?.trim?.() || "");
}

function getClientIp(req) {
    const forwarded = req.headers["x-forwarded-for"];
    const raw = forwarded ? forwarded.split(",")[0] : req.socket.remoteAddress || "";
    return raw.replace(/^::ffff:/, "").trim();
}

// 리뷰 작성
router.post("/", authenticateToken, (req, res) => {
    const date = sanitizeInput(req.body.date);
    const rating = parseInt(req.body.rating);
    const comment = sanitizeInput(req.body.comment);
    const userId = req.user.id;
    const ip = getClientIp(req);

    if (!date || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "유효하지 않은 입력입니다." });
    }

    db.run(
        'INSERT INTO reviews (user_id, date, rating, comment, ip, is_deleted) VALUES (?, ?, ?, ?, ?, 0)',
        [userId, date, rating, comment, ip],
        function (err) {
            if (err) {
                console.error("리뷰 저장 실패:", err);
                return res.status(500).json({ error: "리뷰 저장에 실패했습니다." });
            }

            db.get('SELECT username FROM users WHERE id = ?', [userId], (err, user) => {
                if (err) return res.status(500).json({ error: "사용자 정보 조회에 실패했습니다." });

                const newReview = {
                    id: this.lastID,
                    user_id: userId,
                    username: user.username,
                    date,
                    rating,
                    comment,
                    ip,
                    created_at: new Date().toISOString()
                };

                broadcast({ type: "new_review", review: newReview });
                res.json({ message: "리뷰가 저장되었습니다." });
            });
        }
    );
});

// 리뷰 조회
router.get("/:date", (req, res) => {
    const date = sanitizeInput(req.params.date);

    db.all(
        'SELECT r.*, u.username FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.date = ? AND r.is_deleted = 0 ORDER BY r.created_at DESC',
        [date],
        (err, reviews) => {
            if (err) return res.status(500).json({ error: "리뷰 조회 중 오류가 발생했습니다." });
            res.json(reviews);
        }
    );
});

// 리뷰 삭제 (소프트 삭제)
router.delete("/:id", authenticateToken, (req, res) => {
    const id = parseInt(req.params.id);
    const userId = req.user.id;
    const username = req.user.username;

    db.get('SELECT user_id FROM reviews WHERE id = ?', [id], (err, review) => {
        if (err) return res.status(500).json({ error: "리뷰 삭제 중 오류가 발생했습니다." });
        if (!review) return res.status(404).json({ error: "리뷰를 찾을 수 없습니다." });

        if (username !== "null4u" && review.user_id !== userId) {
            return res.status(403).json({ error: "자신의 리뷰만 삭제할 수 있습니다." });
        }

        db.run('UPDATE reviews SET is_deleted = 1 WHERE id = ?', [id], function (err) {
            if (err) return res.status(500).json({ error: "리뷰 삭제 중 오류가 발생했습니다." });

            broadcast({ type: "delete_review", reviewId: id });
            res.json({ message: "리뷰가 삭제되었습니다." });
        });
    });
});

module.exports = router;
