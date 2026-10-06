require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/database');

// Initialize app
const app = express();

// Connect Database
connectDB();

// Middleware
app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000', 'null'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for frontend (optional - if running from same server)
app.use('/frontend', express.static(path.join(__dirname, '..', 'frontend')));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/rooms', require('./routes/roomRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Himalayan Grand Hotel API is running 🏔️',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Root
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🏨 Himalayan Grand Hotel - Hotel Management System',
    description: 'Nepal\'s Premier Luxury Hotel Management API',
    docs: '/api/health',
    endpoints: {
      auth: '/api/auth',
      rooms: '/api/rooms',
      bookings: '/api/bookings',
      payments: '/api/payments'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('');
  console.log('🏔️  =============================================');
  console.log('🏨  Himalayan Grand Hotel - Management System');
  console.log('🌿  Server running on http://localhost:' + PORT);
  console.log('📡  API Base: http://localhost:' + PORT + '/api');
  console.log('🇳🇵  Nepal\'s Premier Hotel System | NPR Currency');
  console.log('🏔️  =============================================');
  console.log('');
});

module.exports = app;
