const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const { sequelize } = require('./models');

sequelize.authenticate()
  .then(() => {
    console.log('✅ MySQL 연결 성공');
  
    return sequelize.sync();
  })
  .then(() => {
    console.log('✅ 테이블 생성 완료');
  })
  .catch((err) => {
    console.error('❌ MySQL 연결 실패:', err);
  });

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ Auth Service running on port ${PORT}`);
});

//로그인 유지
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
	  httpOnly:true,
	  secure:false,
	  sameSite: 'lax',
  }
}));

//locals
app.use((req, res, next) => {
  res.locals.user = req.session ? req.session.user : null;
  next();
});

//미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// view 설정 (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

//라우터 불러오기
const authRouter = require('./routes/auth');
//라우터 연결
app.use('/auth', authRouter);

// 정적 파일
//app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/home', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }

  res.send(`로그인 성공! ${req.session.user.name}`);
});
