require('dotenv').config(); // Ensure this is at the top of the file

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");  // Add jwt for authentication
const cors = require("cors");  // Add CORS for cross-origin requests

// Create Express app
const app = express();

console.log('Environment Variables:');
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('PORT:', process.env.PORT);

// Verify the MongoDB URI before connecting
if (!process.env.MONGODB_URI) {
    console.error('ERROR: MongoDB URI is not defined in .env file');
    process.exit(1); // Exit the process if URI is not defined
}

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enable CORS for cross-origin requests
app.use(cors()); // This allows requests from different origins

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Mongoose connected successfully');
    })
    .catch((e) => {
        console.error('Failed to connect to MongoDB', e);
        process.exit(1); // Exit if the connection fails
    });

// Define user schema and model
const logInSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    contact: { type: String, required: false }
});

// Hash password before saving user
logInSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

const registrations = mongoose.model('registrations', logInSchema);

// Routes

// Signup route
app.get('/signup', (req, res) => {
    res.send('Signup page');
});

app.post('/signup', async (req, res) => {
    const { name, email, password, confirmPassword, contact } = req.body;

    // Validate input fields
    if (!name || !email || !password || !confirmPassword) {
        return res.status(400).send('All fields are required.');
    }

    if (password !== confirmPassword) {
        return res.status(400).send('Passwords do not match.');
    }

    try {
        // Create a new user instance
        const newUser = new registrations({ name, email, password, contact });

        // Save the user to the database
        await newUser.save();

        console.log('User saved successfully:', newUser); // Log success
        res.status(201).send('Signup successful');
    } catch (saveError) {
        console.error('Error saving user:', saveError); // Log error details

        // Check for duplicate email error
        if (saveError.code === 11000) {
            return res.status(400).send('Email already exists.');
        }

        return res.status(500).send('Error saving user');
    }
});

// Login route
app.post('/login', async (req, res) => {
    console.log('Login request received:', req.body); // Log incoming request body

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Both email and password are required.' });
    }

    try {
        const user = await registrations.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid password' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({
            message: 'Login successful',
            token: token
        });
    } catch (error) {
        console.error('Error logging in:', error);
        return res.status(500).json({ message: 'Error logging in' });
    }
});

// Middleware to verify JWT (use this in routes that require authentication)
const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', ''); // Get the token from the Authorization header

    if (!token) {
        return res.status(401).send('Access denied. No token provided.');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach the decoded user information to the request object
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(400).send('Invalid token');
    }
};

// Protected route (example)
app.get('/profile', authenticate, (req, res) => {
    res.send('This is a protected profile route');
});

// Start the server on the port specified in the .env file or default to 5000
const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});