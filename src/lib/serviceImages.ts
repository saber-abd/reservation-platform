export function getServiceImageFallback(serviceName: string): string {
  const name = serviceName.toLowerCase();
  
  if (name.includes('femme')) return '/images/prestations/coupe_femme.jpg';
  if (name.includes('homme')) return '/images/prestations/coupe_homme.jpg';
  if (name.includes('enfant')) return '/images/prestations/coupe_enfant.jpg';
  if (name.includes('coloration')) return '/images/prestations/coloration_complete.jpg';
  if (name.includes('balayage') || name.includes('mèche') || name.includes('meche')) return '/images/prestations/balayage_meches.jpg';
  if (name.includes('brushing')) return '/images/prestations/brushing.jpg';
  if (name.includes('lissage')) return '/images/prestations/lissage_bresilien.jpg';
  if (name.includes('permanente')) return '/images/prestations/permanente.jpg';
  if (name.includes('soin')) return '/images/prestations/soin_capillaire.jpg';
  if (name.includes('chignon')) return '/images/prestations/chignon_coiffe.jpg';

  // Default fallback if no match
  return `https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80`;
}
