/**
 * WBSA Classification — Players Module
 * Full CRUD for the players table with search, sort, filter, and pagination.
 */

const Players = {
  // State
  data: [],
  filtered: [],
  currentPage: 1,
  pageSize: APP_CONFIG.pageSize,
  sortColumn: 'player_number',
  sortDirection: 'asc',
  searchTerm: '',
  filters: {
    classification: '',
    gender: '',
    zone: '',
    status: ''
  },
  editingPlayer: null,

  async init() {
    const session = await Auth.requireAuth();
    if (!session) return;

    App.initMobileNav();
    App.setActiveNav('players');
    this.bindLogout();
    this.bindEvents();
    this.buildFilterDropdowns();
    await this.loadPlayers();
  },

  bindLogout() {
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await Auth.logout();
      });
    }
  },

  bindEvents() {
    // Search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', App.debounce((e) => {
        this.searchTerm = e.target.value.toLowerCase().trim();
        this.currentPage = 1;
        this.applyFiltersAndRender();
      }, 250));
    }

    // Filters
    ['filter-classification', 'filter-gender', 'filter-zone', 'filter-status'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', (e) => {
          const key = id.replace('filter-', '');
          this.filters[key] = e.target.value;
          this.currentPage = 1;
          this.applyFiltersAndRender();
        });
      }
    });

    // Add player button
    const addBtn = document.getElementById('btn-add-player');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.openAddModal());
    }

    // Export button
    const exportBtn = document.getElementById('btn-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportData());
    }

    // Modal close
    document.querySelectorAll('.modal-close, [data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        App.closeModal('player-modal');
        App.closeModal('confirm-modal');
        App.closeModal('player-view-modal');
      });
    });

    // Player form submit
    const form = document.getElementById('player-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.savePlayer();
      });
    }

    // Click outside modal to close
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });
  },

  buildFilterDropdowns() {
    // Classification dropdown
    const classSelect = document.getElementById('filter-classification');
    if (classSelect) {
      APP_CONFIG.classificationOptions.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        classSelect.appendChild(opt);
      });
    }

    // Zone dropdown
    const zoneSelect = document.getElementById('filter-zone');
    if (zoneSelect) {
      APP_CONFIG.zoneOptions.forEach(z => {
        const opt = document.createElement('option');
        opt.value = z;
        opt.textContent = z;
        zoneSelect.appendChild(opt);
      });
    }

    // Also populate the form dropdowns
    const formClass = document.getElementById('field-classification');
    if (formClass) {
      APP_CONFIG.classificationOptions.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        formClass.appendChild(opt);
      });
    }

    const formZone = document.getElementById('field-zone');
    if (formZone) {
      APP_CONFIG.zoneOptions.forEach(z => {
        const opt = document.createElement('option');
        opt.value = z;
        opt.textContent = z;
        formZone.appendChild(opt);
      });
    }
  },

  async loadPlayers() {
    try {
      document.getElementById('players-table-body').innerHTML =
        `<tr><td colspan="8" class="loading-overlay"><div class="spinner"></div></td></tr>`;

      const { data, error } = await window.supabaseClient
        .from('players')
        .select('*')
        .order('player_number', { ascending: true });

      if (error) throw error;

      this.data = data || [];
      this.applyFiltersAndRender();

      // Update total count in header
      const countEl = document.getElementById('player-count');
      if (countEl) countEl.textContent = `${this.data.length} players`;
    } catch (err) {
      console.error('Failed to load players:', err);
      App.toast('Failed to load players', 'error');
    }
  },

  applyFiltersAndRender() {
    // Apply search
    let result = this.data;

    if (this.searchTerm) {
      result = result.filter(p => {
        const searchable = [
          String(p.player_number),
          p.last_name, p.first_name,
          p.birth_country, p.legal_nationality,
          p.classification, p.zone, p.disability,
          p.notes
        ].filter(Boolean).join(' ').toLowerCase();
        return searchable.includes(this.searchTerm);
      });
    }

    // Apply filters
    if (this.filters.classification) {
      result = result.filter(p => p.classification === this.filters.classification);
    }
    if (this.filters.gender) {
      result = result.filter(p => p.gender === this.filters.gender);
    }
    if (this.filters.zone) {
      result = result.filter(p => p.zone === this.filters.zone);
    }
    if (this.filters.status) {
      const isActive = this.filters.status === 'true';
      result = result.filter(p => p.is_active === isActive);
    }

    // Apply sort
    result.sort((a, b) => {
      let va = a[this.sortColumn];
      let vb = b[this.sortColumn];
      if (va == null) va = '';
      if (vb == null) vb = '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();

      let cmp = 0;
      if (va < vb) cmp = -1;
      else if (va > vb) cmp = 1;
      return this.sortDirection === 'asc' ? cmp : -cmp;
    });

    this.filtered = result;
    this.renderTable();
    this.renderPagination();
  },

  renderTable() {
    const tbody = document.getElementById('players-table-body');
    if (!tbody) return;

    const start = (this.currentPage - 1) * this.pageSize;
    const pageData = this.filtered.slice(start, start + this.pageSize);

    if (pageData.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="8">
          <div class="empty-state">
            <div class="empty-icon">🏀</div>
            <h3>No players found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = pageData.map(p => `
      <tr data-id="${p.id}">
        <td><strong>#${p.player_number}</strong></td>
        <td>
          <div style="font-weight:600;">${App.escapeHtml(p.last_name || '')}</div>
          <div style="color:var(--text-secondary);font-size:0.82rem;">${App.escapeHtml(p.first_name || '')}</div>
        </td>
        <td>${App.classificationBadge(p.classification)}</td>
        <td>${App.genderBadge(p.gender)}</td>
        <td>${App.escapeHtml(p.zone || '—')}</td>
        <td>${App.escapeHtml(p.disability || '—')}</td>
        <td>${App.statusBadge(p.is_active)}</td>
        <td>
          <div style="display:flex;gap:0.35rem;">
            <button class="btn btn-secondary btn-icon" onclick="Players.viewPlayer(${p.id})" title="View">👁</button>
            <button class="btn btn-secondary btn-icon" onclick="Players.openEditModal(${p.id})" title="Edit">✏️</button>
            <button class="btn btn-danger btn-icon" onclick="Players.deletePlayer(${p.id})" title="Delete">🗑</button>
          </div>
        </td>
      </tr>
    `).join('');

    // Update sort indicators
    document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
      th.classList.remove('sorted');
      const indicator = th.querySelector('.sort-indicator');
      if (th.dataset.sort === this.sortColumn) {
        th.classList.add('sorted');
        if (indicator) indicator.textContent = this.sortDirection === 'asc' ? '▲' : '▼';
      } else {
        if (indicator) indicator.textContent = '⇅';
      }
    });
  },

  renderPagination() {
    const totalPages = Math.ceil(this.filtered.length / this.pageSize);
    const info = document.getElementById('pagination-info');
    const controls = document.getElementById('pagination-controls');

    if (info) {
      const start = (this.currentPage - 1) * this.pageSize + 1;
      const end = Math.min(this.currentPage * this.pageSize, this.filtered.length);
      info.textContent = this.filtered.length > 0
        ? `Showing ${start}–${end} of ${this.filtered.length}`
        : 'No results';
    }

    if (controls) {
      let html = `<button ${this.currentPage <= 1 ? 'disabled' : ''} onclick="Players.goToPage(${this.currentPage - 1})">‹</button>`;

      const maxButtons = 7;
      let startPage = Math.max(1, this.currentPage - 3);
      let endPage = Math.min(totalPages, startPage + maxButtons - 1);
      if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        html += `<button class="${i === this.currentPage ? 'active' : ''}" onclick="Players.goToPage(${i})">${i}</button>`;
      }

      html += `<button ${this.currentPage >= totalPages ? 'disabled' : ''} onclick="Players.goToPage(${this.currentPage + 1})">›</button>`;
      controls.innerHTML = html;
    }
  },

  goToPage(page) {
    const totalPages = Math.ceil(this.filtered.length / this.pageSize);
    if (page < 1 || page > totalPages) return;
    this.currentPage = page;
    this.renderTable();
    this.renderPagination();
    // Scroll to top of table
    document.querySelector('.table-wrapper')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  sortBy(column) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.currentPage = 1;
    this.applyFiltersAndRender();
  },

  openAddModal() {
    this.editingPlayer = null;
    document.getElementById('modal-title').textContent = 'Add New Player';
    document.getElementById('player-form').reset();
    document.getElementById('field-is-active').checked = true;
    
    // Hide player number field on create
    document.getElementById('group-player-number').style.display = 'none';
    document.getElementById('field-player-number').value = '';
    
    // Reset photo preview
    document.getElementById('photo-preview-container').style.display = 'none';
    document.getElementById('photo-preview').src = '';
    document.getElementById('form-upload-status').textContent = '';
    
    App.openModal('player-modal');
  },

  openEditModal(id) {
    const player = this.data.find(p => p.id === id);
    if (!player) return;

    this.editingPlayer = player;
    document.getElementById('modal-title').textContent = 'Edit Player';

    // Fill form
    document.getElementById('group-player-number').style.display = 'block';
    document.getElementById('field-player-number').value = player.player_number || '';
    document.getElementById('field-last-name').value = player.last_name || '';
    document.getElementById('field-first-name').value = player.first_name || '';
    document.getElementById('field-birth-date').value = App.formatDateInput(player.birth_date);
    document.getElementById('field-birth-country').value = player.birth_country || '';
    document.getElementById('field-legal-nationality').value = player.legal_nationality || '';
    document.getElementById('field-card-issue-date').value = App.formatDateInput(player.card_issue_date);
    document.getElementById('field-classification').value = player.classification || '';
    document.getElementById('field-zone').value = player.zone || '';
    document.getElementById('field-gender').value = player.gender || '';
    document.getElementById('field-disability').value = player.disability || '';
    document.getElementById('field-is-active').checked = player.is_active !== false;
    document.getElementById('field-notes').value = player.notes || '';
    
    // Show photo preview
    if (player.photo_url) {
      document.getElementById('photo-preview-container').style.display = 'block';
      document.getElementById('photo-preview').src = player.photo_url;
    } else {
      document.getElementById('photo-preview-container').style.display = 'none';
      document.getElementById('photo-preview').src = '';
    }
    document.getElementById('form-upload-status').textContent = '';

    App.openModal('player-modal');
  },

  async savePlayer() {
    const submitBtn = document.getElementById('btn-save-player');
    const uploadStatus = document.getElementById('form-upload-status');
    const photoFile = document.getElementById('field-photo').files[0];
    
    submitBtn.disabled = true;

    try {
      let photoUrl = this.editingPlayer ? this.editingPlayer.photo_url : null;
      
      // Upload photo if selected
      if (photoFile) {
        uploadStatus.textContent = 'Uploading photo...';
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await window.supabaseClient.storage
          .from('avatars')
          .upload(fileName, photoFile);
          
        if (uploadError) throw new Error('Failed to upload photo: ' + uploadError.message);
        
        const { data: publicUrlData } = window.supabaseClient.storage
          .from('avatars')
          .getPublicUrl(fileName);
          
        photoUrl = publicUrlData.publicUrl;
      }

      uploadStatus.textContent = 'Saving data...';

      let playerNumber = parseInt(document.getElementById('field-player-number').value);
      
      // Auto-generate player number if creating a new player
      if (!this.editingPlayer) {
        // Fetch the max player_number
        const { data: maxPlayer } = await window.supabaseClient
          .from('players')
          .select('player_number')
          .order('player_number', { ascending: false })
          .limit(1);
          
        if (maxPlayer && maxPlayer.length > 0) {
          playerNumber = maxPlayer[0].player_number + 1;
        } else {
          playerNumber = 1; // Fallback to 1 if empty
        }
      }

      const formData = {
        player_number: playerNumber,
        last_name: document.getElementById('field-last-name').value.trim().toUpperCase(),
        first_name: document.getElementById('field-first-name').value.trim().toUpperCase(),
        birth_date: document.getElementById('field-birth-date').value || null,
        birth_country: document.getElementById('field-birth-country').value.trim() || null,
        legal_nationality: document.getElementById('field-legal-nationality').value.trim() || null,
        card_issue_date: document.getElementById('field-card-issue-date').value || null,
        classification: document.getElementById('field-classification').value || null,
        zone: document.getElementById('field-zone').value || null,
        gender: document.getElementById('field-gender').value || null,
        disability: document.getElementById('field-disability').value.trim() || null,
        is_active: document.getElementById('field-is-active').checked,
        notes: document.getElementById('field-notes').value.trim() || null,
        photo_url: photoUrl,
        updated_at: new Date().toISOString()
      };

      // Validation
      if (!formData.last_name) throw new Error('Last name is required');
      if (!formData.first_name) throw new Error('First name is required');

      if (this.editingPlayer) {
        // Update
        const { error } = await window.supabaseClient
          .from('players')
          .update(formData)
          .eq('id', this.editingPlayer.id);
        if (error) throw error;
        App.toast('Player updated successfully', 'success');
      } else {
        // Insert
        const { error } = await window.supabaseClient
          .from('players')
          .insert([formData]);
        if (error) throw error;
        App.toast(`Player added successfully (ID: #${playerNumber})`, 'success');
      }

      App.closeModal('player-modal');
      await this.loadPlayers();
    } catch (err) {
      console.error('Save failed:', err);
      App.toast(err.message || 'Failed to save player', 'error');
    } finally {
      submitBtn.disabled = false;
      uploadStatus.textContent = '';
    }
  },

  async deletePlayer(id) {
    const player = this.data.find(p => p.id === id);
    if (!player) return;

    const confirmed = await App.confirm(
      'Delete Player',
      `Are you sure you want to delete #${player.player_number} ${player.last_name}, ${player.first_name}?`
    );

    if (!confirmed) return;

    try {
      const { error } = await window.supabaseClient
        .from('players')
        .delete()
        .eq('id', id);
      if (error) throw error;
      App.toast('Player deleted', 'success');
      await this.loadPlayers();
    } catch (err) {
      console.error('Delete failed:', err);
      App.toast('Failed to delete player', 'error');
    }
  },

  viewPlayer(id) {
    const p = this.data.find(pl => pl.id === id);
    if (!p) return;

    const body = document.getElementById('player-view-body');
    if (!body) return;

    const dobString = App.formatDate(p.birth_date);
    const photoImg = p.photo_url 
      ? `<img src="${p.photo_url}" alt="Photo">` 
      : `<span style="font-size:1.5rem;color:#ccc;">👤</span>`;

    // Redesigned to exact IWBF Card specifics
    body.innerHTML = `
      <div class="iwbf-card-wrapper">
        <div class="iwbf-card">
          
          <div class="iwbf-left-half">
            <div class="iwbf-left">
              <div class="iwbf-logo">
                <img src="assets/wbsa-logo.jpeg" style="height: 100%; width: 100%; object-fit: contain; mix-blend-mode: multiply;" alt="WBSA Logo">
              </div>
              <div class="iwbf-photo">${photoImg}</div>
            </div>
            
            <div class="iwbf-center">
              <div class="iwbf-header-center">WHEELCHAIR BASKETBALL<br>SOUTH AFRICA</div>
              <div class="iwbf-fields-left">
                <div class="iwbf-line"><span>Name</span><strong>${App.escapeHtml(p.last_name || '')}</strong></div>
                <div class="iwbf-line"><span>First Name</span><strong>${App.escapeHtml(p.first_name || '')}</strong></div>
                <div class="iwbf-line"><span>Place of Birth</span><strong>${App.escapeHtml(p.birth_country || '')}</strong></div>
                <div class="iwbf-line"><span>Date of Birth</span><strong>${dobString}</strong></div>
              </div>
            </div>
          </div>
          
          <div class="iwbf-right">
            <div class="iwbf-header-right">
              <div>WBSA CLASSIFICATION CARD</div>
              <div style="font-size: 11pt; font-weight: normal; margin-top: 4px;">
                ${App.escapeHtml(p.first_name || '')} ${App.escapeHtml(p.last_name || '')}
              </div>
            </div>
            
            <div class="iwbf-class-block">
              <div class="iwbf-class-text">
                <div style="margin-top:15px; text-align:center;">
                  <div style="font-size: 6pt; color: #666; margin-bottom: 2px;">Jersey Number</div>
                  <div style="width: 25mm; height: 18mm; border: 1px solid #000; margin: 0 auto;"></div>
                </div>
              </div>
              <div class="iwbf-class-separator"></div>
              <div class="iwbf-class-number">${p.classification || ''}</div>
            </div>
          </div>

        </div>
      </div>
      
      <div class="player-card-footer no-print" style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.5rem; font-size:0.85rem;">
          <div><strong>Gender:</strong> ${p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : '—'}</div>
          <div><strong>Zone:</strong> ${App.escapeHtml(p.zone || '—')}</div>
          <div><strong>Disability:</strong> ${App.escapeHtml(p.disability || '—')}</div>
          <div><strong>Card Issue Date:</strong> ${App.formatDate(p.card_issue_date)}</div>
          <div><strong>Status:</strong> ${p.is_active ? 'Active' : 'Inactive'}</div>
          <div><strong>ID / Notes:</strong> ${App.escapeHtml(p.notes || '')}</div>
        </div>
      </div>
    `;

    App.openModal('player-view-modal');
  },

  exportData() {
    const exportData = this.filtered.map(p => ({
      'Player #': p.player_number,
      'Last Name': p.last_name,
      'First Name': p.first_name,
      'Birth Date': App.formatDate(p.birth_date),
      'Birth Country': p.birth_country,
      'Nationality': p.legal_nationality,
      'Classification': p.classification,
      'Gender': p.gender,
      'Zone': p.zone,
      'Disability': p.disability,
      'Status': p.is_active ? 'Active' : 'Inactive',
      'Card Issue Date': App.formatDate(p.card_issue_date),
      'Notes': p.notes
    }));

    App.exportCSV(exportData, `wbsa_players_${new Date().toISOString().split('T')[0]}.csv`);
    App.toast(`Exported ${exportData.length} players`, 'success');
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => Players.init());
