/**
 * WBSA Classification — Dashboard Module
 * Loads stats, charts, and recent players for the dashboard page.
 */

const Dashboard = {
  async init() {
    const session = await Auth.requireAuth();
    if (!session) return;

    App.initMobileNav();
    App.setActiveNav('dashboard');
    this.bindLogout();
    await this.loadStats();
    await this.loadCharts();
    await this.loadRecentPlayers();
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

  async loadStats() {
    try {
      // Total players
      const { count: total } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true });

      // Active players
      const { count: active } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Male players
      const { count: male } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('gender', 'M');

      // Female players
      const { count: female } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('gender', 'F');

      document.getElementById('stat-total').textContent = total || 0;
      document.getElementById('stat-active').textContent = active || 0;
      document.getElementById('stat-male').textContent = male || 0;
      document.getElementById('stat-female').textContent = female || 0;
    } catch (err) {
      console.error('Failed to load stats:', err);
      App.toast('Failed to load statistics', 'error');
    }
  },

  async loadCharts() {
    try {
      // Classification distribution
      const { data: players } = await supabase
        .from('players')
        .select('classification, zone')
        .eq('is_active', true);

      if (!players) return;

      // Classification chart
      const classCounts = {};
      APP_CONFIG.classificationOptions.forEach(c => classCounts[c] = 0);
      players.forEach(p => {
        if (p.classification && classCounts.hasOwnProperty(p.classification)) {
          classCounts[p.classification]++;
        }
      });

      const maxClass = Math.max(...Object.values(classCounts), 1);
      const classChart = document.getElementById('chart-classification');
      if (classChart) {
        classChart.innerHTML = Object.entries(classCounts)
          .map(([label, count]) => {
            const pct = (count / maxClass) * 100;
            return `
              <div class="bar-row">
                <span class="bar-label">${label}</span>
                <div class="bar-track">
                  <div class="bar-fill" style="width:${pct}%">
                    <span class="bar-value">${count}</span>
                  </div>
                </div>
              </div>`;
          }).join('');
      }

      // Zone chart — top 10
      const zoneCounts = {};
      players.forEach(p => {
        if (p.zone) {
          const z = p.zone.trim();
          zoneCounts[z] = (zoneCounts[z] || 0) + 1;
        }
      });

      const topZones = Object.entries(zoneCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const maxZone = topZones.length > 0 ? topZones[0][1] : 1;
      const zoneChart = document.getElementById('chart-zone');
      if (zoneChart) {
        zoneChart.innerHTML = topZones
          .map(([label, count]) => {
            const pct = (count / maxZone) * 100;
            return `
              <div class="bar-row">
                <span class="bar-label">${App.escapeHtml(label)}</span>
                <div class="bar-track">
                  <div class="bar-fill" style="width:${pct}%; background: linear-gradient(90deg, #22d3ee, #06b6d4);">
                    <span class="bar-value">${count}</span>
                  </div>
                </div>
              </div>`;
          }).join('');
      }
    } catch (err) {
      console.error('Failed to load charts:', err);
    }
  },

  async loadRecentPlayers() {
    try {
      const { data: players } = await supabase
        .from('players')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      const tbody = document.getElementById('recent-players-body');
      if (!tbody || !players) return;

      if (players.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted);">No players yet</td></tr>`;
        return;
      }

      tbody.innerHTML = players.map(p => `
        <tr>
          <td><strong>#${p.player_number}</strong></td>
          <td>${App.escapeHtml(p.last_name || '')}, ${App.escapeHtml(p.first_name || '')}</td>
          <td>${App.classificationBadge(p.classification)}</td>
          <td>${App.genderBadge(p.gender)}</td>
          <td>${App.escapeHtml(p.zone || '—')}</td>
          <td>${App.statusBadge(p.is_active)}</td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Failed to load recent players:', err);
    }
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => Dashboard.init());
