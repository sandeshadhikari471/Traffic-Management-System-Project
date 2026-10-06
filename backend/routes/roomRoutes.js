const express = require('express');
const router = express.Router();
const {
  getRooms, getRoom, checkAvailability, getRoomTypes,
  createRoom, updateRoom, deleteRoom
} = require('../controllers/roomController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/types', getRoomTypes);
router.get('/', getRooms);
router.get('/:id', getRoom);
router.post('/:id/availability', checkAvailability);

// Admin routes
router.post('/', protect, adminOnly, createRoom);
router.put('/:id', protect, adminOnly, updateRoom);
router.delete('/:id', protect, adminOnly, deleteRoom);

module.exports = router;
