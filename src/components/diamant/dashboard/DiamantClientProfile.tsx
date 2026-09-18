import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Upload } from 'lucide-react';

export default function DiamantClientProfile() {
	const [saving, setSaving] = useState(false);
	const [successMsg, setSuccessMsg] = useState('');

	// Form data mock (since we don't have a dedicated clients table for the demo, we mock it via localStorage)
	const [firstName, setFirstName] = useState('Victoria');
	const [lastName, setLastName] = useState('Belmont');
	const [email, setEmail] = useState('victoria.b@email.com');
	const [phone, setPhone] = useState('06 12 34 56 78');
	const [preferences, setPreferences] = useState('Cheveux fins, tendance sèche. Sensible au PPD (Paraphénylènediamine). Préfère les produits naturels.');

	useEffect(() => {
		const saved = localStorage.getItem('diamant_client_profile');
		if (saved) {
			try {
				const data = JSON.parse(saved);
				setFirstName(data.firstName || 'Victoria');
				setLastName(data.lastName || 'Belmont');
				setPhone(data.phone || '06 12 34 56 78');
				setPreferences(data.preferences || '');
			} catch (e) {}
		}
	}, []);

	async function handleSave(e: React.FormEvent) {
		e.preventDefault();
		setSaving(true);
		setSuccessMsg('');

		// Simuler un appel réseau
		await new Promise(resolve => setTimeout(resolve, 800));

		localStorage.setItem('diamant_client_profile', JSON.stringify({
			firstName, lastName, phone, preferences
		}));

		setSuccessMsg('Vos informations ont été mises à jour avec succès.');
		setSaving(false);
		setTimeout(() => setSuccessMsg(''), 3000);
	}

	function generateAvatar() {
		const seed = encodeURIComponent(`${firstName} ${lastName}`);
		// Style diamant
		return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=ffdab9,fbc4ab&textColor=1c1917`;
	}

	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
			{/* Photo de profil & Résumé */}
			<div className="rounded-2xl border border-white/10 bg-stone-900/50 p-8 shadow-xl text-center h-fit">
				<div className="relative w-32 h-32 mx-auto mb-6 group">
					<div className="w-full h-full rounded-full bg-gradient-to-br from-jasmine-400 to-jasmine-600 p-1">
						<div className="w-full h-full rounded-full bg-stone-950 flex items-center justify-center overflow-hidden">
							<img src={generateAvatar()} alt="Avatar" className="w-full h-full object-cover" />
						</div>
					</div>
					<button 
						onClick={() => alert('Fonctionnalité d\'upload d\'image à venir. Les avatars sont générés automatiquement pour la démo.')}
						className="absolute inset-0 m-1 bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer"
					>
						<Upload size={18} className="mb-1 text-jasmine-400" />
						<span className="text-[10px] font-bold uppercase tracking-wider text-jasmine-400">Modifier</span>
					</button>
				</div>
				
				<h2 className="text-2xl font-bold text-white mb-1">{firstName} {lastName}</h2>
				<p className="text-stone-400 mb-6">Membre Diamant depuis 2024</p>
				
				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between text-sm p-3 rounded-xl bg-white/5 border border-white/10">
						<span className="text-stone-400">Rendez-vous passés</span>
						<span className="text-white font-bold">12</span>
					</div>
					<div className="flex items-center justify-between text-sm p-3 rounded-xl bg-white/5 border border-white/10">
						<span className="text-stone-400">Dernière visite</span>
						<span className="text-white font-bold">12 Sept.</span>
					</div>
				</div>
			</div>

			{/* Informations Personnelles */}
			<div className="lg:col-span-2 rounded-2xl border border-white/10 bg-stone-900/50 p-8 shadow-xl">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-4 mb-6 gap-4">
					<h3 className="text-lg font-bold text-white">Informations Personnelles</h3>
					{successMsg && <span className="text-green-400 text-sm font-medium">{successMsg}</span>}
				</div>
				
				<form onSubmit={handleSave} className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Prénom</label>
							<input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-stone-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-jasmine-400/50 transition-colors" />
						</div>
						<div>
							<label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Nom</label>
							<input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-stone-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-jasmine-400/50 transition-colors" />
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Email</label>
							<input type="email" value={email} disabled className="w-full bg-stone-950/50 border border-white/10 rounded-xl px-4 py-3 text-stone-400 cursor-not-allowed" />
						</div>
						<div>
							<label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Téléphone</label>
							<input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-stone-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-jasmine-400/50 transition-colors" />
						</div>
					</div>

					<div>
						<label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Préférences Capillaires (Nature des cheveux, allergies...)</label>
						<textarea rows={4} value={preferences} onChange={e => setPreferences(e.target.value)} className="w-full bg-stone-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-jasmine-400/50 transition-colors resize-none"></textarea>
					</div>

					<div className="pt-4 flex justify-end">
						<button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-jasmine-500 to-jasmine-600 text-stone-950 font-bold text-sm hover:from-jasmine-400 hover:to-jasmine-500 transition-colors shadow-[0_0_15px_rgba(235,188,102,0.3)] uppercase tracking-widest disabled:opacity-50">
							{saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
							{saving ? 'Sauvegarde...' : 'Sauvegarder'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
