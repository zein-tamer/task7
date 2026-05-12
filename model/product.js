const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'اسم المنتج مطلوب'], 
        trim: true 
    },
    price: { 
        type: Number, 
        required: [true, 'سعر المنتج مطلوب'], 
        min: [0.01, 'السعر يجب أن يكون رقماً موجباً']
    },
    quantity: { 
        type: Number, 
        required: [true, 'الكمية مطلوبة'], 
        min: [0, 'الكمية لا يمكن أن تكون أقل من صفر'],
        default: 0
    },
    description: { 
        type: String, 
        required: [true, 'وصف المنتج مطلوب'],
        trim: true 
    },
    category: { 
        type: String, 
        required: [true, 'يجب تحديد القسم'],
        index: true 
    },
    image: { 
        type: String, 
        required: [true, 'رابط الصورة مطلوب'] 
    },
    cloudinaryId: { 
        type: String, 
        required: [true, 'معرف الصورة (Cloudinary ID) مطلوب'] 
    },
    // مصفوفة التقييمات يجب أن تكون داخل الكائن الأول للـ Schema
    reviews: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            name: { type: String, required: true },
            rating: { 
                type: Number, 
                required: true,
                min: [1, 'التقييم لا يمكن أن يقل عن نجمة واحدة'],
                max: [5, 'التقييم لا يمكن أن يزيد عن 5 نجوم']
            },
            comment: { type: String, required: true },
            createdAt: { type: Date, default: Date.now }
        }
    ],
    avgRating: { 
        type: Number, 
        default: 0 
    },
    numReviews: { 
        type: Number, 
        default: 0 
    }
}, { timestamps: true }); 

module.exports = mongoose.model('Product', productSchema);