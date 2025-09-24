const Product = require('../models/Product');

// Unchanged
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

// Unchanged
exports.getProductCountsByCategory = async (req, res) => {
    try {
        const stats = await Product.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            }
        ]);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- UPDATED ---
exports.getProducts = async (req, res) => {
    const pageSize = 8;
    const page = Number(req.query.pageNumber) || 1;
    const query = {};

    // Keyword search
    if (req.query.keyword) {
        query.name = { $regex: req.query.keyword, $options: 'i' };
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
        query['variants.stock'] = { $gt: 0 };
    }
    // Size filtering
    if (req.query.size) {
        query['variants.size'] = req.query.size;
    }
    
    // --- REVISED FILTERING LOGIC ---
    if (req.query.filter === 'mostWanted') {
        query.isMostWanted = true;
    }
    if (req.query.filter === 'newArrivals') {
        query.isNewArrival = true;
    }

    try {
        const count = await Product.countDocuments(query);
        let productsQuery = Product.find(query)
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        // --- SORTING LOGIC ---
        if (req.query.sortBy === 'price-asc') {
            productsQuery = productsQuery.sort({ price: 1 });
        } else if (req.query.sortBy === 'price-desc') {
            productsQuery = productsQuery.sort({ price: -1 });
        } else {
            // Default sort is by newest
            productsQuery = productsQuery.sort({ createdAt: -1 });
        }

        const products = await productsQuery;
        res.json({ products, page, pages: Math.ceil(count / pageSize) });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// Unchanged
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('suggestedItems', 'name price images variants');

        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- UPDATED ---
exports.createProduct = async (req, res) => {
    try {
        const { productName, regularPrice, description, images, category, variants, isNewArrival, suggestedItems, isSuggested, isMostWanted } = req.body;
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
            isSuggested,
            isMostWanted // Added
        });
        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        res.status(400).json({ message: 'Error creating product', error: error.message });
    }
};

// --- UPDATED ---
exports.updateProduct = async (req, res) => {
    const { productName, regularPrice, description, images, category, variants, isNewArrival, suggestedItems, isSuggested, isMostWanted } = req.body;
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
        product.isMostWanted = isMostWanted; // Added

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } else {
        res.status(404).json({ message: 'Product not found' });
    }
};

// Unchanged
exports.deleteProduct = async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (product) {
        await product.deleteOne();
        res.json({ message: 'Product removed' });
    } else {
        res.status(404).json({ message: 'Product not found' });
    }
};