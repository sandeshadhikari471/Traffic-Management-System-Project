const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../config/database');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = (req, res) => {
  const { name, email, password, phone, address } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide name, email and password.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  const db = getDB();

  db.get('SELECT id FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) return res.status(500).json({ success: false, message: 'Server error.' });

    if (user) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (name, email, password, phone, address) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, phone || null, address || null],
      function (err) {
        if (err) return res.status(500).json({ success: false, message: 'Registration failed.' });

        const token = generateToken(this.lastID);

        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000
        });

        res.status(201).json({
          success: true,
          message: 'Registration successful! Welcome to Himalayan Grand Hotel.',
          token,
          user: { id: this.lastID, name, email, phone, role: 'user' }
        });
      }
    );
  });
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password.' });
  }

  const db = getDB();

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) return res.status(500).json({ success: false, message: 'Server error.' });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user.id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: 'Login successful! Namaste 🙏',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  });
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = (req, res) => {
  const db = getDB();

  db.get(
    'SELECT id, name, email, phone, address, role, created_at FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err || !user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
      res.json({ success: true, user });
    }
  );
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = (req, res) => {
  const { name, phone, address } = req.body;
  const db = getDB();

  db.run(
    'UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?',
    [name, phone, address, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ success: false, message: 'Update failed.' });

      res.json({ success: true, message: 'Profile updated successfully.' });
    }
  );
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const db = getDB();

  db.get('SELECT password FROM users WHERE id = ?', [req.user.id], async (err, user) => {
    if (err || !user) return res.status(404).json({ success: false, message: 'User not found.' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    db.run('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id], (err) => {
      if (err) return res.status(500).json({ success: false, message: 'Password change failed.' });
      res.json({ success: true, message: 'Password changed successfully.' });
    });
  });
};

module.exports = { register, login, getMe, updateProfile, changePassword };
