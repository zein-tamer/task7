const verifyAdmin = (req, res, next) => {
    // التأكد من وجود مستخدم وصلاحيات (تأتي من verifyJWT)
    if (!req.user || !req.user.roles) {
        return res.status(401).json({ message: "غير مصرح لك بالوصول" });
    }

    // التحقق مما إذا كانت قائمة الصلاحيات تحتوي على 'admin'
    const isAdmin = req.user.roles.includes('admin');

    if (!isAdmin) {
        return res.status(403).json({ message: "هذا الإجراء مخصص للمسؤولين فقط" });
    }

    next(); // السماح بالانتقال للدالة التالية (Controller)
};

module.exports = verifyAdmin;
