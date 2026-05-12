const Sequelize = require('sequelize');
const config = require('../configs/config').development; 

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  config
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// 모델 불러오기
db.User = require('./User')(sequelize, Sequelize);

// 관계 설정
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;
