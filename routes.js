const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authController = require('./authController');
const artworkController = require('./artworkController');
const { verifyToken, verifyAdmin } = require('./authMiddleware');
const adminController = require('./adminController');

// Multer memory storage configuration for Serverless / Vercel compatibility
const storage = multer.memoryStorage();

// File filter (restrict to JPEG, PNG, WEBP, MP4)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and MP4 are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: fileFilter
});

// Middleware wrapper to catch multer errors gracefully
const handleUpload = (req, res, next) => {
  const uploadSingle = upload.single('mediaFile');
  uploadSingle(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

// Authentication routes
router.post('/auth/signup', authController.signup);
router.post('/auth/login', authController.login);
router.get('/auth/session', verifyToken, authController.verifySession);
router.post('/auth/logout', authController.logout);

// Artwork / Gallery routes
router.get('/artworks', artworkController.getArtworks);
router.get('/artworks/my-artworks', verifyToken, artworkController.getMyArtworks);
router.post('/artworks', verifyToken, handleUpload, artworkController.createArtwork);
router.put('/artworks/:id', verifyToken, handleUpload, artworkController.updateArtwork);
router.delete('/artworks/:id', verifyToken, artworkController.deleteArtwork);
router.post('/artworks/:id/like', artworkController.toggleLike);

// Admin routes
router.get('/admin/artists', verifyAdmin, adminController.getArtists);
router.delete('/admin/artists/:id', verifyAdmin, adminController.deleteArtist);
router.get('/admin/artworks', verifyAdmin, adminController.getArtworksAdmin);
router.put('/admin/artworks/:id', verifyAdmin, adminController.updateArtworkAdmin);
router.delete('/admin/artworks/:id', verifyAdmin, adminController.deleteArtworkAdmin);

module.exports = router;
