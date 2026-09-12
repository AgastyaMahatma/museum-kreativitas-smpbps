const db = require('./db');
const fs = require('fs').promises;
const path = require('path');

// Helper to delete a local media file if it exists
const deleteLocalFile = async (mediaUrl) => {
  if (mediaUrl && mediaUrl.startsWith('/uploads/')) {
    try {
      const filePath = path.join(__dirname, mediaUrl);
      await fs.unlink(filePath);
      console.log(`Successfully cleaned up local file: ${filePath}`);
    } catch (err) {
      console.error(`Failed to delete local file: ${mediaUrl}`, err);
    }
  }
};

// Get all published artworks with artist details
const getArtworks = async (req, res) => {
  const deviceFingerprint = req.query.device_fingerprint || '';
  try {
    const artworks = await db.query(
      `SELECT a.*, u.artist_name 
       FROM artworks a 
       JOIN users u ON a.artist_id = u.id 
       ORDER BY a.upload_date DESC`
    );

    let likedArtworkIds = new Set();
    if (deviceFingerprint) {
      const likedRecords = await db.query(
        'SELECT artwork_id FROM guest_likes WHERE device_fingerprint = ?',
        [deviceFingerprint]
      );
      likedRecords.forEach(rec => likedArtworkIds.add(rec.artwork_id));
    }

    const response = artworks.map(art => ({
      ...art,
      liked: likedArtworkIds.has(art.id)
    }));

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching artworks:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get current artist's own artworks
const getMyArtworks = async (req, res) => {
  const artist_id = req.user.id;
  try {
    const artworks = await db.query(
      `SELECT a.*, u.artist_name 
       FROM artworks a 
       JOIN users u ON a.artist_id = u.id 
       WHERE a.artist_id = ?
       ORDER BY a.upload_date DESC`,
      [artist_id]
    );

    return res.status(200).json(artworks);
  } catch (error) {
    console.error('Error fetching my artworks:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new artwork (Authenticated)
const createArtwork = async (req, res) => {
  const { title, art_type, description = '' } = req.body;
  let media_url = req.body.media_url;
  const artist_id = req.user.id;

  if (req.file) {
    if (req.file.buffer) {
      const b64 = req.file.buffer.toString('base64');
      media_url = `data:${req.file.mimetype};base64,${b64}`;
    } else if (req.file.filename) {
      media_url = `/uploads/${req.file.filename}`;
    }
  }

  if (!title || !art_type || !media_url) {
    return res.status(400).json({ error: 'title, art_type, and media_url (or file upload) are required' });
  }

  const validTypes = [
    'Digital Art',
    'Manual Art (Photoed)',
    'Traditional Art',
    'Video Art',
    'Photography',
    'Karya Sastra',
    'Others'
  ];
  if (!validTypes.includes(art_type)) {
    return res.status(400).json({ error: `Invalid art_type. Must be one of: ${validTypes.join(', ')}` });
  }

  try {
    await db.run(
      'INSERT INTO artworks (artist_id, title, art_type, description, media_url) VALUES (?, ?, ?, ?, ?)',
      [artist_id, title, art_type, description, media_url]
    );

    const newArt = await db.get(
      'SELECT a.*, u.artist_name FROM artworks a JOIN users u ON a.artist_id = u.id WHERE a.artist_id = ? AND a.title = ? ORDER BY a.upload_date DESC LIMIT 1',
      [artist_id, title]
    );

    return res.status(201).json({
      message: 'Artwork uploaded successfully',
      artwork: newArt
    });
  } catch (error) {
    console.error('Error creating artwork:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Update an existing artwork (Authenticated, Ownership guardrails enforced)
const updateArtwork = async (req, res) => {
  const { id } = req.params;
  const artist_id = req.user.id;
  const { title, art_type, description } = req.body;
  let media_url = req.body.media_url;

  if (req.file) {
    if (req.file.buffer) {
      const b64 = req.file.buffer.toString('base64');
      media_url = `data:${req.file.mimetype};base64,${b64}`;
    } else if (req.file.filename) {
      media_url = `/uploads/${req.file.filename}`;
    }
  }

  if (!title || !art_type) {
    if (req.file) {
      await deleteLocalFile(`/uploads/${req.file.filename}`);
    }
    return res.status(400).json({ error: 'title and art_type are required' });
  }

  const validTypes = [
    'Digital Art',
    'Manual Art (Photoed)',
    'Traditional Art',
    'Video Art',
    'Photography',
    'Karya Sastra',
    'Others'
  ];
  if (!validTypes.includes(art_type)) {
    if (req.file) {
      await deleteLocalFile(`/uploads/${req.file.filename}`);
    }
    return res.status(400).json({ error: `Invalid art_type. Must be one of: ${validTypes.join(', ')}` });
  }

  try {
    const existingArt = await db.get(
      'SELECT * FROM artworks WHERE id = ? AND artist_id = ?',
      [id, artist_id]
    );

    if (!existingArt) {
      if (req.file) {
        await deleteLocalFile(`/uploads/${req.file.filename}`);
      }
      return res.status(404).json({ error: 'Artwork not found or permission denied' });
    }

    const finalMediaUrl = media_url || existingArt.media_url;
    const finalDescription = description !== undefined ? description : (existingArt.description || '');

    await db.run(
      `UPDATE artworks 
       SET title = ?, art_type = ?, description = ?, media_url = ? 
       WHERE id = ? AND artist_id = ?`,
      [title, art_type, finalDescription, finalMediaUrl, id, artist_id]
    );

    if (req.file && existingArt.media_url !== finalMediaUrl) {
      await deleteLocalFile(existingArt.media_url);
    }

    const updatedArt = await db.get(
      'SELECT a.*, u.artist_name FROM artworks a JOIN users u ON a.artist_id = u.id WHERE a.id = ?',
      [id]
    );

    return res.status(200).json({
      message: 'Artwork updated successfully',
      artwork: updatedArt
    });
  } catch (error) {
    console.error('Error updating artwork:', error);
    if (req.file) {
      await deleteLocalFile(`/uploads/${req.file.filename}`);
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete artwork (Authenticated, Ownership guardrails enforced)
const deleteArtwork = async (req, res) => {
  const { id } = req.params;
  const artist_id = req.user.id;
  const user_role = req.user.role;

  try {
    // Admin or owner check
    let artwork;
    if (user_role === 'admin') {
      artwork = await db.get('SELECT * FROM artworks WHERE id = ?', [id]);
    } else {
      artwork = await db.get('SELECT * FROM artworks WHERE id = ? AND artist_id = ?', [id, artist_id]);
    }

    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found or permission denied' });
    }

    await db.run('DELETE FROM artworks WHERE id = ?', [id]);
    await deleteLocalFile(artwork.media_url);

    return res.status(200).json({ message: 'Artwork deleted successfully' });
  } catch (error) {
    console.error('Error deleting artwork:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Toggle like status using a device fingerprint (Unlike toggling support)
const toggleLike = async (req, res) => {
  const { id } = req.params;
  const { device_fingerprint } = req.body;

  if (!device_fingerprint) {
    return res.status(400).json({ error: 'device_fingerprint is required' });
  }

  try {
    const artwork = await db.get('SELECT * FROM artworks WHERE id = ?', [id]);
    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    // Check if device already liked this artwork
    const existingLike = await db.get(
      'SELECT * FROM guest_likes WHERE artwork_id = ? AND device_fingerprint = ?',
      [id, device_fingerprint]
    );

    if (existingLike) {
      // Toggle off (Unlike)
      await db.run(
        'DELETE FROM guest_likes WHERE artwork_id = ? AND device_fingerprint = ?',
        [id, device_fingerprint]
      );
      await db.run('UPDATE artworks SET likes_count = MAX(0, likes_count - 1) WHERE id = ?', [id]);

      const updatedArtwork = await db.get('SELECT likes_count FROM artworks WHERE id = ?', [id]);
      return res.status(200).json({
        liked: false,
        likes_count: updatedArtwork ? updatedArtwork.likes_count : 0
      });
    } else {
      // Toggle on (Like)
      await db.run(
        'INSERT INTO guest_likes (artwork_id, device_fingerprint) VALUES (?, ?)',
        [id, device_fingerprint]
      );
      await db.run('UPDATE artworks SET likes_count = likes_count + 1 WHERE id = ?', [id]);

      const updatedArtwork = await db.get('SELECT likes_count FROM artworks WHERE id = ?', [id]);
      return res.status(200).json({
        liked: true,
        likes_count: updatedArtwork.likes_count
      });
    }
  } catch (error) {
    console.error('Error recording like toggle:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getArtworks,
  getMyArtworks,
  createArtwork,
  updateArtwork,
  deleteArtwork,
  toggleLike
};
