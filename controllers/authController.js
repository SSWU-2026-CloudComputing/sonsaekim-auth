const authService = require('../services/authService');

exports.showVerifyPage = (req, res) => {
  const { email } = req.query;
  res.render('auth/verify', { email });
};

exports.showRegisterPage = (req, res) => {
  res.render('auth/register', {
    name: '', email: '', emailError: '', passwordMatchError: '', passwordMatched: false,
  });
};

exports.registerTemp = async (req, res) => {
  const { name, email, password, password2 } = req.body;

  if (password !== password2) {
    return res.render('auth/register', {
      name, email, emailError: '', passwordMatchError: '비밀번호가 일치하지 않습니다.', passwordMatched: false,
    });
  }

  try {
    await authService.registerTemp({ name, email, password });
    res.redirect(`/auth/verify?email=${encodeURIComponent(email)}`);
  } catch (err) {
    const emailError = err.message === 'EMAIL_EXISTS' ? '이미 존재하는 이메일입니다.' : '오류가 발생했습니다. 다시 시도해주세요.';
    res.render('auth/register', { name, email, emailError, passwordMatchError: '', passwordMatched: false });
  }
};

exports.checkEmail = async (req, res) => {
  try {
    const exists = await authService.checkEmail(req.query.email);
    res.json({ exists });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
};

exports.verifyCode = async (req, res) => {
  const { email, code } = req.body;
  try {
    await authService.verifyCode({ email, code });
    res.redirect('/auth/welcome');
  } catch (err) {
    const errorMessage =
      err.message === 'CODE_EXPIRED' ? '인증 시간이 만료되었습니다. 다시 시도해주세요.' : '인증번호가 일치하지 않습니다.';
    res.render('auth/verify', { email, errorMessage });
  }
};

exports.showWelcomePage = (req, res) => res.render('auth/welcome');
exports.showLoginPage = (req, res) => res.render('auth/login', { email: '', error: null });

exports.loginProcess = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await authService.login({ email, password });
    req.session.user = user;
    req.session.save((err) => {
      if (err) return res.status(500).send('세션 저장 실패');
      res.redirect('/loginHome');
    });
  } catch (err) {
    const error =
      err.message === 'USER_NOT_FOUND' ? '유저 정보가 존재하지 않습니다.' : '비밀번호가 올바르지 않습니다.';
    res.render('auth/login', { email, error });
  }
};

exports.showfinPwPage = (req, res) => res.render('auth/findPw', { email: '', error: '' });
exports.showfinPwVerifyPage = (req, res) => res.render('auth/findPwVerify', { email: req.query.email });
exports.showchangePwPage = (req, res) => res.render('auth/changePw', { email: req.query.email });

exports.findPwProcess = async (req, res) => {
  const { email } = req.body;
  try {
    await authService.findPw(email);
    res.redirect(`/auth/findpwverify?email=${encodeURIComponent(email)}`);
  } catch (err) {
    res.render('auth/findPw', { email, error: '존재하지 않는 이메일입니다.' });
  }
};

exports.verifyFindPwCode = async (req, res) => {
  const { email, code } = req.body;
  try {
    await authService.verifyFindPwCode({ email, code });
    res.redirect(`/auth/changepw?email=${encodeURIComponent(email)}`);
  } catch (err) {
    const errorMessage =
      err.message === 'CODE_EXPIRED' ? '인증 시간이 만료되었습니다. 다시 시도해주세요.' : '인증번호가 일치하지 않습니다.';
    res.render('auth/findPwVerify', { email, errorMessage });
  }
};

exports.changePassword = async (req, res) => {
  const { newPassword, confirmPassword, email } = req.body;
  if (newPassword !== confirmPassword) {
    return res.render('auth/changePw', { email, errorMessage: '비밀번호가 일치하지 않습니다.' });
  }
  try {
    await authService.changePassword({ email, newPassword });
    res.redirect('/auth/login');
  } catch (err) {
    res.status(500).send('비밀번호 변경 중 오류 발생');
  }
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).send('로그아웃 실패');
    res.clearCookie('connect.sid');
    res.redirect('/home');
  });
};
