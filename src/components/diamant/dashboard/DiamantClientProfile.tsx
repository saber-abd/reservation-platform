import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Upload, Check } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { EnChargement, Squelette } from './kit/primitives';
import { confirmer } from './kit/notifier';
import { supabase } from '@/lib/supabase';

export default function DiamantClientProfile() {
	const [saving, setSaving] = useState(false);
	const [loading, setLoading] = useState(true);
	const reduit = useReducedMotion();
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
			confirmer('Vos informations ont été enregistrées avec succès.');
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
			<EnChargement label="Chargement de votre profil..." className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<Squelette className="h-[420px] !rounded-[14px]" />
				<Squelette className="h-[520px] !rounded-[14px] lg:col-span-2" />
			</EnChargement>
		);
	}

	return (
		<div className="grid grid-cols-1 items-start gap-6 text-dx-encre lg:grid-cols-3">
			{/* Photo de profil & résumé réel */}
			<section className="dx-carte relative overflow-hidden">
				<div className="flex flex-col items-center bg-dx-papier px-6 pb-6 pt-8 text-center">
					<div className="group relative h-28 w-28">
						<div className="h-full w-full overflow-hidden rounded-full bg-dx-ivoire-2 ring-4 ring-dx-carte">
							<img src={generateAvatar(selectedAvatarSeed)} alt="Avatar" width={112} height={112} className="h-full w-full object-cover" />
						</div>
						<button
							type="button"
							onClick={() => setShowAvatarSelector(true)}
							className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-dx-nuit/55 text-white opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
							title="Changer de photo"
							aria-label="Changer de photo"
						>
							<Upload size={18} className="mb-1" />
							<span className="text-[10px] font-semibold">Modifier</span>
						</button>
					</div>
					<h2 className="mt-5 break-words font-heading text-[1.9rem] font-light leading-none tracking-[-0.03em] text-dx-encre">{displayName}</h2>
					<p className="mt-2 text-sm text-dx-gris">{memberSince ? `Membre depuis ${memberSince}` : 'Compte Client'}</p>
				</div>
				<dl className="divide-y divide-dx-filet border-t border-dx-filet">
					<div className="flex items-baseline justify-between gap-3 px-6 py-4">
						<dt className="text-sm text-dx-gris">Rendez-vous passés</dt>
						<dd className="dx-chiffre text-3xl text-dx-encre">{pastCount}</dd>
					</div>
					<div className="flex items-baseline justify-between gap-3 px-6 py-4">
						<dt className="text-sm text-dx-gris">Dernière visite</dt>
						<dd className="text-sm font-semibold text-dx-encre">{lastVisit || 'Aucune visite'}</dd>
					</div>
				</dl>

				<AnimatePresence>
					{showAvatarSelector && (
						<motion.div
							initial={reduit ? false : { opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-dx-carte/97 p-6"
							role="dialog"
							aria-label="Choisir un avatar"
						>
							<h4 className="dx-h3 mb-5">Choisir un avatar</h4>
							<div className="mb-6 flex flex-wrap justify-center gap-3">
								{avatarOptions.map(seed => (
									<button
										key={seed}
										type="button"
										onClick={() => handleAvatarSelect(seed)}
										aria-pressed={selectedAvatarSeed === seed}
										className={`relative h-14 w-14 overflow-hidden rounded-full transition-transform ${
											selectedAvatarSeed === seed ? 'scale-110 ring-2 ring-dx-terre ring-offset-2 ring-offset-dx-carte' : 'ring-1 ring-dx-filet hover:scale-105'
										}`}
									>
										<img src={generateAvatar(seed)} alt={seed} className="h-full w-full object-cover" />
										{selectedAvatarSeed === seed && (
											<span className="absolute inset-0 flex items-center justify-center bg-dx-terre/30">
												<Check size={20} className="text-white" />
											</span>
										)}
									</button>
								))}
							</div>
							<button type="button" onClick={() => setShowAvatarSelector(false)} className="dx-btn dx-btn--sm dx-btn--fantome">
								Annuler
							</button>
						</motion.div>
					)}
				</AnimatePresence>
			</section>

			{/* Informations personnelles */}
			<section className="dx-carte p-6 sm:p-8 lg:col-span-2">
				<div className="mb-6 border-b border-dx-filet pb-5">
					<h3 className="dx-h2">Informations Personnelles</h3>
					<p className="dx-meta mt-1">Vos coordonnées réelles utilisées pour vos réservations et contact par le salon.</p>
				</div>

				<form onSubmit={handleSave} className="space-y-5">
					<div className="grid grid-cols-1 gap-5 md:grid-cols-2">
						<div>
							<label htmlFor="cl-prenom" className="dx-champ-label">Prénom</label>
							<input id="cl-prenom" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Votre prénom" className="dx-champ" />
						</div>
						<div>
							<label htmlFor="cl-nom" className="dx-champ-label">Nom</label>
							<input id="cl-nom" type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Votre nom" className="dx-champ" />
						</div>
					</div>

					<div className="grid grid-cols-1 gap-5 md:grid-cols-2">
						<div>
							<label htmlFor="cl-email" className="dx-champ-label">Adresse Email</label>
							<input id="cl-email" type="email" value={email} disabled className="dx-champ" />
							<p className="dx-champ-aide">Identifiant associé à votre compte de connexion.</p>
						</div>
						<div>
							<label htmlFor="cl-tel" className="dx-champ-label">Numéro de Téléphone</label>
							<input id="cl-tel" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ex : 06 00 00 00 00" className="dx-champ" />
							<p className="dx-champ-aide">Pour la confirmation de vos rendez-vous.</p>
						</div>
					</div>

					<div>
						<label htmlFor="cl-pref" className="dx-champ-label">Préférences Capillaires (Nature des cheveux, allergies, souhaits...)</label>
						<textarea
							id="cl-pref"
							rows={4}
							value={preferences}
							onChange={e => setPreferences(e.target.value)}
							placeholder="Indiquez ici vos préférences ou sensibilités éventuelles pour vos prestations..."
							className="dx-champ !resize-none"
						></textarea>
					</div>

					<div className="flex flex-wrap items-center justify-end gap-3 border-t border-dx-filet pt-5">
						{successMsg && (
							<span className="inline-flex items-center gap-1.5 text-sm font-semibold text-dx-ok" role="status">
								<Check size={15} /> {successMsg}
							</span>
						)}
						<button type="submit" disabled={saving} className="dx-btn">
							{saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
							<span>{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
						</button>
					</div>
				</form>
			</section>
		</div>
	);
}
