const db = require('./db');

// Get all artists with their artwork count
const getArtists = async (req, res) => {
  try {
    const artists = await db.query(
      `SELECT u.id, u.artist_name, u.email, u.role, u.created_at, COUNT(a.id) as artwork_count
       FROM users u
       LEFT JOIN artworks a ON u.id = a.artist_id
       GROUP BY u.id
       ORDER BY u.artist_name ASC`
    );
    return res.status(200).json(artists);
  } catch (error) {
    console.error('Error fetching artists for admin:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete an artist (will cascade delete their artworks)
const deleteArtist = async (req, res) => {
  const { id } = req.params;

  try {
    const artist = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!artist) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    if (artist.role === 'admin') {
      return res.status(400).json({ error: 'Cannot delete an admin user' });
    }

    await db.run('DELETE FROM users WHERE id = ?', [id]);
    return res.status(200).json({ message: 'Artist and their artworks successfully deleted' });
  } catch (error) {
    console.error('Error deleting artist:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all artworks
const getArtworksAdmin = async (req, res) => {
  try {
    const artworks = await db.query(
      `SELECT a.*, u.artist_name 
       FROM artworks a 
       JOIN users u ON a.artist_id = u.id 
       ORDER BY a.upload_date DESC`
    );
    return res.status(200).json(artworks);
  } catch (error) {
    console.error('Error fetching artworks for admin:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Update artwork metadata (title, art_type, description, media_url)
const updateArtworkAdmin = async (req, res) => {
  const { id } = req.params;
  const { title, art_type, description = '', media_url } = req.body;

  if (!title || !art_type || !media_url) {
    return res.status(400).json({ error: 'title, art_type, and media_url are required' });
  }

  const validTypes = ['Digital Art', 'Manual Art (Photoed)', 'Video Art', 'Photography'];
  if (!validTypes.includes(art_type)) {
    return res.status(400).json({ error: `Invalid art_type. Must be one of: ${validTypes.join(', ')}` });
  }

  try {
    const artwork = await db.get('SELECT * FROM artworks WHERE id = ?', [id]);
    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    await db.run(
      'UPDATE artworks SET title = ?, art_type = ?, description = ?, media_url = ? WHERE id = ?',
      [title, art_type, description, media_url, id]
    );

    const updated = await db.get('SELECT * FROM artworks WHERE id = ?', [id]);
    return res.status(200).json({ message: 'Artwork updated successfully', artwork: updated });
  } catch (error) {
    console.error('Error updating artwork:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete any artwork
const deleteArtworkAdmin = async (req, res) => {
  const { id } = req.params;

  try {
    const artwork = await db.get('SELECT * FROM artworks WHERE id = ?', [id]);
    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    await db.run('DELETE FROM artworks WHERE id = ?', [id]);
    return res.status(200).json({ message: 'Artwork deleted successfully' });
  } catch (error) {
    console.error('Error deleting artwork by admin:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getArtists,
  deleteArtist,
  getArtworksAdmin,
  updateArtworkAdmin,
  deleteArtworkAdmin
};
