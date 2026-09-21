import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Upload, Check } from 'lucide-react';

export default function DiamantClientProfile() {
	const [saving, setSaving] = useState(false);
	const [successMsg, setSuccessMsg] = useState('');
	const [showAvatarSelector, setShowAvatarSelector] = useState(false);
	const [selectedAvatarSeed, setSelectedAvatarSeed] = useState('Victoria Belmont');

	// Form data mock
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
				setSelectedAvatarSeed(data.avatarSeed || `${data.firstName || 'Victoria'} ${data.lastName || 'Belmont'}`);
			} catch (e) {}
		}
	}, []);

	async function handleSave(e: React.FormEvent) {
		e.preventDefault();
		setSaving(true);
		setSuccessMsg('');

		await new Promise(resolve => setTimeout(resolve, 800));

		localStorage.setItem('diamant_client_profile', JSON.stringify({
			firstName, lastName, phone, preferences, avatarSeed: selectedAvatarSeed
		}));

		setSuccessMsg('Vos informations ont été mises à jour avec succès.');
		setSaving(false);
		setTimeout(() => setSuccessMsg(''), 3000);
	}

	function generateAvatar(seed: string) {
		const encoded = encodeURIComponent(seed);
		return `https://api.dicebear.com/7.x/initials/svg?seed=${encoded}&backgroundColor=f08080,f8ad9d,ffdab9&textColor=ffffff`;
	}

	const avatarOptions = [
		`${firstName} ${lastName}`,
		'VB',
		'Client',
		'Style',
		'Prestige'
	];

	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-stone-800">
			{/* Photo de profil & Résumé */}
			<div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm text-center h-fit relative">
				{showAvatarSelector ? (
					<div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 rounded-2xl p-6 flex flex-col items-center justify-center border border-stone-200 shadow-lg">
						<h4 className="text-sm font-bold text-stone-800 mb-4 uppercase tracking-widest">Choisir un avatar</h4>
						<div className="flex flex-wrap justify-center gap-3 mb-6">
							{avatarOptions.map(seed => (
								<button 
									key={seed}
									onClick={() => {
										setSelectedAvatarSeed(seed);
										setShowAvatarSelector(false);
									}}
									className={`relative w-14 h-14 rounded-full border-2 overflow-hidden transition-all ${selectedAvatarSeed === seed ? 'border-deep-teal-500 scale-110 shadow-md' : 'border-stone-200 hover:border-deep-teal-300'}`}
								>
									<img src={generateAvatar(seed)} alt={seed} className="w-full h-full object-cover" />
									{selectedAvatarSeed === seed && (
										<div className="absolute inset-0 bg-deep-teal-500/20 flex items-center justify-center">
											<Check size={20} className="text-white drop-shadow-md" />
										</div>
									)}
								</button>
							))}
						</div>
						<button onClick={() => setShowAvatarSelector(false)} className="text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors uppercase tracking-widest">
							Annuler
						</button>
					</div>
				) : null}

				<div className="relative w-32 h-32 mx-auto mb-6 group">
					<div className="w-full h-full rounded-full border border-stone-200 shadow-sm p-1 bg-white">
						<div className="w-full h-full rounded-full flex items-center justify-center overflow-hidden">
							<img src={generateAvatar(selectedAvatarSeed)} alt="Avatar" className="w-full h-full object-cover" />
						</div>
					</div>
					<button 
						onClick={() => setShowAvatarSelector(true)}
						className="absolute inset-0 m-1 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer backdrop-blur-[2px]"
					>
						<Upload size={18} className="mb-1" />
						<span className="text-[10px] font-bold uppercase tracking-wider">Modifier</span>
					</button>
				</div>
				
				<h2 className="text-2xl font-bold text-stone-900 mb-1">{firstName} {lastName}</h2>
				<p className="text-deep-teal-600 text-sm font-bold uppercase tracking-widest mb-6">Membre Diamant depuis 2024</p>
				
				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between text-sm p-3 rounded-xl bg-stone-50 border border-stone-100">
						<span className="text-stone-500">Rendez-vous passés</span>
						<span className="text-stone-900 font-bold font-coolvetica text-lg">12</span>
					</div>
					<div className="flex items-center justify-between text-sm p-3 rounded-xl bg-stone-50 border border-stone-100">
						<span className="text-stone-500">Dernière visite</span>
						<span className="text-stone-900 font-bold font-coolvetica text-lg">12 Sept.</span>
					</div>
				</div>
			</div>

			{/* Informations Personnelles */}
			<div className="lg:col-span-2 rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-4 mb-6 gap-4">
					<h3 className="text-lg font-bold text-stone-900">Informations Personnelles</h3>
					{successMsg && <span className="text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-bold border border-green-200">{successMsg}</span>}
				</div>
				
				<form onSubmit={handleSave} className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Prénom</label>
							<input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:border-deep-teal-400 focus:ring-1 focus:ring-deep-teal-400 transition-colors" />
						</div>
						<div>
							<label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Nom</label>
							<input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:border-deep-teal-400 focus:ring-1 focus:ring-deep-teal-400 transition-colors" />
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Email</label>
							<input type="email" value={email} disabled className="w-full bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 text-stone-400 cursor-not-allowed" />
						</div>
						<div>
							<label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Téléphone</label>
							<input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:border-deep-teal-400 focus:ring-1 focus:ring-deep-teal-400 transition-colors" />
						</div>
					</div>

					<div>
						<label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Préférences Capillaires (Nature des cheveux, allergies...)</label>
						<textarea rows={4} value={preferences} onChange={e => setPreferences(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:border-deep-teal-400 focus:ring-1 focus:ring-deep-teal-400 transition-colors resize-none"></textarea>
					</div>

					<div className="pt-4 flex justify-end">
						<button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-deep-teal-500 text-white font-bold text-sm hover:bg-deep-teal-600 transition-colors uppercase tracking-widest disabled:opacity-50">
							{saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
							{saving ? 'Sauvegarde...' : 'Sauvegarder'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
