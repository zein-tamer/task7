const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        index: true 
    },
    // 📍 ربط الطلب بعنوان المستخدم الذي اختاره
    addressId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Address', 
        required: true 
    },
     // 📍 الحقل الجديد (لقطة ثابتة للعنوان وقت الشراء)
    shippingAddressSnapshot: {
        city: String,
        phone: String,
        details: String,
        alias: String
    },
    items: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            name: { type: String, required: true },
            quantity: { type: Number, required: true, min: 1 },
            price: { type: Number, required: true }, // السعر الفردي وقت الشراء
            image: String
        }
    ],
    // 💰 المجموع النهائي بعد تطبيق الخصم
    totalAmount: { 
        type: Number, 
        required: true 
    },
    // 🎫 بيانات الخصم والكوبونات
    couponCode: { 
        type: String, 
        uppercase: true, 
        trim: true, 
        default: null 
    },
    discountApplied: { 
        type: Number, 
        default: 0 
    }, // القيمة المالية المخصومة (مثلاً 50 ريال)
    
    status: { 
        type: String, 
        lowercase: true, 
        trim: true, 
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], 
        default: 'pending' 
    },
    paymentStatus: { 
        type: String, 
        lowercase: true, 
        trim: true, 
        enum: ['unpaid', 'paid', 'failed', 'refunded'], 
        default: 'unpaid' 
    }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
