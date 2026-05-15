const Cart = require('../model/cart');
const Product = require('../model/product');
const Order = require('../model/Order');


const getCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const cart = await Cart.findOne({ userId });
        if (!cart) return res.status(200).json({ items: [], finalTotalPrice: 0 });
        res.status(200).json(cart);
    } catch (error) {
        res.status(500).json({ message: "خطأ في جلب العربة", error: error.message });
    }
};


const addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.user.id; 

        // 1. التحقق من وجود المنتج وسعره وبياناته
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "المنتج غير موجود" });
        }


      // 1. : التأكد أن المنتج متوفر أصلاً في المخزن
          if (product.quantity <= 0) {
            return res.status(400).json({ message: "عذراً، هذا المنتج نفد من المخزن" });
          }

          // 2. : التأكد أن الكمية المطلوبة لا تتجاوز المتاح
          if (quantity > product.quantity) {
            return res.status(400).json({ 
              message: `الكمية المطلوبة غير متوفرة. المتاح حالياً: ${product.quantity} فقط` 
            });
          }


        let cart = await Cart.findOne({ userId });

        if (cart) {
            // 2. البحث عن المنتج في العربة الحالية
            const itemIndex = cart.items.findIndex(p => p.productId.toString() === productId);

            if (itemIndex > -1) {
                 const totalNewQuantity = cart.items[itemIndex].quantity + quantity;
              if (totalNewQuantity > product.quantity) {
                return res.status(400).json({ 
                  message: `لا يمكنك إضافة المزيد. إجمالي ما في العربة والمطلوب يتجاوز المخزن (${product.quantity})` 
           });
        }
                // إذا وجد المنتج: تحديث الكمية وإعادة حساب السعر للعنصر
                cart.items[itemIndex].quantity += quantity;
                // cart.items[itemIndex].itemTotalPrice = cart.items[itemIndex].quantity * product.price;
            } else {
                // إذا لم يوجد: إضافة العنصر مع كافة تفاصيله 
                cart.items.push({
                    productId,
                    name: product.name,
                    image: product.image,
                    category: product.category,
                    unitPrice: product.price,
                    quantity,
                    // itemTotalPrice: quantity * product.price
                });
            }
        } else {
            // 3. إنشاء عربة جديدة تماماً للمستخدم
            cart = new Cart({
                userId,
                items: [{
                    productId,
                    name: product.name,
                    image: product.image,
                    category: product.category,
                    unitPrice: product.price,
                    quantity,
                    // itemTotalPrice: quantity * product.price
                }]
            });
        }

        // 4. حساب الإجمالي النهائي (Final Total Price) لكل العربة
        // cart.finalTotalPrice = cart.items.reduce((total, item) => total + item.itemTotalPrice, 0);

        await cart.save();

         
        res.status(200).json({
            success: true,
            cart: cart
        });

    } catch (error) {
        res.status(500).json({ message: "حدث خطأ أثناء الإضافة للعربة", error: error.message });
    }
};


const checkout = async (req, res) => {
    try {
        // جرب هذا السطر بدلاً من السطر القديم
        const userId = req.user.id || req.user._id || req.user.userId;

        // 1. جلب العربة والتأكد أنها ليست فارغة
        const cart = await Cart.findOne({ userId });
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "العربة فارغة، أضف منتجات أولاً" });
        }

        // 2. التحقق من المخزون لجميع المنتجات قبل البدء بأي خصم
        
        for (const item of cart.items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                throw new Error(`المنتج ${item.name} لم يعد متوفراً`);
            }
            if (Number(product.quantity) < Number(item.quantity)) {
                throw new Error(`المخزون غير كافٍ لـ ${product.name}. المتاح: ${product.quantity}`);
            }
        }

        // 3. الخصم الفعلي من المخزن
        for (const item of cart.items) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { quantity: -Number(item.quantity) } // خصم الكمية باستخدام $inc (أكثر أماناً)
            });
        }

        // 4. إنشاء الطلب الرسمي (Order) في قاعدة البيانات
        const newOrder = await Order.create({
            userId: userId,
            items: cart.items.map(item => ({
                productId: item.productId,
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                image: item.image
            })),
            totalPrice: cart.finalTotalPrice,
            status: 'pending' // حالة الطلب الافتراضية
        });

        // بعد خصم جميع المنتجات بنجاح، يتم مسح العربة
        await Cart.deleteOne({ userId });

        res.status(200).json({ 
            success: true, 
            message: "تمت عملية الشراء بنجاح وتحديث المخزون" 
        });

    } catch (error) {
        // إرجاع رسالة الخطأ في حال فشل أي شرط (مثل نقص المخزون)
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
};


// const checkout = async (req, res) => {
//     const session = await mongoose.startSession();
//     session.startTransaction(); // لبدء المعاملة (Transaction)

//     try {
//         const userId = req.user.id;
//         const cart = await Cart.findOne({ userId }).session(session);

//         if (!cart || cart.items.length === 0) {
//             throw new Error("العربة فارغة");
//         }

//         // التحقق من المخزون وخصمه لكل منتج
//         for (const item of cart.items) {
//             const product = await Product.findById(item.productId).session(session);
            
//             if (!product || product.quantity < item.quantity) {
//                 throw new Error(`المخزون غير كافٍ للمنتج: ${product?.name || 'غير معروف'}`);
//             }

//             
//             product.quantity -= item.quantity;
//             await product.save({ session });
//         }

//         // إنشاء الطلب (Order) وتفريغ العربة
//       
//         await Cart.deleteOne({ userId }).session(session);

//         await session.commitTransaction(); // تثبيت التغييرات
//         res.status(200).json({ success: true, message: "تمت عملية الشراء وخصم المخزن بنجاح" });

//     } catch (error) {
//         await session.abortTransaction(); // إلغاء كل شيء في حال الفشل
//         res.status(400).json({ success: false, message: error.message });
//     } finally {
//         session.endSession();
//     }
// };


const removeFromCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;

        let cart = await Cart.findOne({ userId });
        if (!cart) return res.status(404).json({ message: "العربة غير موجودة" });

        // تصفية المصفوفة لإزالة المنتج
        cart.items = cart.items.filter(item => item.productId.toString() !== productId);

        // إعادة حساب الإجمالي
        // cart.finalTotalPrice = cart.items.reduce((total, item) => total + item.itemTotalPrice, 0);

        await cart.save();
        res.status(200).json({ message: "تم حذف المنتج بنجاح", cart });
    } catch (error) {
        res.status(500).json({ message: "خطأ في الحذف", error: error.message });
    }
};


const updateQuantity = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.user.id;

        if (quantity < 1) return res.status(400).json({ message: "الكمية يجب أن تكون 1 على الأقل" });

        const cart = await Cart.findOne({ userId });
        if (!cart) return res.status(404).json({ message: "العربة غير موجودة" });

        const itemIndex = cart.items.findIndex(p => p.productId.toString() === productId);
        if (itemIndex === -1) return res.status(404).json({ message: "المنتج غير موجود بالعربة" });

        // // تحديث الكمية والحسابات
         cart.items[itemIndex].quantity = quantity;
        // cart.items[itemIndex].itemTotalPrice = quantity * cart.items[itemIndex].unitPrice;

        // تحديث إجمالي العربة
        // cart.finalTotalPrice = cart.items.reduce((total, item) => total + item.itemTotalPrice, 0);

        await cart.save();
        res.status(200).json(cart);
    } catch (error) {
        res.status(500).json({ message: "خطأ في التحديث", error: error.message });
    }
};


module.exports = {
    getCart,
    addToCart,
    checkout, 
    removeFromCart,
    updateQuantity,
 
};