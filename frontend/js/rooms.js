// Rooms listing page JS
document.addEventListener('DOMContentLoaded', () => {
  loadRooms();
  setupFilters();

  // Pre-fill dates from URL params
  const params = new URLSearchParams(window.location.search);
  if (params.get('check_in')) document.getElementById('filter-checkin').value = params.get('check_in');
  if (params.get('check_out')) document.getElementById('filter-checkout').value = params.get('check_out');
  if (params.get('guests')) document.getElementById('filter-guests').value = params.get('guests');
  if (params.get('type')) document.getElementById('filter-type').value = params.get('type');

  // Set min date for checkin to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('filter-checkin').min = today;
});

const loadRooms = async (filters = {}) => {
  const container = document.getElementById('rooms-container');
  const countEl = document.getElementById('rooms-count');
  container.innerHTML = '<div class="loading-rooms"><div class="loader"></div><p>Loading rooms...</p></div>';

  try {
    let query = new URLSearchParams();
    if (filters.type) query.append('type', filters.type);
    if (filters.min_price) query.append('min_price', filters.min_price);
    if (filters.max_price) query.append('max_price', filters.max_price);
    if (filters.capacity) query.append('capacity', filters.capacity);
    if (filters.check_in) query.append('check_in', filters.check_in);
    if (filters.check_out) query.append('check_out', filters.check_out);

    const result = await HGH.apiCall(`/rooms?${query.toString()}`);

    if (!result.ok) {
      container.innerHTML = '<div class="error-state">Failed to load rooms. Please try again.</div>';
      return;
    }

    const rooms = result.data.rooms;
    if (countEl) countEl.textContent = `${rooms.length} room${rooms.length !== 1 ? 's' : ''} found`;

    if (rooms.length === 0) {
      container.innerHTML = `
        <div class="no-rooms">
          <div class="no-rooms-icon">🏨</div>
          <h3>No rooms available</h3>
          <p>Try adjusting your search filters</p>
          <button onclick="clearFilters()" class="btn btn-primary">Clear Filters</button>
        </div>
      `;
      return;
    }

    container.innerHTML = rooms.map(room => renderRoomCard(room, filters)).join('');

  } catch (err) {
    container.innerHTML = '<div class="error-state">⚠️ Network error. Please ensure the server is running on port 5000.</div>';
  }
};

const renderRoomCard = (room, filters) => {
  const amenitiesList = room.amenities.slice(0, 4).map(a => `<span class="amenity-tag">✓ ${a}</span>`).join('');
  const moreAmenities = room.amenities.length > 4 ? `<span class="amenity-more">+${room.amenities.length - 4} more</span>` : '';

  const bookParams = new URLSearchParams();
  bookParams.append('room_id', room.id);
  if (filters.check_in) bookParams.append('check_in', filters.check_in);
  if (filters.check_out) bookParams.append('check_out', filters.check_out);
  if (filters.capacity) bookParams.append('guests', filters.capacity);

  return `
    <div class="room-card" data-type="${room.type}">
      <div class="room-image">
        <div class="room-image-placeholder">
          <span class="room-type-icon">${HGH.getRoomIcon(room.type)}</span>
        </div>
        <div class="room-badges">
          <span class="room-type-badge">${room.type}</span>
          ${room.is_available ? '<span class="available-badge">Available</span>' : '<span class="unavailable-badge">Occupied</span>'}
        </div>
        <div class="room-floor">Floor ${room.floor}</div>
      </div>
      <div class="room-content">
        <div class="room-header">
          <h3 class="room-title">Room ${room.room_number}</h3>
          <div class="room-capacity">👥 Up to ${room.capacity} guests</div>
        </div>
        <p class="room-description">${room.description}</p>
        <div class="room-amenities">
          ${amenitiesList}
          ${moreAmenities}
        </div>
        <div class="room-footer">
          <div class="room-price">
            <span class="price-amount">${HGH.formatNPR(room.price_per_night)}</span>
            <span class="price-unit">/ night</span>
          </div>
          <div class="room-actions">
            <button onclick="viewRoom(${room.id})" class="btn btn-outline btn-sm">View Details</button>
            <a href="booking.html?${bookParams.toString()}" class="btn btn-primary btn-sm ${!room.is_available ? 'disabled' : ''}">
              ${room.is_available ? 'Book Now' : 'Unavailable'}
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
};

const setupFilters = () => {
  const form = document.getElementById('filter-form');
  const checkIn = document.getElementById('filter-checkin');
  const checkOut = document.getElementById('filter-checkout');

  if (checkIn) {
    checkIn.addEventListener('change', () => {
      if (checkOut) {
        checkOut.min = checkIn.value;
        const nextDay = new Date(checkIn.value);
        nextDay.setDate(nextDay.getDate() + 1);
        if (!checkOut.value || new Date(checkOut.value) <= new Date(checkIn.value)) {
          checkOut.value = nextDay.toISOString().split('T')[0];
        }
      }
      updatePriceEstimate();
    });
  }

  if (checkOut) {
    checkOut.addEventListener('change', updatePriceEstimate);
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      applyFilters();
    });
  }

  // Price range slider
  const priceRange = document.getElementById('price-range');
  const priceDisplay = document.getElementById('price-display');
  if (priceRange && priceDisplay) {
    priceRange.addEventListener('input', () => {
      priceDisplay.textContent = HGH.formatNPR(priceRange.value);
    });
  }
};

const applyFilters = () => {
  const filters = {
    type: document.getElementById('filter-type')?.value || '',
    capacity: document.getElementById('filter-guests')?.value || '',
    check_in: document.getElementById('filter-checkin')?.value || '',
    check_out: document.getElementById('filter-checkout')?.value || '',
    max_price: document.getElementById('price-range')?.value || ''
  };

  Object.keys(filters).forEach(k => { if (!filters[k]) delete filters[k]; });

  loadRooms(filters);
};

const clearFilters = () => {
  document.querySelectorAll('#filter-form input, #filter-form select').forEach(el => el.value = '');
  loadRooms();
};

const updatePriceEstimate = () => {
  const checkIn = document.getElementById('filter-checkin')?.value;
  const checkOut = document.getElementById('filter-checkout')?.value;
  const nightsEl = document.getElementById('nights-estimate');

  if (checkIn && checkOut && nightsEl) {
    const nights = HGH.calculateNights(checkIn, checkOut);
    if (nights > 0) {
      nightsEl.textContent = `${nights} night${nights > 1 ? 's' : ''}`;
      nightsEl.style.display = 'inline';
    }
  }
};

const viewRoom = (roomId) => {
  const modal = document.getElementById('room-modal');
  const modalContent = document.getElementById('modal-room-content');
  if (!modal) return;

  modalContent.innerHTML = '<div class="loader"></div>';
  modal.style.display = 'flex';

  HGH.apiCall(`/rooms/${roomId}`).then(result => {
    if (!result.ok) {
      modalContent.innerHTML = '<p>Failed to load room details.</p>';
      return;
    }

    const room = result.data.room;
    const amenities = room.amenities.map(a => `<li>✓ ${a}</li>`).join('');

    modalContent.innerHTML = `
      <div class="modal-room-header">
        <span class="modal-room-icon">${HGH.getRoomIcon(room.type)}</span>
        <div>
          <h2>Room ${room.room_number} - ${room.type}</h2>
          <p class="modal-room-floor">Floor ${room.floor} | Capacity: ${room.capacity} guests</p>
        </div>
      </div>
      <p class="modal-room-desc">${room.description}</p>
      <div class="modal-amenities">
        <h4>🌿 Amenities & Services</h4>
        <ul class="amenities-list">${amenities}</ul>
      </div>
      <div class="modal-price-section">
        <div class="modal-price">
          <span>${HGH.formatNPR(room.price_per_night)}</span>
          <span class="per-night">per night</span>
        </div>
        <a href="booking.html?room_id=${room.id}" class="btn btn-primary btn-lg">Book This Room</a>
      </div>
    `;
  });
};

// Close modal
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay') || e.target.id === 'close-modal') {
    document.getElementById('room-modal').style.display = 'none';
  }
});
