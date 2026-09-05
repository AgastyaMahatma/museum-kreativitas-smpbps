const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { JWT_SECRET } = require('./authMiddleware');

// User Signup
const signup = async (req, res) => {
  const { artist_name, email, password } = req.body;

  const trimmedName = (artist_name || '').trim();
  const trimmedEmail = (email || '').trim().toLowerCase();
  const rawPassword = password || '';

  if (!trimmedName || !trimmedEmail || !rawPassword) {
    return res.status(400).json({ error: 'artist_name, email, and password are required' });
  }

  try {
    // 1. Check for duplicate artist_name / username
    const existingNameUser = await db.get('SELECT * FROM users WHERE LOWER(artist_name) = ?', [trimmedName.toLowerCase()]);
    if (existingNameUser) {
      return res.status(409).json({ error: 'Artist name / username already taken. Please choose another name.' });
    }

    // 2. Check for duplicate email
    const existingEmailUser = await db.get('SELECT * FROM users WHERE LOWER(email) = ?', [trimmedEmail]);
    if (existingEmailUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // 3. Hash password using bcrypt (10 rounds)
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(rawPassword, saltRounds);

    // 4. Save new user account in Supabase
    await db.run(
      'INSERT INTO users (artist_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [trimmedName, trimmedEmail, password_hash, 'artist']
    );

    const user = await db.get('SELECT id, artist_name, email, role, created_at FROM users WHERE email = ?', [trimmedEmail]);
    if (!user) {
      return res.status(500).json({ error: 'Failed to complete account registration.' });
    }

    // 5. Issue JWT session token
    const token = jwt.sign(
      { id: user.id, email: user.email, artist_name: user.artist_name, role: user.role || 'artist' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(201).json({
      message: 'Artist registered successfully',
      user: {
        id: user.id,
        artist_name: user.artist_name,
        email: user.email,
        role: user.role || 'artist',
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// User Login (with Remember Me option)
const login = async (req, res) => {
  const { email, password, rememberMe = false } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await db.get('SELECT * FROM users WHERE LOWER(email) = ?', [email.toLowerCase().trim()]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password strictly using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const expiresIn = rememberMe ? '30d' : '1d';
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    const token = jwt.sign(
      { id: user.id, email: user.email, artist_name: user.artist_name, role: user.role || 'artist' },
      JWT_SECRET,
      { expiresIn }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge
    });

    return res.status(200).json({
      message: 'Logged in successfully',
      user: {
        id: user.id,
        artist_name: user.artist_name,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const verifySession = (req, res) => {
  return res.status(200).json({
    authenticated: true,
    user: req.user
  });
};

const logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  return res.status(200).json({ message: 'Logged out successfully' });
};

module.exports = {
  signup,
  login,
  verifySession,
  logout
};
