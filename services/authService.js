const redisClient = require('../configs/redis');
const { generateRandomNumber, sendEmail } = require('../lib/email.helper');
const { User } = require('../models');
const bcrypt = require('bcrypt');
const axios = require('axios');

exports.registerTemp = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) throw new Error('EMAIL_EXISTS');

  const authCode = generateRandomNumber();
  const hashedPassword = await bcrypt.hash(password, 10);

  await redisClient.setEx(`${email}:authCode`, 300, authCode);
  await redisClient.setEx(`${email}:tempUser`, 300, JSON.stringify({ name, password: hashedPassword }));
  await sendEmail(email, authCode);
};

exports.checkEmail = async (email) => {
  const user = await User.findOne({ where: { email } });
  return !!user;
};

exports.verifyCode = async ({ email, code }) => {
  const savedCode = await redisClient.get(`${email}:authCode`);
  const tempUserStr = await redisClient.get(`${email}:tempUser`);
  const tempUser = tempUserStr ? JSON.parse(tempUserStr) : null;

  if (!savedCode || !tempUser) throw new Error('CODE_EXPIRED');
  if (code !== savedCode) throw new Error('CODE_MISMATCH');

  const { name, password } = tempUser;
  const user = await User.create({ email, name, password });

  try {
      await axios.post(`${process.env.PROGRESS_SERVICE_URL}/progress/user-init`, { userId: user.user_id });
  } catch (err) {
      console.error('Progress 초기화 요청 실패:', err.message);
  }

  await redisClient.del(`${email}:authCode`);
  await redisClient.del(`${email}:tempUser`);
};

exports.login = async ({ email, password }) => {
  const user = await User.findOne({ where: { email } });
  if (!user) throw new Error('USER_NOT_FOUND');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error('WRONG_PASSWORD');

  return { user_id: user.user_id, name: user.name, email: user.email };
};

exports.findPw = async (email) => {
  const user = await User.findOne({ where: { email } });
  if (!user) throw new Error('USER_NOT_FOUND');

  const authCode = generateRandomNumber();
  await redisClient.setEx(`${email}:resetCode`, 300, authCode);
  await sendEmail(email, authCode);
};

exports.verifyFindPwCode = async ({ email, code }) => {
  const savedCode = await redisClient.get(`${email}:resetCode`);
  if (!savedCode) throw new Error('CODE_EXPIRED');
  if (code !== savedCode) throw new Error('CODE_MISMATCH');
  await redisClient.del(`${email}:resetCode`);
};

exports.changePassword = async ({ email, newPassword }) => {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await User.update({ password: hashedPassword }, { where: { email } });
};
