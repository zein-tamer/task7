const router = require('express').Router();
const { upload, validateImage, handleMulterError } = require('../../utils/multer');
const {
    createProduct,
    getAllProducts,
    getProductById,
    deleteProduct,
    updateProduct,
    getProductStock,
    createProductReview,
    deleteReview 
        } = require('../../controllers/productController');

const verifyAdmin = require('../../middleware/verifyAdmin');


// GET ALL
router.get('/', getAllProducts);
// GET BY ID
router.get('/:id', getProductById);
// GET STOCK
router.get('/:id/stock', getProductStock);



// إضافة تقييم لمنتج معين
router.post('/:id/reviews', createProductReview);

router.delete('/:id/reviews/:reviewId', deleteReview);


router.use(verifyAdmin);

// CREATE PRODUCT
router.post(
    '/create',
    upload,
    handleMulterError,
    validateImage,
    createProduct
)

// DELETE
router.delete('/:id', deleteProduct);
// UPDATE
router.put('/:id', upload, handleMulterError, validateImage, updateProduct);

module.exports = router;
