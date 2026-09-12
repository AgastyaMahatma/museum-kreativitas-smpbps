// Client-side Javascript for Artist Portfolio Manager Page
document.addEventListener('DOMContentLoaded', () => {
  const managementGrid = document.getElementById('managementGrid');
  const navActions = document.getElementById('navActions');
  
  // Modals & Backdrops
  const uploadModal = document.getElementById('uploadModal');
  const editModal = document.getElementById('editModal');
  const deleteModal = document.getElementById('deleteModal');
  const closeUploadBtn = document.getElementById('closeUploadBtn');
  const closeEditBtn = document.getElementById('closeEditBtn');
  
  // Forms & Inputs
  const uploadForm = document.getElementById('uploadForm');
  const editForm = document.getElementById('editForm');
  const toastNotification = document.getElementById('toastNotification');
  const toastMessage = document.getElementById('toastMessage');

  // Media Source toggles for Upload
  const uploadSourceType = document.getElementById('uploadSourceType');
  const fileUploadGroup = document.getElementById('fileUploadGroup');
  const urlUploadGroup = document.getElementById('urlUploadGroup');
  const mediaFile = document.getElementById('mediaFile');
  const mediaUrl = document.getElementById('mediaUrl');

  // Media Source toggles for Edit
  const editSourceType = document.getElementById('editSourceType');
  const editFileGroup = document.getElementById('editFileGroup');
  const editUrlGroup = document.getElementById('editUrlGroup');
  const editMediaFile = document.getElementById('editMediaFile');
  const editMediaUrl = document.getElementById('editMediaUrl');

  // Delete modal buttons
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

  // --- State Variables ---
  let myArtworks = [];
  let currentUser = null;
  let artToDeleteId = null;

  // --- Session Guard / Init ---
  if (window.location.protocol === 'file:') {
    document.body.innerHTML = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 100px auto; padding: 30px; border: 2px solid #ef4444; background: #fef2f2; border-radius: 12px; color: #991b1b; text-align: center;">
        <h2 style="color: #991b1b;">⚠️ Server Required (file:// detected)</h2>
        <p>You opened this HTML file directly from your file system. Please run <code>npm start</code> in your terminal and visit <a href="http://localhost:3000/manager.html" style="color: #2563eb; font-weight: bold;">http://localhost:3000/manager.html</a>.</p>
      </div>
    `;
    return;
  }

  checkSessionAndInit();

  async function checkSessionAndInit() {
    try {
      const response = await fetch('/api/auth/session');
      if (!response.ok) {
        // Illegal access: Redirect to home page
        window.location.replace('index.html');
        return;
      }
      const data = await response.json();
      if (!data.authenticated) {
        // Illegal access: Redirect to home page
        window.location.replace('index.html');
        return;
      }
      currentUser = data.user;
      updateNavbar();
      fetchMyArtworks();
    } catch (err) {
      console.error(err);
      window.location.replace('index.html');
    }
  }

  // --- Fetch Own Submissions ---
  async function fetchMyArtworks() {
    try {
      const response = await fetch('/api/artworks/my-artworks');
      if (!response.ok) throw new Error('Failed to load portfolio.');
      myArtworks = await response.json();
      renderManagementGrid();
    } catch (err) {
      console.error(err);
      managementGrid.innerHTML = `
        <div class="empty-state">
          <h3>Failed to load submissions</h3>
          <p>Please check your connection and try refreshing.</p>
        </div>
      `;
    }
  }

  // --- Render Portfolio Grid ---
  function renderManagementGrid() {
    managementGrid.innerHTML = '';

    if (myArtworks.length === 0) {
      managementGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; width: 100%;">
          <h3>No submissions yet</h3>
          <p>Click "Publish Art" in the navigation bar to post your first creation!</p>
        </div>
      `;
      return;
    }

    myArtworks.forEach(art => {
      const card = document.createElement('div');
      card.className = 'gallery-item';
      
      let mediaSrc = art.media_url || '';
      if (mediaSrc && !mediaSrc.startsWith('http') && !mediaSrc.startsWith('data:')) {
        if (!mediaSrc.startsWith('/')) {
          mediaSrc = '/' + mediaSrc;
        }
      }

      const isVideo = art.art_type === 'Video Art' || mediaSrc.endsWith('.mp4') || mediaSrc.startsWith('data:video/');
      const isPdf = mediaSrc.startsWith('data:application/pdf') || mediaSrc.toLowerCase().includes('.pdf') || (art.art_type === 'Karya Sastra' && (mediaSrc.includes('drive.google.com') || mediaSrc.includes('docs.google.com')));

      let mediaHtml = '';
      if (isVideo) {
        mediaHtml = `<video src="${escapeHtml(mediaSrc)}" loop muted playsinline></video>
           <div class="video-indicator">
             <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
           </div>`;
      } else if (isPdf) {
        mediaHtml = `<div class="pdf-card-preview">
           <div class="pdf-icon-badge">
             <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
           </div>
           <div class="pdf-preview-text">
             <span class="pdf-preview-title">${escapeHtml(art.title)}</span>
             <span class="pdf-preview-hint">📄 Dokumen Sastra (PDF)</span>
           </div>
         </div>`;
      } else {
        mediaHtml = `<img src="${escapeHtml(mediaSrc)}" alt="${escapeHtml(art.title)}" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800';">`;
      }

      card.innerHTML = `
        <div class="artwork-media-container">
          <div class="art-type-badge">${art.art_type}</div>
          ${mediaHtml}
        </div>
        <div class="artwork-details">
          <div>
            <h3 class="artwork-title">${escapeHtml(art.title)}</h3>
            <p style="font-size: 0.85rem; color: var(--clr-lavender); margin-bottom: 0.5rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${escapeHtml(art.description || '')}</p>
            <div class="artist-name-label">Votes: <span>${art.likes_count} likes</span></div>
          </div>
          <div class="management-actions">
            <button class="btn btn-secondary edit-btn" data-id="${art.id}">Edit Info</button>
            <button class="btn btn-danger delete-btn" data-id="${art.id}">Delete</button>
          </div>
        </div>
      `;

      if (isVideo) {
        const videoEl = card.querySelector('video');
        card.addEventListener('mouseenter', () => videoEl.play().catch(e => {}));
        card.addEventListener('mouseleave', () => {
          videoEl.pause();
          videoEl.currentTime = 0;
        });
      }

      card.querySelector('.edit-btn').addEventListener('click', () => {
        openEditModal(art);
      });

      card.querySelector('.delete-btn').addEventListener('click', () => {
        openDeleteConfirmation(art.id);
      });

      managementGrid.appendChild(card);
    });
  }

  // --- Upload Form Event Listeners ---
  uploadSourceType.addEventListener('change', (e) => {
    if (e.target.value === 'file') {
      fileUploadGroup.style.display = 'block';
      urlUploadGroup.style.display = 'none';
      mediaFile.required = true;
      mediaUrl.required = false;
    } else {
      fileUploadGroup.style.display = 'none';
      urlUploadGroup.style.display = 'block';
      mediaFile.required = false;
      mediaUrl.required = true;
    }
  });

  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', document.getElementById('artTitle').value);
    formData.append('art_type', document.getElementById('artType').value);
    formData.append('description', document.getElementById('artDescription').value);

    if (uploadSourceType.value === 'file') {
      formData.append('mediaFile', mediaFile.files[0]);
    } else {
      formData.append('media_url', mediaUrl.value);
    }

    try {
      const response = await fetch('/api/artworks', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        showToast(data.error || 'Upload failed');
        return;
      }

      uploadModal.classList.remove('active');
      uploadForm.reset();
      showToast('Artwork published successfully!');
      fetchMyArtworks();
    } catch (err) {
      console.error(err);
      showToast('Upload failed due to connection error.');
    }
  });

  // --- Edit Form Event Listeners ---
  editSourceType.addEventListener('change', (e) => {
    if (e.target.value === 'file') {
      editFileGroup.style.display = 'block';
      editUrlGroup.style.display = 'none';
      editMediaFile.required = true;
      editMediaUrl.required = false;
    } else if (e.target.value === 'url') {
      editFileGroup.style.display = 'none';
      editUrlGroup.style.display = 'block';
      editMediaFile.required = false;
      editMediaUrl.required = true;
    } else {
      editFileGroup.style.display = 'none';
      editUrlGroup.style.display = 'none';
      editMediaFile.required = false;
      editMediaUrl.required = false;
    }
  });

  function openEditModal(art) {
    document.getElementById('editArtId').value = art.id;
    document.getElementById('editArtTitle').value = art.title;
    document.getElementById('editArtType').value = art.art_type;
    document.getElementById('editArtDescription').value = art.description || '';
    
    // Reset edit media options
    editSourceType.value = 'none';
    editFileGroup.style.display = 'none';
    editUrlGroup.style.display = 'none';
    editMediaFile.required = false;
    editMediaUrl.required = false;

    editModal.classList.add('active');
  }

  closeEditBtn.addEventListener('click', () => editModal.classList.remove('active'));

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editArtId').value;
    const formData = new FormData();
    formData.append('title', document.getElementById('editArtTitle').value);
    formData.append('art_type', document.getElementById('editArtType').value);
    formData.append('description', document.getElementById('editArtDescription').value);

    if (editSourceType.value === 'file') {
      formData.append('mediaFile', editMediaFile.files[0]);
    } else if (editSourceType.value === 'url') {
      formData.append('media_url', editMediaUrl.value);
    }

    try {
      const response = await fetch(`/api/artworks/${id}`, {
        method: 'PUT',
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        showToast(data.error || 'Failed to update artwork');
        return;
      }

      editModal.classList.remove('active');
      showToast('Artwork submission updated successfully!');
      fetchMyArtworks();
    } catch (err) {
      console.error(err);
      showToast('Connection error while updating artwork.');
    }
  });

  // --- Delete Artwork Logic ---
  function openDeleteConfirmation(id) {
    artToDeleteId = id;
    deleteModal.classList.add('active');
  }

  cancelDeleteBtn.addEventListener('click', () => {
    artToDeleteId = null;
    deleteModal.classList.remove('active');
  });

  confirmDeleteBtn.addEventListener('click', async () => {
    if (!artToDeleteId) return;
    try {
      const response = await fetch(`/api/artworks/${artToDeleteId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!response.ok) {
        showToast(data.error || 'Deletion failed');
        return;
      }
      deleteModal.classList.remove('active');
      showToast('Artwork deleted successfully.');
      fetchMyArtworks();
    } catch (err) {
      console.error(err);
      showToast('Connection error while attempting deletion.');
    } finally {
      artToDeleteId = null;
    }
  });

  // --- Update Navbar ---
  function updateNavbar() {
    const isAdmin = currentUser.role === 'admin';
    const adminBtnHtml = isAdmin 
      ? `<a href="admin.html" class="btn btn-secondary" style="border-color: var(--clr-coral); color: var(--clr-coral);">Admin Portal</a>` 
      : '';

    navActions.innerHTML = `
      ${adminBtnHtml}
      <div class="user-badge">
        <div class="user-dot" style="${isAdmin ? 'background-color: var(--clr-coral);' : ''}"></div>
        <span class="user-name">${escapeHtml(currentUser.artist_name)}</span>
      </div>
      <button class="btn btn-primary" id="openUploadBtn">Publish Art</button>
      <button class="btn btn-secondary" id="logoutBtn" style="padding: 0.5rem 0.75rem;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      </button>
    `;

    document.getElementById('openUploadBtn').addEventListener('click', () => {
      uploadForm.reset();
      uploadSourceType.value = 'file';
      fileUploadGroup.style.display = 'block';
      urlUploadGroup.style.display = 'none';
      mediaFile.required = true;
      mediaUrl.required = false;
      uploadModal.classList.add('active');
    });

    closeUploadBtn.addEventListener('click', () => uploadModal.classList.remove('active'));
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

  // Close modals clicking backdrop
  [uploadModal, editModal, deleteModal].forEach(modal => {
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
