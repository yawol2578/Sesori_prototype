const { db } = require("./db");
const express = require("express");
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// 오늘 날짜를 YYYYMMDD 형식으로 반환
const getTodayDate = () => {
    const now = new Date();
    now.setHours(now.getHours() + 9); // KST 보정
    return now.toISOString().slice(0, 10).replace(/-/g, '');
};

// 날짜 유효성 검사
const isValidDate = (dateStr) => {
    if (!/^\d{8}$/.test(dateStr)) return false;
    const year = parseInt(dateStr.slice(0, 4));
    const month = parseInt(dateStr.slice(4, 6)) - 1;
    const day = parseInt(dateStr.slice(6, 8));
    const date = new Date(year, month, day);
    return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
};

// 급식 데이터 로딩 (DB -> API fallback)
const fetchData = async (dateStr) => {
    console.log(`[급식 조회] 날짜: ${dateStr}`);
    
    if (!isValidDate(dateStr)) {
        console.error(`[급식 조회 오류] 잘못된 날짜 형식: ${dateStr}`);
        return { error: '잘못된 날짜입니다.' };
    }

    return new Promise((resolve) => {
        db.get('SELECT * FROM meals WHERE date = ?', [dateStr], async (err, row) => {
            if (err) {
                console.error('[DB 조회 오류]', err);
                return resolve({ error: 'DB 조회 오류: ' + err.message });
            }

            if (row) {
                console.log(`[급식 조회] DB에서 찾음: ${dateStr}`);
                return resolve({ date: row.date, menu: row.menu, CAL_INFO: row.cal_info });
            }

            try {
                console.log(`[급식 조회] API 요청: ${dateStr}`);
                const response = await fetch(`https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&pIndex=1&pSize=100&ATPT_OFCDC_SC_CODE=B10&SD_SCHUL_CODE=7010537&MLSV_YMD=${dateStr}`);
                const data = await response.json();

                const mealInfo = data?.mealServiceDietInfo?.[1]?.row?.[0];
                if (!mealInfo) {
                    console.log(`[급식 조회] 정보 없음: ${dateStr}`);
                    return resolve({ error: "급식 정보가 없습니다." });
                }

                const cleanedMenu = mealInfo.DDISH_NM.replace(/<br\/>/g, "\n").replace(/\s*\([\d.]+\)/g, "").trim();
                const calInfo = mealInfo.CAL_INFO || null;

                db.run(
                    'INSERT INTO meals (date, menu, cal_info) VALUES (?, ?, ?)',
                    [mealInfo.MLSV_YMD, cleanedMenu, calInfo],
                    (err) => {
                        if (err) {
                            console.error('[급식 DB 저장 실패]', err);
                        } else {
                            console.log(`[급식 저장] DB에 저장 완료: ${dateStr}`);
                        }
                    }
                );

                return resolve({ date: mealInfo.MLSV_YMD, menu: cleanedMenu, CAL_INFO: calInfo });
            } catch (error) {
                console.error("[API 요청 오류]", error);
                return resolve({ error: "API 요청 실패: " + error.message });
            }
        });
    });
};

// 급식 정보 API (인증 없이도 가능하되 main.html 에서 오면 토큰 필요)
router.get("/", async (req, res) => {
    const referer = req.headers.referer || "";
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // main.html에서 왔고, 토큰이 없으면 차단
    if (referer.includes("/main.html") && !token) {
        return res.status(401).json({ error: "로그인이 필요합니다." });
    }

    const date = req.query.date || getTodayDate();
    console.log(`[급식 API] 요청 받음 - 날짜: ${date}, Referer: ${referer}`);

    try {
        const result = await fetchData(date);
        if (result.error) {
            console.log(`[급식 API] 오류 응답: ${result.error}`);
            return res.json({ error: result.error, hasMeal: false });
        }
        console.log(`[급식 API] 성공 응답: ${date}`);
        res.json({ menu: result.menu, date: result.date, hasMeal: true, CAL_INFO: result.CAL_INFO });
    } catch (error) {
        console.error('[급식 API 오류]', error);
        res.json({ error: '급식 정보를 불러오는데 실패했습니다.', hasMeal: false });
    }
});

module.exports = router;
