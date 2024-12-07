require('dotenv').config(); // Ensure this is at the top of the file
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Verify the MongoDB URI before connecting
if (!process.env.MONGODB_URI) {
    console.error('ERROR: MongoDB URI is not defined in .env file');
    process.exit(1); // Exit the process if URI is not defined
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Mongoose connected successfully');
    })
    .catch((e) => {
        console.error('Failed to connect to MongoDB', e);
        process.exit(1); // Exit if the connection fails
    });

// Define Schemas
const logInSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    contact: { type: String, required: false }
});

const lostItemSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'registrations', required: true },
    category: { type: String, required: true, enum: ['Electronics', 'Bags', 'Clothing', 'Accessories', 'Documents', 'Others'] },
    description: { type: String, required: true },
    additionalDetails: { type: mongoose.Schema.Types.Mixed },
    photo: { type: String, required: false },
    location: { type: String, required: true },
    status: { type: String, enum: ['Reported', 'Matched', 'Resolved'], default: 'Reported' },
    matchedItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'foundItems', default: null }
}, { timestamps: true });

const foundItemSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'registrations', required: true },
    category: { type: String, required: true, enum: ['Electronics', 'Bags', 'Clothing', 'Accessories', 'Documents', 'Others'] },
    description: { type: String, required: true },
    additionalDetails: { type: mongoose.Schema.Types.Mixed },
    photo: { type: String, required: false },
    location: { type: String, required: true },
    status: { type: String, enum: ['Available', 'Matched', 'Claimed'], default: 'Available' },
    matchedLostItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'LostItem', default: null }
}, { timestamps: true });

// Hash password before saving user
logInSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// Create Models
const registrations = mongoose.model('registrations', logInSchema);
const LostItem = mongoose.model('LostItem', lostItemSchema);
const FoundItem = mongoose.model('FoundItem', foundItemSchema);

// Multer Configuration for File Upload
const storage = multer.diskStorage({
    destination(req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename(req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
    fileFilter(req, file, cb) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'));
        }
    }
});

// Authentication Middleware
const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).send('Access denied. No token provided.');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(400).send('Invalid token');
    }
};

// Find Potential Matches Function
async function findPotentialMatches(item) {
    const isLostItem = item instanceof LostItem;
    const Model = isLostItem ? FoundItem : LostItem;

    const matchCriteria = {
        category: item.category,
        location: { $regex: item.location, $options: 'i' },
    };

    if (item.description) {
        matchCriteria.$text = { $search: item.description };
    }

    const potentialMatches = await Model.find(matchCriteria)
        .limit(10)
        .sort({ createdAt: -1 });

    return potentialMatches;
}

// Authentication Routes
app.post('/signup', async (req, res) => {
    const { name, email, password, confirmPassword, contact } = req.body;
    if (!name || !email || !password || !confirmPassword) {
        return res.status(400).send('All fields are required.');
    }
    if (password !== confirmPassword) {
        return res.status(400).send('Passwords do not match.');
    }
    try {
        const newUser = new registrations({ name, email, password, contact });
        await newUser.save();
        res.status(201).send('Signup successful');
    } catch (saveError) {
        if (saveError.code === 11000) {
            return res.status(400).send('Email already exists.');
        }
        return res.status(500).send('Error saving user');
    }
});

app.post('/login', async (req, res) => {
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
        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        return res.status(500).json({ message: 'Error logging in' });
    }
});

// Lost and Found Routes
app.post('/report-lost', authenticate, upload.single('photo'), async (req, res) => {
    try {
        const { category, description, location, additionalDetails } = req.body;
        const parsedAdditionalDetails = typeof additionalDetails === 'string' ? JSON.parse(additionalDetails) : additionalDetails;

        const lostItem = new LostItem({
            userId: req.user.userId,
            category,
            description,
            location,
            additionalDetails: parsedAdditionalDetails,
            photo: req.file ? req.file.path : null
        });

        await lostItem.save();
        const matchedFoundItems = await findPotentialMatches(lostItem);

        res.status(201).json({
            message: 'Lost item reported successfully',
            lostItem,
            potentialMatches: matchedFoundItems
        });
    } catch (error) {
        res.status(500).json({ message: 'Error reporting lost item', error: error.message });
    }
});

app.post('/report-found', authenticate, upload.single('photo'), async (req, res) => {
    try {
        const { category, description, location, additionalDetails } = req.body;
        const parsedAdditionalDetails = typeof additionalDetails === 'string' ? JSON.parse(additionalDetails) : additionalDetails;

        const foundItem = new FoundItem({
            userId: req.user.userId,
            category,
            description,
            location,
            additionalDetails: parsedAdditionalDetails,
            photo: req.file ? req.file.path : null
        });

        await foundItem.save();
        const matchedLostItems = await findPotentialMatches(foundItem);

        res.status(201).json({
            message: 'Found item reported successfully',
            foundItem,
            potentialMatches: matchedLostItems
        });
    } catch (error) {
        res.status(500).json({ message: 'Error reporting found item', error: error.message });
    }
});

app.get('/potential-matches/:itemId', authenticate, async (req, res) => {
    try {
        const lostItem = await LostItem.findById(req.params.itemId);
        if (!lostItem) {
            return res.status(404).json({ message: 'Lost item not found' });
        }

        const matchedFoundItems = await findPotentialMatches(lostItem);
        res.status(200).json({ potentialMatches: matchedFoundItems });
    } catch (error) {
        res.status(500).json({ message: 'Error finding matches', error: error.message });
    }
});

app.post('/match-item', authenticate, async (req, res) => {
    try {
        const { lostItemId, foundItemId } = req.body;
        await LostItem.findByIdAndUpdate(lostItemId, { status: 'Matched', matchedItemId: foundItemId });
        await FoundItem.findByIdAndUpdate(foundItemId, { status: 'Matched', matchedLostItemId: lostItemId });

        res.status(200).json({ message: 'Items matched successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error matching items', error: error.message });
    }
});

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
