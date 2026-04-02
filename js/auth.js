/**
 * WBSA Classification — Auth Module
 * Handles Supabase authentication (login, logout, session checks)
 */

// Initialize Supabase client
let supabase;
try {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  console.error("Failed to initialize Supabase client. Is the CDN blocked?", e);
}

const Auth = {
  /**
   * Login with email and password
   */
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  /**
   * Logout current user
   */
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    window.location.href = 'index.html';
  },

  /**
   * Get current session
   */
  async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error('Supabase session error:', error);
      return data?.session || null;
    } catch (err) {
      console.error('Failed to get session:', err);
      return null;
    }
  },

  /**
   * Get current user
   */
  async getUser() {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error('Supabase user error:', error);
      return data?.user || null;
    } catch (err) {
      console.error('Failed to get user:', err);
      return null;
    }
  },

  /**
   * Require authentication — redirect to login if not authenticated.
   * Call this at the top of each protected page.
   */
  async requireAuth() {
    const session = await this.getSession();
    if (!session) {
      window.location.href = 'index.html';
      return null;
    }
    return session;
  },

  /**
   * If already authenticated, redirect away from login page.
   */
  async redirectIfAuthenticated() {
    const session = await this.getSession();
    if (session) {
      window.location.href = 'dashboard.html';
    }
  }
};
