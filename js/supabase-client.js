import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://nturffjkprilmvqwbnml.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dXJmZmprcHJpbG12cXdibm1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MDIxNzQsImV4cCI6MjA3NjM3ODE3NH0.wGNftRwd-AyBt38vKk2SfNwODdEhjIcmDXy9EQMAcuw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);