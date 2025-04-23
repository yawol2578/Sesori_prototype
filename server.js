require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");

const { setupWebSocket } = require("./meal_back/websocket");
const authRoutes = require("./meal_back/auth");
const reviewRoutes = require("./meal_back/reviews");
const mealRoutes = require("./meal_back/meals");
const { initDB } = require("./meal_back/db");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// 초기 설정
setupWebSocket();
initDB();

app.use(cors());
app.use(express.json());

// ✅ 정적 파일 라우팅
app.use(express.static(path.join(__dirname, "meal_front")));

// ✅ HTML 라우팅
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "meal_front", "index", "index.html"));
});

app.get("/main.html", (req, res) => {
  res.sendFile(path.join(__dirname, "meal_front", "main", "main.html"));
});

app.get("/guest.html", (req, res) => {
  res.sendFile(path.join(__dirname, "meal_front", "guest", "guest.html"));
});

// ✅ API 라우팅
app.use("/", authRoutes);
app.use("/reviews", reviewRoutes);
app.use("/api", mealRoutes);

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
