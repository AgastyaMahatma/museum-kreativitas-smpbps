require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.SUPABASE_URL || 'https://audpdjandnxuzdewewaz.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1ZHBkamFuZG54dXpkZXdld2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MzA0MjUsImV4cCI6MjEwNDEwNjQyNX0.qatR8crB8GWUsoQs7Se0A8rDY1BbZ5wLZqlAg0ieRMM';

const supabase = createClient(supabaseUrl, supabaseKey);

const generateUuid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const LEGACY_POSTGRES_TYPES = ['Digital Art', 'Manual Art (Photoed)', 'Video Art', 'Photography'];

const encodeArtTypeForDb = (artType, description = '') => {
  if (LEGACY_POSTGRES_TYPES.includes(artType)) {
    return { dbArtType: artType, dbDescription: description || '' };
  }
  
  let fallbackType = 'Digital Art';
  if (artType === 'Traditional Art') fallbackType = 'Manual Art (Photoed)';
  else if (artType === 'Video Art') fallbackType = 'Video Art';
  else if (artType === 'Photography') fallbackType = 'Photography';
  
  const encodedDesc = `[ART_TYPE:${artType}]` + (description || '');
  return { dbArtType: fallbackType, dbDescription: encodedDesc };
};

const decodeArtworkFromDb = (artwork) => {
  if (!artwork) return artwork;
  let artType = artwork.art_type;
  let description = artwork.description || '';

  if (description.startsWith('[ART_TYPE:')) {
    const endIdx = description.indexOf(']');
    if (endIdx !== -1) {
      artType = description.substring('[ART_TYPE:'.length, endIdx);
      description = description.substring(endIdx + 1);
    }
  }

  return {
    ...artwork,
    art_type: artType,
    description: description
  };
};

const initDb = async () => {
  console.log('Connecting to Supabase Database...');
  try {
    const { data: users, error } = await supabase.from('users').select('id, email').eq('email', 'agastyamahatma@gmail.com');
    if (error) {
      console.error('Supabase Connection Notice:', error.message);
      return;
    }

    console.log('Successfully connected to Supabase PostgreSQL Database!');

    // Ensure Admin Agastya Mahatma is present with proper bcrypt hash
    const adminHash = bcrypt.hashSync('kemBangapi2025#', 10);
    if (!users || users.length === 0) {
      console.log('Seeding initial Admin (Agastya Mahatma)...');
      await supabase.from('users').insert([
        {
          id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
          artist_name: 'Agastya Mahatma',
          email: 'agastyamahatma@gmail.com',
          password_hash: adminHash,
          role: 'admin'
        }
      ]);
    } else {
      // Ensure password hash and role are up to date
      await supabase.from('users').update({
        artist_name: 'Agastya Mahatma',
        password_hash: adminHash,
        role: 'admin'
      }).eq('email', 'agastyamahatma@gmail.com');
    }

    // Ensure John Smith sample artist exists for testing & demo
    const { data: smith } = await supabase.from('users').select('id').eq('email', 'john.smith@museum.id');
    if (!smith || smith.length === 0) {
      const smithHash = bcrypt.hashSync('kemBangapi2025#', 10);
      await supabase.from('users').insert([
        {
          id: 'f6e5d4c3-b2a1-0f9e-8d7c-6b5a4f3e2d1c',
          artist_name: 'John Smith',
          email: 'john.smith@museum.id',
          password_hash: smithHash,
          role: 'artist'
        }
      ]);
    }
  } catch (err) {
    console.error('Supabase Initialization Exception:', err.message);
  }
};

// Database Query Adapter mapping SQL to Supabase client
const query = async (sql, params = []) => {
  const sqlLower = sql.toLowerCase();

  // USERS QUERIES
  if (sqlLower.includes('from users')) {
    let queryBuilder = supabase.from('users').select('*');

    if (sqlLower.includes('where email = ? or lower(artist_name) = ?') || sqlLower.includes('where lower(email) = ? or lower(artist_name) = ?')) {
      const email = (params[0] || '').toLowerCase().trim();
      const name = (params[1] || '').toLowerCase().trim();
      queryBuilder = supabase.from('users').select('*').or(`email.ilike.${email},artist_name.ilike.${name}`);
    } else if (sqlLower.includes('where lower(artist_name) = ? or email = ?') || sqlLower.includes('where lower(artist_name) = ? or lower(email) = ?')) {
      const name = (params[0] || '').toLowerCase().trim();
      const email = (params[1] || '').toLowerCase().trim();
      queryBuilder = supabase.from('users').select('*').or(`artist_name.ilike.${name},email.ilike.${email}`);
    } else if (sqlLower.includes('where lower(artist_name) = ?') || sqlLower.includes('where artist_name = ?')) {
      const name = (params[0] || '').trim();
      queryBuilder = queryBuilder.ilike('artist_name', name);
    } else if (sqlLower.includes('where email = ?') || sqlLower.includes('where lower(email) = ?')) {
      const email = (params[0] || '').trim().toLowerCase();
      queryBuilder = queryBuilder.ilike('email', email);
    } else if (sqlLower.includes('where id = ?')) {
      queryBuilder = queryBuilder.eq('id', params[0]);
    }

    if (sqlLower.includes('order by')) {
      queryBuilder = queryBuilder.order('artist_name', { ascending: true });
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    let result = data || [];

    if (sqlLower.includes('count(a.id)')) {
      const { data: artData } = await supabase.from('artworks').select('artist_id');
      result = result.map(u => ({
        ...u,
        artwork_count: (artData || []).filter(a => a.artist_id === u.id).length
      }));
    }
    return result;
  }

  // ARTWORKS QUERIES
  if (sqlLower.includes('from artworks')) {
    let queryBuilder = supabase.from('artworks').select('*, users(artist_name)');

    if (sqlLower.includes('where id = ? and artist_id = ?')) {
      queryBuilder = queryBuilder.eq('id', params[0]).eq('artist_id', params[1]);
    } else if (sqlLower.includes('where a.artist_id = ? and a.title = ?')) {
      queryBuilder = queryBuilder.eq('artist_id', params[0]).ilike('title', params[1]);
    } else if (sqlLower.includes('where a.artist_id = ?')) {
      queryBuilder = queryBuilder.eq('artist_id', params[0]);
    } else if (sqlLower.includes('where id = ?')) {
      queryBuilder = queryBuilder.eq('id', params[0]);
    }

    if (sqlLower.includes('order by')) {
      queryBuilder = queryBuilder.order('upload_date', { ascending: false });
    }

    const { data, error } = await queryBuilder;
    if (error) {
      // Fallback query without relational join
      const { data: plainData } = await supabase.from('artworks').select('*');
      return (plainData || []).map(a => decodeArtworkFromDb(a));
    }

    return (data || []).map(a => {
      const decoded = decodeArtworkFromDb(a);
      return {
        ...decoded,
        artist_name: a.users ? a.users.artist_name : 'Unknown Artist'
      };
    });
  }

  // GUEST LIKES QUERIES
  if (sqlLower.includes('from guest_likes')) {
    let queryBuilder = supabase.from('guest_likes').select('*');
    if (sqlLower.includes('where artwork_id = ? and device_fingerprint = ?')) {
      queryBuilder = queryBuilder.eq('artwork_id', params[0]).eq('device_fingerprint', params[1]);
    } else if (sqlLower.includes('where device_fingerprint = ?')) {
      queryBuilder = queryBuilder.eq('device_fingerprint', params[0]);
    }
    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  }

  return [];
};

const get = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows.length > 0 ? rows[0] : null;
};

const run = async (sql, params = []) => {
  const sqlLower = sql.toLowerCase();

  // INSERT INTO users
  if (sqlLower.includes('insert into users')) {
    const artistName = (params[0] || '').trim();
    const email = (params[1] || '').trim().toLowerCase();
    const passwordHash = params[2];
    const role = params[3] || 'artist';

    const { data, error } = await supabase.from('users').insert([
      {
        artist_name: artistName,
        email: email,
        password_hash: passwordHash,
        role: role
      }
    ]).select();

    if (error) throw error;
    const insertedUser = data[0];
    return { id: insertedUser.id, changes: 1 };
  }

  // INSERT INTO artworks
  if (sqlLower.includes('insert into artworks')) {
    const { dbArtType, dbDescription } = encodeArtTypeForDb(params[2], params[3]);
    const { data, error } = await supabase.from('artworks').insert([
      {
        artist_id: params[0],
        title: params[1],
        art_type: dbArtType,
        description: dbDescription,
        media_url: params[4],
        likes_count: 0
      }
    ]).select();

    if (error) throw error;
    const insertedArt = decodeArtworkFromDb(data[0]);
    return { id: insertedArt.id, changes: 1 };
  }

  // UPDATE artworks
  if (sqlLower.includes('update artworks')) {
    if (sqlLower.includes('likes_count = likes_count + 1')) {
      const { data: art } = await supabase.from('artworks').select('likes_count').eq('id', params[0]).single();
      const newCount = (art ? art.likes_count : 0) + 1;
      const { error } = await supabase.from('artworks').update({ likes_count: newCount }).eq('id', params[0]);
      if (error) throw error;
      return { changes: 1 };
    } else if (sqlLower.includes('likes_count = max(0, likes_count - 1)')) {
      const { data: art } = await supabase.from('artworks').select('likes_count').eq('id', params[0]).single();
      const newCount = Math.max(0, (art ? art.likes_count : 0) - 1);
      const { error } = await supabase.from('artworks').update({ likes_count: newCount }).eq('id', params[0]);
      if (error) throw error;
      return { changes: 1 };
    } else if (sqlLower.includes('set title = ?, art_type = ?, description = ?, media_url = ? where id = ? and artist_id = ?')) {
      const { dbArtType, dbDescription } = encodeArtTypeForDb(params[1], params[2]);
      const { error } = await supabase.from('artworks').update({
        title: params[0],
        art_type: dbArtType,
        description: dbDescription,
        media_url: params[3]
      }).eq('id', params[4]).eq('artist_id', params[5]);
      if (error) throw error;
      return { changes: 1 };
    } else if (sqlLower.includes('set title = ?, art_type = ?, description = ?, media_url = ? where id = ?')) {
      const { dbArtType, dbDescription } = encodeArtTypeForDb(params[1], params[2]);
      const { error } = await supabase.from('artworks').update({
        title: params[0],
        art_type: dbArtType,
        description: dbDescription,
        media_url: params[3]
      }).eq('id', params[4]);
      if (error) throw error;
      return { changes: 1 };
    }
  }

  // DELETE FROM artworks
  if (sqlLower.includes('delete from artworks')) {
    const artId = params[0];
    const artistId = params[1];
    let queryBuilder = supabase.from('artworks').delete().eq('id', artId);
    if (artistId) queryBuilder = queryBuilder.eq('artist_id', artistId);
    const { error } = await queryBuilder;
    if (error) throw error;
    return { changes: 1 };
  }

  // INSERT INTO guest_likes
  if (sqlLower.includes('insert into guest_likes')) {
    const { data, error } = await supabase.from('guest_likes').insert([
      {
        artwork_id: params[0],
        device_fingerprint: params[1]
      }
    ]).select();
    if (error) throw error;
    return { id: data[0].id, changes: 1 };
  }

  // DELETE FROM guest_likes
  if (sqlLower.includes('delete from guest_likes')) {
    const { error } = await supabase.from('guest_likes').delete().eq('artwork_id', params[0]).eq('device_fingerprint', params[1]);
    if (error) throw error;
    return { changes: 1 };
  }

  // DELETE FROM users
  if (sqlLower.includes('delete from users')) {
    const { error } = await supabase.from('users').delete().eq('id', params[0]);
    if (error) throw error;
    return { changes: 1 };
  }

  return { changes: 0 };
};

module.exports = {
  supabase,
  initDb,
  query,
  run,
  get
};
