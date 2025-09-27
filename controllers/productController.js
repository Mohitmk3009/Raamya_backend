// const Product = require('../models/Product');

// // Unchanged
// exports.createProductReview = async (req, res) => {
//     const { rating, comment } = req.body;
//     const product = await Product.findById(req.params.id);

//     if (product) {
//         const alreadyReviewed = product.reviews.find(
//             (r) => r.user.toString() === req.user._id.toString()
//         );

//         if (alreadyReviewed) {
//             res.status(400).json({ message: 'Product already reviewed' });
//             return;
//         }

//         const review = {
//             name: req.user.name,
//             rating: Number(rating),
//             comment,
//             user: req.user._id,
//         };

//         product.reviews.push(review);
//         product.numReviews = product.reviews.length;
//         product.rating =
//             product.reviews.reduce((acc, item) => item.rating + acc, 0) /
//             product.reviews.length;

//         await product.save();
//         res.status(201).json({ message: 'Review added' });
//     } else {
//         res.status(404).json({ message: 'Product not found' });
//     }
// };

// // Unchanged
// exports.getProductCountsByCategory = async (req, res) => {
//     try {
//         const stats = await Product.aggregate([
//             {
//                 $group: {
//                     _id: '$category',
//                     count: { $sum: 1 }
//                 }
//             }
//         ]);
//         res.json(stats);
//     } catch (error) {
//         res.status(500).json({ message: 'Server Error' });
//     }
// };

// // --- UPDATED ---
// exports.getProducts = async (req, res) => {
//     const pageSize = 8;
//     const page = Number(req.query.pageNumber) || 1;
//     const query = {};

//     // Keyword search
//     if (req.query.keyword) {
//         query.name = { $regex: req.query.keyword, $options: 'i' };
//     }
//     // Category filtering
//     if (req.query.category) {
//         query.category = { $in: req.query.category.split(',') };
//     }
//     // Price range filtering
//     if (req.query.maxPrice) {
//         query.price = { $lte: Number(req.query.maxPrice) };
//     }
//     // Availability filtering
//     const { inStock, outOfStock } = req.query;

//     if (inStock === 'true' && outOfStock !== 'true') {
//         query['variants.stock'] = { $gt: 0 };
//     } else if (outOfStock === 'true' && inStock !== 'true') {
//         // Corrected logic to find products where ALL variants have 0 stock
//         query.variants = { $not: { $elemMatch: { stock: { $gt: 0 } } } };
//     }
//     // Size filtering
//     if (req.query.size) {
//         query['variants.size'] = req.query.size;
//     }
    
//     // --- REVISED FILTERING LOGIC ---
//     if (req.query.filter === 'mostWanted') {
//         query.isMostWanted = true;
//     }
//     if (req.query.filter === 'newArrivals') {
//         query.isNewArrival = true;
//     }

//     try {
//         const count = await Product.countDocuments(query);
//         let productsQuery = Product.find(query)
//             .limit(pageSize)
//             .skip(pageSize * (page - 1));

//         // --- SORTING LOGIC ---
//         if (req.query.sortBy === 'price-asc') {
//             productsQuery = productsQuery.sort({ price: 1 });
//         } else if (req.query.sortBy === 'price-desc') {
//             productsQuery = productsQuery.sort({ price: -1 });
//         } else {
//             // Default sort is by newest
//             productsQuery = productsQuery.sort({ createdAt: -1 });
//         }

//         const products = await productsQuery;
//         res.json({ products, page, pages: Math.ceil(count / pageSize) });
//     } catch (error) {
//         res.status(500).json({ message: 'Server Error' });
//     }
// };

// // Unchanged
// exports.getProductById = async (req, res) => {
//     try {
//         const product = await Product.findById(req.params.id)
//             .populate('suggestedItems', 'name price images variants');

//         if (product) {
//             res.json(product);
//         } else {
//             res.status(404).json({ message: 'Product not found' });
//         }
//     } catch (error) {
//         res.status(500).json({ message: 'Server Error' });
//     }
// };

// // --- UPDATED ---
// // exports.createProduct = async (req, res) => {
// //     try {
// //         const { productName, regularPrice, description, images, category, variants, isNewArrival, suggestedItems, isSuggested, isMostWanted } = req.body;
// //         const product = new Product({
// //             name: productName,
// //             price: regularPrice,
// //             description,
// //             images: images && images.length > 0 && images[0] !== '' ? images : ['/placeholder.png'],
// //             category,
// //             variants,
// //             user: req.user._id,
// //             isNewArrival,
// //             suggestedItems,
// //             isSuggested,
// //             isMostWanted // Added
// //         });
// //         const createdProduct = await product.save();
// //         res.status(201).json(createdProduct);
// //     } catch (error) {
// //         res.status(400).json({ message: 'Error creating product', error: error.message });
// //     }
// // };

// // // --- UPDATED ---
// // exports.updateProduct = async (req, res) => {
// //     const { productName, regularPrice, description, images, category, variants, isNewArrival, suggestedItems, isSuggested, isMostWanted } = req.body;
// //     const product = await Product.findById(req.params.id);
// //     if (product) {
// //         product.name = productName || product.name;
// //         product.price = regularPrice || product.price;
// //         product.description = description || product.description;
// //         product.images = images || product.images;
// //         product.category = category || product.category;
// //         product.variants = variants || product.variants;
// //         product.isNewArrival = isNewArrival;
// //         product.suggestedItems = suggestedItems;
// //         product.isSuggested = isSuggested;
// //         product.isMostWanted = isMostWanted; // Added

// //         const updatedProduct = await product.save();
// //         res.json(updatedProduct);
// //     } else {
// //         res.status(404).json({ message: 'Product not found' });
// //     }
// // };
// const generateSKU = (category, name, size, companyId) => {
//     // Take the first letter of each word from the CATEGORY
//     const categoryInitials = category.split(' ').map((word) => word.charAt(0)).join('').toUpperCase();
//     // Take the first letter of each word from the PRODUCT NAME
//     const productInitials = name.split(' ').map((word) => word.charAt(0)).join('').toUpperCase();
//     // Take the single letter from the SIZE (e.g., M, L, S)
//     const sizeInitial = size.charAt(0).toUpperCase();
//     // Use a unique random number at the end
//     const uniqueId = Math.random().toString(36).substring(2, 6).toUpperCase();

//     return `${categoryInitials}-${productInitials}-${sizeInitial}-${companyId}-${uniqueId}`;
// };

// exports.createProduct = async (req, res) => {
//     try {
//         // Corrected: Use 'name' and 'price' from the request body
//         const { name, price, description, images, category, variants, isNewArrival, suggestedItems, isSuggested, isMostWanted, companyId } = req.body;

//         const newImageUrls = req.files ? req.files.map(file => file.path) : [];

//         // 2. Combine with any existing URLs (if any were sent, though unlikely for create)
//         const allImages = [...newImageUrls];

//         if (!variants || variants.length === 0) {
//             return res.status(400).json({ message: 'Product must have at least one variant.' });
//         }
        
//         const variantsWithSKU = variants.map(variant => {
//             const sku = generateSKU(category, name, variant.size, companyId);
//             return {
//                 ...variant,
//                 sku: sku, // Add the generated SKU to the variant
//             };
//         });
//         const product = new Product({
//             name, // Use the correct variable 'name'
//             price, // Use the correct variable 'price'
//             description,
//             images: allImages.length > 0 ? allImages : ['/placeholder.png'],
//             category,
//             variants: variantsWithSKU, // Use the new variants array
//             user: req.user._id,
//             isNewArrival,
//             suggestedItems,
//             isSuggested,
//             isMostWanted,
//             companyId,
//         });

//         const createdProduct = await product.save();
//         res.status(201).json(createdProduct);
//     } catch (error) {
//         res.status(400).json({ message: 'Error creating product', error: error.message });
//     }
// };

// exports.updateProduct = async (req, res) => {
//     // Corrected: Use 'name' and 'price' from the request body
//     const { name, price, description, images, category, variants, isNewArrival, suggestedItems, isSuggested, isMostWanted, companyId } = req.body;

//     const product = await Product.findById(req.params.id);
    
//     if (product) {

//          const newImageUrls = req.files ? req.files.map(file => file.path) : [];
            
//             // 2. Combine with existing URLs sent from the client
//             const updatedImages = [...(existingImages || []), ...newImageUrls];
//         // Use 'name' and 'category' when checking for SKU updates
//         const shouldUpdateSKUs = name !== product.name || category !== product.category || JSON.stringify(variants) !== JSON.stringify(product.variants);

//         if (shouldUpdateSKUs) {
//             product.variants = variants.map(variant => {
//                 const existingVariant = product.variants.find(v => v.size === variant.size);
//                 // Use 'name' and 'category' in the SKU generation function
//                 const sku = existingVariant ? existingVariant.sku : generateSKU(category, name, variant.size, companyId);
//                 return {
//                     ...variant,
//                     sku: sku,
//                 };
//             });
//         } else {
//             product.variants = variants;
//         }

//         // Assign the correct variables
//         product.name = name;
//         product.price = price;
//         product.description = description;
//         product.images = updatedImages; 
//         product.category = category;
//         product.isNewArrival = isNewArrival;
//         product.suggestedItems = suggestedItems;
//         product.isSuggested = isSuggested;
//         product.isMostWanted = isMostWanted;
//         product.companyId = companyId;

//         const updatedProduct = await product.save();
//         res.json(updatedProduct);
//     } else {
//         res.status(404).json({ message: 'Product not found' });
//     }
// };
// // Unchanged
// exports.deleteProduct = async (req, res) => {
//     const product = await Product.findById(req.params.id);

//     if (product) {
//         await product.deleteOne();
//         res.json({ message: 'Product removed' });
//     } else {
//         res.status(404).json({ message: 'Product not found' });
//     }
// };

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
    const pageSize = Number(req.query.pageSize) || 12;
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
    const { inStock, outOfStock } = req.query;

    if (inStock === 'true' && outOfStock !== 'true') {
        query['variants.stock'] = { $gt: 0 };
    } else if (outOfStock === 'true' && inStock !== 'true') {
        // Corrected logic to find products where ALL variants have 0 stock
        query.variants = { $not: { $elemMatch: { stock: { $gt: 0 } } } };
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


const generateSKU = (category, name, size, companyId) => {
    // Take the first letter of each word from the CATEGORY
    const categoryInitials = category.split(' ').map((word) => word.charAt(0)).join('').toUpperCase();
    // Take the first letter of each word from the PRODUCT NAME
    const productInitials = name.split(' ').map((word) => word.charAt(0)).join('').toUpperCase();
    // Take the single letter from the SIZE (e.g., M, L, S)
    const sizeInitial = size.charAt(0).toUpperCase();
    // Use a unique random number at the end
    const uniqueId = Math.random().toString(36).substring(2, 6).toUpperCase();

    return `${categoryInitials}-${productInitials}-${sizeInitial}-${companyId}-${uniqueId}`;
};

exports.createProduct = async (req, res) => {
    try {
        // Corrected: Use 'name' and 'price' from the request body
        const { name, price, description, images, category, variants, isNewArrival, suggestedItems, isSuggested, isMostWanted, companyId } = req.body;

        if (!variants || variants.length === 0) {
            return res.status(400).json({ message: 'Product must have at least one variant.' });
        }
        
        const variantsWithSKU = variants.map(variant => {
            const sku = generateSKU(category, name, variant.size, companyId);
            return {
                ...variant,
                sku: sku, // Add the generated SKU to the variant
            };
        });
        const product = new Product({
            name, // Use the correct variable 'name'
            price, // Use the correct variable 'price'
            description,
            images: images && images.length > 0 && images[0] !== '' ? images : ['/placeholder.png'],
            category,
            variants: variantsWithSKU, // Use the new variants array
            user: req.user._id,
            isNewArrival,
            suggestedItems,
            isSuggested,
            isMostWanted,
            companyId,
        });

        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        res.status(400).json({ message: 'Error creating product', error: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    // Corrected: Use 'name' and 'price' from the request body
    const { name, price, description, images, category, variants, isNewArrival, suggestedItems, isSuggested, isMostWanted, companyId } = req.body;

    const product = await Product.findById(req.params.id);
    
    if (product) {
        // Use 'name' and 'category' when checking for SKU updates
        const shouldUpdateSKUs = name !== product.name || category !== product.category || JSON.stringify(variants) !== JSON.stringify(product.variants);

        if (shouldUpdateSKUs) {
            product.variants = variants.map(variant => {
                const existingVariant = product.variants.find(v => v.size === variant.size);
                // Use 'name' and 'category' in the SKU generation function
                const sku = existingVariant ? existingVariant.sku : generateSKU(category, name, variant.size, companyId);
                return {
                    ...variant,
                    sku: sku,
                };
            });
        } else {
            product.variants = variants;
        }

        // Assign the correct variables
        product.name = name;
        product.price = price;
        product.description = description;
        product.images = images;
        product.category = category;
        product.isNewArrival = isNewArrival;
        product.suggestedItems = suggestedItems;
        product.isSuggested = isSuggested;
        product.isMostWanted = isMostWanted;
        product.companyId = companyId;

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