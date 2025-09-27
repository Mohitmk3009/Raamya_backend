const express = require('express');
const router = express.Router();
const { createProduct,getProducts, getProductById,createProductReview, updateProduct, deleteProduct,getProductCountsByCategory  } = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');

// const upload = require('../middleware/upload');
// Route for creating a product
// It's protected by both 'protect' and 'admin' middleware
// router.post('/', protect, admin,upload.array('newImages', 5), createProduct);
router.post('/', protect, admin, createProduct);

// Route for getting all products (Public)
router.get('/', getProducts);

// Add this new route for creating a review.
// It's protected, so only logged-in users can access it.
router.post('/:id/reviews', protect, createProductReview);

router.get('/categories/counts', protect, admin, getProductCountsByCategory);
// Route for getting a single product by ID (Public)
router.get('/:id', getProductById);
// router.put('/:id', protect, admin,upload.array('newImages', 5), updateProduct);     // ADD THIS ROUTE

router.put('/:id', protect, admin, updateProduct);     // ADD THIS ROUTE
router.delete('/:id', protect, admin, deleteProduct); // ADD THIS ROUTE

module.exports = router;