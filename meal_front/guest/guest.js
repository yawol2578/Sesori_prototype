const API_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3001';
let user = null;

function getDate(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset + dayOffset);
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

function updateMealLabels(offset) {
  const labels = document.querySelectorAll('.meal-date');
  const baseOffsets = [-1, 0, 1];
  labels.forEach((el, i) => {
    const actualOffset = offset + baseOffsets[i];
    let label = '';
    if (actualOffset === 0) label = '오늘';
    else if (actualOffset === -1) label = '어제';
    else if (actualOffset === 1) label = '내일';
    else if (actualOffset < 0) label = `${Math.abs(actualOffset)}일 전`;
    else label = `${actualOffset}일 후`;
    const date = new Date();
    date.setDate(date.getDate() + actualOffset);
    const formatted = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
    el.innerHTML = `${label}<br><span style="font-size: 0.9em; color: #666;">${formatted}</span>`;
  });
}

function loadMealInfo(date, elementId) {
  fetch(`${API_URL}/api?date=${date}`)
    .then(res => res.json())
    .then(data => {
      const mealContent = document.getElementById(elementId);
      if (data.error) {
        mealContent.innerHTML = `<div class="error-message">${data.error}</div>`;
      } else {
        mealContent.innerHTML = `<div>${data.menu}</div>${data.CAL_INFO ? `<div style="margin-top: 8px; font-size: 0.9em; color: #555;">칼로리: ${data.CAL_INFO}</div>` : ''}`;
      }
    })
    .catch(() => {
      document.getElementById(elementId).innerHTML = '<div class="error-message">급식 정보를 불러오는데 실패했습니다.</div>';
    });
}

function renderReview(review, container) {
  if (typeof container === 'string') container = document.getElementById(container);
  const div = document.createElement('div');
  div.className = 'review-item';
  div.setAttribute('data-review-id', review.id);
  const time = new Date(review.created_at);
  time.setHours(time.getHours() + 9);
  const formatted = time.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  div.innerHTML = `<div class="user-info">${review.username} • ${formatted}</div><div class="rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div><div>${review.comment || ''}</div>`;
  container.appendChild(div);
}

function loadReviews(date, elementId) {
  fetch(`${API_URL}/reviews/${date}`)
    .then(res => res.json())
    .then(reviews => {
      const reviewList = document.getElementById(elementId);
      reviewList.innerHTML = '';
      if (!Array.isArray(reviews) || reviews.length === 0) {
        reviewList.innerHTML = '<p>아직 작성된 리뷰가 없습니다.</p>';
        return;
      }
      reviews.forEach(review => renderReview(review, reviewList));
    })
    .catch(() => {
      document.getElementById(elementId).innerHTML = '<div class="error-message">리뷰 목록을 불러오는데 실패했습니다.</div>';
    });
}

function getDayFromDate(dateStr) {
  const today = new Date();
  const input = new Date(dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
  const diff = Math.round((input.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === -1) return 'yesterday';
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  return null;
}

function handleDeleteReview(reviewId) {
  const el = document.querySelector(`[data-review-id="${reviewId}"]`);
  if (el) {
    const parent = el.parentElement;
    el.remove();
    if (parent.querySelectorAll('.review-item').length === 0) {
      parent.innerHTML = '<p>아직 작성된 리뷰가 없습니다.</p>';
    }
  }
}

let dayOffset = 0;
function moveDay(delta) {
  dayOffset += delta;
  console.log('Moving day with offset:', dayOffset);
  renderMeals(dayOffset);
}

function renderMeals(offset) {
  console.log('Rendering meals with offset:', offset);
  const days = ['yesterday', 'today', 'tomorrow'];
  const offsets = [-1, 0, 1];
  days.forEach((day, idx) => {
    const actualOffset = offsets[idx] + offset;
    const date = getDate(actualOffset);
    console.log(`Loading meal for ${day}:`, date);
    loadMealInfo(date, `${day}Meal`);
    loadReviews(date, `${day}Reviews`);
  });
  updateMealLabels(offset);
}

function connectWebSocket() {
  const ws = new WebSocket(WS_URL);
  ws.onopen = () => console.log('WebSocket connected (guest)');
  ws.onmessage = e => {
    const data = JSON.parse(e.data);
    if (data.type === 'new_review') {
      const review = data.review;
      const day = getDayFromDate(review.date);
      if (!day) return;
      const list = document.getElementById(`${day}Reviews`);
      if (list.innerHTML.includes('아직 작성된 리뷰가 없습니다')) list.innerHTML = '';
      const temp = document.createElement('div');
      renderReview(review, temp);
      list.insertBefore(temp.firstChild, list.firstChild);
    } else if (data.type === 'delete_review') {
      handleDeleteReview(data.reviewId);
    }
  };
  ws.onclose = () => setTimeout(connectWebSocket, 3000);
  ws.onerror = e => console.error('WebSocket error:', e);
}

// ✅ 홈으로 되돌아가기 (게스트용 logout)
function logout() {
  localStorage.removeItem('token');
  window.location.href = '/index/index.html';
}

renderMeals(0);
connectWebSocket();
