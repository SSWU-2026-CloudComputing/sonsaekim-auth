require('dotenv').config();

const redis = require('redis');

const redisClient = redis.createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});

redisClient.on('connect', () => {
  console.log('✅ Redis 연결 성공');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis 에러:', err);
});

//redisClient.connect().catch(console.error);

module.exports = redisClient;
