const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const FileType = require('file-type');

// =======================
// 1. إعداد التخزين
// =======================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname).toLowerCase());
  }
});

// =======================
// 2. فلترة أولية (سريعة)
// =======================
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed'), false);
  }
};

// =======================
// 3. إعداد Multer
// =======================
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter
}).single('image');

// =======================
// 4. التحقق الحقيقي من الملف
// =======================
const validateImage = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const filePath = req.file.path;

    const fileType = await FileType.fromFile(filePath);

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    if (!fileType || !allowedTypes.includes(fileType.mime)) {
       await fsPromises.unlink(filePath);  // حذف الملف مباشرة
      return res.status(400).json({
        success: false,
        message: 'Invalid file type'
      });
    }

    next();
  } catch (error) {
    if (req.file && req.file.path) {
      await fsPromises.unlink(req.file.path);  // حذف الملف في حالة حدوث أي خطأ
    }
    return res.status(500).json({
      success: false,
      message: 'File validation failed'
    });
  }
};

// =======================
// 5. Middleware معالجة الأخطاء
// =======================
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // تخصيص رسائل الخطأ الشائعة من Multer
    let errorMessage = err.message;

    if (err.code === 'LIMIT_FILE_SIZE') {
      errorMessage = 'حجم الملف كبير جداً، الحد الأقصى المسموح به هو 5 ميجابايت';
    } else if (err.code === 'LIMIT_UNEXPECTED_FIELD') {
      errorMessage = 'خطأ في اسم الحقل (Key)، تأكد أن الاسم هو "image"';
    }

    return res.status(400).json({
      success: false,
      message: errorMessage
    });
  } else if (err) {
    // الأخطاء العامة الأخرى (مثل خطأ الامتداد الذي نرسله من الـ fileFilter)
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};


// =======================
module.exports = {
  upload,
  validateImage,
  handleMulterError
};