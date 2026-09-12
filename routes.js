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

// File filter (supports PDF, HEIC, JPG, PNG, WEBP, MP4, WEBM, MOV)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/heic-sequence',
    'image/heif-sequence',
    'application/pdf',
    'application/x-pdf',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ];

  const ext = path.extname(file.originalname || '').toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.pdf', '.mp4', '.webm', '.mov'];

  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed formats: PDF, PNG, JPG/JPEG, HEIC, WEBP, MP4.'), false);
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
