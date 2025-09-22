const Product = require('../models/Product');

exports.createProductReview = async (req, res) => {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (product) {
        const alreadyReviewed = product.reviews.find(
            (r) => r.user.toString() === req.user._id.toString()
        );

        if (alreadyReviewed) {
            res.status(400).json({ message: 'Product already reviewed' });
            return;
        }

        const review = {
            name: req.user.name,
            rating: Number(rating),
            comment,
            user: req.user._id,
        };

        product.reviews.push(review);
        product.numReviews = product.reviews.length;
        product.rating =
            product.reviews.reduce((acc, item) => item.rating + acc, 0) /
            product.reviews.length;

        await product.save();
        res.status(201).json({ message: 'Review added' });
    } else {
        res.status(404).json({ message: 'Product not found' });
    }
};

// @desc    Get product counts by category
// @route   GET /api/products/categories/counts
// @access  Private/Admin
exports.getProductCountsByCategory = async (req, res) => {
    try {
        const stats = await Product.aggregate([
            {
                $group: {
                    _id: '$category', // Group by the category field
                    count: { $sum: 1 } // Count the number of products in each group
                }
            }
        ]);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getProducts = async (req, res) => {
    const pageSize = 8; // Number of products per page
    const page = Number(req.query.pageNumber) || 1;

    // Build the query object for filtering
    const query = {};

    // Keyword search for product name
    if (req.query.keyword) {
        query.name = {
            $regex: req.query.keyword,
            $options: 'i', // Case-insensitive
        };
    }

    // Category filtering
    if (req.query.category) {
        query.category = { $in: req.query.category.split(',') };
    }
    
    // Price range filtering
    if (req.query.maxPrice) {
        query.price = { $lte: Number(req.query.maxPrice) };
    }
    
    // Availability filtering
    if (req.query.inStock === 'true') {
        // Find products where at least one variant has stock > 0
        query['variants.stock'] = { $gt: 0 };
    }
    
    // Size filtering
    if (req.query.size) {
        query['variants.size'] = req.query.size;
    }

    // ** FIX: Correctly checking for 'isSuggested' **
    if (req.query.isNewArrival === 'true') {
        query.isNewArrival = true;
    }
    if (req.query.isSuggested === 'true') {
        query.isSuggested = true;
    }
    
    try {
        const count = await Product.countDocuments(query); // Get total count of matching products
        
        let productsQuery = Product.find(query)
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        // Sorting
        if (req.query.sortBy === 'price-asc') {
            productsQuery = productsQuery.sort({ price: 1 });
        } else if (req.query.sortBy === 'price-desc') {
            productsQuery = productsQuery.sort({ price: -1 });
        } else {
            productsQuery = productsQuery.sort({ createdAt: -1 }); // Default sort by newest
        }

        const products = await productsQuery;

        res.json({ products, page, pages: Math.ceil(count / pageSize) });

    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Fetch a single product by ID
// @route   GET /api/products/:id
// @access  Public
// REPLACE your old getProductById function with this one
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('suggestedItems', 'name price images variants'); // The fix is here

        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a new product
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = async (req, res) => {
    try {
        const { productName, regularPrice, description, images, category, variants, isNewArrival, suggestedItems, isSuggested } = req.body;
        const product = new Product({
            name: productName,
            price: regularPrice,
            description,
            images: images && images.length > 0 && images[0] !== '' ? images : ['/placeholder.png'],
            category,
            variants,
            user: req.user._id,
            isNewArrival,
            suggestedItems,
            isSuggested
        });
        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        res.status(400).json({ message: 'Error creating product', error: error.message });
    }
};

// FIX: Changed the field name in updateProduct
exports.updateProduct = async (req, res) => {
    const { productName, regularPrice, description, images, category, variants, isNewArrival, suggestedItems, isSuggested } = req.body;
    const product = await Product.findById(req.params.id);
    if (product) {
        product.name = productName || product.name;
        product.price = regularPrice || product.price;
        product.description = description || product.description;
        product.images = images || product.images;
        product.category = category || product.category;
        product.variants = variants || product.variants;
        product.isNewArrival = isNewArrival;
        product.suggestedItems = suggestedItems;
        product.isSuggested = isSuggested;

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } else {
        res.status(404).json({ message: 'Product not found' });
    }
};



// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (product) {
        await product.deleteOne(); // Mongoose 6+ uses deleteOne()
        res.json({ message: 'Product removed' });
    } else {
        res.status(404).json({ message: 'Product not found' });
    }
};