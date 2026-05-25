const express = require('express');
const router = express.Router();
const mypageController = require('../controllers/mypageController');
const { User } = require('../models');


router.get('/mypage', mypageController.renderMypage);
router.get('/gomypage', mypageController.goMypage);
router.get('/nouser', mypageController.renderNoUser);
router.get('/logout', mypageController.logout);

router.post('/updateProfile', mypageController.updateProfile);
router.post('/sendEmailCode', mypageController.sendEmailCode);
router.post('/verifyEmailCode', mypageController.verifyEmailCode);
router.post('/updateEmail', mypageController.updateEmail)
router.get('/bookmarkDetail/vc/:id', mypageController.renderVcDetail);
router.get('/bookmarkDetail/word/:id', mypageController.renderWordDetail);

// GET /api/users/:userId — Progress Service가 호출
router.get('/api/users/:userId', async (req, res) => {
    try {
        const user = await User.findOne({
            where: { user_id: req.params.userId },
            attributes: ['user_id', 'name', 'email', 'favorite_study'],
        });
        if (!user) return res.status(404).json({ message: '유저 없음' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: '서버 오류' });
    }
});

module.exports = router;
