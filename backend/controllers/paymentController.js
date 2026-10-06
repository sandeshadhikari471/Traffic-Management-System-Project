const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../config/database');

// eSewa configuration
const ESEWA_MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';
const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
const ESEWA_URL = process.env.ESEWA_URL || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
const ESEWA_VERIFY_URL = process.env.ESEWA_VERIFY_URL || 'https://rc.esewa.com.np/api/epay/transaction/status/';

// Generate eSewa signature
const generateEsewaSignature = (message, secret) => {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(message);
  return hmac.digest('base64');
};

// @desc    Initiate eSewa Payment
// @route   POST /api/payments/esewa/initiate
// @access  Private
const initiateEsewaPayment = (req, res) => {
  const { booking_id } = req.body;
  const db = getDB();

  if (!booking_id) {
    return res.status(400).json({ success: false, message: 'Booking ID is required.' });
  }

  db.get('SELECT * FROM bookings WHERE booking_id = ? AND user_id = ?', [booking_id, req.user.id], (err, booking) => {
    if (err) return res.status(500).json({ success: false, message: 'Server error.' });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    if (booking.payment_status === 'paid') {
      return res.status(400).json({ success: false, message: 'Booking already paid.' });
    }

    const paymentId = 'PAY-' + uuidv4().split('-')[0].toUpperCase();
    const amount = booking.total_amount;
    const taxAmount = 0;
    const productServiceCharge = 0;
    const productDeliveryCharge = 0;
    const totalAmount = amount + taxAmount + productServiceCharge + productDeliveryCharge;

    // Base URLs for success/failure redirects (frontend)
    const successUrl = `http://localhost:5000/api/payments/esewa/success`;
    const failureUrl = `http://localhost:5000/api/payments/esewa/failure`;

    const signatureMessage = `total_amount=${totalAmount},transaction_uuid=${paymentId},product_code=${ESEWA_MERCHANT_CODE}`;
    const signature = generateEsewaSignature(signatureMessage, ESEWA_SECRET_KEY);

    // Save payment record
    db.run(
      'INSERT INTO payments (payment_id, booking_id, user_id, amount, method, status) VALUES (?, ?, ?, ?, ?, ?)',
      [paymentId, booking_id, req.user.id, totalAmount, 'esewa', 'pending'],
      (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Payment initiation failed.' });

        res.json({
          success: true,
          message: 'eSewa payment initiated.',
          payment: {
            payment_id: paymentId,
            amount,
            tax_amount: taxAmount,
            product_service_charge: productServiceCharge,
            product_delivery_charge: productDeliveryCharge,
            total_amount: totalAmount,
            transaction_uuid: paymentId,
            product_code: ESEWA_MERCHANT_CODE,
            signature,
            signed_field_names: 'total_amount,transaction_uuid,product_code',
            success_url: successUrl,
            failure_url: failureUrl,
            esewa_payment_url: ESEWA_URL
          }
        });
      }
    );
  });
};

// @desc    eSewa Payment Success Callback
// @route   GET /api/payments/esewa/success
// @access  Public (eSewa redirect)
const esewaSuccess = (req, res) => {
  const { data } = req.query;
  const db = getDB();

  if (!data) {
    return res.redirect(`http://127.0.0.1:5500/frontend/payment-result.html?status=failed&message=No+payment+data+received`);
  }

  try {
    // Decode eSewa response
    const decoded = Buffer.from(data, 'base64').toString('utf-8');
    const paymentData = JSON.parse(decoded);

    const { transaction_uuid, product_code, signed_field_names, signature, status, total_amount } = paymentData;

    // Verify signature
    const signatureFields = signed_field_names.split(',');
    const messageArray = signatureFields.map(field => `${field}=${paymentData[field]}`);
    const message = messageArray.join(',');
    const expectedSignature = generateEsewaSignature(message, ESEWA_SECRET_KEY);

    if (signature !== expectedSignature) {
      return res.redirect(`http://127.0.0.1:5500/frontend/payment-result.html?status=failed&message=Invalid+signature`);
    }

    if (status !== 'COMPLETE') {
      return res.redirect(`http://127.0.0.1:5500/frontend/payment-result.html?status=failed&message=Payment+not+complete`);
    }

    // Update payment and booking
    db.get('SELECT * FROM payments WHERE payment_id = ?', [transaction_uuid], (err, payment) => {
      if (err || !payment) {
        return res.redirect(`http://127.0.0.1:5500/frontend/payment-result.html?status=failed&message=Payment+record+not+found`);
      }

      db.run(
        'UPDATE payments SET status=?, transaction_id=?, esewa_ref_id=? WHERE payment_id=?',
        ['completed', paymentData.transaction_code || transaction_uuid, paymentData.ref_id || '', transaction_uuid],
        (err) => {
          if (err) return res.redirect(`http://127.0.0.1:5500/frontend/payment-result.html?status=failed&message=Update+failed`);

          db.run(
            'UPDATE bookings SET payment_status=?, payment_method=?, status=? WHERE booking_id=?',
            ['paid', 'esewa', 'confirmed', payment.booking_id],
            (err) => {
              if (err) return res.redirect(`http://127.0.0.1:5500/frontend/payment-result.html?status=failed&message=Booking+update+failed`);

              res.redirect(`http://127.0.0.1:5500/frontend/payment-result.html?status=success&booking_id=${payment.booking_id}&amount=${total_amount}&method=eSewa`);
            }
          );
        }
      );
    });
  } catch (e) {
    res.redirect(`http://127.0.0.1:5500/frontend/payment-result.html?status=failed&message=Payment+processing+error`);
  }
};

// @desc    eSewa Payment Failure Callback
// @route   GET /api/payments/esewa/failure
// @access  Public (eSewa redirect)
const esewaFailure = (req, res) => {
  const { data } = req.query;
  let bookingId = 'unknown';

  if (data) {
    try {
      const decoded = Buffer.from(data, 'base64').toString('utf-8');
      const paymentData = JSON.parse(decoded);
      bookingId = paymentData.transaction_uuid || 'unknown';

      const db = getDB();
      db.run('UPDATE payments SET status=? WHERE payment_id=?', ['failed', bookingId]);
    } catch (e) {}
  }

  res.redirect(`http://127.0.0.1:5500/frontend/payment-result.html?status=failed&message=Payment+was+cancelled+or+failed`);
};

// @desc    Cash payment
// @route   POST /api/payments/cash
// @access  Private
const cashPayment = (req, res) => {
  const { booking_id } = req.body;
  const db = getDB();

  db.get('SELECT * FROM bookings WHERE booking_id = ? AND user_id = ?', [booking_id, req.user.id], (err, booking) => {
    if (err) return res.status(500).json({ success: false, message: 'Server error.' });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    if (booking.payment_status === 'paid') {
      return res.status(400).json({ success: false, message: 'Booking already paid.' });
    }

    const paymentId = 'CASH-' + uuidv4().split('-')[0].toUpperCase();

    db.run(
      'INSERT INTO payments (payment_id, booking_id, user_id, amount, method, status) VALUES (?, ?, ?, ?, ?, ?)',
      [paymentId, booking_id, req.user.id, booking.total_amount, 'cash', 'pending'],
      (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Payment record failed.' });

        db.run(
          'UPDATE bookings SET payment_status=?, payment_method=?, status=? WHERE booking_id=?',
          ['cash_pending', 'cash', 'confirmed', booking_id],
          (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Booking update failed.' });

            res.json({
              success: true,
              message: 'Booking confirmed! Please pay NPR ' + booking.total_amount.toLocaleString() + ' at the reception upon check-in.',
              payment_id: paymentId,
              booking_id
            });
          }
        );
      }
    );
  });
};

// @desc    Get payment details
// @route   GET /api/payments/:paymentId
// @access  Private
const getPayment = (req, res) => {
  const db = getDB();

  db.get('SELECT * FROM payments WHERE payment_id = ? AND user_id = ?', [req.params.paymentId, req.user.id], (err, payment) => {
    if (err) return res.status(500).json({ success: false, message: 'Server error.' });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });
    res.json({ success: true, payment });
  });
};

// @desc    Get all payments (Admin)
// @route   GET /api/payments
// @access  Private/Admin
const getAllPayments = (req, res) => {
  const db = getDB();

  const query = `
    SELECT p.*, b.booking_id, u.name as user_name, u.email as user_email
    FROM payments p
    JOIN bookings b ON p.booking_id = b.booking_id
    JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC
  `;

  db.all(query, [], (err, payments) => {
    if (err) return res.status(500).json({ success: false, message: 'Failed to fetch payments.' });
    res.json({ success: true, count: payments.length, payments });
  });
};

module.exports = { initiateEsewaPayment, esewaSuccess, esewaFailure, cashPayment, getPayment, getAllPayments };
