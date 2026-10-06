const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'hotel.db');

let db;

const connectDB = () => {
  db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Database connection failed:', err.message);
      process.exit(1);
    }
    console.log('✅ Connected to SQLite database');
  });

  db.run('PRAGMA foreign_keys = ON');

  createTables();
  return db;
};

const createTables = () => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Rooms table
  db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_number TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      price_per_night REAL NOT NULL,
      capacity INTEGER NOT NULL,
      amenities TEXT,
      images TEXT,
      floor INTEGER,
      is_available INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Bookings table
  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      room_id INTEGER NOT NULL,
      check_in DATE NOT NULL,
      check_out DATE NOT NULL,
      guests INTEGER NOT NULL,
      total_nights INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      payment_status TEXT DEFAULT 'unpaid',
      payment_method TEXT,
      special_requests TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    )
  `);

  // Payments table
  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id TEXT UNIQUE NOT NULL,
      booking_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      method TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      transaction_id TEXT,
      esewa_ref_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Seed rooms
  db.get("SELECT COUNT(*) as count FROM rooms", (err, row) => {
    if (!err && row.count === 0) {
      seedRooms();
    }
  });

  // Seed admin user
  db.get("SELECT COUNT(*) as count FROM users WHERE role='admin'", (err, row) => {
    if (!err && row.count === 0) {
      seedAdmin();
    }
  });
};

const seedRooms = () => {
  const rooms = [
    {
      room_number: '101',
      type: 'Standard',
      description: 'Cozy standard room with mountain view, perfect for solo travelers or couples on a budget. Features a comfortable bed, en-suite bathroom, and basic amenities.',
      price_per_night: 3500,
      capacity: 2,
      amenities: JSON.stringify(['WiFi', 'TV', 'AC', 'Hot Water', 'Room Service', 'Mountain View']),
      images: JSON.stringify(['standard1.jpg', 'standard2.jpg']),
      floor: 1
    },
    {
      room_number: '102',
      type: 'Standard',
      description: 'Comfortable standard room with garden view, equipped with twin beds ideal for friends or colleagues traveling together.',
      price_per_night: 3500,
      capacity: 2,
      amenities: JSON.stringify(['WiFi', 'TV', 'AC', 'Hot Water', 'Room Service', 'Garden View']),
      images: JSON.stringify(['standard3.jpg']),
      floor: 1
    },
    {
      room_number: '201',
      type: 'Deluxe',
      description: 'Spacious deluxe room featuring a king-size bed with panoramic Himalayan views. Includes premium toiletries, a work desk, and enhanced amenities.',
      price_per_night: 6500,
      capacity: 2,
      amenities: JSON.stringify(['WiFi', 'Smart TV', 'AC', 'Hot Water', 'Room Service', 'Himalayan View', 'Mini Bar', 'Bathtub', 'Premium Toiletries']),
      images: JSON.stringify(['deluxe1.jpg', 'deluxe2.jpg']),
      floor: 2
    },
    {
      room_number: '202',
      type: 'Deluxe',
      description: 'Elegant deluxe room with valley views and a private balcony. Perfect for romantic getaways with luxurious amenities and personalized service.',
      price_per_night: 7000,
      capacity: 3,
      amenities: JSON.stringify(['WiFi', 'Smart TV', 'AC', 'Hot Water', 'Room Service', 'Valley View', 'Mini Bar', 'Balcony', 'Bathtub']),
      images: JSON.stringify(['deluxe3.jpg']),
      floor: 2
    },
    {
      room_number: '301',
      type: 'Super Deluxe',
      description: 'Premium super deluxe room with breathtaking 270° Himalayan views. Features a living area, king-size bed, and exclusive access to the hotel lounge.',
      price_per_night: 10500,
      capacity: 3,
      amenities: JSON.stringify(['WiFi', '4K Smart TV', 'AC', 'Hot Water', '24/7 Room Service', 'Himalayan View', 'Mini Bar', 'Jacuzzi', 'Living Area', 'Lounge Access', 'Welcome Drinks']),
      images: JSON.stringify(['superdeluxe1.jpg', 'superdeluxe2.jpg']),
      floor: 3
    },
    {
      room_number: '302',
      type: 'Super Deluxe',
      description: 'Magnificent super deluxe family room with interconnecting spaces. Ideal for families with children, offering ample space and top-tier amenities.',
      price_per_night: 12000,
      capacity: 4,
      amenities: JSON.stringify(['WiFi', '4K Smart TV', 'AC', 'Hot Water', '24/7 Room Service', 'Mountain View', 'Mini Bar', 'Jacuzzi', 'Living Area', 'Kids Corner']),
      images: JSON.stringify(['superdeluxe3.jpg']),
      floor: 3
    },
    {
      room_number: '401',
      type: 'Suite',
      description: 'Luxurious suite with a separate living room, dining area, and master bedroom. Features a private terrace with unobstructed Himalayan views and butler service.',
      price_per_night: 18000,
      capacity: 4,
      amenities: JSON.stringify(['WiFi', '4K Smart TV', 'AC', 'Hot Water', '24/7 Butler Service', 'Panoramic View', 'Full Bar', 'Jacuzzi', 'Private Terrace', 'Dining Area', 'Living Room', 'Welcome Hamper', 'Spa Access']),
      images: JSON.stringify(['suite1.jpg', 'suite2.jpg']),
      floor: 4
    },
    {
      room_number: '402',
      type: 'Suite',
      description: 'Exclusive honeymoon suite designed for romance. Features a four-poster bed, rose petal turndown service, private plunge pool, and couple spa access.',
      price_per_night: 20000,
      capacity: 2,
      amenities: JSON.stringify(['WiFi', '4K Smart TV', 'AC', 'Hot Water', '24/7 Butler Service', 'Himalayan View', 'Full Bar', 'Plunge Pool', 'Private Terrace', 'Couple Spa', 'Romantic Setup', 'Champagne']),
      images: JSON.stringify(['suite3.jpg']),
      floor: 4
    },
    {
      room_number: '501',
      type: 'Presidential Suite',
      description: 'The pinnacle of luxury - our Presidential Suite spans the entire top floor with 360° Himalayan views. Features three bedrooms, a private kitchen, dining room, and exclusive dedicated staff.',
      price_per_night: 35000,
      capacity: 6,
      amenities: JSON.stringify(['WiFi', '4K Smart TVs', 'AC', 'Hot Water', 'Dedicated Staff', '360° Himalayan View', 'Full Kitchen', 'Private Bar', 'Infinity Pool Access', 'Private Terrace', 'Dining Room', 'Library', 'Personal Chef', 'Airport Transfer', 'Spa Access', 'Gym Access']),
      images: JSON.stringify(['presidential1.jpg', 'presidential2.jpg']),
      floor: 5
    }
  ];

  const stmt = db.prepare(`
    INSERT INTO rooms (room_number, type, description, price_per_night, capacity, amenities, images, floor)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  rooms.forEach(room => {
    stmt.run(
      room.room_number,
      room.type,
      room.description,
      room.price_per_night,
      room.capacity,
      room.amenities,
      room.images,
      room.floor
    );
  });

  stmt.finalize();
  console.log('✅ Rooms seeded successfully');
};

const seedAdmin = async () => {
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash('admin@hotel123', 10);

  db.run(`
    INSERT INTO users (name, email, password, phone, role)
    VALUES (?, ?, ?, ?, ?)
  `, ['Admin', 'admin@himalayan.com', hashedPassword, '9800000000', 'admin'],
  (err) => {
    if (!err) console.log('✅ Admin user seeded: admin@himalayan.com / admin@hotel123');
  });
};

const getDB = () => db;

module.exports = { connectDB, getDB };
