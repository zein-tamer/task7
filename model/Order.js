const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        index: true 
    },
    items: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            name: { type: String, required: true },
            quantity: { type: Number, required: true, min: 1 },
            // تغييرنا الاسم هنا من price إلى unitPrice ليتطابق مع الدالة
            unitPrice: { type: Number, required: true }, 
            image: String
        }
    ],
    // إضافة totalPrice ليتوافق مع سطر totalPrice في الدالة
    totalPrice: { 
        type: Number, 
        required: true 
    },
    status: { 
        type: String, 
        default: 'pending' 
    }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);