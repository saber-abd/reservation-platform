import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getPrimaryProfessional, getDemoTag, type Professional } from '@/lib/queries';
import { getActiveProRole, type ProRole } from '@/lib/permissions';
import { User, Mail, Phone, MapPin, Building2, Save, CreditCard, RefreshCw, Upload, Lock, ArrowRight } from 'lucide-react';
import { EnChargement, Pastille, Squelette } from './kit/primitives';
import { avertirLectureSeule, confirmer, informer } from './kit/notifier';

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
			avertirLectureSeule("Action désactivée : modifications non autorisées dans ce mode.");
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
			confirmer('Profil et nom de l\'établissement mis à jour avec succès.');
			
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
		informer('Fonctionnalité "Gérer la facturation" à venir très prochainement !');
	}

	const lectureSeule = role === 'employee' || role === 'demo';
	const initiale = (businessName || name || 'O').trim().charAt(0).toUpperCase();

	if (loading) {
		return (
			<EnChargement label="Chargement du profil..." className="grid gap-6 lg:grid-cols-12">
				<Squelette className="h-[560px] !rounded-[14px] lg:col-span-8" />
				<Squelette className="h-[360px] !rounded-[14px] lg:col-span-4" />
			</EnChargement>
		);
	}

	const champs: { id: string; label: string; icon: typeof User; value: string; set: (v: string) => void; type?: string; large?: boolean }[] = [
		{ id: 'pro-etab', label: "Nom de l'établissement", icon: Building2, value: businessName, set: setBusinessName },
		{ id: 'pro-nom', label: 'Nom du gérant / Praticien', icon: User, value: name, set: setName },
		{ id: 'pro-adresse', label: 'Adresse postale', icon: MapPin, value: address, set: setAddress, large: true },
		{ id: 'pro-tel', label: 'Téléphone', icon: Phone, value: phone, set: setPhone, type: 'tel' },
		{ id: 'pro-email', label: 'Email de contact', icon: Mail, value: email, set: setEmail, type: 'email' },
	];

	return (
		<div className="space-y-6">
			{/* Alerte Mode Employé ou Démo */}
			{lectureSeule && (
				<div className="dx-bandeau" data-ton={role === 'demo' ? 'lecture' : 'attente'}>
					<Lock size={17} className={role === 'demo' ? 'mt-0.5 flex-none text-dx-terre-clair' : 'mt-0.5 flex-none'} />
					<p>
						<b className="block">{role === 'demo' ? 'Mode Démo Commercial — Consultation Seule' : 'Mode Employé — Modification Verrouillée'}</b>
						{role === 'demo'
							? "Vous explorez le profil en mode Démo Commercial. Toutes les informations sont visibles pour vos prospects, mais les modifications sont désactivées."
							: "Vous êtes connecté avec les droits Employé. Vous n'avez pas la permission de modifier les informations de l'établissement."}
					</p>
				</div>
			)}

			<div className="grid items-start gap-6 lg:grid-cols-12">
				<section className="dx-carte overflow-hidden lg:col-span-8">
					{/* Carte identité */}
					<div className="flex flex-col gap-5 border-b border-dx-filet bg-dx-papier p-6 sm:flex-row sm:items-center sm:p-8">
						<div className="group relative shrink-0">
							<div className="grid h-24 w-24 place-items-center rounded-full bg-dx-encre font-heading text-5xl italic text-dx-creme" aria-hidden="true">
								{initiale}
							</div>
							{role === 'admin' && (
								<button
									type="button"
									onClick={() => informer("Fonctionnalité d'upload d'image à venir. Les avatars sont générés automatiquement pour la démo.")}
									className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-dx-nuit/60 text-white opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
									aria-label="Modifier l'image de l'établissement"
								>
									<Upload size={18} className="mb-1" />
									<span className="text-[10px] font-semibold">Modifier</span>
								</button>
							)}
						</div>
						<div className="min-w-0">
							<h2 className="font-heading text-[clamp(1.8rem,3vw,2.5rem)] font-light leading-none tracking-[-0.03em] text-dx-encre">{businessName || 'Mon Établissement'}</h2>
							<p className="mt-2 text-sm text-dx-gris">{pro?.description || 'Professionnel'}</p>
						</div>
					</div>

					<div className="p-6 sm:p-8">
						<div className="mb-5 flex items-center justify-between gap-3">
							<h3 className="dx-h2">Informations Publiques</h3>
							{lectureSeule && (
								<Pastille ton="neutre" nu><Lock size={11} /> Lecture Seule</Pastille>
							)}
						</div>
						<form onSubmit={handleSave}>
							<div className="grid grid-cols-1 gap-5 md:grid-cols-2">
								{champs.map((c) => {
									const Icon = c.icon;
									return (
										<div key={c.id} className={c.large ? 'md:col-span-2' : ''}>
											<label htmlFor={c.id} className="dx-champ-label flex items-center gap-2">
												<Icon size={13} className="text-dx-terre" /> {c.label}
											</label>
											<input
												id={c.id}
												type={c.type || 'text'}
												disabled={lectureSeule}
												value={c.value}
												onChange={(e) => c.set(e.target.value)}
												className="dx-champ"
											/>
										</div>
									);
								})}
							</div>

							<div className="mt-7 flex justify-end border-t border-dx-filet pt-6">
								{lectureSeule ? (
									<span className="inline-flex items-center gap-2 rounded-full bg-dx-ivoire px-5 py-3 text-sm font-semibold text-dx-gris">
										<Lock size={14} />
										{role === 'demo' ? 'Lecture seule (Mode Démo)' : "Modification réservée à l'administrateur"}
									</span>
								) : (
									<button type="submit" disabled={saving} className="dx-btn">
										{saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
										{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
									</button>
								)}
							</div>
						</form>
					</div>
				</section>

				<aside className="space-y-6 lg:col-span-4">
					<section className="dx-carte dx-carte--nuit p-6">
						<div className="flex items-center justify-between gap-3">
							<p className="text-sm text-dx-sable">Abonnement</p>
							<span className="inline-flex items-center gap-1.5 rounded-full bg-[#2c3a2f] px-2.5 py-0.5 text-xs font-semibold text-[#b7d4bd]">
								<span className="h-1.5 w-1.5 rounded-full bg-[#9fc4a7]" /> Actif
							</span>
						</div>
						<p className="mt-3 font-heading text-[2rem] font-light leading-none tracking-[-0.03em] text-dx-creme">Plan <em className="text-dx-terre-clair">Prestige</em></p>
						<p className="mt-3 text-sm text-dx-sable">Toutes les fonctionnalités premium sont activées.</p>
						<button type="button" onClick={handleBilling} className="dx-btn dx-btn--clair mt-6 w-full">
							<CreditCard size={16} /> Gérer la facturation
						</button>
					</section>

					<section className="dx-carte p-6">
						<h4 className="dx-h3 mb-3">Accès rapide</h4>
						<ul className="divide-y divide-dx-filet">
							<li>
								<a href="/demo-diamant/dashboard" className="group flex items-center justify-between py-3 text-sm font-medium text-dx-encre-2 hover:text-dx-terre">
									Tableau de bord <ArrowRight size={15} className="text-dx-sable transition-transform group-hover:translate-x-0.5 group-hover:text-dx-terre" />
								</a>
							</li>
							<li>
								<a href="/demo-diamant/dashboard/services" className="group flex items-center justify-between py-3 text-sm font-medium text-dx-encre-2 hover:text-dx-terre">
									Gérer les prestations <ArrowRight size={15} className="text-dx-sable transition-transform group-hover:translate-x-0.5 group-hover:text-dx-terre" />
								</a>
							</li>
						</ul>
					</section>
				</aside>
			</div>
		</div>
	);
}
