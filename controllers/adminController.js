
const Product = require('../model/product');
const User = require('../model/User');
const Order = require('../model/Order');
const Message = require('../model/message');
const ExcelJS = require('exceljs');





const getDashboardStats = async (req, res, next) => {
  try {
    // تشغيل جميع الاستعلامات في نفس الوقت لتقليل وقت الاستجابة بنسبة تصل لـ 80%
    const [
      totalSalesResult,
      ordersCount,
      productsCount,
      usersCount,
      latestOrders
    ] = await Promise.all([
      // 1. إجمالي المبيعات
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, totalAmount: { $sum: "$totalAmount" } } }
      ]),
      // 2. عدد الطلبات
      Order.countDocuments(),
      // 3. عدد المنتجات
      Product.countDocuments(),
      // 4. عدد المستخدمين (الزبائن فقط)
      User.countDocuments({ roles: { $ne: 'admin' } }),
      // 5. آخر 5 طلبات مع بيانات العميل
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('userId totalAmount status createdAt')
        // جلب اسم العميل وإيميله لعرضهم في جدول لوحة التحكم
        .populate('userId', 'name email') 
        .lean()
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalSales: totalSalesResult.length > 0 ? totalSalesResult[0].totalAmount : 0,
        ordersCount,
        productsCount,
        usersCount
      },
      latestOrders
    });
  } catch (error) {
    next(error);
  }
};

// البحث عن طلب محدد بواسطة ID (للأدمن)
const getOrderDetailsForAdmin = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId).populate('userId', 'name email');
    if (!order) {
      return res.status(404).json({ message: "عذراً، لم يتم العثور على طلب بهذا الرقم" });
    }
    
    res.status(200).json({ success: true, order });
  } catch (error) {
    next(error);
  } 
};



const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    let { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: "يرجى تحديد حالة الطلب الجديدة" });
    }

    status = status.toLowerCase().trim();

    const order = await Order.findByIdAndUpdate(
      orderId,
      { status: status },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: "الطلب غير موجود" });
    }

    res.status(200).json({
      success: true,
      message: `تم تحديث حالة الطلب بنجاح إلى ${status}`,
      order
    });
  } catch (error) {
    next(error);
  }
};


const getAllConversations = async (req, res, next) => {
  try {
    const adminId = new mongoose.Types.ObjectId(req.user.id);

    const conversations = await Message.aggregate([
      { $match: { $or: [{ sender: adminId }, { receiver: adminId }] } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: { $cond: [{ $eq: ["$sender", adminId] }, "$receiver", "$sender"] },
          lastMessage: { $first: "$content" },
          lastSenderId: { $first: "$sender" },
          lastReceiverId: { $first: "$receiver" },
          //    جلب حالة آخر رسالة في المحادثة
          lastMessageStatus: { $first: "$status" }, 
          unreadCount: {
            $sum: {
              $cond: [{ $and: [{ $eq: ["$status", "unread"] }, { $eq: ["$receiver", adminId] }] }, 1, 0]
            }
          },
          lastActivity: { $first: "$timestamp" }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'lastSenderId',
          foreignField: '_id',
          as: 'senderInfo'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'lastReceiverId',
          foreignField: '_id',
          as: 'receiverInfo'
        }
      },
      { $unwind: '$senderInfo' },
      { $unwind: '$receiverInfo' },
      { $sort: { lastActivity: -1 } }
    ]);

    const formatted = conversations.map(conv => ({
      conversationWith: conv._id,
      
      // إظهار الحالة في الرد النهائي
      
      senderName: conv.senderInfo.name, 
      receiverName: conv.receiverInfo.name,
      content: conv.lastMessage,
      status: conv.lastMessageStatus, 
       lastMessageBy: conv.lastSenderId.toString() === adminId.toString() ? 'Me (Admin)' : conv.senderInfo.name,
      unreadCount: conv.unreadCount,
      lastActivity: conv.lastActivity
    }));

    res.status(200).json({ success: true, conversations: formatted });
  } catch (error) { next(error); }
};



// 2. جلب محادثة مع مستخدم معين
const getAdminUserConversation = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;

    // 1. تحديث الرسائل المرسلة من المستخدم لتصبح "مقروءة" بمجرد فتح الأدمن للمحادثة
    await Message.updateMany(
      { sender: userId, receiver: adminId, status: 'unread' },
      { $set: { status: 'read' } }
    );

    // 2. جلب الرسائل مع "ترتيب" البيانات (Populate) لجلب الأسماء
    const messages = await Message.find({
      $or: [
        { sender: adminId, receiver: userId },
        { sender: userId, receiver: adminId }
      ]
    })
    .populate('sender', 'name')   // جلب اسم المرسل
    .populate('receiver', 'name') // جلب اسم المستقبل
    .sort({ timestamp: 1 });      // ترتيب من الأقدم للأحدث ليقرأها كحوار

    // 3. تنسيق الرسائل (Formatted Response) لتحديد صاحب كل رسالة
    const formattedMessages = messages.map(msg => ({
      _id: msg._id,
      senderName: msg.sender.name,
      receiverName: msg.receiver.name,
      content: msg.content,
      status: msg.status,
      timestamp: msg.timestamp,
      //   هل هذه الرسالة أرسلها الأدمن أم المستخدم؟
      sentBy: msg.sender._id.toString() === adminId.toString() ? 'Me (Admin)' : msg.sender.name
    }));

  // 2.   : استخراج هوية صاحب آخر رسالة في هذه المحادثة
    // نذهب لآخر عنصر في مصفوفة الرسائل المنسقة ونأخذ منه حقل sentBy
    const lastMessageFrom = formattedMessages.length > 0 
      ? formattedMessages[formattedMessages.length - 1].sentBy 
      : null;

    res.status(200).json({ 
      success: true, 
         lastMessageBy: lastMessageFrom,
      messages: formattedMessages 
    });
  } catch (error) { 
    next(error); 
  }
};



const adminSendMessage = async (req, res, next) => {
    try {
        const { receiverId, content } = req.body;

        // 1. فحص المحتوى والمستلم
        if (!content || !receiverId) {
            return res.status(400).json({ message: "المحتوى والمستلم مطلوبان" });
        }



// 1. جلب بيانات المستلم للتأكد من وجود التوكن
        const receiver = await User.findById(receiverId).select('fcmToken name isDeleted');

        if (!receiver || receiver.isDeleted) {
            return res.status(404).json({ message: "المستخدم غير موجود أو تم حذف حسابه" });
        }

        // 2. إنشاء الرسالة في قاعدة البيانات
        const message = await Message.create({
            sender: req.user.id,
            receiver: receiverId,
            content,
            timestamp: new Date()
        });



  // 3. إرسال إشعار فوري لهاتف المستخدم
        if (receiver.fcmToken) {
            await sendPushNotification(
                receiver.fcmToken,
                "رد من الإدارة الأدمن", // عنوان الإشعار
                content, // نص الرسالة المرسلة
                { type: "ADMIN_REPLY", messageId: message._id.toString() } // بيانات لفتح المحادثة
            );
        }


        // 3.   جلب اسم المستلم فوراً بعد الإرسال
        const newMessage = await Message.findById(message._id)
            .populate('receiver', 'name email'); // ربط سريع لجلب بيانات المستلم

        res.status(201).json({ success: true, newMessage });
    } catch (error) { 
        next(error); 
    }
};


// حذف محادثة كاملة مع مستخدم محدد (للأدمن)
const deleteConversation = async (req, res, next) => {
  try {
    const { userId } = req.params; // معرف المستخدم المراد حذف المحادثة معه
    const adminId = req.user.id;

    // حذف جميع الرسائل التي يكون فيها الأدمن والمستخدم طرفين
    const result = await Message.deleteMany({
      $or: [
        { sender: adminId, receiver: userId },
        { sender: userId, receiver: adminId }
      ]
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "لا توجد رسائل لحذفها في هذه المحادثة" 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: `تم حذف المحادثة بنجاح. إجمالي الرسائل المحذوفة: ${result.deletedCount}` 
    });
  } catch (error) {
    next(error);
  }
};



const adminSendMessageToAdmin = async (req, res, next) => {
    try {
        const { receiverId, content } = req.body;
        const senderId = req.user.id;

        // 1. التحقق من أن المرسل هو أدمن بالفعل (إضافة طبقة حماية ثانية)
        if (!req.user.roles.includes('admin')) {
            return res.status(403).json({ message: "هذا المسار مخصص للمسؤولين فقط" });
        }

        // 2. التحقق من المحتوى
        if (!content || content.trim() === "") {
            return res.status(400).json({ message: "محتوى الرسالة مطلوب" });
        }

        // 3. التحقق من أن المستلم هو أدمن أيضاً
        const targetAdmin = await User.findOne({ _id: receiverId, roles: 'admin' });
        if (!targetAdmin) {
            return res.status(404).json({ message: "لم يتم العثور على مسؤول بهذا المعرف" });
        }

        // 4. منع الأدمن من مراسلة نفسه (اختياري)
        if (senderId === receiverId) {
            return res.status(400).json({ message: "لا يمكنك مراسلة نفسك" });
        }
        
       // 1. إنشاء الرسالة (ستخزن في القاعدة كـ IDs)
        const message = await Message.create({
           sender: senderId,
           receiver: receiverId,
           content: content,
           status: 'unread',
           timestamp: new Date()
       });

        // 2.   جلب اسم المستلم فوراً بعد الإرسال
const newMessage = await Message.findById(message._id)
    .populate('sender', 'name')   // جلب اسم المرسل
    .populate('receiver', 'name'); // جلب اسم المستقبل

        res.status(201).json({ success: true, message: newMessage });
    } catch (error) {
        next(error);
    }
};

const ordersToExcel = async (req, res, next) => {
    try {
        const orders = await Order.find()
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('تقرير المبيعات التفصيلي');

        // 1. إعدادات الأعمدة
        worksheet.columns = [
            { header: 'معرف الطلب', key: '_id', width: 25 },
            { header: 'العميل', key: 'userName', width: 20 },
            { header: 'البريد الإلكتروني', key: 'userEmail', width: 25 },
            { header: 'تفاصيل المنتجات المشتراة', key: 'products', width: 65 },
            { header: 'المبلغ الإجمالي', key: 'totalAmount', width: 15 },
            { header: 'الحالة', key: 'status', width: 15 },
            { header: 'تاريخ الطلب', key: 'createdAt', width: 25 }
        ];

        orders.forEach(order => {
            // تجميع المنتجات مع التأكد من وجود المصفوفة
            const productsSummary = order.items && order.items.length > 0 
                ? order.items.map(item => `  • ${item.name} (${item.quantity})`).join('\n\n') 
                : ' - ';

            // --- التعديلات الجوهرية هنا لمنع الـ TypeError ---
            const row = worksheet.addRow({
                _id: order._id ? order._id.toString() : 'N/A',
                userName: order.userId?.name || 'N/A',
                userEmail: order.userId?.email || 'N/A',
                products: productsSummary,
                // التأكد من أن المبلغ رقم قبل استدعاء toLocaleString
                totalAmount: order.totalAmount != null ? `${order.totalAmount.toLocaleString()} $` : '0 $',
                status: order.status ? order.status.toUpperCase() : 'UNKNOWN',
                // التأكد من وجود تاريخ صالح
                createdAt: order.createdAt ? new Date(order.createdAt).toLocaleString('ar-EG') : 'غير محدد'
            });

            // 3. التحكم بارتفاع الصف
            const lineCount = (order.items?.length || 1) * 2;
            row.height = Math.max(45, lineCount * 18); 

            // 4. تنسيق الخلية
            const productsCell = row.getCell('products');
            productsCell.alignment = { 
                vertical: 'middle', 
                horizontal: 'right', 
                wrapText: true,
                indent: 2 
            };

            // تنسيق الألوان بناءً على الحالة
            const statusCell = row.getCell('status');
            const colors = {
                completed: 'FF008000',
                cancelled: 'FFFF0000',
                pending: 'FFFFA500',
                shipped: 'FF2E75B6'
            };
            
            const statusKey = order.status ? order.status.toLowerCase() : '';
            if (colors[statusKey]) {
                statusCell.font = { color: { argb: colors[statusKey] }, bold: true };
            }
            
            // إضافة حدود ناعمة وتنسيق المحاذاة
            row.eachCell((cell) => {
                cell.border = {
                    bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } }
                };
                // محاذاة كل الخلايا للوسط ما عدا خلية تفاصيل المنتجات
                if (cell.address.includes('D') === false) { 
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                }
            });
        });

        // 5. تنسيق رأس الجدول
        const headerRow = worksheet.getRow(1);
        headerRow.height = 40;
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF203764' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // إرسال الملف
        const fileName = `Export_Report_${new Date().toISOString().slice(0,10)}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Excel Export Error:", error); // تسجيل الخطأ في الكونسول للمتابعة
        next(error);
    }
};
module.exports = {
    adminSendMessageToAdmin,
    deleteConversation,
    adminSendMessage,
    getAdminUserConversation,
    getAllConversations,
    getOrderDetailsForAdmin,
    getDashboardStats,
    updateOrderStatus,
    ordersToExcel
}