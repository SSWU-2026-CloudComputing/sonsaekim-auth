require('dotenv').config();

const express = require('express');
const app = express();
const path = require('path');
const PORT = process.env.PORT || 3001;
const session = require('express-session');
const { RedisStore } = require('connect-redis');
const redisClient = require('./configs/redis');
const { sequelize } = require('./models');
const authMiddleware = require('./middlewares/authMiddleware');
const { connectRabbitMQ } = require('./src/events/publisher');

app.use(session({
  name: 'connect.sid',
  store: new RedisStore({
    client: redisClient,
    prefix: 'sess:',
    ttl: 86400,
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24,
  },
}));

app.use((req, res, next) => {
  res.locals.user = req.session ? req.session.user : null;
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/auth', express.static(path.join(__dirname, 'public/auth')));
app.use('/', express.static(path.join(__dirname, 'public')));

const authRouter = require('./routes/auth');
const mypageRouter = require('./routes/mypage');

app.use('/auth', authRouter);
app.use('/', mypageRouter);

app.get('/healthz', (req, res) => res.sendStatus(200));

app.get('/', (req, res) => {
  res.redirect('/home');
});

app.get('/home', (req, res) => {
  if (req.session.user) {
    res.render('auth/loginHome', { user: req.session.user });
  } else {
    res.render('auth/home');
  }
});

app.get('/loginHome', authMiddleware, (req, res) => {
  res.render('auth/loginHome', { user: req.session.user });
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).send('로그아웃 실패');
    res.clearCookie('connect.sid');
    res.redirect('/home');
  });
});

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log(' MySQL 연결 성공');

    await sequelize.sync();
    console.log('테이블 생성 완료');

    // RabbitMQ 연결 추가
    try {
        await connectRabbitMQ();
    } catch (err) {
        console.warn('RabbitMQ 연결 실패 — 서버는 계속 실행:', err.message);
    }

    app.listen(PORT, () => {
      console.log(`Auth Service running on port ${PORT}`);
    });
  } catch (err) {
    console.error('서버 실행 실패:', err);
  }
};

startServer();
