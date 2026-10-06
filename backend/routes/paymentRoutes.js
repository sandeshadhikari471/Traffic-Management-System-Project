const express = require('express');
const router = express.Router();
const {
  initiateEsewaPayment, esewaSuccess, esewaFailure,
  cashPayment, getPayment, getAllPayments
} = require('../controllers/paymentController');
const { protect, adminOnly } = require('../middleware/auth');

// eSewa callbacks (public - called by eSewa servers)
router.get('/esewa/success', esewaSuccess);
router.get('/esewa/failure', esewaFailure);

// Protected routes
router.use(protect);

router.post('/esewa/initiate', initiateEsewaPayment);
router.post('/cash', cashPayment);
router.get('/', adminOnly, getAllPayments);
router.get('/:paymentId', getPayment);

module.exports = router;
