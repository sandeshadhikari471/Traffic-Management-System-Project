// Payment page JS with eSewa integration
document.addEventListener('DOMContentLoaded', async () => {
  if (!HGH.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const bookingId = params.get('booking_id');

  if (!bookingId) {
    window.location.href = 'dashboard.html';
    return;
  }

  await loadBookingDetails(bookingId);
  setupPaymentOptions();
});

const loadBookingDetails = async (bookingId) => {
  try {
    const result = await HGH.apiCall(`/bookings/${bookingId}`, 'GET', null, true);

    if (!result.ok) {
      HGH.showToast('Booking not found.', 'error');
      setTimeout(() => window.location.href = 'dashboard.html', 1500);
      return;
    }

    const booking = result.data.booking;
    window._paymentBooking = booking;

    if (booking.payment_status === 'paid') {
      document.getElementById('payment-section').innerHTML = `
        <div class="already-paid">
          <div class="success-icon">✅</div>
          <h3>Booking Already Paid</h3>
          <p>Booking <strong>${bookingId}</strong> has already been paid via ${booking.payment_method || 'eSewa'}.</p>
          <a href="dashboard.html" class="btn btn-primary">View Dashboard</a>
        </div>
      `;
      return;
    }

    // Fill payment summary
    document.getElementById('pay-booking-id').textContent = booking.booking_id;
    document.getElementById('pay-room').textContent = `Room ${booking.room_number} (${booking.room_type})`;
    document.getElementById('pay-checkin').textContent = HGH.formatDate(booking.check_in);
    document.getElementById('pay-checkout').textContent = HGH.formatDate(booking.check_out);
    document.getElementById('pay-nights').textContent = booking.total_nights;
    document.getElementById('pay-guests').textContent = booking.guests;
    document.getElementById('pay-subtotal').textContent = HGH.formatNPR(booking.total_amount);

    const tax = Math.round(booking.total_amount * 0.13);
    const total = booking.total_amount + tax;

    document.getElementById('pay-tax').textContent = HGH.formatNPR(tax);
    document.getElementById('pay-total').textContent = HGH.formatNPR(total);
    window._paymentTotal = total;

    // eSewa pay button amount
    document.getElementById('esewa-amount').textContent = HGH.formatNPR(total);

  } catch (err) {
    HGH.showToast('Failed to load booking details.', 'error');
  }
};

const setupPaymentOptions = () => {
  // Payment method tabs
  document.querySelectorAll('.payment-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.payment-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.payment-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.panel).classList.add('active');
    });
  });
};

// Initiate eSewa Payment
const initiateEsewa = async () => {
  const booking = window._paymentBooking;
  if (!booking) return;

  const btn = document.getElementById('esewa-pay-btn');
  HGH.setLoading(btn, true, 'Preparing eSewa...');

  try {
    const result = await HGH.apiCall('/payments/esewa/initiate', 'POST', {
      booking_id: booking.booking_id
    }, true);

    if (!result.ok) {
      HGH.showToast(result.data.message, 'error');
      HGH.setLoading(btn, false);
      return;
    }

    const { payment } = result.data;

    // Create and submit eSewa payment form
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = payment.esewa_payment_url;

    const fields = {
      amount: payment.amount,
      tax_amount: payment.tax_amount,
      total_amount: payment.total_amount,
      transaction_uuid: payment.transaction_uuid,
      product_code: payment.product_code,
      product_service_charge: payment.product_service_charge,
      product_delivery_charge: payment.product_delivery_charge,
      success_url: payment.success_url,
      failure_url: payment.failure_url,
      signed_field_names: payment.signed_field_names,
      signature: payment.signature
    };

    Object.entries(fields).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);

    HGH.showToast('Redirecting to eSewa...', 'success');
    setTimeout(() => form.submit(), 800);

  } catch (err) {
    HGH.showToast('Payment initiation failed.', 'error');
    HGH.setLoading(btn, false);
  }
};

// Cash payment at hotel
const payCash = async () => {
  const booking = window._paymentBooking;
  if (!booking) return;

  const confirmed = confirm(`Confirm cash payment of ${HGH.formatNPR(window._paymentTotal)} at hotel reception upon check-in?`);
  if (!confirmed) return;

  const btn = document.getElementById('cash-pay-btn');
  HGH.setLoading(btn, true, 'Processing...');

  try {
    const result = await HGH.apiCall('/payments/cash', 'POST', {
      booking_id: booking.booking_id
    }, true);

    if (result.ok) {
      HGH.showToast(result.data.message, 'success');
      setTimeout(() => {
        window.location.href = `payment-result.html?status=cash&booking_id=${booking.booking_id}&amount=${window._paymentTotal}&method=Cash`;
      }, 1500);
    } else {
      HGH.showToast(result.data.message, 'error');
      HGH.setLoading(btn, false);
    }
  } catch (err) {
    HGH.showToast('Payment failed. Please try again.', 'error');
    HGH.setLoading(btn, false);
  }
};
