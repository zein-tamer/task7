const router = require('express').Router();
const { 
    getAdminUserConversation,
    getAllConversations,
    adminSendMessage,
    deleteConversation,
    adminSendMessageToAdmin,
    getOrderDetailsForAdmin,
    getDashboardStats,
    updateOrderStatus
 } = require('../../controllers/adminController');
const verifyAdmin = require('../../middleware/verifyAdmin');



router.use(verifyAdmin);

router.get('/stats', getDashboardStats);

router.post('/messages/send',   adminSendMessage);

router.post('/send-to-admin',   adminSendMessageToAdmin);
router.get('/conversations', getAllConversations);

router.get('/conversations/:userId',   getAdminUserConversation);
router.delete('/conversations/:userId',   deleteConversation); // للأدمن لحذف المحادثة مع مستخدم

router.get('/order/:orderId', getOrderDetailsForAdmin);
router.patch('/:orderId/status', updateOrderStatus);

module.exports = router;
  