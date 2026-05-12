const express = require('express');
const router = express.Router();
const path = require('path');

const verifyJWT = require('../../middleware/verifyJWT');
const {
    register,
    login,
    RefreshToken,
    logoutAll,
    logout,
    forgotPassword,
    resetPassword   
} = require('../../controllers/authController');


router.post('/register', register);
router.post('/login', login);
router.get('/logoutAll', verifyJWT, logoutAll);
router.get('/logout', verifyJWT, logout);
router.post('/refresh', RefreshToken);
router.post('/forgot-password', forgotPassword);
router.get('/reset-password/:token', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/reset.html'));
});
// استقبال كلمة المرور الجديدة
router.post('/reset-password/:token', resetPassword);



module.exports = router;



 






