import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getPrimaryProfessional, getDemoTag, type Professional } from '@/lib/queries';
import { getActiveProRole, type ProRole } from '@/lib/permissions';
import { User, Mail, Phone, MapPin, Building2, Save, CreditCard, RefreshCw, Upload, Lock } from 'lucide-react';

export default function DiamantProProfile() {
	const [pro, setPro] = useState<Professional | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [successMsg, setSuccessMsg] = useState('');
	const [errorMsg, setErrorMsg] = useState('');
	const [role, setRole] = useState<ProRole>('admin');

	// FormData
	const [businessName, setBusinessName] = useState('');
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [phone, setPhone] = useState('');
	const [address, setAddress] = useState('');

	useEffect(() => {
		setRole(getActiveProRole());
		const onRoleChange = (e: any) => {
			if (e.detail?.role) setRole(e.detail.role);
		};
		window.addEventListener('pro:role-changed', onRoleChange);

		async function fetchPro() {
			try {
				const tag = getDemoTag();
				let p = null;
				try {
					p = await getPrimaryProfessional(tag);
				} catch (e) {
					console.warn("Could not fetch primary professional:", e);
				}

				// Check local storage for overrides
				const localDataStr = typeof window !== 'undefined' ? localStorage.getItem('diamant_pro_profile') : null;
				let localData = null;
				if (localDataStr) {
					try {
						localData = JSON.parse(localDataStr);
					} catch (e) {}
				}

				// Check cookie as fallback
				let cookieBusinessName = null;
				if (typeof document !== 'undefined') {
					const match = document.cookie.match(/(^|;)\s*diamant_business_name=([^;]+)/);
					if (match) cookieBusinessName = decodeURIComponent(match[2]);
				}

				const resolvedBusinessName = localData?.business_name ?? cookieBusinessName ?? p?.business_name ?? "On'hair";
				const resolvedName = localData?.name ?? p?.name ?? 'Alexandre de Paris';
				const resolvedEmail = localData?.email ?? p?.email ?? 'contact@prestige-diamant.fr';
				const resolvedPhone = localData?.phone ?? p?.phone ?? '01 42 68 55 00';
				const resolvedAddress = localData?.address ?? p?.address ?? '18 Place Vendôme, 75001 Paris';

				setBusinessName(resolvedBusinessName);
				setName(resolvedName);
				setEmail(resolvedEmail);
				setPhone(resolvedPhone);
				setAddress(resolvedAddress);

				if (p) {
					setPro(p);
				} else {
					// Fallback pro object for demo mode
					setPro({
						id: 'demo-pro-diamant',
						user_id: 'demo-user-diamant',
						business_name: resolvedBusinessName,
						activity: 'Haute Coiffure & Soins Précieux',
						description: 'Salon de prestige dédié à l\'élégance.',
						phone: resolvedPhone,
						email: resolvedEmail,
						address: resolvedAddress,
						logo_url: null,
						avatar_url: null,
						opening_hours: null,
						tag_bd: tag
					});
				}
			} catch (err) {
				console.error(err);
			} finally {
				setLoading(false);
			}
		}
		fetchPro();
	}, []);

	async function handleSave(e: React.FormEvent) {
		e.preventDefault();

		if (role === 'employee' || role === 'demo') {
			setErrorMsg("Action désactivée : modifications non autorisées dans ce mode.");
			return;
		}

		setSaving(true);
		setSuccessMsg('');
		setErrorMsg('');

		try {
			// 1. Save locally to persist across reloads
			localStorage.setItem('diamant_pro_profile', JSON.stringify({
				business_name: businessName,
				name, email, phone, address
			}));

			// 2. Set cookie for immediate SSR sync across all site pages
			document.cookie = `diamant_business_name=${encodeURIComponent(businessName)}; path=/; max-age=31536000; SameSite=Lax`;

			// 3. Immediately update all elements with data-diamant-business-name in current DOM
			document.querySelectorAll('[data-diamant-business-name]').forEach((el) => {
				el.textContent = businessName;
			});

			// 4. Dispatch custom event for any listening components
			window.dispatchEvent(new CustomEvent('diamant:profile-updated', {
				detail: { business_name: businessName }
			}));

			// 5. Try to save to DB (may fail if RLS is enabled without auth in demo mode)
			if (pro && pro.id !== 'demo-pro-diamant') {
				await supabase
					.from('professionals')
					.update({
						business_name: businessName,
						name: name,
						email: email,
						phone: phone,
						address: address
					})
					.eq('id', pro.id);
			}

		} catch (err: any) {
			console.warn("DB update failed (likely RLS), but saved locally.", err);
		} finally {
			setSuccessMsg('Profil et nom de l\'établissement mis à jour avec succès.');
			
			// MAJ locale state
			if (pro) {
				setPro({
					...pro,
					business_name: businessName,
					name, email, phone, address
				});
			}

			setSaving(false);
			setTimeout(() => setSuccessMsg(''), 3000);
		}
	}

	function handleBilling() {
		alert('Fonctionnalité "Gérer la facturation" à venir très prochainement !');
	}

	function generateAvatar() {
		const seed = encodeURIComponent(businessName || name || 'Prestige');
		return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=f08080,f8ad9d,ffdab9&textColor=ffffff`;
	}

	if (loading) {
		return <div className="py-12 text-center text-stone-400">Chargement du profil...</div>;
	}

	return (
		<div className="space-y-6">
			{successMsg && (
				<div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
					{successMsg}
				</div>
			)}
			{errorMsg && (
				<div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">
					{errorMsg}
				</div>
			)}

			{/* Alerte Mode Employé ou Démo */}
			{(role === 'employee' || role === 'demo') && (
				<div className={`mb-6 p-4 rounded-2xl border flex items-start gap-3.5 shadow-2xs ${
					role === 'demo' 
						? 'bg-purple-50 border-purple-200 text-purple-950' 
						: 'bg-amber-50 border-amber-200 text-amber-950'
				}`}>
					<div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
						role === 'demo' 
							? 'bg-purple-100 border-purple-300 text-purple-800' 
							: 'bg-amber-100 border-amber-300 text-amber-800'
					}`}>
						<Lock size={16} />
					</div>
					<div>
						<p className="font-bold text-sm">
							{role === 'demo' ? 'Mode Démo Commercial — Consultation Seule' : 'Mode Employé — Modification Verrouillée'}
						</p>
						<p className="text-xs mt-0.5 leading-relaxed opacity-90">
							{role === 'demo'
								? "Vous explorez le profil en mode Démo Commercial. Toutes les informations sont visibles pour vos prospects, mais les modifications sont désactivées."
								: "Vous êtes connecté avec les droits Employé. Vous n'avez pas la permission de modifier les informations de l'établissement."}
						</p>
					</div>
				</div>
			)}

			{/* Carte identité */}
			<div className="rounded-2xl border border-stone-200 bg-white p-7 shadow-sm mb-6">
				<div className="flex flex-col md:flex-row items-center gap-6 mb-8 border-b border-stone-100 pb-7">
					<div className="relative group shrink-0">
						<div className="w-24 h-24 rounded-2xl bg-stone-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
							<img src={generateAvatar()} alt="Avatar" className="w-full h-full object-cover" />
						</div>
						{role === 'admin' && (
							<button 
								onClick={() => alert('Fonctionnalité d\'upload d\'image à venir. Les avatars sont générés automatiquement pour la démo.')}
								className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl cursor-pointer"
							>
								<Upload size={18} className="mb-1" />
								<span className="text-[10px] font-bold uppercase tracking-wider">Modifier</span>
							</button>
						)}
					</div>
					<div className="text-center md:text-left">
						<h2 className="text-2xl font-bold text-stone-900 mb-1">{businessName || 'Mon Établissement'}</h2>
						<p className="text-deep-teal-600 text-sm font-bold uppercase tracking-widest">{pro?.description || 'Professionnel'}</p>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-7">
					<div className="md:col-span-2">
						<div className="flex items-center justify-between mb-5">
							<h3 className="text-base font-bold text-stone-800">Informations Publiques</h3>
							{(role === 'employee' || role === 'demo') && (
								<span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200 flex items-center gap-1">
									<Lock size={11} /> Lecture Seule
								</span>
							)}
						</div>
						<form onSubmit={handleSave} className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Building2 size={12}/> Nom de l'établissement</label>
									<input 
										type="text" 
										disabled={role === 'employee' || role === 'demo'}
										value={businessName} 
										onChange={e => setBusinessName(e.target.value)} 
										className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:border-deep-teal-400 focus:ring-1 focus:ring-deep-teal-400 disabled:opacity-60 disabled:cursor-not-allowed" 
									/>
								</div>
								<div>
									<label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-2"><User size={12}/> Nom du gérant / Praticien</label>
									<input 
										type="text" 
										disabled={role === 'employee' || role === 'demo'}
										value={name} 
										onChange={e => setName(e.target.value)} 
										className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:border-deep-teal-400 focus:ring-1 focus:ring-deep-teal-400 disabled:opacity-60 disabled:cursor-not-allowed" 
									/>
								</div>
							</div>
							
							<div>
								<label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-2"><MapPin size={12}/> Adresse postale</label>
								<input 
									type="text" 
									disabled={role === 'employee' || role === 'demo'}
									value={address} 
									onChange={e => setAddress(e.target.value)} 
									className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:border-deep-teal-400 focus:ring-1 focus:ring-deep-teal-400 disabled:opacity-60 disabled:cursor-not-allowed" 
								/>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Phone size={12}/> Téléphone</label>
									<input 
										type="tel" 
										disabled={role === 'employee' || role === 'demo'}
										value={phone} 
										onChange={e => setPhone(e.target.value)} 
										className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:border-deep-teal-400 focus:ring-1 focus:ring-deep-teal-400 disabled:opacity-60 disabled:cursor-not-allowed" 
									/>
								</div>
								<div>
									<label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Mail size={12}/> Email de contact</label>
									<input 
										type="email" 
										disabled={role === 'employee' || role === 'demo'}
										value={email} 
										onChange={e => setEmail(e.target.value)} 
										className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:border-deep-teal-400 focus:ring-1 focus:ring-deep-teal-400 disabled:opacity-60 disabled:cursor-not-allowed" 
									/>
								</div>
							</div>

							<div className="pt-4 flex justify-end">
								{role === 'employee' || role === 'demo' ? (
									<div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-stone-100 text-stone-400 font-bold text-xs border border-stone-200">
										<Lock size={14} />
										<span>{role === 'demo' ? 'Lecture seule (Mode Démo)' : 'Modification réservée à l\'administrateur'}</span>
									</div>
								) : (
									<button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-deep-teal-500 text-white font-bold text-sm hover:bg-deep-teal-600 transition-colors disabled:opacity-50 cursor-pointer shadow-xs">
										{saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
										{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
									</button>
								)}
							</div>
						</form>
					</div>

					<div>
						<h3 className="text-base font-bold text-stone-800 mb-5">Abonnement</h3>
						<div className="rounded-2xl border border-deep-teal-200 bg-deep-teal-50 p-6 shadow-sm">
							<div className="flex items-center justify-between mb-3">
								<span className="text-deep-teal-700 font-bold uppercase tracking-widest text-sm">Plan Prestige</span>
								<span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full border border-green-200">Actif</span>
							</div>
							<p className="text-stone-600 text-sm mb-5">Toutes les fonctionnalités premium sont activées.</p>
							<button onClick={handleBilling} className="flex items-center justify-center gap-2 w-full rounded-xl border border-deep-teal-300 bg-white px-4 py-3 text-sm font-bold text-deep-teal-700 hover:bg-deep-teal-50 transition-colors card-hover">
								<CreditCard size={16} /> Gérer la facturation
							</button>
						</div>

						<div className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
							<h4 className="text-stone-700 font-bold text-sm mb-3">Accès rapide</h4>
							<div className="space-y-2">
								<a href="/demo-diamant/dashboard" className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 text-stone-600 text-sm transition-colors">
									<span className="w-6 h-6 rounded-md bg-stone-100 flex items-center justify-center text-stone-500 text-xs">→</span>
									Tableau de bord
								</a>
								<a href="/demo-diamant/dashboard/services" className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 text-stone-600 text-sm transition-colors">
									<span className="w-6 h-6 rounded-md bg-stone-100 flex items-center justify-center text-stone-500 text-xs">✂</span>
									Gérer les prestations
								</a>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
