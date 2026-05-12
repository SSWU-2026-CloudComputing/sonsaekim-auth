require('dotenv').config();

const express = require('express');
const app = express();
const path = require('path');
const PORT = 3001;
const session = require('express-session');
const { RedisStore } = require('connect-redis');
const redisClient = require('./configs/redis');
const { sequelize } = require('./models');
const authMiddleware = require('./middlewares/authMiddleware');

const startServer = async () => {
  try {
    await redisClient.connect();

    await sequelize.authenticate();
    console.log('✅ MySQL 연결 성공');

    await sequelize.sync();
    console.log('✅ 테이블 생성 완료');

    app.listen(PORT, () => {
      console.log(`✅ Auth Service running on port ${PORT}`);
    });

  } catch (err) {
    console.error('❌ 서버 실행 실패:', err);
  }
};

startServer();

//로그인 유지
app.use(session({
  store: new RedisStore({
    client: redisClient,
    prefix: "sess:",
    ttl: 86400,
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
	  httpOnly:true,
	  secure:false,
	  sameSite: 'lax',
	  maxAge: 1000 * 60 * 60 * 24,
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

app.get('/home', authMiddleware, (req, res) => {
  res.send(`로그인 성공! ${req.session.user.name}`);
});
