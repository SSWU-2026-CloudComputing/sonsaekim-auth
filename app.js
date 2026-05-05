const express = require('express');
const app = express();
const path = require('path');

// router 불러오기
const authRouter = require('./routes/auth');

// 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.locals.user = req.session ? req.session.user : null;
  next();
});

// view 설정 (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 정적 파일
//app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
// 라우터 연결
app.use('/auth', authRouter);

// 서버 실행
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ Auth Service running on port ${PORT}`);
});
