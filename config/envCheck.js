const dotenv = require('dotenv');
dotenv.config();

/**
 * قائمة بالمتغيرات الإجبارية التي لا يمكن للتطبيق العمل بدونها
 */
const REQUIRED_VARIABLES = [
    'DATABASE_URI',
    'ACCESS_TOKEN_SECRET',
    'REFRESH_TOKEN_SECRET',
    'CLOUDINARY_CLOUD_NAME', // أضفنا هؤلاء لضمان عمل رفع الصور
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
];

const validateEnv = () => {
    const missing = [];

    REQUIRED_VARIABLES.forEach((variable) => {
        if (!process.env[variable]) {
            missing.push(variable);
        }
    });

    if (missing.length > 0) {
        console.error('\n❌ [Environment Error]: Missing required variables in .env file:');
        missing.forEach((msg) => console.error(`   - ${msg}`));
        console.error('\nExiting process...\n');
        
        // إيقاف التطبيق فوراً
        process.exit(1); 
    }

    // إشارة اختيارية في بيئة التطوير فقط
    if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Environment variables validated successfully.');
    }
};

// تنفيذ الفحص فور استدعاء الملف
validateEnv();

module.exports = process.env;
