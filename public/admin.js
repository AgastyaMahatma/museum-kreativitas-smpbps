// Client-side Javascript for Admin Dashboard Page
document.addEventListener('DOMContentLoaded', () => {
  const navActions = document.getElementById('navActions');
  
  // Admin Portal Elements
  const adminTabArtistsBtn = document.getElementById('adminTabArtistsBtn');
  const adminTabArtworksBtn = document.getElementById('adminTabArtworksBtn');
  const adminArtistsTab = document.getElementById('adminArtistsTab');
  const adminArtworksTab = document.getElementById('adminArtworksTab');
  const adminArtistsTableBody = document.getElementById('adminArtistsTableBody');
  const adminArtworksTableBody = document.getElementById('adminArtworksTableBody');

  // Admin Modals
  const adminEditModal = document.getElementById('adminEditModal');
  const closeAdminEditBtn = document.getElementById('closeAdminEditBtn');
  const adminEditForm = document.getElementById('adminEditForm');
  const adminEditArtId = document.getElementById('adminEditArtId');
  const adminEditArtTitle = document.getElementById('adminEditArtTitle');
  const adminEditArtType = document.getElementById('adminEditArtType');
  const adminEditArtStatus = document.getElementById('adminEditArtStatus');
  const adminEditMediaUrl = document.getElementById('adminEditMediaUrl');

  const deleteModal = document.getElementById('deleteModal');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

  const adminDeleteArtistModal = document.getElementById('adminDeleteArtistModal');
  const cancelDeleteArtistBtn = document.getElementById('cancelDeleteArtistBtn');
  const confirmDeleteArtistBtn = document.getElementById('confirmDeleteArtistBtn');

  const toastNotification = document.getElementById('toastNotification');
  const toastMessage = document.getElementById('toastMessage');

  // --- State Variables ---
  let adminArtists = [];
  let adminArtworks = [];
  let currentUser = null;
  let artistToDeleteId = null;
  let adminArtToDeleteId = null;
  let currentAdminTab = 'artists';

  // --- Admin Session Guard ---
  if (window.location.protocol === 'file:') {
    document.body.innerHTML = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 100px auto; padding: 30px; border: 2px solid #ef4444; background: #fef2f2; border-radius: 12px; color: #991b1b; text-align: center;">
        <h2 style="color: #991b1b;">⚠️ Server Required (file:// detected)</h2>
        <p>You opened this HTML file directly from your file system. Please run <code>npm start</code> in your terminal and visit <a href="http://localhost:3000/admin.html" style="color: #2563eb; font-weight: bold;">http://localhost:3000/admin.html</a>.</p>
      </div>
    `;
    return;
  }

  checkAdminSessionAndInit();

  async function checkAdminSessionAndInit() {
    try {
      const response = await fetch('/api/auth/session');
      if (!response.ok) {
        window.location.replace('index.html');
        return;
      }
      const data = await response.json();
      if (!data.authenticated || data.user.role !== 'admin') {
        // Forbidden: Redirect to home page
        window.location.replace('index.html');
        return;
      }
      currentUser = data.user;
      updateNavbar();
      showAdminTab('artists');
    } catch (err) {
      console.error(err);
      window.location.replace('index.html');
    }
  }

  // --- Tab Swappers ---
  adminTabArtistsBtn.addEventListener('click', () => showAdminTab('artists'));
  adminTabArtworksBtn.addEventListener('click', () => showAdminTab('artworks'));

  function showAdminTab(tab) {
    currentAdminTab = tab;
    if (tab === 'artists') {
      adminTabArtistsBtn.classList.add('active');
      adminTabArtworksBtn.classList.remove('active');
      adminArtistsTab.style.display = 'block';
      adminArtworksTab.style.display = 'none';
      fetchAdminArtists();
    } else {
      adminTabArtistsBtn.classList.remove('active');
      adminTabArtworksBtn.classList.add('active');
      adminArtistsTab.style.display = 'none';
      adminArtworksTab.style.display = 'block';
      fetchAdminArtworks();
    }
  }

  // --- API Fetches ---
  async function fetchAdminArtists() {
    try {
      const response = await fetch('/api/admin/artists');
      if (!response.ok) throw new Error('Unauthorized or server issue');
      adminArtists = await response.json();
      renderAdminArtists();
    } catch (err) {
      console.error(err);
      showToast('Failed to load artists for administration.');
    }
  }

  async function fetchAdminArtworks() {
    try {
      const response = await fetch('/api/admin/artworks');
      if (!response.ok) throw new Error('Unauthorized or server issue');
      adminArtworks = await response.json();
      renderAdminArtworks();
    } catch (err) {
      console.error(err);
      showToast('Failed to load artworks for administration.');
    }
  }

  // --- Table Renderers ---
  function renderAdminArtists() {
    adminArtistsTableBody.innerHTML = '';
    if (adminArtists.length === 0) {
      adminArtistsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No artists registered.</td></tr>';
      return;
    }

    adminArtists.forEach(artist => {
      const row = document.createElement('tr');
      const formattedDate = new Date(artist.created_at).toLocaleDateString();
      const badgeClass = artist.role === 'admin' ? 'badge-admin' : 'badge-artist';
      const actionHtml = artist.role === 'admin'
        ? `<span style="color: var(--clr-lavender); font-size: 0.8rem;">Protected</span>`
        : `<button class="btn btn-danger delete-artist-btn" data-id="${artist.id}" style="padding: 0.35rem 0.75rem; font-size: 0.75rem;">Delete Artist</button>`;

      row.innerHTML = `
        <td style="padding: 1rem; font-weight: 500;">${escapeHtml(artist.artist_name)}</td>
        <td style="padding: 1rem; color: var(--clr-peach-cream);">${escapeHtml(artist.email)}</td>
        <td style="padding: 1rem;"><span class="badge ${badgeClass}">${artist.role}</span></td>
        <td style="padding: 1rem; color: var(--clr-lavender);">${formattedDate}</td>
        <td style="padding: 1rem; text-align: center; font-weight: bold;">${artist.artwork_count}</td>
        <td style="padding: 1rem; text-align: right;">${actionHtml}</td>
      `;

      if (artist.role !== 'admin') {
        row.querySelector('.delete-artist-btn').addEventListener('click', () => {
          openDeleteArtistConfirmation(artist.id);
        });
      }

      adminArtistsTableBody.appendChild(row);
    });
  }

  function renderAdminArtworks() {
    adminArtworksTableBody.innerHTML = '';
    if (adminArtworks.length === 0) {
      adminArtworksTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No artworks found.</td></tr>';
      return;
    }

    adminArtworks.forEach(art => {
      const row = document.createElement('tr');
      const isVideo = art.art_type === 'Video Art';
      const mediaPreview = isVideo
        ? `<div style="width: 50px; height: 50px; background: #000; border-radius: 6px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--clr-border);">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--clr-peach-cream)"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
           </div>`
        : `<img src="${art.media_url}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px; border: 1px solid var(--clr-border);">`;

      row.innerHTML = `
        <td style="padding: 1rem;">${mediaPreview}</td>
        <td style="padding: 1rem; font-weight: 500;">${escapeHtml(art.title)}</td>
        <td style="padding: 1rem; color: var(--clr-rose-gold);">${escapeHtml(art.artist_name)}</td>
        <td style="padding: 1rem; color: var(--clr-lavender);">${art.art_type}</td>
        <td style="padding: 1rem; text-align: center;">${art.likes_count}</td>
        <td style="padding: 1rem; text-align: right;">
          <div style="display: flex; gap: 0.5rem; justify-content: flex-end; align-items: center;">
            <button class="btn btn-secondary edit-artwork-admin-btn" style="padding: 0.35rem 0.75rem; font-size: 0.75rem;">Edit</button>
            <button class="btn btn-danger delete-artwork-admin-btn" style="padding: 0.35rem 0.75rem; font-size: 0.75rem;">Delete</button>
          </div>
        </td>
      `;

      row.querySelector('.edit-artwork-admin-btn').addEventListener('click', () => {
        openAdminEditModal(art);
      });
      row.querySelector('.delete-artwork-admin-btn').addEventListener('click', () => {
        openAdminDeleteArtworkConfirmation(art.id);
      });

      adminArtworksTableBody.appendChild(row);
    });
  }

  // --- Admin Moderation Modals Triggers ---
  function openAdminEditModal(art) {
    adminEditArtId.value = art.id;
    adminEditArtTitle.value = art.title;
    adminEditArtType.value = art.art_type;
    const descEl = document.getElementById('adminEditArtDescription');
    if (descEl) descEl.value = art.description || '';
    adminEditMediaUrl.value = art.media_url;
    adminEditModal.classList.add('active');
  }

  closeAdminEditBtn.addEventListener('click', () => {
    adminEditModal.classList.remove('active');
  });

  adminEditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = adminEditArtId.value;
    const title = adminEditArtTitle.value;
    const art_type = adminEditArtType.value;
    const descEl = document.getElementById('adminEditArtDescription');
    const description = descEl ? descEl.value : '';
    const media_url = adminEditMediaUrl.value;

    try {
      const response = await fetch(`/api/admin/artworks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, art_type, description, media_url })
      });

      const data = await response.json();
      if (!response.ok) {
        showToast(data.error || 'Failed to update artwork');
        return;
      }

      adminEditModal.classList.remove('active');
      showToast('Artwork moderated successfully!');
      fetchAdminArtworks();
    } catch (err) {
      console.error(err);
      showToast('Connection error while saving edits.');
    }
  });

  // Admin Delete Artist Logic
  function openDeleteArtistConfirmation(id) {
    artistToDeleteId = id;
    adminDeleteArtistModal.classList.add('active');
  }

  cancelDeleteArtistBtn.addEventListener('click', () => {
    artistToDeleteId = null;
    adminDeleteArtistModal.classList.remove('active');
  });

  confirmDeleteArtistBtn.addEventListener('click', async () => {
    if (!artistToDeleteId) return;

    try {
      const response = await fetch(`/api/admin/artists/${artistToDeleteId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (!response.ok) {
        showToast(data.error || 'Failed to remove artist');
        return;
      }

      adminDeleteArtistModal.classList.remove('active');
      showToast('Artist and their artworks successfully deleted.');
      fetchAdminArtists();
    } catch (err) {
      console.error(err);
      showToast('Connection error while deleting artist.');
    } finally {
      artistToDeleteId = null;
    }
  });

  // Admin Delete Artwork Confirmation
  function openAdminDeleteArtworkConfirmation(id) {
    adminArtToDeleteId = id;
    deleteModal.classList.add('active');
  }

  cancelDeleteBtn.addEventListener('click', () => {
    adminArtToDeleteId = null;
    deleteModal.classList.remove('active');
  });

  confirmDeleteBtn.addEventListener('click', async () => {
    if (!adminArtToDeleteId) return;

    try {
      const response = await fetch(`/api/admin/artworks/${adminArtToDeleteId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (!response.ok) {
        showToast(data.error || 'Failed to delete artwork');
        return;
      }

      deleteModal.classList.remove('active');
      showToast('Artwork deleted successfully.');
      fetchAdminArtworks();
    } catch (err) {
      console.error(err);
      showToast('Connection error while attempting deletion.');
    } finally {
      adminArtToDeleteId = null;
    }
  });

  // --- Update Navbar ---
  function updateNavbar() {
    navActions.innerHTML = `
      <div class="user-badge">
        <div class="user-dot" style="background-color: var(--clr-coral); box-shadow: 0 0 8px var(--clr-coral);"></div>
        <span class="user-name">${escapeHtml(currentUser.artist_name)}</span>
      </div>
      <a href="manager.html" class="btn btn-secondary">My Gallery</a>
      <button class="btn btn-secondary" id="logoutBtn" style="padding: 0.5rem 0.75rem;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      </button>
    `;

    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  }

  async function handleLogout() {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        window.location.replace('index.html');
      }
    } catch (err) {
      console.error(err);
      showToast('Logout request failed.');
    }
  }

  // Close modals backdrop clicking
  [adminEditModal, deleteModal, adminDeleteArtistModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  });

  function showToast(message) {
    toastMessage.innerText = message;
    toastNotification.classList.add('active');
    setTimeout(() => {
      toastNotification.classList.remove('active');
    }, 3000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
