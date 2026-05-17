
require('./config/envCheck'); 
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');


const connectDB = require('./config/dbConn');
const verifyJWT = require('./middleware/verifyJWT');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

// 2. الاتصال بقاعدة البيانات
connectDB();

// 3. Middlewares الأساسية
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(cors({ origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://127.0.0.1:5501', 'https://wondrous-sfogliatella-a94c8a.netlify.app'], credentials: true }));
// 4. المسارات العامة (بدون حماية)
app.use('/', require('./routes/root'));
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/products', require('./routes/api/product')); 

// 5. حماية المسارات التالية (المسارات التي تحتاج تسجيل دخول)
app.use(verifyJWT);
app.use('/api/user', require('./routes/api/user'));
app.use('/api/cart', require('./routes/api/cart'));
app.use('/api/admin', require('./routes/api/admin')); 


// 6. معالجة الـ 404

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `المسار ${req.originalUrl} غير موجود على هذا السيرفر`
    });
})
// // يوضع بعد جميع المسارات (Routes)
// app.all('*splat', (req, res) => {
//     res.status(404);
//     if (req.accepts('html')) {
//         res.sendFile(path.join(__dirname, 'views', '404.html'));
//     } else if (req.accepts('json')) {
//         res.json({ "error": "404 Not Found" });
//     } else {
//         res.type('txt').send("404 Not Found");
//     }
// });


// 7. تشغيل السيرفر بعد التأكد من اتصال قاعدة البيانات
mongoose.connection.once('open', () => {
    console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
    app.listen(PORT, () => {
        console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
});
