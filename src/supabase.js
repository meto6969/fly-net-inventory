import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://whqvudenvywcjckoosqx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndocXZ1ZGVudnl3Y2pja29vc3F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMjY5ODEsImV4cCI6MjEwMjkwMjk4MX0.WRhWe8NweHLS9YKSV0zj_-VsJKsA63qczFlragOSTGc';

export const supabase = createClient(supabaseUrl, supabaseKey);