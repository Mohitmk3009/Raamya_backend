const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const passport = require('passport');

// Load environment variables at the very top of the file
dotenv.config();

// Passport config for Google login
require('./config/passport')(passport);

const app = express();

// --- Middleware ---
// Enable Cross-Origin Resource Sharing to allow your frontend to communicate with this backend
app.use(cors({
  origin: "https://raamya-backend.onrender.com"
}));
// Parse incoming JSON request bodies
app.use(express.json());
// Initialize Passport for authentication strategies
app.use(passport.initialize());

// --- Database Connection ---
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected successfully! 🚀');
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        // Exit process with failure code if database connection fails
        process.exit(1);
    }
};
connectDB();
app.get('/',(req,res)=>{
    res.send("Welcome to Raamya Backend")
})
// --- API Routes ---
// Directs any requests starting with '/api/auth' to the authRoutes.js file
app.use('/api/auth', require('./routes/authRoutes'));
// Directs any requests starting with '/api/products' to the productRoutes.js file
app.use('/api/products', require('./routes/productRoutes'));
// Directs any requests starting with '/api/orders' to the orderRoutes.js file
app.use('/api/orders', require('./routes/orderRoutes'));
// Directs any requests starting with '/api/cart' to the cartRoutes.js file
app.use('/api/cart', require('./routes/cartRoutes'));
// Directs any requests starting with '/api/users' to the userRoutes.js file
app.use('/api/users', require('./routes/userRoutes'));


// --- Server Initialization ---
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});

