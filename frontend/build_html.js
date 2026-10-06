const fs = require('fs');
const path = require('path');

const BASE_DIR = __dirname;

const header = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Himalayan Grand Hotel</title>
  <link rel="stylesheet" href="css/style.css">
  <style>
    .tab-panel { display: none; }
    .tab-panel.active { display: block; }
    .payment-panel { display: none; }
    .payment-panel.active { display: block; }
  </style>
</head>
<body>
<nav class="navbar">
  <div class="nav-inner">
    <a href="index.html" class="nav-brand">
      <span class="nav-brand-icon">🏔️</span>
      <div class="nav-brand-text">
        <span class="hotel-name">Himalayan Grand Hotel</span>
        <span class="hotel-sub">Kathmandu, Nepal</span>
      </div>
    </a>
    <ul class="nav-menu" id="nav-menu">
      <li><a href="index.html">Home</a></li>
      <li><a href="rooms.html">Rooms</a></li>
      <li><a href="index.html#amenities">Amenities</a></li>
      <li><a href="index.html#about">About</a></li>
      <li><a href="index.html#contact">Contact</a></li>
    </ul>
    <div style="display:flex;align-items:center;gap:1rem;">
      <div id="nav-auth-links">
        <a href="login.html" class="btn btn-outline-light btn-sm">Login</a>
        <a href="register.html" class="btn btn-secondary btn-sm">Sign Up</a>
      </div>
      <div id="nav-user-menu" class="nav-user-menu" style="display:none;">
        <button class="nav-user-btn">
          <div class="user-avatar-sm" id="user-initial">U</div>
          <span id="nav-user-name">User</span> ▾
        </button>
        <div class="user-dropdown" id="user-dropdown">
          <a href="dashboard.html">🏠 My Dashboard</a>
          <hr>
          <button onclick="HGH.logout()">🚪 Logout</button>
        </div>
      </div>
      <button class="menu-toggle" id="menu-toggle"><span></span><span></span><span></span></button>
    </div>
  </div>
</nav>
<main style="min-height: 80vh; padding: 2rem;">
`;

const footer = `
</main>
<footer class="footer">
  <div class="footer-bottom">
    <p>© 2024 Himalayan Grand Hotel.</p>
  </div>
</footer>
<script src="js/main.js"></script>
</body>
</html>
`;

const pages = {
    "login.html": `
<div style="max-width: 400px; margin: auto;">
  <h2>Login</h2>
  <form id="login-form">
    <label>Email</label>
    <input type="email" id="email" required style="width:100%; margin-bottom:1rem; padding:0.5rem;" />
    <label>Password</label>
    <div style="display:flex;">
      <input type="password" id="password" required style="width:100%; padding:0.5rem;" />
      <button type="button" class="password-toggle">👁️</button>
    </div>
    <button type="submit" class="btn btn-primary" style="width:100%; margin-top:1rem;">Login</button>
  </form>
</div>
<script src="js/auth.js"></script>
`,
    
    "register.html": `
<div style="max-width: 400px; margin: auto;">
  <h2>Register</h2>
  <form id="register-form">
    <label>Name</label><input type="text" id="name" required style="width:100%; margin-bottom:1rem; padding:0.5rem;" />
    <label>Email</label><input type="email" id="email" required style="width:100%; margin-bottom:1rem; padding:0.5rem;" />
    <label>Phone</label><input type="text" id="phone" required style="width:100%; margin-bottom:1rem; padding:0.5rem;" />
    <label>Address</label><input type="text" id="address" required style="width:100%; margin-bottom:1rem; padding:0.5rem;" />
    <label>Password</label>
    <div style="display:flex;">
      <input type="password" id="password" required style="width:100%; padding:0.5rem;" />
      <button type="button" class="password-toggle">👁️</button>
    </div>
    <div id="password-strength" class="strength-bar" style="height:4px; margin-bottom:1rem;"></div>
    <label>Confirm Password</label>
    <div style="display:flex;">
      <input type="password" id="confirm-password" required style="width:100%; padding:0.5rem;" />
      <button type="button" class="password-toggle">👁️</button>
    </div>
    <button type="submit" class="btn btn-primary" style="width:100%; margin-top:1rem;">Register</button>
  </form>
</div>
<script src="js/auth.js"></script>
`,

    "rooms.html": `
<div style="max-width: 1200px; margin: auto;">
  <h2>Rooms</h2>
  <form id="filter-form" style="display:flex; gap:1rem; margin-bottom:2rem; flex-wrap:wrap; align-items:center;">
    <input type="date" id="filter-checkin" style="padding:0.5rem;" />
    <input type="date" id="filter-checkout" style="padding:0.5rem;" />
    <input type="number" id="filter-guests" placeholder="Guests" style="padding:0.5rem;" />
    <select id="filter-type" style="padding:0.5rem;">
      <option value="">All Types</option>
      <option value="Standard">Standard</option>
      <option value="Deluxe">Deluxe</option>
      <option value="Super Deluxe">Super Deluxe</option>
      <option value="Suite">Suite</option>
      <option value="Presidential Suite">Presidential Suite</option>
    </select>
    <input type="range" id="price-range" min="0" max="50000" step="500" value="50000" />
    <span id="price-display">NPR 50,000</span>
    <button type="submit" class="btn btn-primary">Filter</button>
    <span id="nights-estimate" style="display:none;"></span>
  </form>
  <div id="rooms-count" style="margin-bottom:1rem; font-weight:bold;"></div>
  <div id="rooms-container" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:2rem;"></div>
  
  <div id="room-modal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); align-items:center; justify-content:center;">
    <div style="background:#fff; padding:2rem; border-radius:8px; max-width:600px; width:100%; position:relative;">
      <div id="modal-room-content"></div>
      <button id="close-modal" class="btn" style="margin-top:1rem;">Close</button>
    </div>
  </div>
</div>
<script src="js/rooms.js"></script>
`,

    "dashboard.html": `
<div style="max-width: 1000px; margin: auto;">
  <h2>Dashboard</h2>
  <div style="display:flex; gap:2rem; margin-bottom:2rem;">
    <div style="background:#f4f4f4; padding:1rem; border-radius:8px; width:300px;">
      <div id="profile-initial" style="width:50px; height:50px; background:#ccc; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; margin-bottom:1rem;"></div>
      <h3 id="profile-name"></h3>
      <p id="profile-email"></p>
      <p>Member since: <span id="profile-since"></span></p>
      <a href="admin.html" id="admin-link" style="display:none;" class="btn btn-outline-light">Admin Panel</a>
    </div>
    <div style="flex:1;">
      <div style="display:flex; gap:1rem; margin-bottom:1rem;">
        <button class="dashboard-tab active" data-tab="bookings" onclick="switchTab('bookings')">My Bookings</button>
        <button class="dashboard-tab" data-tab="profile" onclick="switchTab('profile')">Profile</button>
      </div>
      
      <div id="tab-bookings" class="tab-panel active">
        <div style="display:flex; gap:1rem; margin-bottom:1rem;">
          <div style="background:#eef; padding:1rem; border-radius:8px;">Total: <span id="stat-total">0</span></div>
          <div style="background:#efe; padding:1rem; border-radius:8px;">Active: <span id="stat-active">0</span></div>
          <div style="background:#ffe; padding:1rem; border-radius:8px;">Upcoming: <span id="stat-upcoming">0</span></div>
          <div style="background:#fef; padding:1rem; border-radius:8px;">Spent: <span id="stat-spent">NPR 0</span></div>
        </div>
        <div id="bookings-list" style="display:flex; flex-direction:column; gap:1rem;"></div>
      </div>
      
      <div id="tab-profile" class="tab-panel">
        <form id="profile-form">
          <label>Name</label><input type="text" id="form-name" style="width:100%; padding:0.5rem; margin-bottom:1rem;" />
          <label>Phone</label><input type="text" id="form-phone" style="width:100%; padding:0.5rem; margin-bottom:1rem;" />
          <label>Address</label><input type="text" id="form-address" style="width:100%; padding:0.5rem; margin-bottom:1rem;" />
          <button type="submit" class="btn btn-primary">Save Profile</button>
        </form>
        <hr style="margin:2rem 0;" />
        <form id="password-form">
          <label>Current Password</label><input type="password" id="current-password" style="width:100%; padding:0.5rem; margin-bottom:1rem;" />
          <label>New Password</label><input type="password" id="new-password" style="width:100%; padding:0.5rem; margin-bottom:1rem;" />
          <label>Confirm New Password</label><input type="password" id="confirm-new-password" style="width:100%; padding:0.5rem; margin-bottom:1rem;" />
          <button type="submit" class="btn btn-primary">Change Password</button>
        </form>
      </div>
    </div>
  </div>

  <div id="booking-modal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); align-items:center; justify-content:center;">
    <div style="background:#fff; padding:2rem; border-radius:8px; max-width:600px; width:100%;">
      <div id="modal-booking-content"></div>
      <button id="close-booking-modal" class="btn" style="margin-top:1rem;">Close</button>
    </div>
  </div>
</div>
<script src="js/dashboard.js"></script>
`,

    "booking.html": `
<div style="max-width: 800px; margin: auto;">
  <h2>Complete Your Booking</h2>
  <div style="display:flex; gap:2rem;">
    <div style="flex:1;">
      <form id="booking-form">
        <label>Check-In Date</label><input type="date" id="check-in" required style="width:100%; padding:0.5rem; margin-bottom:1rem;" />
        <label>Check-Out Date</label><input type="date" id="check-out" required style="width:100%; padding:0.5rem; margin-bottom:1rem;" />
        <label>Guests</label><input type="number" id="guests" required min="1" style="width:100%; padding:0.5rem; margin-bottom:1rem;" />
        <div id="availability-status" style="margin-bottom:1rem;"></div>
        <label>Special Requests</label><textarea id="special-requests" rows="4" style="width:100%; padding:0.5rem; margin-bottom:1rem;"></textarea>
        <button type="submit" id="book-btn" class="btn btn-primary" style="width:100%;">Proceed to Payment</button>
      </form>
    </div>
    <div style="width:300px; background:#f9f9f9; padding:1.5rem; border-radius:8px;">
      <h3>Room Summary</h3>
      <div id="room-icon" style="font-size:2rem; margin-bottom:0.5rem;"></div>
      <div id="room-number" style="font-weight:bold;"></div>
      <div id="room-type"></div>
      <div id="room-capacity"></div>
      <div id="room-price" style="margin-bottom:1rem;"></div>
      <div id="room-amenities-list" style="margin-bottom:1rem; display:flex; flex-wrap:wrap; gap:0.5rem;"></div>
      <hr style="margin-bottom:1rem;" />
      <div>Nights: <span id="summary-nights"></span></div>
      <div>Rate: <span id="summary-rate"></span></div>
      <div>Check-in: <span id="summary-checkin"></span></div>
      <div>Check-out: <span id="summary-checkout"></span></div>
      <hr style="margin-bottom:1rem;" />
      <div>Subtotal: <span id="summary-subtotal"></span></div>
      <div>Tax (13%): <span id="summary-tax"></span></div>
      <h3 style="margin-top:0.5rem;">Total: <span id="summary-total"></span></h3>
    </div>
  </div>
</div>
<script src="js/booking.js"></script>
`,

    "payment.html": `
<div style="max-width: 800px; margin: auto;" id="payment-section">
  <h2>Payment</h2>
  <div style="background:#f9f9f9; padding:1.5rem; border-radius:8px; margin-bottom:2rem;">
    <h3>Booking Summary</h3>
    <p>Booking ID: <span id="pay-booking-id"></span></p>
    <p>Room: <span id="pay-room"></span></p>
    <p>Check-in: <span id="pay-checkin"></span></p>
    <p>Check-out: <span id="pay-checkout"></span></p>
    <p>Nights: <span id="pay-nights"></span> | Guests: <span id="pay-guests"></span></p>
    <p>Subtotal: <span id="pay-subtotal"></span></p>
    <p>Tax: <span id="pay-tax"></span></p>
    <h3 style="margin-top:0.5rem;">Total to Pay: <span id="pay-total"></span></h3>
  </div>
  
  <div style="display:flex; gap:1rem; margin-bottom:1rem;">
    <button class="payment-tab active btn btn-primary" data-panel="panel-esewa">eSewa</button>
    <button class="payment-tab btn btn-outline" data-panel="panel-cash">Pay at Hotel</button>
  </div>
  
  <div id="panel-esewa" class="payment-panel active" style="padding:1.5rem; border:1px solid #ccc; border-radius:8px;">
    <h3>Pay with eSewa</h3>
    <p>Amount: <span id="esewa-amount"></span></p>
    <button id="esewa-pay-btn" class="btn btn-success" onclick="initiateEsewa()">Pay via eSewa</button>
  </div>
  
  <div id="panel-cash" class="payment-panel" style="padding:1.5rem; border:1px solid #ccc; border-radius:8px;">
    <h3>Pay at Hotel (Cash)</h3>
    <p>You can pay in cash upon arrival at the hotel.</p>
    <button id="cash-pay-btn" class="btn btn-primary" onclick="payCash()">Confirm Cash Payment</button>
  </div>
</div>
<script src="js/payment.js"></script>
`
};

for (const [filename, content] of Object.entries(pages)) {
    const filepath = path.join(BASE_DIR, filename);
    fs.writeFileSync(filepath, header + content + footer, 'utf8');
    console.log("Created " + filename);
}
