
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jsojnwxstmhqcktwxvnh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impzb2pud3hzdG1ocWNrdHd4dm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMTgzODgsImV4cCI6MjA4MzU5NDM4OH0.i99dQFq2n9eQX2uWHe8Lf04VSBeMXoSiH9pjZ9o436w';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
