const SUPABASE_URL = "https://dtextxjqehntmuywjzre.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0ZXh0eGpxZWhudG11eXdqenJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzI0NTEsImV4cCI6MjA5MDIwODQ1MX0.ZorA2Z3K6IWOgMWdfCHmhZaHJWXchK_aXEhywIif9ns";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
},
});
