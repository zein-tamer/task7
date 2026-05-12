
const Product = require('../model/product');
const cloudinary = require('../config/cloudinary'); 
const fs = require('fs');
const fsPromises = require('fs').promises;



// Helper حذف ملف بأمان
const safeDelete = (filePath) => {
    if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};


const createProduct = async (req, res, next) => {
     console.log("البيانات القادمة:", req.body)
        try {
            const { name, price, quantity, description, category } = req.body;

            if (!req.file) {
                return res.status(400).json({ message: 'Image required' });
            }

            if (!name || !price || !quantity || !description || !category) {
                safeDelete(req.file.path);
                return res.status(400).json({ message: 'All fields required' });
            }

            const result = await cloudinary.uploader.upload(req.file.path);
            safeDelete(req.file.path);

            const product = await Product.create({
                name,
                price,
                quantity,
                description,
                category,
                image: result.secure_url,
                cloudinaryId: result.public_id
            });

            res.status(201).json(product);
        } catch (err) {
             if (req.file) safeDelete(req.file.path); 
            next(err);
        }
    }

// بدلاً من أن تقوم دالة getAllProducts
// بجلب 1000 منتج دفعة واحدة 
//  (مما يجعل التطبيق بطيئاً جداً)
//  يقوم التقسيم بجلب كمية محددة فقط (مثلاً 10 منتجات في كل صفحة).


const getAllProducts = async (req, res, next) => {
    try {
        // 1. التصفية (Filtering)
        const queryObj = { ...req.query };
        const excludeFields = ['page', 'sort', 'limit']; // استبعاد كلمات التقسيم من البحث
        excludeFields.forEach(el => delete queryObj[el]);

        // 2. التقسيم (Pagination)
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // تنفيذ الاستعلام
        const products = await Product.find(queryObj)
            .skip(skip)
            .limit(limit)
            .sort('-createdAt'); // ترتيب الأحدث أولاً

        // إرجاع النتائج مع معلومات الصفحة
        res.json({
            results: products.length,
            page,
            products
        });
    } catch (err) {
        next(err);
    }
}



// const getAllProducts = async (req, res, next) => {
//     try {
//         const products = await Product.find();
//         res.json(products);
//     } catch (err) {
//         next(err);
//     }
// }


//============================//

// إذا أرسلت ?search=birth سيعيد لك "birthday".
// إذا أرسلت ?category=party&search=cake سيعيد لك الكيك الموجود في قسم الحفلات فقط.

// const getAllProducts = async (req, res, next) => {
//     try {
//         const queryObj = { ...req.query };
//         const excludeFields = ['page', 'sort', 'limit', 'search']; // أضفنا search هنا
//         excludeFields.forEach(el => delete queryObj[el]);

//         // إضافة منطق البحث بالاسم (إذا تم إرسال كلمة في الرابط)
//         if (req.query.search) {
//             queryObj.name = { $regex: req.query.search, $options: 'i' }; // بحث مرن غير حساس لحالة الأحرف
//         }

//         const page = Number(req.query.page) || 1;
//         const limit = Number(req.query.limit) || 10;
//         const skip = (page - 1) * limit;

//         const products = await Product.find(queryObj)
//             .skip(skip)
//             .limit(limit)
//             .sort('-createdAt');

//         res.json({
//             results: products.length,
//             page,
//             products
//         });
//     } catch (err) {
//         next(err);
//     }
// }

//============================//






const getProductById = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Not found' });

        // إضافة حالة التوفر
        const isAvailable = product.quantity > 0;

        res.json({
            ...product._doc, // بيانات المنتج الأصلية
            isAvailable      // حقل جديد: true إذا كان متوفراً، false إذا نفد
        });
    } catch (err) {
        next(err);
    }
}


const deleteProduct =async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product)
            return res.status(404).json({ message: 'Not found' });

        await cloudinary.uploader.destroy(product.cloudinaryId);
        await product.deleteOne();

        res.json({ message: 'Deleted successfully' });
    } catch (err) {
         
        next(err);
    }
}


const updateProduct = async (req, res, next) => {
    try {
        let product = await Product.findById(req.params.id);
        
        if (!product) {
            // إذا لم نجد المنتج وكان هناك ملف مرفوع، نحذفه فوراً
            if (req.file) await fsPromises.unlink(req.file.path).catch(() => {});
            return res.status(404).json({ message: 'Not found' });
        }

        // إذا تم رفع صورة جديدة (تم فحصها مسبقاً بواسطة validateImage)
        if (req.file) {
            // 1. حذف الصورة القديمة من Cloudinary
            if (product.cloudinaryId) {
                await cloudinary.uploader.destroy(product.cloudinaryId);
            }

            // 2. رفع الصورة الجديدة
            const result = await cloudinary.uploader.upload(req.file.path);

            // 3. حذف الملف المؤقت من السيرفر بشكل غير متزامن
            await fsPromises.unlink(req.file.path).catch(() => {});

            // 4. تحديث روابط الصورة
            product.image = result.secure_url;
            product.cloudinaryId = result.public_id;
        }

        // تحديث باقي البيانات المبعوثة في الـ body
        Object.assign(product, req.body);
        
        await product.save();
        res.json(product);

    } catch (err) {
        // تنظيف المجلد في حالة حدوث خطأ أثناء المعالجة
        if (req.file) await fsPromises.unlink(req.file.path).catch(() => {});
        next(err);
    }
}



const getProductStock = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);

        if (!product) return res.status(404).json({ message: "المنتج غير موجود" });

        // إضافة منطق الوصف (Description Logic)
       let stockStatus = "";

           if (product.quantity === 0) {
               stockStatus = "نفدت الكمية تماماً.";
           } else if (product.quantity < 20) {
               stockStatus = `المخزون منخفض (بقي ${product.quantity} فقط)، سارع بالطلب!`;
           } else if (product.quantity > 100) {
               stockStatus = "المنتج متوفر بكمية ممتازة في المستودع.";
           } else {
               // هذه الحالة لأي رقم بين 20 و 100
               stockStatus = "المنتج متوفر حالياً.";
           }


        res.status(200).json({
            name: product.name,
            remainingStock: product.quantity, // الكمية الرقمية
            description: stockStatus           // الوصف النصي للحالة
        });
    } catch (error) {
        res.status(500).json({ message: "خطأ في جلب البيانات" });
    }
};



const createProductReview = async (req, res, next) => {
    
    try {

        const { rating, comment } = req.body;

        // فحص أمني لمنع أرقام التقييم غير المنطقية
        if (Number(rating) < 1 || Number(rating) > 5) {
          return res.status(400).json({ message: "التقييم يجب أن يكون بين 1 و 5 نجوم فقط" });
       }

        const product = await Product.findById(req.params.id);

        if (!product) return res.status(404).json({ message: "المنتج غير موجود" });

         // 1. التحقق إذا كان المستخدم قد قيم المنتج سابقاً 
        const alreadyReviewed = product.reviews.find(
            (r) => r.user.toString() === req.user._id.toString()
        );

        // // إذا وجد تقييماً سابقاً، يرسل رد 400 (طلب سيئ) ويوقف العملية.

        if (alreadyReviewed) {
            return res.status(400).json({ message: "لقد قمت بتقييم هذا المنتج مسبقاً" });
        }

        // 2. إنشاء كائن التقييم الجديد
        const review = {
            user: req.user._id, 
            name: req.user.name,  
            rating: Number(rating),
            comment 
        };

        // 3. إضافة التقييم للمصفوفة وتحديث الإحصائيات
        product.reviews.push(review);
        // تحديث "عداد التقييمات": لكي لا نضطر لحسابهم في كل مرة، نخزن الرقم النهائي (مثلاً 50 تقييماً)
        product.numReviews = product.reviews.length;
        
        // حساب متوسط النجوم (Average Rating)
      
        product.avgRating = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;

        // حفظ كل التغييرات (التقييم الجديد + الرقم الإجمالي + المتوسط الجديد) في MongoDB.
        await product.save();
        res.status(201).json({ message: "تم إضافة التقييم بنجاح" });
    } catch (error) {
        next(error);
    }
};



const deleteReview = async (req, res, next) => {
    try {
        // استخراج "آيدي المنتج" و "آيدي التقييم" من رابط الطلب (URL).
        const { id, reviewId } = req.params;

           // البحث عن المنتج الذي يحتوي على هذا التقييم في قاعدة البيانات.
        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ message: "المنتج غير موجود" });

        // 1. البحث عن التقييم المطلوب داخل مصفوفة المنتج
        const review = product.reviews.find((rev) => rev._id.toString() === reviewId);
        
        // إذا لم يجد تقييماً بهذا الرقم داخل هذا المنتج تحديداً، يرسل 404.
        if (!review) {
            return res.status(404).json({ message: "التقييم غير موجود" });
        }

        //  2. فحص الأمان: هل هذا التقييم يخص المستخدم الحالي؟ 
        // أو هل المستخدم الحالي هو "أدمن" ليمتلك صلاحية الحذف؟
        const isOwner = review.user.toString() === req.user.id;
        const isAdmin = req.user.roles && req.user.roles.includes('admin');


        // الفائدة: حماية آراء المستخدمين من الحذف بواسطة مستخدمين آخرين.
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "غير مسموح لك بحذف هذا التقييم" });
        }

        // 3. تصفية المصفوفة لإزالة التعليق
        // هنا يتم حذف التقييم فعلياً عن طريق إنشاء مصفوفة جديدة تحتوي على كل شيء "ما عدا" التقييم الذي أردنا حذفه
        product.reviews = product.reviews.filter((rev) => rev._id.toString() !== reviewId);

        
        product.numReviews = product.reviews.length;
        

        if (product.numReviews > 0) {
            product.avgRating = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.numReviews;
        } else {
            product.avgRating = 0;
        }

        await product.save();
        
        res.status(200).json({ message: "تم حذف التقييم وتحديث الإحصائيات بنجاح" });
    } catch (error) {
        next(error);
    }
};


module.exports = {
    createProduct,
    getAllProducts,
    getProductById,
    deleteProduct,
    updateProduct,
    getProductStock,
    createProductReview,
    deleteReview
};


