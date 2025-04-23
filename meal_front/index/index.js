function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('authStatus').style.display = 'none';
  }
  
  function showRegisterForm() {
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('authStatus').style.display = 'none';
  }
  
  function handleLoginButton() {
    const loginFormVisible = document.getElementById('loginForm').style.display === 'block';
    if (loginFormVisible) {
      login();
    } else {
      showLoginForm();
    }
  }
  
  function handleRegisterButton() {
    const registerFormVisible = document.getElementById('registerForm').style.display === 'block';
    if (registerFormVisible) {
      register();
    } else {
      showRegisterForm();
    }
  }
  
  function login() {
    const username = document.getElementById('loginUsername').value;d
    const password = document.getElementById('loginPassword').value;
  
    fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          localStorage.setItem('token', data.token);
          location.href = '/main/main.html';
        } else {
          alert(data.error || '로그인 실패');
        }
      })
      .catch(err => alert('요청 실패: ' + err.message));
  }
  
  function validateEmail(email) {
    const domain = email.split('@')[1];
    if (domain !== 'sen.go.kr') {
      alert('sen.go.kr 도메인의 이메일만 사용 가능합니다.');
      return false;
    }
    return true;
  }

  function sendVerificationCode() {
    const email = document.getElementById('registerEmail').value;
    if (!email) {
      alert('이메일을 입력해주세요.');
      return;
    }

    if (!validateEmail(email)) {
      return;
    }

    fetch('http://localhost:3000/send-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
      .then(res => res.json())
      .then(data => {
        if (data.message) {
          alert('인증 코드가 이메일로 발송되었습니다.');
        } else {
          alert(data.error || '인증 코드 발송 실패');
        }
      })
      .catch(err => alert('요청 실패: ' + err.message));
  }
  
  function register() {
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const email = document.getElementById('registerEmail').value;
    const verificationCode = document.getElementById('verificationCode').value;

    if (!email || !verificationCode) {
      alert('이메일과 인증 코드를 모두 입력해주세요.');
      return;
    }

    if (!validateEmail(email)) {
      return;
    }

    fetch('http://localhost:3000/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email, verificationCode })
    })
      .then(res => res.json())
      .then(data => {
        if (data.message) {
          alert('회원가입 완료!');
          showLoginForm();
        } else {
          alert(data.error || '회원가입 실패');
        }
      })
      .catch(err => alert('요청 실패: ' + err.message));
  }
  
  function goGuestMode() {
    // ✅ guest.html도 /guest/ 디렉토리에 있으니까 경로 수정
    location.href = '/guest/guest.html';
  }
  