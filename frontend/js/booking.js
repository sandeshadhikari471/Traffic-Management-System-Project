// Booking page JS
document.addEventListener('DOMContentLoaded', async () => {
  if (!HGH.isLoggedIn()) {
    window.location.href = 'login.html?redirect=booking.html' + window.location.search.replace('?', '&');
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const roomId = params.get('room_id');

  if (!roomId) {
    window.location.href = 'rooms.html';
    return;
  }

  // Set min date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('check-in').min = today;

  // Pre-fill from URL params
  if (params.get('check_in')) document.getElementById('check-in').value = params.get('check_in');
  if (params.get('check_out')) document.getElementById('check-out').value = params.get('check_out');
  if (params.get('guests')) document.getElementById('guests').value = params.get('guests');

  await loadRoomDetails(roomId);
  setupBookingForm(roomId);
  updateSummary();
});

const loadRoomDetails = async (roomId) => {
  try {
    const result = await HGH.apiCall(`/rooms/${roomId}`);
    if (!result.ok) {
      HGH.showToast('Room not found.', 'error');
      setTimeout(() => window.location.href = 'rooms.html', 1500);
      return;
    }

    const room = result.data.room;
    window._currentRoom = room;

    // Fill room summary card
    document.getElementById('room-icon').textContent = HGH.getRoomIcon(room.type);
    document.getElementById('room-number').textContent = `Room ${room.room_number}`;
    document.getElementById('room-type').textContent = room.type;
    document.getElementById('room-capacity').textContent = `Up to ${room.capacity} guests`;
    document.getElementById('room-price').textContent = HGH.formatNPR(room.price_per_night) + ' / night';
    document.getElementById('guests').max = room.capacity;

    // Amenities
    const amenitiesEl = document.getElementById('room-amenities-list');
    if (amenitiesEl) {
      amenitiesEl.innerHTML = room.amenities.slice(0, 6).map(a => `<span class="amenity-chip">✓ ${a}</span>`).join('');
    }

    updateSummary();
  } catch (err) {
    HGH.showToast('Failed to load room details.', 'error');
  }
};

const updateSummary = () => {
  const room = window._currentRoom;
  const checkIn = document.getElementById('check-in')?.value;
  const checkOut = document.getElementById('check-out')?.value;

  if (!room || !checkIn || !checkOut) return;

  const nights = HGH.calculateNights(checkIn, checkOut);
  if (nights <= 0) return;

  const subtotal = room.price_per_night * nights;
  const tax = Math.round(subtotal * 0.13); // 13% VAT in Nepal
  const total = subtotal + tax;

  document.getElementById('summary-nights').textContent = nights;
  document.getElementById('summary-rate').textContent = HGH.formatNPR(room.price_per_night);
  document.getElementById('summary-subtotal').textContent = HGH.formatNPR(subtotal);
  document.getElementById('summary-tax').textContent = HGH.formatNPR(tax);
  document.getElementById('summary-total').textContent = HGH.formatNPR(total);
  document.getElementById('summary-checkin').textContent = HGH.formatDate(checkIn);
  document.getElementById('summary-checkout').textContent = HGH.formatDate(checkOut);

  window._bookingTotal = total;
  window._bookingSubtotal = subtotal;
  window._bookingNights = nights;
};

const setupBookingForm = (roomId) => {
  const checkIn = document.getElementById('check-in');
  const checkOut = document.getElementById('check-out');
  const guests = document.getElementById('guests');

  [checkIn, checkOut, guests].forEach(el => {
    if (el) el.addEventListener('change', () => {
      if (checkIn.value && checkOut.value) {
        checkAvailabilityRealtime(roomId);
      }
      updateSummary();
    });
  });

  checkIn.addEventListener('change', () => {
    const nextDay = new Date(checkIn.value);
    nextDay.setDate(nextDay.getDate() + 1);
    checkOut.min = nextDay.toISOString().split('T')[0];
    if (checkOut.value && new Date(checkOut.value) <= new Date(checkIn.value)) {
      checkOut.value = nextDay.toISOString().split('T')[0];
    }
  });

  const form = document.getElementById('booking-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await submitBooking(roomId);
    });
  }
};

let availabilityTimer;
const checkAvailabilityRealtime = (roomId) => {
  clearTimeout(availabilityTimer);
  availabilityTimer = setTimeout(async () => {
    const checkIn = document.getElementById('check-in').value;
    const checkOut = document.getElementById('check-out').value;
    const statusEl = document.getElementById('availability-status');

    if (!checkIn || !checkOut || !statusEl) return;

    statusEl.innerHTML = '<span class="checking">Checking availability...</span>';

    try {
      const result = await HGH.apiCall(`/rooms/${roomId}/availability`, 'POST', { check_in: checkIn, check_out: checkOut });
      if (result.ok) {
        if (result.data.available) {
          statusEl.innerHTML = '<span class="available">✅ Room is available for selected dates!</span>';
        } else {
          statusEl.innerHTML = '<span class="unavailable">❌ Room is not available for selected dates. Please choose different dates.</span>';
        }
      }
    } catch (err) {}
  }, 500);
};

const submitBooking = async (roomId) => {
  const btn = document.getElementById('book-btn');
  const checkIn = document.getElementById('check-in').value;
  const checkOut = document.getElementById('check-out').value;
  const guests = document.getElementById('guests').value;
  const specialRequests = document.getElementById('special-requests').value;

  if (!checkIn || !checkOut || !guests) {
    HGH.showToast('Please fill all required fields.', 'error');
    return;
  }

  HGH.setLoading(btn, true, 'Creating Booking...');

  try {
    const result = await HGH.apiCall('/bookings', 'POST', {
      room_id: parseInt(roomId),
      check_in: checkIn,
      check_out: checkOut,
      guests: parseInt(guests),
      special_requests: specialRequests
    }, true);

    if (result.ok) {
      const booking = result.data.booking;
      HGH.showToast('Booking created! Redirecting to payment...', 'success');
      localStorage.setItem('pending_booking', JSON.stringify(booking));
      setTimeout(() => {
        window.location.href = `payment.html?booking_id=${booking.booking_id}`;
      }, 1500);
    } else {
      HGH.showToast(result.data.message, 'error');
      HGH.setLoading(btn, false);
    }
  } catch (err) {
    HGH.showToast('Booking failed. Please try again.', 'error');
    HGH.setLoading(btn, false);
  }
};
