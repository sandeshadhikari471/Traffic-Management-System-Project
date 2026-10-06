const { getDB } = require('../config/database');

// @desc    Get all rooms (with optional filters)
// @route   GET /api/rooms
// @access  Public
const getRooms = (req, res) => {
  const db = getDB();
  const { type, min_price, max_price, capacity, check_in, check_out } = req.query;

  let query = 'SELECT * FROM rooms WHERE 1=1';
  const params = [];

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  if (min_price) {
    query += ' AND price_per_night >= ?';
    params.push(parseFloat(min_price));
  }

  if (max_price) {
    query += ' AND price_per_night <= ?';
    params.push(parseFloat(max_price));
  }

  if (capacity) {
    query += ' AND capacity >= ?';
    params.push(parseInt(capacity));
  }

  query += ' ORDER BY price_per_night ASC';

  db.all(query, params, (err, rooms) => {
    if (err) return res.status(500).json({ success: false, message: 'Failed to fetch rooms.' });

    // Parse JSON fields
    rooms = rooms.map(room => ({
      ...room,
      amenities: JSON.parse(room.amenities || '[]'),
      images: JSON.parse(room.images || '[]'),
      is_available: room.is_available === 1
    }));

    // If check_in and check_out provided, filter by availability
    if (check_in && check_out) {
      const checkInDate = new Date(check_in);
      const checkOutDate = new Date(check_out);

      const availabilityQuery = `
        SELECT DISTINCT room_id FROM bookings
        WHERE status NOT IN ('cancelled')
        AND payment_status != 'failed'
        AND NOT (check_out <= ? OR check_in >= ?)
      `;

      db.all(availabilityQuery, [check_in, check_out], (err, bookedRooms) => {
        if (err) return res.status(500).json({ success: false, message: 'Availability check failed.' });

        const bookedRoomIds = bookedRooms.map(b => b.room_id);
        const availableRooms = rooms.filter(r => !bookedRoomIds.includes(r.id));

        res.json({ success: true, count: availableRooms.length, rooms: availableRooms });
      });
    } else {
      res.json({ success: true, count: rooms.length, rooms });
    }
  });
};

// @desc    Get single room
// @route   GET /api/rooms/:id
// @access  Public
const getRoom = (req, res) => {
  const db = getDB();

  db.get('SELECT * FROM rooms WHERE id = ?', [req.params.id], (err, room) => {
    if (err) return res.status(500).json({ success: false, message: 'Server error.' });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found.' });

    room.amenities = JSON.parse(room.amenities || '[]');
    room.images = JSON.parse(room.images || '[]');
    room.is_available = room.is_available === 1;

    res.json({ success: true, room });
  });
};

// @desc    Check room availability
// @route   POST /api/rooms/:id/availability
// @access  Public
const checkAvailability = (req, res) => {
  const { check_in, check_out } = req.body;
  const db = getDB();

  if (!check_in || !check_out) {
    return res.status(400).json({ success: false, message: 'Please provide check-in and check-out dates.' });
  }

  const query = `
    SELECT COUNT(*) as count FROM bookings
    WHERE room_id = ?
    AND status NOT IN ('cancelled')
    AND payment_status != 'failed'
    AND NOT (check_out <= ? OR check_in >= ?)
  `;

  db.get(query, [req.params.id, check_in, check_out], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: 'Availability check failed.' });

    const isAvailable = result.count === 0;
    res.json({ success: true, available: isAvailable });
  });
};

// @desc    Get room types
// @route   GET /api/rooms/types
// @access  Public
const getRoomTypes = (req, res) => {
  const db = getDB();

  db.all('SELECT DISTINCT type, MIN(price_per_night) as min_price, MAX(price_per_night) as max_price FROM rooms GROUP BY type ORDER BY min_price', [], (err, types) => {
    if (err) return res.status(500).json({ success: false, message: 'Failed to fetch room types.' });
    res.json({ success: true, types });
  });
};

// @desc    Create room (Admin)
// @route   POST /api/rooms
// @access  Private/Admin
const createRoom = (req, res) => {
  const { room_number, type, description, price_per_night, capacity, amenities, floor } = req.body;
  const db = getDB();

  if (!room_number || !type || !price_per_night || !capacity) {
    return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
  }

  db.run(
    'INSERT INTO rooms (room_number, type, description, price_per_night, capacity, amenities, floor) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [room_number, type, description, price_per_night, capacity, JSON.stringify(amenities || []), floor || 1],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ success: false, message: 'Room number already exists.' });
        }
        return res.status(500).json({ success: false, message: 'Failed to create room.' });
      }
      res.status(201).json({ success: true, message: 'Room created successfully.', id: this.lastID });
    }
  );
};

// @desc    Update room (Admin)
// @route   PUT /api/rooms/:id
// @access  Private/Admin
const updateRoom = (req, res) => {
  const { type, description, price_per_night, capacity, amenities, is_available, floor } = req.body;
  const db = getDB();

  db.run(
    'UPDATE rooms SET type=?, description=?, price_per_night=?, capacity=?, amenities=?, is_available=?, floor=? WHERE id=?',
    [type, description, price_per_night, capacity, JSON.stringify(amenities || []), is_available ? 1 : 0, floor, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ success: false, message: 'Update failed.' });
      if (this.changes === 0) return res.status(404).json({ success: false, message: 'Room not found.' });
      res.json({ success: true, message: 'Room updated successfully.' });
    }
  );
};

// @desc    Delete room (Admin)
// @route   DELETE /api/rooms/:id
// @access  Private/Admin
const deleteRoom = (req, res) => {
  const db = getDB();

  db.run('DELETE FROM rooms WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ success: false, message: 'Delete failed.' });
    if (this.changes === 0) return res.status(404).json({ success: false, message: 'Room not found.' });
    res.json({ success: true, message: 'Room deleted successfully.' });
  });
};

module.exports = { getRooms, getRoom, checkAvailability, getRoomTypes, createRoom, updateRoom, deleteRoom };
