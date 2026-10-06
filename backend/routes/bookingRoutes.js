const express = require('express');
const router = express.Router();
const {
  createBooking, getMyBookings, getBooking,
  cancelBooking, getAllBookings, updateBookingStatus, getDashboardStats
} = require('../controllers/bookingController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);

router.get('/stats', adminOnly, getDashboardStats);
router.get('/my-bookings', getMyBookings);
router.get('/', adminOnly, getAllBookings);
router.post('/', createBooking);
router.get('/:bookingId', getBooking);
router.put('/:bookingId/cancel', cancelBooking);
router.put('/:bookingId/status', adminOnly, updateBookingStatus);

module.exports = router;
