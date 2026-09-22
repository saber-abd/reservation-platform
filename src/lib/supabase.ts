import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!import.meta.env.PUBLIC_SUPABASE_URL || !import.meta.env.PUBLIC_SUPABASE_ANON_KEY) {
	console.warn(
		'Variables PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY non définies dans l\'environnement. Utilisation des valeurs de repli pour le build.',
	);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
