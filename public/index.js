// Client-side Javascript for Public Exhibition Page
document.addEventListener('DOMContentLoaded', () => {
  const galleryGrid = document.getElementById('galleryGrid');
  const filtersContainer = document.getElementById('filtersContainer');
  const categoryDropdown = document.getElementById('categoryDropdown');
  const navActions = document.getElementById('navActions');
  
  // Modals & Backdrops
  const authModal = document.getElementById('authModal');
  const detailModal = document.getElementById('detailModal');
  const openAuthBtn = document.getElementById('openAuthBtn');
  const closeAuthBtn = document.getElementById('closeAuthBtn');
  
  // Auth Form Toggles
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const switchToSignup = document.getElementById('switchToSignup');
  const switchToLogin = document.getElementById('switchToLogin');
  const authTitle = document.getElementById('authTitle');
  
  const toastNotification = document.getElementById('toastNotification');
  const toastMessage = document.getElementById('toastMessage');

  // --- State Variables ---
  let artworks = [];
  let currentFilter = 'All';
  let currentUser = null;

  // --- Device Fingerprint (for liking system) ---
  let deviceFingerprint = localStorage.getItem('device_fingerprint');
  if (!deviceFingerprint) {
    deviceFingerprint = 'fp_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('device_fingerprint', deviceFingerprint);
  }

  // --- Initialization ---
  if (window.location.protocol === 'file:') {
    if (galleryGrid) {
      galleryGrid.innerHTML = `
        <div class="empty-state" style="border: 2px solid #ef4444; background: #fef2f2; padding: 24px; border-radius: 12px; color: #991b1b; text-align: center; margin: 20px auto; max-width: 600px;">
          <h3 style="color: #991b1b; margin-bottom: 8px;">⚠️ Server Required (file:// detected)</h3>
          <p style="margin-bottom: 12px;">You opened this HTML file directly from your file system. The application requires the Express server to handle API routes and sessions.</p>
          <p><strong>How to run:</strong></p>
          <ol style="display: inline-block; text-align: left; margin-top: 8px; line-height: 1.6;">
            <li>Open a terminal in <code>Website Museum Kreativitas</code></li>
            <li>Run command: <code>npm start</code></li>
            <li>Open your browser at: <a href="http://localhost:3000" style="color: #2563eb; font-weight: bold;">http://localhost:3000</a></li>
          </ol>
        </div>
      `;
    }
    return;
  }

  checkSession();
  fetchArtworks();

  // --- Fetch Data ---
  async function fetchArtworks() {
    try {
      const response = await fetch(`/api/artworks?device_fingerprint=${deviceFingerprint}`);
      if (!response.ok) throw new Error('Failed to fetch artworks');
      artworks = await response.json();
      renderGallery();
    } catch (err) {
      console.error(err);
      galleryGrid.innerHTML = `
        <div class="empty-state">
          <h3>Failed to Load Gallery</h3>
          <p>Please check your connection and try refreshing.</p>
        </div>
      `;
    }
  }

  async function checkSession() {
    try {
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          currentUser = data.user;
          updateNavbar();
        }
      }
    } catch (err) {
      // Ignore initial session fetch error
    }
  }

  // --- Render Gallery Grid (Responsive Masonry) ---
  function renderGallery() {
    galleryGrid.innerHTML = '';
    
    // Filter artworks
    const filtered = currentFilter === 'All' 
      ? artworks 
      : artworks.filter(art => art.art_type === currentFilter);

    if (filtered.length === 0) {
      galleryGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; width: 100%;">
          <h3>No creations found</h3>
          <p>Be the first artist to publish a piece in the "${currentFilter}" category!</p>
        </div>
      `;
      return;
    }

    filtered.forEach(art => {
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
             <span class="pdf-preview-hint">📄 Baca Dokumen Sastra (PDF)</span>
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
            <div class="artist-name-label">by <span>${escapeHtml(art.artist_name)}</span></div>
          </div>
          <div class="card-footer">
            <div class="likes-wrapper">
              <button class="like-button ${art.liked ? 'liked' : ''}" data-id="${art.id}">
                <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
              </button>
              <span class="likes-count">${art.likes_count} likes</span>
            </div>
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

      card.addEventListener('click', (e) => {
        if (e.target.closest('.like-button')) return;
        openDetailModal(art);
      });

      const likeBtn = card.querySelector('.like-button');
      likeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleLike(art.id, likeBtn);
      });

      galleryGrid.appendChild(card);
    });
  }

  // --- Like Event Handler (Optimistic UI Update) ---
  const pendingLikeRequests = new Set();

  async function handleLike(artworkId, buttonEl) {
    if (pendingLikeRequests.has(artworkId)) return;
    pendingLikeRequests.add(artworkId);

    const artwork = artworks.find(art => art.id === artworkId);
    
    // 1. Determine current state
    const currentlyLiked = artwork ? artwork.liked : (buttonEl ? buttonEl.classList.contains('liked') : false);
    const prevCount = artwork ? artwork.likes_count : (buttonEl && buttonEl.nextElementSibling ? (parseInt(buttonEl.nextElementSibling.innerText, 10) || 0) : 0);

    // 2. Compute optimistic target state
    const nextLiked = !currentlyLiked;
    const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));

    // 3. Optimistically update local data model
    if (artwork) {
      artwork.liked = nextLiked;
      artwork.likes_count = nextCount;
    }

    // Helper to update both grid card and detail modal elements instantly
    const updateUIState = (isLiked, count) => {
      // Update target button passed to function
      if (buttonEl) {
        if (isLiked) buttonEl.classList.add('liked');
        else buttonEl.classList.remove('liked');

        const countEl = buttonEl.nextElementSibling;
        if (countEl && countEl.classList.contains('likes-count')) {
          countEl.innerText = `${count} likes`;
        }
      }

      // Update grid card element if exists
      const gridCardBtn = galleryGrid.querySelector(`.like-button[data-id="${artworkId}"]`);
      if (gridCardBtn) {
        if (isLiked) gridCardBtn.classList.add('liked');
        else gridCardBtn.classList.remove('liked');

        const gridCountEl = gridCardBtn.nextElementSibling;
        if (gridCountEl) gridCountEl.innerText = `${count} likes`;
      }

      // Update detail modal elements if active
      const detailLikeBtn = document.getElementById('detailLikeBtn');
      const detailLikeCount = document.getElementById('detailLikeCount');
      if (detailLikeBtn) {
        if (isLiked) detailLikeBtn.classList.add('liked');
        else detailLikeBtn.classList.remove('liked');
      }
      if (detailLikeCount) {
        detailLikeCount.innerText = `${count} likes`;
      }
    };

    // 4. Apply UI update IMMEDIATELY (0ms latency for user feedback)
    updateUIState(nextLiked, nextCount);

    if (nextLiked) {
      showToast('Creations liked! Added to device votes.');
    } else {
      showToast('Like removed.');
    }

    // 5. Fire network request asynchronously in background
    try {
      const response = await fetch(`/api/artworks/${artworkId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_fingerprint: deviceFingerprint })
      });

      if (!response.ok) throw new Error('Like request failed');
      const result = await response.json();

      // Synchronize exact values from server
      if (artwork) {
        artwork.liked = result.liked;
        artwork.likes_count = result.likes_count;
      }
      updateUIState(result.liked, result.likes_count);
    } catch (err) {
      console.error('Optimistic like error:', err);
      // Revert optimistic update on failure
      if (artwork) {
        artwork.liked = currentlyLiked;
        artwork.likes_count = prevCount;
      }
      updateUIState(currentlyLiked, prevCount);
      showToast('Action failed. Reverting like state.');
    } finally {
      pendingLikeRequests.delete(artworkId);
    }
  }

  // --- Filter Category Tab Change ---
  filtersContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.type;
      categoryDropdown.value = currentFilter;
      renderGallery();
    }
  });

  categoryDropdown.addEventListener('change', (e) => {
    currentFilter = e.target.value;
    document.querySelectorAll('.filter-btn').forEach(btn => {
      if (btn.dataset.type === currentFilter) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    renderGallery();
  });

  // --- Detail Modal Open/Close ---
  function openDetailModal(artwork) {
    let mediaSrc = artwork.media_url || '';
    if (mediaSrc && !mediaSrc.startsWith('http') && !mediaSrc.startsWith('data:')) {
      if (!mediaSrc.startsWith('/')) {
        mediaSrc = '/' + mediaSrc;
      }
    }

    const isVideo = artwork.art_type === 'Video Art' || mediaSrc.endsWith('.mp4') || mediaSrc.startsWith('data:video/');
    const isPdf = mediaSrc.startsWith('data:application/pdf') || mediaSrc.toLowerCase().includes('.pdf') || (artwork.art_type === 'Karya Sastra' && (mediaSrc.includes('drive.google.com') || mediaSrc.includes('docs.google.com')));

    let mediaHtml = '';
    if (isVideo) {
      mediaHtml = `<video src="${escapeHtml(mediaSrc)}" controls autoplay loop muted class="detail-video"></video>`;
    } else if (isPdf) {
      mediaHtml = `<div class="detail-pdf-viewer">
        <iframe src="${escapeHtml(mediaSrc)}" class="pdf-iframe" title="${escapeHtml(artwork.title)}"></iframe>
        <div style="margin-top: 0.75rem; text-align: center;">
          <a href="${escapeHtml(mediaSrc)}" target="_blank" rel="noopener noreferrer" download="${escapeHtml(artwork.title)}.pdf" class="btn btn-primary" style="display: inline-flex; justify-content: center; width: 100%;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Buka / Unduh Dokumen (PDF)
          </a>
        </div>
      </div>`;
    } else {
      mediaHtml = `<img src="${escapeHtml(mediaSrc)}" alt="${escapeHtml(artwork.title)}">`;
    }

    const formattedDate = new Date(artwork.upload_date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const isOwnerOrAdmin = currentUser && (currentUser.id === artwork.artist_id || currentUser.role === 'admin');
    const deleteBtnHtml = isOwnerOrAdmin
      ? `<button class="btn btn-danger" id="detailDeleteBtn" style="margin-top: 1rem; width: 100%; justify-content: center;">Delete Artwork</button>`
      : '';

    detailModal.innerHTML = `
      <div class="modal-content detail-modal-content">
        <button class="close-modal" id="closeDetailBtn" style="position: absolute; top: 1.5rem; right: 1.5rem; z-index: 10;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div class="detail-media-pane">
          ${mediaHtml}
        </div>
        <div class="detail-info-pane">
          <div>
            <h2 class="detail-title">${escapeHtml(artwork.title)}</h2>
            <div class="detail-badge-row">
              <span class="detail-badge">${artwork.art_type}</span>
              <span class="detail-badge" style="color: var(--clr-lavender);">Uploaded on ${formattedDate}</span>
            </div>
            <p class="detail-desc">${escapeHtml(artwork.description || 'No description provided for this artwork.')}</p>
          </div>
          <div>
            <div class="detail-action-row">
              <div>
                <p style="font-size: 0.8rem; color: var(--clr-lavender);">ARTIST</p>
                <h4 style="font-family: var(--font-header); font-size: 1.15rem; color: var(--clr-peach-cream);">${escapeHtml(artwork.artist_name)}</h4>
              </div>
              <div class="likes-wrapper">
                <button class="like-button ${artwork.liked ? 'liked' : ''}" id="detailLikeBtn" style="padding: 0.5rem; border-radius: 50%; background: rgba(255,255,255,0.05);">
                  <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </button>
                <span class="likes-count" id="detailLikeCount" style="font-size: 1rem;">${artwork.likes_count} likes</span>
              </div>
            </div>
            ${deleteBtnHtml}
          </div>
        </div>
      </div>
    `;

    detailModal.classList.add('active');

    const closeBtn = detailModal.querySelector('#closeDetailBtn');
    closeBtn.addEventListener('click', () => {
      detailModal.classList.remove('active');
      detailModal.innerHTML = '';
    });

    const detailLikeBtn = detailModal.querySelector('#detailLikeBtn');
    detailLikeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleLike(artwork.id, detailLikeBtn);
    });

    if (isOwnerOrAdmin) {
      const detailDeleteBtn = detailModal.querySelector('#detailDeleteBtn');
      detailDeleteBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete this artwork?')) return;
        try {
          const response = await fetch(`/api/artworks/${artwork.id}`, { method: 'DELETE' });
          if (response.ok) {
            detailModal.classList.remove('active');
            detailModal.innerHTML = '';
            showToast('Artwork deleted successfully.');
            fetchArtworks();
          } else {
            const data = await response.json();
            showToast(data.error || 'Failed to delete artwork.');
          }
        } catch (err) {
          console.error(err);
          showToast('Connection error while deleting artwork.');
        }
      });
    }
  }

  // --- Auth Dialog Navigation ---
  switchToSignup.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
    authTitle.innerText = 'Create Account';
  });

  switchToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.style.display = 'none';
    loginForm.style.display = 'block';
    authTitle.innerText = 'Artist Portal Login';
  });

  if (openAuthBtn) openAuthBtn.addEventListener('click', () => authModal.classList.add('active'));
  closeAuthBtn.addEventListener('click', () => authModal.classList.remove('active'));
  
  [authModal, detailModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        if (modal === detailModal) detailModal.innerHTML = '';
      }
    });
  });

  // --- Update Navbar UI based on Session Auth ---
  function updateNavbar() {
    if (currentUser) {
      const isAdmin = currentUser.role === 'admin';
      const adminBtnHtml = isAdmin 
        ? `<a href="admin.html" class="btn btn-secondary" style="border-color: var(--clr-coral); color: var(--clr-coral);">Admin Portal</a>` 
        : '';

      navActions.innerHTML = `
        ${adminBtnHtml}
        <div class="user-badge" id="navUserBadge" style="cursor: pointer;" title="View Portfolio Manager">
          <div class="user-dot" style="${isAdmin ? 'background-color: var(--clr-coral); box-shadow: 0 0 8px var(--clr-coral);' : ''}"></div>
          <span class="user-name">${escapeHtml(currentUser.artist_name)}</span>
        </div>
        <a href="manager.html" class="btn btn-secondary">My Gallery</a>
        <button class="btn btn-secondary" id="logoutBtn" style="padding: 0.5rem 0.75rem;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </button>
      `;

      document.getElementById('navUserBadge').addEventListener('click', () => {
        window.location.href = 'manager.html';
      });
      document.getElementById('logoutBtn').addEventListener('click', handleLogout);
      authModal.classList.remove('active');
    } else {
      navActions.innerHTML = `
        <button class="btn btn-secondary" id="openAuthBtn">Login / Sign Up</button>
      `;
      document.getElementById('openAuthBtn').addEventListener('click', () => {
        authModal.classList.add('active');
      });
    }
  }

  // --- Authentication Form Handlers ---
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('loginRememberMe') ? document.getElementById('loginRememberMe').checked : false;
    const emailError = document.getElementById('loginEmailError');
    const passwordError = document.getElementById('loginPasswordError');

    emailError.style.display = 'none';
    passwordError.style.display = 'none';

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe })
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.error && data.error.includes('email')) {
          emailError.innerText = data.error;
          emailError.style.display = 'block';
        } else {
          passwordError.innerText = data.error || 'Authentication failed';
          passwordError.style.display = 'block';
        }
        return;
      }

      currentUser = data.user;
      updateNavbar();
      fetchArtworks();
      showToast(`Welcome back, ${currentUser.artist_name}!`);
    } catch (err) {
      console.error(err);
      showToast('Server connection failed. Try again.');
    }
  });

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const artist_name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const nameError = document.getElementById('signupNameError');
    const emailError = document.getElementById('signupEmailError');
    const passwordError = document.getElementById('signupPasswordError');

    if (nameError) nameError.style.display = 'none';
    if (emailError) emailError.style.display = 'none';
    if (passwordError) passwordError.style.display = 'none';

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist_name, email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        const errorMsg = data.error || 'Failed to register account';
        if (errorMsg.toLowerCase().includes('name') || errorMsg.toLowerCase().includes('username')) {
          if (nameError) {
            nameError.innerText = errorMsg;
            nameError.style.display = 'block';
          } else {
            showToast(errorMsg);
          }
        } else if (errorMsg.toLowerCase().includes('email')) {
          if (emailError) {
            emailError.innerText = errorMsg;
            emailError.style.display = 'block';
          } else {
            showToast(errorMsg);
          }
        } else if (errorMsg.toLowerCase().includes('password')) {
          if (passwordError) {
            passwordError.innerText = errorMsg;
            passwordError.style.display = 'block';
          } else {
            showToast(errorMsg);
          }
        } else {
          if (emailError) {
            emailError.innerText = errorMsg;
            emailError.style.display = 'block';
          }
        }
        return;
      }

      currentUser = data.user;
      updateNavbar();
      fetchArtworks();
      showToast(`Artist account created! Welcome ${currentUser.artist_name}`);
    } catch (err) {
      console.error(err);
      showToast('Registration failed. Try again.');
    }
  });

  async function handleLogout() {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        currentUser = null;
        updateNavbar();
        fetchArtworks();
        showToast('Successfully logged out.');
      }
    } catch (err) {
      console.error(err);
      showToast('Logout request failed.');
    }
  }

  // --- Helper: Toast Notification ---
  function showToast(message) {
    toastMessage.innerText = message;
    toastNotification.classList.add('active');
    setTimeout(() => {
      toastNotification.classList.remove('active');
    }, 3000);
  }

  // --- Helper: Escape HTML strings ---
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
