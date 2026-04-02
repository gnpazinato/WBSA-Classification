/**
 * WBSA Classification — App Utilities
 * Shared helpers: toasts, modals, formatting, etc.
 */

const App = {
  /**
   * Show toast notification
   */
  toast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  /**
   * Format date for display
   */
  formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '—';
    }
  },

  /**
   * Format date for input fields (YYYY-MM-DD)
   */
  formatDateInput(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Debounce function
   */
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  /**
   * Create classification badge HTML
   */
  classificationBadge(value) {
    if (!value) return '<span class="badge badge-classification">—</span>';
    return `<span class="badge badge-classification">${this.escapeHtml(value)}</span>`;
  },

  /**
   * Create status badge
   */
  statusBadge(isActive) {
    return isActive
      ? '<span class="badge badge-active">Active</span>'
      : '<span class="badge badge-inactive">Inactive</span>';
  },

  /**
   * Create gender badge
   */
  genderBadge(gender) {
    if (!gender) return '—';
    const cls = gender === 'M' ? 'badge-gender-m' : 'badge-gender-f';
    const label = gender === 'M' ? 'Male' : 'Female';
    return `<span class="badge ${cls}">${label}</span>`;
  },

  /**
   * Open a modal
   */
  openModal(modalId) {
    const overlay = document.getElementById(modalId);
    if (overlay) {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  /**
   * Close a modal
   */
  closeModal(modalId) {
    const overlay = document.getElementById(modalId);
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  /**
   * Confirm dialog — returns a promise
   */
  confirm(title, message) {
    return new Promise((resolve) => {
      const overlay = document.getElementById('confirm-modal');
      if (!overlay) {
        resolve(false);
        return;
      }
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-message').textContent = message;

      const yesBtn = document.getElementById('confirm-yes');
      const noBtn = document.getElementById('confirm-no');

      const cleanup = () => {
        this.closeModal('confirm-modal');
        yesBtn.replaceWith(yesBtn.cloneNode(true));
        noBtn.replaceWith(noBtn.cloneNode(true));
      };

      yesBtn.addEventListener('click', () => { cleanup(); resolve(true); }, { once: true });
      noBtn.addEventListener('click', () => { cleanup(); resolve(false); }, { once: true });

      this.openModal('confirm-modal');
    });
  },

  /**
   * Initialize mobile sidebar toggle
   */
  initMobileNav() {
    const toggle = document.getElementById('mobile-toggle');
    const sidebar = document.getElementById('sidebar');
    if (toggle && sidebar) {
      toggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
      // Close on click outside
      document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) &&
            e.target !== toggle) {
          sidebar.classList.remove('open');
        }
      });
    }
  },

  /**
   * Set active nav item
   */
  setActiveNav(page) {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });
  },

  /**
   * Export data to CSV
   */
  exportCSV(data, filename = 'export.csv') {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(h => {
          let val = row[h] != null ? String(row[h]) : '';
          if (val.includes(',') || val.includes('"') || val.includes('\n')) {
            val = '"' + val.replace(/"/g, '""') + '"';
          }
          return val;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }
};
