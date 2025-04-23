const nodemailer = require('nodemailer');

// 이메일 인증 코드 저장소
const verificationCodes = new Map();

// 구글 SMTP 설정
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// 인증 코드 생성
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 이메일 발송
async function sendVerificationEmail(email, code) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '급식 리뷰 서비스 이메일 인증',
    html: `
      <h1>이메일 인증</h1>
      <p>아래의 인증 코드를 입력해주세요:</p>
      <h2>${code}</h2>
      <p>이 인증 코드는 10분 동안 유효합니다.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    // 인증 코드 저장 (10분 유효)
    verificationCodes.set(email, {
      code,
      expires: Date.now() + 10 * 60 * 1000
    });
    return true;
  } catch (error) {
    console.error('이메일 발송 실패:', error);
    return false;
  }
}

// 인증 코드 확인
function verifyCode(email, code) {
  const verification = verificationCodes.get(email);
  if (!verification) return false;
  
  if (Date.now() > verification.expires) {
    verificationCodes.delete(email);
    return false;
  }

  if (verification.code === code) {
    verificationCodes.delete(email);
    return true;
  }

  return false;
}

module.exports = {
  sendVerificationEmail,
  verifyCode
}; 