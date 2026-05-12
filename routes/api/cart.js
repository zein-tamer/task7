const express = require('express');
const router = express.Router();
const cartController = require('../../controllers/cartController'); 
// const verifyJWT = require('../middleware/verifyJWT'); 

// // جميع المسارات التالية تتطلب تسجيل دخول (Protect)
// router.use(verifyJWT);

// 1. جلب محتويات العربة (GET /cart) 
router.get('/', cartController.getCart);

// 2. إضافة منتج للعربة (POST /cart)
router.post('/', cartController.addToCart);

// 3. تحديث كمية منتج (PATCH /cart/update) 
router.patch('/update', cartController.updateQuantity);

// 4. حذف منتج من العربة (DELETE /cart/:productId) 
router.delete('/:productId', cartController.removeFromCart);

// 5. إتمام عملية الدفع وتحديث المخزن (POST /cart/checkout) 
router.post('/checkout', cartController.checkout);

module.exports = router; 
