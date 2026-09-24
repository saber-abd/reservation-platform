import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Upload, Check, Calendar, Clock, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function DiamantClientProfile() {
	const [saving, setSaving] = useState(false);
	const [loading, setLoading] = useState(true);
	const [successMsg, setSuccessMsg] = useState('');
	const [showAvatarSelector, setShowAvatarSelector] = useState(false);
	const [selectedAvatarSeed, setSelectedAvatarSeed] = useState('Client');

	// Données du formulaire réelles (sans données factices)
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [phone, setPhone] = useState('');
	const [preferences, setPreferences] = useState('');

	// Statistiques réelles depuis la base de données
	const [pastCount, setPastCount] = useState<number>(0);
	const [lastVisit, setLastVisitDate] = useState<string | null>(null);
	const [memberSince, setMemberSince] = useState<string>('');

	useEffect(() => {
		async function fetchProfile() {
			try {
				const { data: { session } } = await supabase.auth.getSession();
				if (!session?.user) {
					setLoading(false);
					return;
				}

				const user = session.user;
				setEmail(user.email || '');

				// 1. Charger la fiche client depuis Supabase
				const { data: clientData } = await supabase
					.from('clients')
					.select('*')
					.eq('id', user.id)
					.maybeSingle();

				const rawName = clientData?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || '';
				if (rawName) {
					const nameParts = rawName.trim().split(' ');
					setFirstName(nameParts[0] || '');
					setLastName(nameParts.slice(1).join(' ') || '');
				}

				// Téléphone : uniquement la vraie valeur en BDD (pas de 06 12 34 56 78 par défaut)
				setPhone(clientData?.phone || '');

				// Préférences capillaires
				const savedPref = clientData?.preferences || (typeof window !== 'undefined' ? localStorage.getItem(`diamant_pref_${user.id}`) : '');
				setPreferences(savedPref || '');

				// Avatar
				const avatar = clientData?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
				if (avatar) {
					setSelectedAvatarSeed(avatar);
				} else if (rawName) {
					setSelectedAvatarSeed(rawName);
				}

				// Membre depuis
				const createdAtStr = clientData?.created_at || user.created_at;
				if (createdAtStr) {
					const d = new Date(createdAtStr);
					const formatted = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
					setMemberSince(formatted.charAt(0).toUpperCase() + formatted.slice(1));
				}

				// 2. Charger les vraies statistiques de rendez-vous en BD
				const { data: apts, count } = await supabase
					.from('appointments')
					.select('id, start_time, status', { count: 'exact' })
					.eq('client_id', user.id)
					.lt('start_time', new Date().toISOString())
					.order('start_time', { ascending: false });

				const realPastCount = count || (apts?.length ?? 0);
				setPastCount(realPastCount);

				if (apts && apts.length > 0) {
					const d = new Date(apts[0].start_time);
					setLastVisitDate(d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }));
				} else {
					setLastVisitDate(null);
				}
			} catch (e) {
				console.error('Erreur chargement profil client:', e);
			} finally {
				setLoading(false);
			}
		}

		fetchProfile();
	}, []);

	function generateAvatar(seed: string) {
		if (!seed) return `https://api.dicebear.com/7.x/avataaars/svg?seed=Client&backgroundColor=f08080,f8ad9d,ffdab9`;
		if (seed.startsWith('http')) return seed;
		const encoded = encodeURIComponent(seed);
		return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encoded}&backgroundColor=f08080,f8ad9d,ffdab9`;
	}

	async function handleSave(e: React.FormEvent) {
		e.preventDefault();
		setSaving(true);
		setSuccessMsg('');

		try {
			const { data: { session } } = await supabase.auth.getSession();
			if (!session?.user) return;

			const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
			const avatarUrl = generateAvatar(selectedAvatarSeed);

			// Mise à jour locale immédiate
			try {
				localStorage.setItem('diamant_client_avatar', avatarUrl);
				localStorage.setItem(`diamant_pref_${session.user.id}`, preferences);
				window.dispatchEvent(new CustomEvent('diamant:avatar-changed', { detail: { avatarUrl } }));
			} catch {}

			// Mise à jour dans Supabase (table clients)
			try {
				await supabase
					.from('clients')
					.update({
						full_name: fullName || 'Client',
						phone: phone.trim() || null,
						avatar_url: avatarUrl,
						preferences: preferences.trim() || null
					})
					.eq('id', session.user.id);
			} catch (dbErr) {
				// Repli sans la colonne preferences si la migration n'a pas encore été passée
				await supabase
					.from('clients')
					.update({
						full_name: fullName || 'Client',
						phone: phone.trim() || null,
						avatar_url: avatarUrl
					})
					.eq('id', session.user.id);
			}

			setSuccessMsg('Vos informations ont été enregistrées avec succès.');
		} catch (e) {
			console.error('Erreur sauvegarde profil:', e);
		} finally {
			setSaving(false);
			setTimeout(() => setSuccessMsg(''), 3500);
		}
	}

	async function handleAvatarSelect(seed: string) {
		setSelectedAvatarSeed(seed);
		setShowAvatarSelector(false);
		const avatarUrl = generateAvatar(seed);

		try {
			localStorage.setItem('diamant_client_avatar', avatarUrl);
			window.dispatchEvent(new CustomEvent('diamant:avatar-changed', { detail: { avatarUrl } }));

			const { data: { session } } = await supabase.auth.getSession();
			if (session?.user) {
				await supabase
					.from('clients')
					.update({ avatar_url: avatarUrl })
					.eq('id', session.user.id);
			}
		} catch (e) {
			console.error('Erreur mise à jour avatar:', e);
		}
	}

	const displayName = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : 'Mon Profil';
	const avatarOptions = [
		displayName || 'Client',
		'Sophie',
		'Elodie',
		'Lucas',
		'Marie'
	];

	if (loading) {
		return (
			<div className="rounded-2xl border border-stone-200 bg-white p-12 text-center text-stone-400">
				Chargement de votre profil...
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-stone-800">
			{/* Photo de profil & Résumé réel */}
			<div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-xs text-center h-fit relative">
				{showAvatarSelector ? (
					<div className="absolute inset-0 bg-white/95 backdrop-blur-xs z-10 rounded-2xl p-6 flex flex-col items-center justify-center border border-stone-200 shadow-lg">
						<h4 className="text-xs font-bold text-stone-800 mb-4 uppercase tracking-widest">Choisir un avatar</h4>
						<div className="flex flex-wrap justify-center gap-3 mb-6">
							{avatarOptions.map(seed => (
								<button 
									key={seed}
									type="button"
									onClick={() => handleAvatarSelect(seed)}
									className={`relative w-14 h-14 rounded-full border-2 overflow-hidden transition-all cursor-pointer ${
										selectedAvatarSeed === seed ? 'border-deep-teal-500 scale-110 shadow-md' : 'border-stone-200 hover:border-deep-teal-300'
									}`}
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
						<button 
							type="button"
							onClick={() => setShowAvatarSelector(false)} 
							className="text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors uppercase tracking-widest cursor-pointer"
						>
							Annuler
						</button>
					</div>
				) : null}

				<div className="relative w-32 h-32 mx-auto mb-6 group">
					<div className="w-full h-full rounded-full border border-stone-200 shadow-2xs p-1 bg-white">
						<div className="w-full h-full rounded-full flex items-center justify-center overflow-hidden bg-stone-100">
							<img src={generateAvatar(selectedAvatarSeed)} alt="Avatar" className="w-full h-full object-cover" />
						</div>
					</div>
					<button 
						type="button"
						onClick={() => setShowAvatarSelector(true)}
						className="absolute inset-0 m-1 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer backdrop-blur-[2px]"
						title="Changer de photo"
					>
						<Upload size={18} className="mb-1" />
						<span className="text-[10px] font-bold uppercase tracking-wider">Modifier</span>
					</button>
				</div>
				
				<h2 className="text-2xl font-bold text-stone-900 mb-1">{displayName}</h2>
				<p className="text-deep-teal-600 text-xs font-bold uppercase tracking-widest mb-6">
					{memberSince ? `Membre depuis ${memberSince}` : 'Compte Client'}
				</p>
				
				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between text-sm p-3.5 rounded-xl bg-stone-50 border border-stone-100">
						<span className="text-xs text-stone-500 font-medium">Rendez-vous passés</span>
						<span className="text-stone-900 font-black text-lg">{pastCount}</span>
					</div>
					<div className="flex items-center justify-between text-sm p-3.5 rounded-xl bg-stone-50 border border-stone-100">
						<span className="text-xs text-stone-500 font-medium">Dernière visite</span>
						<span className="text-stone-900 font-bold text-sm">
							{lastVisit || 'Aucune visite'}
						</span>
					</div>
				</div>
			</div>

			{/* Informations Personnelles */}
			<div className="lg:col-span-2 rounded-2xl border border-stone-200 bg-white p-8 shadow-xs">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-4 mb-6 gap-4">
					<div>
						<h3 className="text-lg font-bold text-stone-900">Informations Personnelles</h3>
						<p className="text-xs text-stone-400 mt-0.5">Vos coordonnées réelles utilisées pour vos réservations et rappels SMS.</p>
					</div>
					{successMsg && (
						<span className="text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-200 animate-in fade-in">
							{successMsg}
						</span>
					)}
				</div>
				
				<form onSubmit={handleSave} className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Prénom</label>
							<input 
								type="text" 
								value={firstName} 
								onChange={e => setFirstName(e.target.value)} 
								placeholder="Votre prénom"
								className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 focus:outline-none focus:border-deep-teal-400 focus:bg-white transition-colors" 
							/>
						</div>
						<div>
							<label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Nom</label>
							<input 
								type="text" 
								value={lastName} 
								onChange={e => setLastName(e.target.value)} 
								placeholder="Votre nom"
								className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 focus:outline-none focus:border-deep-teal-400 focus:bg-white transition-colors" 
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Adresse Email</label>
							<input 
								type="email" 
								value={email} 
								disabled 
								className="w-full bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-500 cursor-not-allowed" 
							/>
							<p className="text-[11px] text-stone-400 mt-1">Identifiant associé à votre compte de connexion.</p>
						</div>
						<div>
							<label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Numéro de Téléphone</label>
							<input 
								type="tel" 
								value={phone} 
								onChange={e => setPhone(e.target.value)} 
								placeholder="Ex : 06 00 00 00 00"
								className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 focus:outline-none focus:border-deep-teal-400 focus:bg-white transition-colors" 
							/>
							<p className="text-[11px] text-stone-400 mt-1">Pour la confirmation de vos rendez-vous.</p>
						</div>
					</div>

					<div>
						<label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">
							Préférences Capillaires (Nature des cheveux, allergies, souhaits...)
						</label>
						<textarea 
							rows={3} 
							value={preferences} 
							onChange={e => setPreferences(e.target.value)} 
							placeholder="Indiquez ici vos préférences ou sensibilités éventuelles pour vos prestations..."
							className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 focus:outline-none focus:border-deep-teal-400 focus:bg-white transition-colors resize-none"
						></textarea>
					</div>

					<div className="pt-2 flex justify-end">
						<button 
							type="submit" 
							disabled={saving} 
							className="flex items-center gap-2 px-6 py-3 rounded-xl bg-deep-teal-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-deep-teal-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
						>
							{saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
							<span>{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
