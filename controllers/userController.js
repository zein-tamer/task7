const User = require('../model/User');
const bcrypt = require('bcrypt');

// create user
const createNewUser = async (req, res) => {
    try {
        const { name,email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email and password required' });
        }

        const duplicate = await User.findOne({ email });
        if (duplicate) {
            return res.status(409).json({ message: 'Email already exists' });
        }

        const hashedPwd = await bcrypt.hash(password, 10);

        const userObject = {
            name,
            email,
            password: hashedPwd
        };

        const user = await User.create(userObject);

        res.status(201).json({ message: `User ${user.name} created` });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// ================= GET ALL USERS =================
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .lean();

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= GET USER =================
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= UPDATE USER =================
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // التحقق: هل هو صاحب الحساب أم أدمن؟
    const isAdmin = req.user.roles && req.user.roles.includes('admin');
    // const isOwner = req.user.id === id;
    const isOwner = req.user.id.toString() === id.toString();

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "غير مسموح لك بتعديل بيانات مستخدم آخر" });
    }

    const { name, email, password } = req.body;
    const user = await User.findById(id).select('+password');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = name.trim();

    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser && existingUser._id.toString() !== id) {
        return res.status(409).json({ message: "Email already in use" });
      }
      user.email = normalizedEmail;
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: "Password too short" });
      }
      user.password = await bcrypt.hash(password, 12);
    }

    await user.save();
    res.json({ message: "User updated successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= DELETE USER =================
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// 1. إرسال رسالة من المستخدم إلى الأدمن
const userSendMessageToAdmin = async (req, res, next) => {
    try {
        const { content } = req.body;
        const senderId = req.user.id;

        // البحث عن الأدمن في قاعدة البيانات لإرسال الرسالة له
        const admin = await User.findOne({ roles: 'admin', isDeleted: false, isBanned: false });

        if (!admin) {
            return res.status(404).json({ success: false, message: "عذراً، المسؤول غير متاح حالياً" });
        }

        if (!content || content.trim() === "") {
            return res.status(400).json({ success: false, message: "محتوى الرسالة مطلوب" });
        }

        const newMessage = await Message.create({
            sender: senderId,
            receiver: admin._id, // ترسل تلقائياً للأدمن
            content: content,
            status: 'unread',
            timestamp: new Date()
        });


 //  إرسال إشعار فوري للأدمن
        if (admin.fcmToken) {
            await sendPushNotification(
                admin.fcmToken,
                "رسالة جديدة",
                `أرسل ${req.user.name}: ${content}`,
                { type: "NEW_MESSAGE", senderId: senderId.toString() }
            );
        }



        res.status(201).json({ success: true, message: newMessage });
    } catch (error) {
        next(error);
    }
};


// 2. جلب المحادثة الخاصة بالمستخدم الحالي مع الأدمن
const getUserConversation = async (req, res, next) => {
    try {
        const currentUserId = req.user.id;
        const admin = await User.findOne({ roles: 'admin' });

        if (!admin) {
            return res.status(404).json({ success: false, message: "المسؤول غير موجود" });
        }



    // تحديث الرسائل المرسلة من الأدمن إلى هذا المستخدم لتصبح "مقروءة"
        await Message.updateMany(
            { sender: admin._id, receiver: currentUserId, status: 'unread' },
            { $set: { status: 'read' } }
        );


        const messages = await Message.find({
            $or: [
                { sender: currentUserId, receiver: admin._id },
                { sender: admin._id, receiver: currentUserId }
            ]
        }).sort({ timestamp: 1 }); // ترتيب تصاعدي (من الأقدم للأحدث)

        res.status(200).json({ success: true, messages });
    } catch (error) {
        next(error);
    }
};



module.exports = {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  createNewUser,
  getUserConversation,
  userSendMessageToAdmin
};