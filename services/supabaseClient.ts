import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jsojnwxstmhqcktwxvnh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impzb2pud3hzdG1ocWNrdHd4dm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMTgzODgsImV4cCI6MjA4MzU5NDM4OH0.i99dQFq2n9eQX2uWHe8Lf04VSBeMXoSiH9pjZ9o436w';

// Add a safety check for production environments
export const supabase = (() => {
  try {
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch (e) {
    console.error("Supabase failed to initialize:", e);
    // Return a mock object if it fails to prevent crashing components
    return {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: () => Promise.resolve(),
      },
      from: () => ({
        select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [] }) }) }),
        delete: () => ({ match: () => ({ filter: () => Promise.resolve() }) }),
        insert: () => Promise.resolve(),
      })
    } as any;
  }
})();