const API_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3001';
let user = null;
let ws = null;
let dayOffset = 0;

// 급식 카드 상태를 저장할 객체
let mealCards = {
  yesterday: { date: '', meal: null, reviews: [] },
  today: { date: '', meal: null, reviews: [] },
  tomorrow: { date: '', meal: null, reviews: [] }
};

function getDateWithOffset(offset) {
  const now = new Date();
  now.setHours(now.getHours() + 9); // KST로 조정
  const date = new Date(now);
  date.setDate(date.getDate() + offset);
  return {
    formatted: `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`,
    display: `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`,
    dayLabel: offset === 0 ? '오늘' : 
              offset === -1 ? '어제' : 
              offset === 1 ? '내일' : 
              `${Math.abs(offset)}일 ${offset < 0 ? '전' : '후'}`
  };
}

function getDayFromDate(dateStr) {
  const today = new Date();
  const date = new Date(dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
  const diff = Math.floor((date - today) / (1000 * 60 * 60 * 24));
  
  if (diff === -1) return 'yesterday';
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  return null;
}

function updateMealLabels(offset) {
  const labels = document.querySelectorAll('.meal-date');
  const baseOffsets = [-1, 0, 1];
  labels.forEach((el, i) => {
    const actualOffset = baseOffsets[i] + offset;
    let label = actualOffset === 0 ? '오늘' : actualOffset === -1 ? '어제' : actualOffset === 1 ? '내일' : `${Math.abs(actualOffset)}일 ${actualOffset < 0 ? '전' : '후'}`;
    const date = new Date();
    date.setDate(date.getDate() + actualOffset);
    const formatted = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
    el.innerHTML = `${label}<br><span style="font-size: 0.9em; color: #666;">${formatted}</span>`;
  });
}

function displayMeal(position) {
  const mealContent = document.getElementById(`${position}Meal`);
  const data = mealCards[position].meal;
  
  if (!data || data.error) {
    mealContent.innerHTML = `<div class="error-message">${data?.error || '급식 정보가 없습니다.'}</div>`;
  } else {
    mealContent.innerHTML = `<div class="menu-content">${data.menu}</div>${data.CAL_INFO ? `<div style="margin-top: 8px; font-size: 0.9em; color: #555;">칼로리: ${data.CAL_INFO}</div>` : ''}`;
  }
}

function loadMealInfo(date, elementId) {
  return fetch(`${API_URL}/api?date=${date}`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  })
    .then(res => res.json())
    .then(data => {
      // 급식 정보를 표시할 element를 찾을 때 meal-content 클래스를 사용
      const mealContent = document.querySelector(`#${elementId} .meal-content`);
      if (!mealContent) {
        console.error(`Cannot find meal content element for ${elementId}`);
        return;
      }

      if (data.error) {
        mealContent.innerHTML = `<div class="error-message">${data.error}</div>`;
        // 급식 정보가 없으면 리뷰 버튼 비활성화
        const reviewButton = document.querySelector(`#${elementId} .review-button`);
        if (reviewButton) {
          reviewButton.disabled = true;
          reviewButton.title = "급식 정보가 없어 리뷰를 작성할 수 없습니다.";
        }
      } else {
        mealContent.innerHTML = `<div class="menu-content">${data.menu}</div>${data.CAL_INFO ? `<div style="margin-top: 8px; font-size: 0.9em; color: #555;">칼로리: ${data.CAL_INFO}</div>` : ''}`;
        // 급식 정보가 있으면 리뷰 버튼 활성화
        const reviewButton = document.querySelector(`#${elementId} .review-button`);
        if (reviewButton) {
          reviewButton.disabled = false;
          reviewButton.title = "리뷰 작성하기";
        }
      }
      return data;
    })
    .catch(() => {
      const mealContent = document.querySelector(`#${elementId} .meal-content`);
      if (mealContent) {
        mealContent.innerHTML = '<div class="error-message">급식 정보를 불러오는데 실패했습니다.</div>';
      }
    });
}

function moveDay(delta) {
  dayOffset += delta;
  renderMeals();
}

async function renderMeals() {
  const days = ['yesterday', 'today', 'tomorrow'];
  const baseOffsets = [-1, 0, 1];
  
  const loadPromises = days.map(async (day, i) => {
    const actualOffset = baseOffsets[i] + dayOffset;
    const dateInfo = getDateWithOffset(actualOffset);
    
    // 날짜 레이블 업데이트
    const label = document.querySelector(`#${day}Meal .meal-date`);
    if (label) {
      label.innerHTML = `${dateInfo.dayLabel}<br><span style="font-size: 0.9em; color: #666;">${dateInfo.display}</span>`;
    }
    
    // 급식 정보 로드
    try {
      const response = await fetch(`${API_URL}/api?date=${dateInfo.formatted}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      
      const mealContent = document.querySelector(`#${day}Meal .meal-content`);
      if (!mealContent) {
        console.error(`Cannot find meal content element for ${day}Meal`);
        return;
      }

      if (data.error) {
        mealContent.innerHTML = `<div class="error-message">${data.error}</div>`;
        // 급식 정보가 없으면 리뷰 버튼 비활성화
        const reviewButton = document.querySelector(`#${day}Meal .review-button`);
        if (reviewButton) {
          reviewButton.disabled = true;
          reviewButton.title = "급식 정보가 없어 리뷰를 작성할 수 없습니다.";
        }
      } else {
        mealContent.innerHTML = `<div class="menu-content">${data.menu}</div>${data.CAL_INFO ? `<div style="margin-top: 8px; font-size: 0.9em; color: #555;">칼로리: ${data.CAL_INFO}</div>` : ''}`;
        // 급식 정보가 있으면 리뷰 버튼 활성화
        const reviewButton = document.querySelector(`#${day}Meal .review-button`);
        if (reviewButton) {
          reviewButton.disabled = false;
          reviewButton.title = "리뷰 작성하기";
        }
      }
      
      // 리뷰 로드
      loadReviews(dateInfo.formatted, `${day}Reviews`);
    } catch (error) {
      console.error('Failed to load meal info:', error);
      const mealContent = document.querySelector(`#${day}Meal .meal-content`);
      if (mealContent) {
        mealContent.innerHTML = '<div class="error-message">급식 정보를 불러오는데 실패했습니다.</div>';
      }
    }
  });
  
  await Promise.all(loadPromises);
}

function initializeMeals() {
  // 초기 3일치 급식 정보 로드
  loadMealInfo(getDateWithOffset(-1).formatted, 'yesterdayMeal');
  loadMealInfo(getDateWithOffset(0).formatted, 'todayMeal');
  loadMealInfo(getDateWithOffset(1).formatted, 'tomorrowMeal');
}

// 초기 실행
checkLoginStatus().then(() => {
  connectWebSocket();
  renderMeals();  // 초기 데이터 로드
});

async function checkLoginStatus() {
  const token = localStorage.getItem('token');
  if (!token) return location.href = '/';

  try {
    const res = await fetch(`${API_URL}/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!data.id) throw new Error();
    user = data;
  } catch {
    localStorage.removeItem('token');
    return location.href = '/';
  }
}

function renderReview(review, containerId) {
  const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  if (!container) return;

  // 리뷰가 이미 존재하는지 확인
  const existingReview = container.querySelector(`[data-review-id="${review.id}"]`);
  if (existingReview) return;

  const div = document.createElement('div');
  div.className = 'review-item';
  div.setAttribute('data-review-id', review.id);
  div.setAttribute('data-date', review.date);

  const isOwner = user && review.user_id === user.id;
  const isAdmin = user && user.username === 'null4u';

  const time = new Date(review.created_at);
  time.setHours(time.getHours() + 9);
  const formatted = time.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  });

  div.innerHTML = `
    <div class="user-info">${review.username} • ${formatted}</div>
    <div class="rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
    <div>${review.comment || ''}</div>
    <div class="button-group">
      ${(isOwner || isAdmin) ? `<button class="delete-btn" onclick="deleteReview(${review.id}, '${review.date}')">🗑️ 삭제</button>` : ''}
    </div>
  `;

  // 새 리뷰를 리스트의 맨 위에 추가
  const firstChild = container.firstChild;
  if (firstChild) {
    container.insertBefore(div, firstChild);
  } else {
    container.appendChild(div);
  }
}

function loadReviews(date, elementId) {
  fetch(`${API_URL}/reviews/${date}`)
    .then(res => res.json())
    .then(reviews => {
      const list = document.getElementById(elementId);
      list.innerHTML = '';
      
      if (!reviews.length) {
        list.innerHTML = '<p>아직 작성된 리뷰가 없습니다.</p>';
        return;
      }

      // 리뷰를 날짜순으로 정렬 (최신순)
      reviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      // 모든 리뷰를 표시 (날짜가 일치하는 경우)
      reviews.forEach(review => {
        if (review.date === date) {
          renderReview(review, list);
        }
      });
    })
    .catch(() => {
      document.getElementById(elementId).innerHTML = 
        '<div class="error-message">리뷰 목록을 불러오는데 실패했습니다.</div>';
    });
}

function submitReview(day) {
  const rating = +document.getElementById(`${day}Rating`).value;
  const comment = document.getElementById(`${day}Comment`).value.trim();
  let offset = day === 'yesterday' ? -1 : day === 'tomorrow' ? 1 : 0;
  const date = getDateWithOffset(offset).formatted;

  // 필수 입력값 검증
  if (!rating) {
    alert("평점을 선택해주세요.");
    return;
  }
  if (rating < 1 || rating > 5) {
    alert("평점을 1~5 사이로 입력해주세요.");
    return;
  }
  if (!comment) {
    alert("리뷰 내용을 입력해주세요.");
    return;
  }
  if (comment.length > 300) {
    alert("리뷰는 최대 300자까지 작성 가능합니다.");
    return;
  }
  if (/[<>\"'%&`]/.test(comment)) {
    alert("리뷰에 사용 불가능한 문자가 포함되어 있습니다.");
    return;
  }

  fetch(`${API_URL}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ date, rating, comment })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) throw new Error(data.error);
      
      // 리뷰 작성 성공 후 폼 초기화만 수행
      document.getElementById(`${day}Rating`).value = '';
      document.getElementById(`${day}Comment`).value = '';
      document.getElementById(`${day}ReviewForm`).classList.remove('active');
      
      // WebSocket을 통해 새 리뷰가 추가될 때까지 기다림
      alert("리뷰가 작성되었습니다.");
    })
    .catch(err => alert(err.message || "리뷰 작성 실패"));
}

function deleteReview(reviewId, date) {
  if (!confirm("정말 삭제하시겠습니까?")) return;

  fetch(`${API_URL}/reviews/${reviewId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) throw new Error(data.error);
      alert('삭제 완료');
      
      // 모든 날짜의 리뷰를 다시 로드
      const dates = ['yesterday', 'today', 'tomorrow'].map(day => {
        const offset = day === 'yesterday' ? -1 : day === 'tomorrow' ? 1 : 0;
        return {
          date: getDateWithOffset(offset + dayOffset).formatted,
          elementId: `${day}Reviews`
        };
      });
      
      // 각 날짜별로 리뷰 다시 로드
      dates.forEach(({ date, elementId }) => {
        loadReviews(date, elementId);
      });
    })
    .catch(err => alert(err.message || "삭제 실패"));
}

function toggleReviewForm(day) {
  document.getElementById(`${day}ReviewForm`).classList.toggle('active');
}

function closeReviewForm(day) {
  const form = document.getElementById(`${day}ReviewForm`);
  form.classList.remove('active');
  
  // 폼 초기화
  document.getElementById(`${day}Rating`).value = '';
  document.getElementById(`${day}Comment`).value = '';
}

function connectWebSocket() {
  ws = new WebSocket(WS_URL);
  ws.onopen = () => console.log("WebSocket 연결됨");
  ws.onmessage = e => {
    const data = JSON.parse(e.data);
    if (data.type === 'new_review') handleNewReview(data.review);
    if (data.type === 'delete_review') handleDeleteReview(data.reviewId);
  };
  ws.onclose = () => setTimeout(connectWebSocket, 3000);
}

function handleNewReview(review) {
  // 현재 표시된 날짜들을 가져옴
  const days = ['yesterday', 'today', 'tomorrow'];
  const dates = days.map(day => {
    const offset = day === 'yesterday' ? -1 : day === 'tomorrow' ? 1 : 0;
    return getDateWithOffset(offset).formatted;
  });

  // 리뷰의 날짜가 현재 표시된 날짜 중 하나와 일치하면 해당 위치에 추가
  const dayIndex = dates.indexOf(review.date);
  if (dayIndex !== -1) {
    const day = days[dayIndex];
    const list = document.getElementById(`${day}Reviews`);
    if (!list) return;

    // "아직 작성된 리뷰가 없습니다" 메시지 제거
    if (list.innerHTML.includes('아직 작성된 리뷰가 없습니다')) {
      list.innerHTML = '';
    }

    // 리뷰가 이미 리스트에 존재하는지 확인 (중복 방지)
    const existingReview = list.querySelector(`[data-review-id="${review.id}"]`);
    if (existingReview) return;  // 이미 있으면 중복 방지

    // 새 리뷰를 리스트의 맨 위에 추가
    const div = document.createElement('div');
    div.className = 'review-item';
    div.setAttribute('data-review-id', review.id);
    div.setAttribute('data-date', review.date);

    const isOwner = user && review.user_id === user.id;
    const isAdmin = user && user.username === 'null4u';

    const time = new Date(review.created_at);
    time.setHours(time.getHours() + 9);
    const formatted = time.toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    });

    div.innerHTML = `
      <div class="user-info">${review.username} • ${formatted}</div>
      <div class="rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
      <div>${review.comment || ''}</div>
      <div class="button-group">
        ${(isOwner || isAdmin) ? `<button class="delete-btn" onclick="deleteReview(${review.id}, '${review.date}')">🗑️ 삭제</button>` : ''}
      </div>
    `;

    const firstChild = list.firstChild;
    if (firstChild) {
      list.insertBefore(div, firstChild);
    } else {
      list.appendChild(div);
    }
  }
}

function handleDeleteReview(reviewId) {
  const reviewElement = document.querySelector(`[data-review-id="${reviewId}"]`);
  if (reviewElement) {
    const reviewDate = reviewElement.getAttribute('data-date');
    
    // WebSocket으로 다른 클라이언트에게도 삭제 알림
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'delete_review',
        reviewId: reviewId,
        date: reviewDate
      }));
    }
  }
}