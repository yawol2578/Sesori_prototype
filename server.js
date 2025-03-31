require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// 오늘 날짜를 YYYYMMDD 형식으로 반환하는 함수
const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0"); // 1월 = 0이므로 +1 필요
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

// API 엔드포인트
app.get("/api", async (req, res) => {
    const dateStr = getTodayDate(); // 오늘 날짜 가져오기
    const api_data = await fetchData(dateStr);
    res.json(api_data);
});

// 서버 실행
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
