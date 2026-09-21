import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getPrimaryProfessional, getDemoTag, type Professional } from '@/lib/queries';
import { User, Mail, Phone, MapPin, Building2, Save, CreditCard, RefreshCw, Upload } from 'lucide-react';

export default function DiamantProProfile() {
	const [pro, setPro] = useState<Professional | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [successMsg, setSuccessMsg] = useState('');
	const [errorMsg, setErrorMsg] = useState('');

	// FormData
	const [businessName, setBusinessName] = useState('');
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [phone, setPhone] = useState('');
	const [address, setAddress] = useState('');

	useEffect(() => {
		async function fetchPro() {
			try {
				const tag = getDemoTag();
				const p = await getPrimaryProfessional(tag);
				// Check local storage for overrides
				const localDataStr = localStorage.getItem('diamant_pro_profile');
				let localData = null;
				if (localDataStr) {
					try {
						localData = JSON.parse(localDataStr);
					} catch (e) {}
				}

				if (p) {
					setPro(p);
					setBusinessName(localData?.business_name ?? p.business_name ?? '');
					setName(localData?.name ?? p.name ?? '');
					setEmail(localData?.email ?? p.email ?? '');
					setPhone(localData?.phone ?? p.phone ?? '');
					setAddress(localData?.address ?? p.address ?? '');
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
		if (!pro) return;

		setSaving(true);
		setSuccessMsg('');
		setErrorMsg('');

		try {
			// Save locally to persist across reloads in demo mode
			localStorage.setItem('diamant_pro_profile', JSON.stringify({
				business_name: businessName,
				name, email, phone, address
			}));

			// Try to save to DB (may fail if RLS is enabled without auth)
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

		} catch (err: any) {
			console.warn("DB update failed (likely RLS), but saved locally.", err);
		} finally {
			setSuccessMsg('Profil mis à jour avec succès.');
			
			// MAJ locale state
			setPro({
				...pro,
				business_name: businessName,
				name, email, phone, address
			});

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

			{/* Carte identité */}
			<div className="rounded-2xl border border-stone-200 bg-white p-7 shadow-sm mb-6">
				<div className="flex flex-col md:flex-row items-center gap-6 mb-8 border-b border-stone-100 pb-7">
					<div className="relative group shrink-0">
						<div className="w-24 h-24 rounded-2xl bg-stone-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
							<img src={generateAvatar()} alt="Avatar" className="w-full h-full object-cover" />
						</div>
						<button 
							onClick={() => alert('Fonctionnalité d\'upload d\'image à venir. Les avatars sont générés automatiquement pour la démo.')}
							className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl cursor-pointer"
						>
							<Upload size={18} className="mb-1" />
							<span className="text-[10px] font-bold uppercase tracking-wider">Modifier</span>
						</button>
					</div>
					<div className="text-center md:text-left">
						<h2 className="text-2xl font-bold text-stone-900 mb-1">{businessName || 'Mon Établissement'}</h2>
						<p className="text-deep-teal-600 text-sm font-bold uppercase tracking-widest">{pro?.description || 'Professionnel'}</p>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-7">
					<div className="md:col-span-2">
						<h3 className="text-base font-bold text-stone-800 mb-5">Informations Publiques</h3>
						<form onSubmit={handleSave} className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Building2 size={12}/> Nom de l'établissement</label>
									<input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:border-deep-teal-400 focus:ring-1 focus:ring-deep-teal-400" />
								</div>
								<div>
									<label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-2"><User size={12}/> Nom du gérant / Praticien</label>
									<input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:border-deep-teal-400 focus:ring-1 focus:ring-deep-teal-400" />
								</div>
							</div>
							
							<div>
								<label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-2"><MapPin size={12}/> Adresse postale</label>
								<input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:border-deep-teal-400 focus:ring-1 focus:ring-deep-teal-400" />
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Phone size={12}/> Téléphone</label>
									<input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:border-deep-teal-400 focus:ring-1 focus:ring-deep-teal-400" />
								</div>
								<div>
									<label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Mail size={12}/> Email de contact</label>
									<input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:border-deep-teal-400 focus:ring-1 focus:ring-deep-teal-400" />
								</div>
							</div>

							<div className="pt-4 flex justify-end">
								<button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-deep-teal-500 text-white font-bold text-sm hover:bg-deep-teal-600 transition-colors disabled:opacity-50">
									{saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
									{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
								</button>
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
