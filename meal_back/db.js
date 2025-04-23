const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
    if (err) {
        console.error('데이터베이스 연결 실패:', err);
    } else {
        console.log('📦 데이터베이스 연결 성공');
    }
});

function initDB() {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT,
        ip TEXT,
        is_deleted INTEGER DEFAULT 0, -- ✅ 추가됨
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);
    

    db.run(`CREATE TABLE IF NOT EXISTS meals (
        date TEXT PRIMARY KEY,
        menu TEXT NOT NULL,
        cal_info TEXT
    )`);
}

module.exports = { db, initDB };
