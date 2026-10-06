// Dashboard JS
document.addEventListener('DOMContentLoaded', async () => {
  if (!HGH.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  await loadUserProfile();
  await loadMyBookings();
  setupProfileForm();
});

const loadUserProfile = async () => {
  try {
    const result = await HGH.apiCall('/auth/me', 'GET', null, true);
    if (result.ok) {
      const user = result.data.user;
      document.getElementById('profile-name').textContent = user.name;
      document.getElementById('profile-email').textContent = user.email;
      document.getElementById('profile-initial').textContent = user.name.charAt(0).toUpperCase();
      document.getElementById('profile-since').textContent = HGH.formatDate(user.created_at);

      // Fill profile form
      if (document.getElementById('form-name')) document.getElementById('form-name').value = user.name;
      if (document.getElementById('form-phone')) document.getElementById('form-phone').value = user.phone || '';
      if (document.getElementById('form-address')) document.getElementById('form-address').value = user.address || '';

      // Admin link
      if (user.role === 'admin') {
        const adminLink = document.getElementById('admin-link');
        if (adminLink) adminLink.style.display = 'block';
      }
    }
  } catch (err) {
    HGH.showToast('Failed to load profile.', 'error');
  }
};

const loadMyBookings = async () => {
  const container = document.getElementById('bookings-list');
  if (!container) return;

  container.innerHTML = '<div class="loading-state"><div class="loader"></div><p>Loading bookings...</p></div>';

  try {
    const result = await HGH.apiCall('/bookings/my-bookings', 'GET', null, true);

    if (!result.ok) {
      container.innerHTML = '<div class="error-state">Failed to load bookings.</div>';
      return;
    }

    const bookings = result.data.bookings;

    // Stats
    const stats = {
      total: bookings.length,
      confirmed: bookings.filter(b => b.status === 'confirmed' || b.status === 'checked_in').length,
      upcoming: bookings.filter(b => new Date(b.check_in) > new Date() && b.status !== 'cancelled').length
    };

    const totalSpent = bookings
      .filter(b => b.payment_status === 'paid')
      .reduce((sum, b) => sum + b.total_amount, 0);

    if (document.getElementById('stat-total')) document.getElementById('stat-total').textContent = stats.total;
    if (document.getElementById('stat-active')) document.getElementById('stat-active').textContent = stats.confirmed;
    if (document.getElementById('stat-upcoming')) document.getElementById('stat-upcoming').textContent = stats.upcoming;
    if (document.getElementById('stat-spent')) document.getElementById('stat-spent').textContent = HGH.formatNPR(totalSpent);

    if (bookings.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🏨</div>
          <h3>No Bookings Yet</h3>
          <p>You haven't made any bookings. Explore our beautiful rooms!</p>
          <a href="rooms.html" class="btn btn-primary">Explore Rooms</a>
        </div>
      `;
      return;
    }

    container.innerHTML = bookings.map(renderBookingCard).join('');

  } catch (err) {
    container.innerHTML = '<div class="error-state">⚠️ Network error.</div>';
  }
};

const renderBookingCard = (booking) => {
  const isUpcoming = new Date(booking.check_in) > new Date() && booking.status !== 'cancelled';
  const canCancel = booking.status !== 'cancelled' && booking.status !== 'checked_in' && booking.status !== 'checked_out';

  return `
    <div class="booking-card ${booking.status}">
      <div class="booking-card-header">
        <div class="booking-id-section">
          <span class="booking-badge">${HGH.getRoomIcon(booking.room_type)}</span>
          <div>
            <h4>${booking.room_type} - Room ${booking.room_number}</h4>
            <span class="booking-ref">Ref: ${booking.booking_id}</span>
          </div>
        </div>
        <div class="booking-status-section">
          ${HGH.getStatusBadge(booking.status)}
          ${HGH.getStatusBadge(booking.payment_status)}
        </div>
      </div>
      <div class="booking-card-body">
        <div class="booking-dates">
          <div class="date-box">
            <span class="date-label">Check-in</span>
            <span class="date-value">${HGH.formatDate(booking.check_in)}</span>
          </div>
          <div class="date-divider">→</div>
          <div class="date-box">
            <span class="date-label">Check-out</span>
            <span class="date-value">${HGH.formatDate(booking.check_out)}</span>
          </div>
        </div>
        <div class="booking-details-row">
          <span>🌙 ${booking.total_nights} night${booking.total_nights > 1 ? 's' : ''}</span>
          <span>👥 ${booking.guests} guest${booking.guests > 1 ? 's' : ''}</span>
          <span>💰 ${HGH.formatNPR(booking.total_amount)}</span>
        </div>
      </div>
      <div class="booking-card-footer">
        ${booking.payment_status === 'unpaid' ? `<a href="payment.html?booking_id=${booking.booking_id}" class="btn btn-primary btn-sm">💳 Pay Now</a>` : ''}
        ${canCancel ? `<button onclick="cancelBooking('${booking.booking_id}')" class="btn btn-danger btn-sm">Cancel</button>` : ''}
        <button onclick="viewBookingDetails('${booking.booking_id}')" class="btn btn-outline btn-sm">View Details</button>
      </div>
    </div>
  `;
};

const cancelBooking = async (bookingId) => {
  if (!confirm('Are you sure you want to cancel this booking? Cancellation policy applies.')) return;

  try {
    const result = await HGH.apiCall(`/bookings/${bookingId}/cancel`, 'PUT', null, true);
    if (result.ok) {
      HGH.showToast(result.data.message, 'success');
      await loadMyBookings();
    } else {
      HGH.showToast(result.data.message, 'error');
    }
  } catch (err) {
    HGH.showToast('Cancellation failed.', 'error');
  }
};

const viewBookingDetails = async (bookingId) => {
  const modal = document.getElementById('booking-modal');
  const content = document.getElementById('modal-booking-content');
  if (!modal) return;

  content.innerHTML = '<div class="loader"></div>';
  modal.style.display = 'flex';

  try {
    const result = await HGH.apiCall(`/bookings/${bookingId}`, 'GET', null, true);
    if (!result.ok) {
      content.innerHTML = '<p>Failed to load booking details.</p>';
      return;
    }

    const b = result.data.booking;
    content.innerHTML = `
      <h3>Booking Details</h3>
      <div class="detail-grid">
        <div><strong>Booking ID:</strong> ${b.booking_id}</div>
        <div><strong>Room:</strong> ${b.room_type} - Room ${b.room_number}</div>
        <div><strong>Check-in:</strong> ${HGH.formatDate(b.check_in)}</div>
        <div><strong>Check-out:</strong> ${HGH.formatDate(b.check_out)}</div>
        <div><strong>Guests:</strong> ${b.guests}</div>
        <div><strong>Nights:</strong> ${b.total_nights}</div>
        <div><strong>Amount:</strong> ${HGH.formatNPR(b.total_amount)}</div>
        <div><strong>Status:</strong> ${HGH.getStatusBadge(b.status)}</div>
        <div><strong>Payment:</strong> ${HGH.getStatusBadge(b.payment_status)}</div>
        ${b.special_requests ? `<div><strong>Special Requests:</strong> ${b.special_requests}</div>` : ''}
      </div>
      ${b.payment_status === 'unpaid' ? `<a href="payment.html?booking_id=${b.booking_id}" class="btn btn-primary" style="margin-top:1rem">Pay Now</a>` : ''}
    `;
  } catch (err) {
    content.innerHTML = '<p>Error loading details.</p>';
  }
};

const setupProfileForm = () => {
  const form = document.getElementById('profile-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      HGH.setLoading(btn, true, 'Saving...');

      const result = await HGH.apiCall('/auth/profile', 'PUT', {
        name: document.getElementById('form-name').value,
        phone: document.getElementById('form-phone').value,
        address: document.getElementById('form-address').value
      }, true);

      if (result.ok) {
        HGH.showToast('Profile updated!', 'success');
        const user = HGH.getUser();
        user.name = document.getElementById('form-name').value;
        localStorage.setItem('hgh_user', JSON.stringify(user));
        HGH.updateNav();
      } else {
        HGH.showToast(result.data.message, 'error');
      }
      HGH.setLoading(btn, false);
    });
  }

  const pwForm = document.getElementById('password-form');
  if (pwForm) {
    pwForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPw = document.getElementById('new-password').value;
      const confirmPw = document.getElementById('confirm-new-password').value;

      if (newPw !== confirmPw) {
        HGH.showToast('Passwords do not match!', 'error');
        return;
      }

      const btn = pwForm.querySelector('button[type="submit"]');
      HGH.setLoading(btn, true, 'Changing...');

      const result = await HGH.apiCall('/auth/change-password', 'PUT', {
        currentPassword: document.getElementById('current-password').value,
        newPassword: newPw
      }, true);

      if (result.ok) {
        HGH.showToast('Password changed!', 'success');
        pwForm.reset();
      } else {
        HGH.showToast(result.data.message, 'error');
      }
      HGH.setLoading(btn, false);
    });
  }
};

// Tab switching
const switchTab = (tabName) => {
  document.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');
};

// Close modal
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay') || e.target.id === 'close-booking-modal') {
    document.getElementById('booking-modal').style.display = 'none';
  }
});
