import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Parse .env manually since dotenv might not be installed
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  }
});

const supabaseUrl = env['PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const imageMapping = {
  'Coupe femme': '/images/prestations/coupe_femme.jpg',
  'Coupe homme': '/images/prestations/coupe_homme.jpg',
  'Coupe enfant': '/images/prestations/coupe_enfant.jpg',
  'Coloration complète': '/images/prestations/coloration_complete.jpg',
  'Balayage / Mèches': '/images/prestations/balayage_meches.jpg',
  'Brushing': '/images/prestations/brushing.jpg',
  'Lissage brésilien': '/images/prestations/lissage_bresilien.jpg',
  'Permanente': '/images/prestations/permanente.jpg',
  'Soin capillaire': '/images/prestations/soin_capillaire.jpg',
  'Chignon coiffé': '/images/prestations/chignon_coiffe.jpg'
};

async function updateImages() {
  for (const [name, imageUrl] of Object.entries(imageMapping)) {
    const { data, error } = await supabase
      .from('services')
      .update({ image_url: imageUrl })
      .eq('name', name);
    
    if (error) {
      console.error(`Error updating ${name}:`, error.message);
    } else {
      console.log(`Updated ${name} successfully.`);
    }
  }
  console.log('All done!');
}

updateImages();
