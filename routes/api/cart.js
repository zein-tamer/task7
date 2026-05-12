const express = require('express');
const router = express.Router();
const cartController = require('../../controllers/cartController'); // تأكد من المسار الصحيح للكنترولر
// const verifyJWT = require('../middleware/verifyJWT'); // ميدل وير التحقق من تسجيل الدخول

// // جميع المسارات التالية تتطلب تسجيل دخول (Protect)
// router.use(verifyJWT);

// 1. جلب محتويات العربة (GET /cart) - الصورة الأولى
router.get('/', cartController.getCart);

// 2. إضافة منتج للعربة (POST /cart) - الصورة الأولى
router.post('/', cartController.addToCart);

// 3. تحديث كمية منتج (PATCH /cart/update) - الصورة الثانية
router.patch('/update', cartController.updateQuantity);

// 4. حذف منتج من العربة (DELETE /cart/:productId) - الصورة الثانية
router.delete('/:productId', cartController.removeFromCart);

// 5. إتمام عملية الدفع وتحديث المخزن (POST /cart/checkout) - الصورة الثانية والثالثة
router.post('/checkout', cartController.checkout);

module.exports = router; 
