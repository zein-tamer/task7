const express = require('express');
const router = express.Router();
const verifyAdmin = require('../../middleware/verifyAdmin');
const {
    getAllUsers,
    createNewUser,
    updateUser,
    deleteUser,
    getUser
} = require('../../controllers/userController');

// ==================== ROUTE / ====================
router.route('/')
    .get(verifyAdmin, getAllUsers)
    
router.post('/create', verifyAdmin, createNewUser);

// ==================== ROUTE /:id ====================
router.route('/:id')
    .get(getUser)
    .put(updateUser)
    .delete(verifyAdmin, deleteUser);

module.exports = router;
