هيكل توثيق الـ API (API Documentation)

1. معلومات عامة (General Info)

Base URL:https://commerce-backend-5.onrender.com
Content-Type: application/json
Authentication: يتم استخدام Bearer Token في الهيدر للمسارات المحمية.


2. مسارات المصادقة (Authentication Endpoints)
  A. تسجيل حساب جديد (Register) :
   URL:http://localhost:5000/auth/register
   Method: POST
   Body:
   {
  "name": "Zein Tamer",
  "email": "zein@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}


 B. تسجيل الدخول (Login) :
 URL:http://localhost:5000/auth/login
 Method: POST
Body: {
    "email": "user@example.com",
    "password":"password123"
    }
Response: Response Status Codes : 201 تعني استجابة صحيحة   
          يعيد معلومات عن المستخدم مع ال 
          access token 
          ليتم وضعه في ال 
          Authorization 
          في ال 
          bearear token

          Response Status Codes : 400  Bad Request: الطلب غير مفهوم أو فيه خطأ في الصيغة 
                                                     (مثلاً أرسلت JSON خاطئ).
                                          {
                                            "emaiil": "user@example.com",
                                            "passward":"password123"
                                         }

          Response Status Codes : 409 Conflict يعني وجود "تعارض" بين الطلب الذي أرسلته والحالة الراهنة للمورد على الخادم.
                                                  {
                                            "email": "user@example.com",
                                            }
                                                                       message: "Email already exists"

          Response Status Codes : 500  Internal Server Error: خطأ عام في الخادم (غالباً عطل في البرمجة).




C. نسيان كلمة المرور (Forgot Password)

URL: http://localhost:5000/auth/forgot-password
Method: POST
Body: {"email": "user@example.com"}
Response Status Codes : 200  Response: يعيد رابط إعادة التعيين (Reset Link).
Response Status Codes : 404 message: "Email not found"
Response Status Codes : 500  Internal Server Error: خطأ عام في الخادم (غالباً عطل في البرمجة).


D. تسجيل الخروج من جميع الأجهزة (Logout All Devices)

   يستخدم هذا المسار لمسح جميع جلسات المستخدم 
   (Refresh Tokens) 
   من قاعدة البيانات،
   مما يؤدي إلى خروج المستخدم من جميع المتصفحات والأجهزة التي سجل دخوله منها.

         URL: http://localhost:5000/auth/logoutAll
         Method: GET
         التوثيق المطلوب (Auth Required): نعم (يجب إرسال الـ Access Token).
         Headers:
         المفتاح	القيمة	الوصف
         Authorization	Bearer <ACCESS_TOKEN>	توكن الوصول الصالح الخاص بالمستخدم
         استجابة النجاح (Success Response):
         Response Status Codes : 200 ok 
         Body:
         json
         {
           "message": "Logged out from all devices"
         }
         يُرجى استخدام الرمز البرمجي بحذر.
          استجابات الخطأ (Error Responses):
الحالة: 401 Unauthorized (في حال عدم إرسال التوكن أو أنه غير صالح).
         json
         {
           "message": "Unauthorized"
         }
         يُرجى استخدام الرمز البرمجي بحذر.
الحالة: 500Internal Server Error (في حال حدوث مشكلة في الاتصال بقاعدة البيانات).



E. تجديد توكن الوصول (Refresh Access Token)
  URL: http://localhost:5000/auth/refresh
  Method:GET
  Auth:  يجب وجود 
         jwt cookie 
         في المتصفح.

    
  Requirements:
  يجب إرسال الـ 
  Cookie 
  التي تحمل اسم jwt.

   Response Status Codes : 200    
     المحتوى (Body):
     json
      {
         "accessToken": "eyJhbGciOiJIUzI1..."
      }
يُرجى استخدام الرمز البرمجي بحذر


ملاحظة: Rotation لزيادة الأمان.
     سيقوم السيرفر أيضاً بتحديث الـ 
     refreshToken 
     وإرسال واحد جديد في الكوكيز 

         Error Responses:
الحالة: 401  Unauthorized (في حال عدم وجود كوكيز أو انتهائها).
الحالة:          403Forbidden (في حال كان التوكن غير صالح أو تم استخدامه مسبقاً/مخترق).
         🛠️ كيف يعمل هذا المسار برمجياً؟
         يقرأ السيرفر الـ 
         Refresh Token 
         من الكوكيز.
         يبحث عن المستخدم الذي يملك هذا التوكن في قاعدة البيانات.
         إذا وجده، يتأكد من صحة التوكن عبر jwt.verify.
         يقوم بحذف التوكن القديم وإنشاء 
         accessToken و refreshToken 
         جديدين 
         (لأمان أعلى).
         يرسل التوكن الجديد للمستخدم.





Products API :

1. Create Product
   URL: http://localhost:5000/product/create
   Method: POST
   Auth Required: لا الكل يمكنه وليس الادمن فقط.
   <!-- Headers: Authorization: Bearer <ACCESS_TOKEN> -->
   Headers: Authorization: لايوجد
   Body (form-data):

   key              valu

   name                 birthday 
   image                c:\Users\Windows.11\Desktop\مشاريع\FRONT-END\CakeVerse\image\birthday\aneta-pawlik-d8s13D2
   price                300
   quantity             4
   description          birthday  cake with chocllet
   category             party


Response Status Codes : 200 ok يخزن البيانات في قاعدة البيانات ويحمل الصورة على السحابة
Response Status Codes : 400 {message: 'Image required' } || { message: 'All fields required' }



إدارة المنتجات (Products Management)

2. جلب جميع المنتجات (Get All Products)
   URL: http://localhost:5000/product
   Method: GET
   Auth Required: لا (متاح للجميع).
   Response Status Codes : 200  ok 
     [
  {
    "cloudinaryId": "60d5ec...",
    "name": "Iphone 15",
    "quantity":4,
    "price": 999,
    "description": "Latest Apple phone",
    "category": "Electronics",
    "image": "https://cloudinary.com...",
    "createdAt":" ",
    "updatedAt":" "
  }
]




getProductById

URL: http://localhost:5000/product:id
Method: GET
Success Response (200 OK): يعيد تفاصيل المنتج المحدد.
Success Response (404 OK): المنتج غير موجود



deleteProduct
 URL:http://localhost:5000/product:id
 Method: delete
 Success Response (200 OK): يحذف المنتج
                      { message: 'Deleted successfully' }

                      
uccess Response (404): { message: 'Not found' }


updateProduct 
URL: http://localhost:5000/product:id
Method: PUT
Auth Required: لا
Body: الحقول المراد تعديلها فقط.


