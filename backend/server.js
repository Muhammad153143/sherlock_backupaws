const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');
const { initAIService } = require('./utils/aiService');

dotenv.config();

const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Adjust as needed for production
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5000;
app.set('trust proxy', 1);

// Socket.IO Logic
io.on('connection', (socket) => {
    console.log('🔌 New client connected:', socket.id);

    socket.on('joinRoom', ({ itemId }) => {
        socket.join(itemId);
        console.log(`👤 User joined room: ${itemId}`);
    });

    socket.on('sendMessage', async (data) => {
        // data: { itemId, senderId, receiverId, message }
        const { itemId, message } = data;
        
        // Broadcast to room
        io.to(itemId).emit('receiveMessage', data);
        console.log(`💬 Message sent in room ${itemId}: ${message}`);
    });

    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected');
    });
});

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:5000"
];

app.use(cors({
  origin: function(origin, callback) {

    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(null, true); // allow temporarily
  },
  credentials: true
}));


app.use(express.json());
// Rate Limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/v1', apiLimiter);

// Serve static files (uploads)
app.use('api/v1/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve Frontend
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/css', express.static(path.join(__dirname, '../frontend/css')));
app.use('/js', express.static(path.join(__dirname, '../frontend/js')));
app.use('/assets', express.static(path.join(__dirname, '../frontend/assets')));

// Handle direct HTML requests
app.get('/:page.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', `${req.params.page}.html`));
});

// Database Connection
mongoose.connect(process.env.MONGO_URI)
.then(async () => {
    console.log('✅ MongoDB Connected');
    
    // AI Service Health Check (non-blocking)
    try {
        await initAIService();
    } catch (aiErr) {
        // initAIService handles its own logging and never throws, but this is here for safety
        console.warn('AI Service unavailable (non-blocking)');
    }
})
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// Routes
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/items', require('./routes/itemRoutes'));
app.use('/api/v1/chat', require('./routes/chatRoutes'));
app.get('/reset-password/:token', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/reset-password.html'));
});

// Test Route
app.get('/', (req, res) => {
    res.send('SherLock Backend is Running 🚀');
});

// Error Handler (must have 4 args to be recognized by Express)
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.statusCode || 500).json({ message: err.message || 'Server Error' });
});

// Start Server
server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
