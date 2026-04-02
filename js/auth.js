/**
 * WBSA Classification — Auth Module
 */

// Initialize Supabase client
let supabaseClient = null;

try {
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    throw new Error('Supabase CDN not loaded correctly');
  }

  if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
    throw new Error('Supabase config not loaded correctly');
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('Supabase client initialized successfully');
} catch (e) {
  console.error('Failed to initialize Supabase client:', e);
}

const Auth = {
  async login(email, password) {
    if (!supabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  async logout() {
    if (!supabaseClient) throw new Error('Supabase client not initialized');

    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    window.location.href = 'index.html';
  },

  async getSession() {
    if (!supabaseClient) return null;

    try {
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) console.error('Supabase session error:', error);
      return data?.session || null;
    } catch (err) {
      console.error('Failed to get session:', err);
      return null;
    }
  },

  async getUser() {
    if (!supabaseClient) return null;

    try {
      const { data, error } = await supabaseClient.auth.getUser();
      if (error) console.error('Supabase user error:', error);
      return data?.user || null;
    } catch (err) {
      console.error('Failed to get user:', err);
      return null;
    }
  },

  async requireAuth() {
    const session = await this.getSession();
    if (!session) {
      window.location.href = 'index.html';
      return null;
    }
    return session;
  },

  async redirectIfAuthenticated() {
    const session = await this.getSession();
    if (session) {
      window.location.href = 'dashboard.html';
    }
  }
};

window.Auth = Auth;
window.supabaseClient = supabaseClient;
