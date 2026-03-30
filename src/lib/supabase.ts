import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ldelvztpyfchfrprmwyt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZWx2enRweWZjaGZycHJtd3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMDc2NjksImV4cCI6MjA4ODY4MzY2OX0.Q7Fg4p8qiNOK6AhlbYl5gOc3Z8PmpWf9-75Vg2USL44';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
