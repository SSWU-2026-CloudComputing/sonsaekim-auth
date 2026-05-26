const { User } = require('../models');
const { generateRandomNumber, sendEmail } = require('../lib/email.helper');

const axios = require('axios');
const PROGRESS_URL = process.env.PROGRESS_SERVICE_URL || 'http://progress-service:3002';


exports.renderMypage = async (req, res) => {
    const userId = req.session.user?.user_id;
    if (!userId) return res.redirect('/nouser');
    try {
        const user = await User.findOne({ where: { user_id: userId } });
        if (!user) return res.redirect('/nouser');

        let progressData = {
            level: 1, totalDays: 0, daysToNextLevel: 7,
            continuousDays: 0, attendanceDates: [],
            vcBookmarks: [], wordBookmarks: [],
        };
        try {
            const r = await axios.get(`${PROGRESS_URL}/progress/mypage`, {
                params: { userId }});
            progressData = r.data;
        } catch (e) {
            console.error('Progress 호출 실패, 기본값 사용:', e.message);
        }

        res.render('mypage/mypage', {
            name:            user.name,
            email:           user.email,
            level:           progressData.level,
            totalDays:       progressData.totalDays,
            daysToNextLevel: progressData.daysToNextLevel,
            continuousDays:  progressData.continuousDays,
            attendanceDates: progressData.attendanceDates,
            vcBookmarks:     progressData.vcBookmarks,
            wordBookmarks:   progressData.wordBookmarks,
        });
    } catch (err) {
        res.status(500).send('서버 오류');
    }
};

exports.renderVcDetail = async (req, res) => {
    const userId = req.session.user?.user_id;
    try {
        const r = await axios.get(`${PROGRESS_URL}/progress/mypage`, {
            params: { userId }});
        res.render('mypage/bookmarkDetail', { ...r.data, backUrl: '/mypage' });
    } catch { res.status(500).send('서버 오류'); }
};

exports.renderWordDetail = async (req, res) => {
    const userId = req.session.user?.user_id;
    try {
        const r = await axios.get(`${PROGRESS_URL}/progress/mypage`, {
            params: { userId }});
        res.render('mypage/bookmarkDetail', { ...r.data, backUrl: '/mypage' });
    } catch { res.status(500).send('서버 오류'); }
};

exports.updateProfile = async (req, res) => {
    const userId = req.session.user?.user_id;
    const { name } = req.body;

    try {
        const user = await User.findOne({ where: { user_id: userId } });
        if (!user) return res.status(404).json({ success: false });

        user.name = name;
        await user.save();

        return res.json({ success: true });
    } catch (err) {
        console.error("이름 업데이트 실패:", err);
        return res.status(500).json({ success: false });
    }
};

exports.goMypage = async (req, res) => {
    const userId = req.session.user?.user_id;
    if (!userId) return res.redirect('/nouser');

    try {
        const user = await User.findOne({ where: { user_id: userId } });
        return res.redirect(user ? '/mypage' : '/nouser');
    } catch (err) {
        console.error("gomypage 리다이렉션 오류:", err);
        return res.status(500).send("서버 오류 발생");
    }
};

exports.sendEmailCode = async (req, res) => {
    const { email } = req.body;
    const code = generateRandomNumber(6);

    try {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: '이미 사용 중인 이메일입니다.' });
        }

        await sendEmail(email, code);
        req.session.emailCode = code;
        req.session.verifiedEmail = email;
        req.session.save(() => res.json({ success: true }));
    } catch (err) {
        console.error("이메일 전송 실패:", err);
        return res.status(500).json({ success: false });
    }
};

exports.verifyEmailCode = (req, res) => {
    const { code, email } = req.body;
    if (
        req.session.emailCode &&
        req.session.verifiedEmail === email &&
        req.session.emailCode === code
    ) {
        return res.json({ success: true });
    }
    return res.json({ success: false });
};

exports.updateEmail = async (req, res) => {
    const userId = req.session.user?.user_id;
    const newEmail = req.body.newEmail;

    if (!userId || !newEmail) return res.status(400).send("유저아이디/이메일 누락");

    if (
        req.session.verifiedEmail !== newEmail ||
        !req.session.emailCode
    ) {
        return res.status(403).send("이메일 인증을 완료해주세요.");
    }

    try {
        const user = await User.findOne({ where: { user_id: userId } });
        if (!user) return res.status(404).send("사용자를 찾을 수 없습니다.");

        user.email = newEmail;
        await user.save();

        req.session.user.email = newEmail;
        delete req.session.emailCode;
        delete req.session.verifiedEmail;

        req.session.save(() => res.redirect('/mypage'));
    } catch (err) {
        console.error("이메일 변경 실패:", err);
        return res.status(500).send("서버 오류 발생");
    }
};

exports.logout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("세션 삭제 실패:", err);
            return res.status(500).send("서버 오류로 로그아웃에 실패했습니다.");
        }
        res.clearCookie('session-cookie');
        res.redirect('/');
    });
};
