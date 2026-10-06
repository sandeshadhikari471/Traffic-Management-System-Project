const { getDB } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// @desc    Create booking
// @route   POST /api/bookings
// @access  Private
const createBooking = (req, res) => {
  const { room_id, check_in, check_out, guests, special_requests } = req.body;
  const db = getDB();

  if (!room_id || !check_in || !check_out || !guests) {
    return res.status(400).json({ success: false, message: 'Please provide all required booking details.' });
  }

  const checkIn = new Date(check_in);
  const checkOut = new Date(check_out);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (checkIn < today) {
    return res.status(400).json({ success: false, message: 'Check-in date cannot be in the past.' });
  }

  if (checkOut <= checkIn) {
    return res.status(400).json({ success: false, message: 'Check-out must be after check-in.' });
  }

  const totalNights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

  // Check room exists
  db.get('SELECT * FROM rooms WHERE id = ?', [room_id], (err, room) => {
    if (err) return res.status(500).json({ success: false, message: 'Server error.' });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found.' });

    if (parseInt(guests) > room.capacity) {
      return res.status(400).json({ success: false, message: `Room capacity is ${room.capacity} guests.` });
    }

    // Check availability
    const availQuery = `
      SELECT COUNT(*) as count FROM bookings
      WHERE room_id = ?
      AND status NOT IN ('cancelled')
      AND payment_status != 'failed'
      AND NOT (check_out <= ? OR check_in >= ?)
    `;

    db.get(availQuery, [room_id, check_in, check_out], (err, result) => {
      if (err) return res.status(500).json({ success: false, message: 'Availability check failed.' });

      if (result.count > 0) {
        return res.status(400).json({ success: false, message: 'Room is not available for selected dates.' });
      }

      const totalAmount = room.price_per_night * totalNights;
      const bookingId = 'HGH-' + uuidv4().split('-')[0].toUpperCase();

      db.run(
        `INSERT INTO bookings (booking_id, user_id, room_id, check_in, check_out, guests, total_nights, total_amount, special_requests)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [bookingId, req.user.id, room_id, check_in, check_out, guests, totalNights, totalAmount, special_requests || null],
        function (err) {
          if (err) return res.status(500).json({ success: false, message: 'Booking failed. Please try again.' });

          res.status(201).json({
            success: true,
            message: 'Booking created successfully! Please proceed to payment.',
            booking: {
              id: this.lastID,
              booking_id: bookingId,
              room: { id: room.id, number: room.room_number, type: room.type },
              check_in,
              check_out,
              guests,
              total_nights: totalNights,
              total_amount: totalAmount,
              status: 'pending',
              payment_status: 'unpaid'
            }
          });
        }
      );
    });
  });
};

// @desc    Get user bookings
// @route   GET /api/bookings/my-bookings
// @access  Private
const getMyBookings = (req, res) => {
  const db = getDB();

  const query = `
    SELECT b.*, r.room_number, r.type as room_type, r.price_per_night
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `;

  db.all(query, [req.user.id], (err, bookings) => {
    if (err) return res.status(500).json({ success: false, message: 'Failed to fetch bookings.' });
    res.json({ success: true, count: bookings.length, bookings });
  });
};

// @desc    Get single booking
// @route   GET /api/bookings/:bookingId
// @access  Private
const getBooking = (req, res) => {
  const db = getDB();

  const query = `
    SELECT b.*, r.room_number, r.type as room_type, r.price_per_night, r.amenities, r.description,
           u.name as user_name, u.email as user_email, u.phone as user_phone
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    JOIN users u ON b.user_id = u.id
    WHERE b.booking_id = ?
  `;

  db.get(query, [req.params.bookingId], (err, booking) => {
    if (err) return res.status(500).json({ success: false, message: 'Server error.' });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    // Check ownership or admin
    if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    booking.amenities = JSON.parse(booking.amenities || '[]');
    res.json({ success: true, booking });
  });
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:bookingId/cancel
// @access  Private
const cancelBooking = (req, res) => {
  const db = getDB();

  db.get('SELECT * FROM bookings WHERE booking_id = ?', [req.params.bookingId], (err, booking) => {
    if (err) return res.status(500).json({ success: false, message: 'Server error.' });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Booking already cancelled.' });
    }

    if (booking.status === 'checked_in') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a checked-in booking.' });
    }

    const checkIn = new Date(booking.check_in);
    const now = new Date();
    const hoursDiff = (checkIn - now) / (1000 * 60 * 60);

    let refundStatus = 'no_refund';
    if (hoursDiff >= 48) refundStatus = 'full_refund';
    else if (hoursDiff >= 24) refundStatus = 'partial_refund';

    db.run(
      'UPDATE bookings SET status = ?, payment_status = ? WHERE booking_id = ?',
      ['cancelled', booking.payment_status === 'paid' ? refundStatus : 'unpaid', req.params.bookingId],
      function (err) {
        if (err) return res.status(500).json({ success: false, message: 'Cancellation failed.' });

        res.json({
          success: true,
          message: `Booking cancelled. ${refundStatus === 'full_refund' ? 'Full refund will be processed.' : refundStatus === 'partial_refund' ? '50% refund will be processed.' : 'No refund applicable.'}`,
          refund_status: refundStatus
        });
      }
    );
  });
};

// @desc    Get all bookings (Admin)
// @route   GET /api/bookings
// @access  Private/Admin
const getAllBookings = (req, res) => {
  const db = getDB();
  const { status, payment_status } = req.query;

  let query = `
    SELECT b.*, r.room_number, r.type as room_type, u.name as user_name, u.email as user_email
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    JOIN users u ON b.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (status) { query += ' AND b.status = ?'; params.push(status); }
  if (payment_status) { query += ' AND b.payment_status = ?'; params.push(payment_status); }

  query += ' ORDER BY b.created_at DESC';

  db.all(query, params, (err, bookings) => {
    if (err) return res.status(500).json({ success: false, message: 'Failed to fetch bookings.' });
    res.json({ success: true, count: bookings.length, bookings });
  });
};

// @desc    Update booking status (Admin)
// @route   PUT /api/bookings/:bookingId/status
// @access  Private/Admin
const updateBookingStatus = (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];
  const db = getDB();

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }

  db.run(
    'UPDATE bookings SET status = ? WHERE booking_id = ?',
    [status, req.params.bookingId],
    function (err) {
      if (err) return res.status(500).json({ success: false, message: 'Update failed.' });
      if (this.changes === 0) return res.status(404).json({ success: false, message: 'Booking not found.' });
      res.json({ success: true, message: `Booking status updated to ${status}.` });
    }
  );
};

// @desc    Get dashboard stats (Admin)
// @route   GET /api/bookings/stats
// @access  Private/Admin
const getDashboardStats = (req, res) => {
  const db = getDB();

  const stats = {};

  db.get("SELECT COUNT(*) as total, SUM(CASE WHEN status='confirmed' OR status='checked_in' THEN 1 ELSE 0 END) as active FROM bookings", [], (err, bookingStats) => {
    if (err) return res.status(500).json({ success: false, message: 'Stats fetch failed.' });

    stats.bookings = bookingStats;

    db.get("SELECT SUM(total_amount) as total_revenue FROM bookings WHERE payment_status='paid'", [], (err, revenueStats) => {
      stats.revenue = revenueStats;

      db.get("SELECT COUNT(*) as total, SUM(CASE WHEN is_available=1 THEN 1 ELSE 0 END) as available FROM rooms", [], (err, roomStats) => {
        stats.rooms = roomStats;

        db.get("SELECT COUNT(*) as total FROM users WHERE role='user'", [], (err, userStats) => {
          stats.users = userStats;

          res.json({ success: true, stats });
        });
      });
    });
  });
};

module.exports = { createBooking, getMyBookings, getBooking, cancelBooking, getAllBookings, updateBookingStatus, getDashboardStats };
