const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items:
    [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
             // الحقول أدناه ضرورية ليتم حفظها من الكنترولر
            name: String,
            image: String,
            category: String,
            unitPrice: Number,
            quantity: { 
                type: Number, 
                required: true, 
                min: [1, 'يجب إضافة قطعة واحدة على الأقل'],
                default: 1 // هذا السطر سيحل مشكلة الـ NaN
            },
             itemTotalPrice: {
                type: Number,
                
                 min: [0, 'إجمالي العنصر لا يمكن أن يكون سالباً'] // حماية من أي خطأ حسابي
            }
        }
    ],
    finalTotalPrice: {
        type: Number,
        
        default: 0,
        min: [0, 'إجمالي العربة لا يمكن أن يكون سالباً'] 
    }
}, { timestamps: true });


// --- إضافة الحساب التلقائي هنا ---
cartSchema.pre('save', function (next) {
    // 1. حساب إجمالي كل عنصر (السعر * الكمية)
    this.items.forEach(item => {
        item.itemTotalPrice = item.unitPrice * item.quantity;
    });

    // 2. حساب الإجمالي النهائي للعربة بالكامل
    this.finalTotalPrice = this.items.reduce((total, item) => {
        return total + item.itemTotalPrice;
    }, 0);

   
});

module.exports = mongoose.model('Cart', cartSchema);
