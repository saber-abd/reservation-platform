import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { enrollClientInDemo, getDemoTag } from '@/lib/queries';
import { Sparkles, ArrowRight, Phone, User, Mail, Scissors } from 'lucide-react';

interface CompleteProfileFormProps {
	user: any;
	targetDemo: string;
	onCompleted?: () => void;
}

export default function CompleteProfileForm({ user, targetDemo, onCompleted }: CompleteProfileFormProps) {
	const meta = user?.user_metadata || {};
	const demoTag = getDemoTag(targetDemo);

	const initialFullName = meta.full_name || meta.name || '';
	const initialEmail = user?.email || '';
	const initialAvatar = meta.avatar_url || meta.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(initialFullName || 'Client')}&backgroundColor=f08080,f8ad9d,ffdab9`;

	const [fullName, setFullName] = useState(initialFullName);
	const [phone, setPhone] = useState('');
	const [preferences, setPreferences] = useState('');
	const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);

		if (!fullName.trim()) {
			setError('Veuillez renseigner votre prénom et nom.');
			return;
		}

		if (!phone.trim()) {
			setError('Veuillez renseigner votre numéro de téléphone pour vos rappels de rendez-vous.');
			return;
		}

		setSubmitting(true);
		try {
			// Enrôler le client dans la base de données
			const client = await enrollClientInDemo(user.id, demoTag, {
				full_name: fullName.trim(),
				email: initialEmail,
				phone: phone.trim(),
				avatar_url: avatarUrl
			});

			// Enregistrer les préférences en BDD ou cache local
			if (preferences.trim()) {
				try {
					localStorage.setItem(`diamant_pref_${user.id}`, preferences.trim());
					await supabase
						.from('clients')
						.update({ preferences: preferences.trim() })
						.eq('id', user.id);
				} catch (prefErr) {}
			}

			// Mettre à jour les métadonnées de session locale
			if (typeof window !== 'undefined') {
				if (initialEmail) localStorage.setItem('diamant_client_email', initialEmail);
				if (avatarUrl) localStorage.setItem('diamant_client_avatar', avatarUrl);
			}

			if (onCompleted) {
				onCompleted();
			} else {
				window.location.replace(`${targetDemo}/espace-client`);
			}
		} catch (err: any) {
			console.error('Erreur finalisation profil:', err);
			setError(err?.message || "Une erreur est survenue lors de l'enregistrement de votre profil.");
			setSubmitting(false);
		}
	}

	return (
		<div className="w-full max-w-md mx-auto animate-in fade-in zoom-in-95 duration-300">
			<div className="text-center mb-6">
				<div className="relative w-20 h-20 mx-auto mb-4">
					<img 
						src={avatarUrl} 
						alt="Avatar" 
						className="w-full h-full rounded-full object-cover border-2 border-deep-teal-500 shadow-md bg-white p-0.5" 
					/>
					<div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-deep-teal-600 text-white flex items-center justify-center text-xs shadow-sm">
						<Sparkles size={12} />
					</div>
				</div>
				<h2 className="text-2xl font-black text-stone-900 tracking-tight">Finaliser votre compte</h2>
				<p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto leading-relaxed">
					Quelques informations complémentaires pour préparer au mieux vos futures réservations et vos rappels de rendez-vous.
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4">
				{error && (
					<div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 font-medium">
						{error}
					</div>
				)}

				<div>
					<label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1">
						Prénom & Nom <span className="text-rose-600">*</span>
					</label>
					<div className="relative">
						<User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
						<input 
							type="text" 
							required
							value={fullName}
							onChange={e => setFullName(e.target.value)}
							placeholder="Ex : Sarah Bernard"
							className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:bg-white focus:border-deep-teal-500 focus:outline-none transition-all"
						/>
					</div>
				</div>

				<div>
					<label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1">
						Adresse Email
					</label>
					<div className="relative">
						<Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
						<input 
							type="email" 
							disabled
							value={initialEmail}
							className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-100 text-sm text-stone-500 cursor-not-allowed"
						/>
					</div>
				</div>

				<div>
					<label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1">
						Numéro de Téléphone <span className="text-rose-600">*</span>
					</label>
					<div className="relative">
						<Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
						<input 
							type="tel" 
							required
							value={phone}
							onChange={e => setPhone(e.target.value)}
							placeholder="Ex : 06 12 34 56 78"
							className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:bg-white focus:border-deep-teal-500 focus:outline-none transition-all"
						/>
					</div>
					<p className="text-[11px] text-stone-400 mt-1">Utilisé pour la confirmation et les rappels de vos rendez-vous.</p>
				</div>

				<div>
					<label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1">
						Préférences Capillaires (Optionnel)
					</label>
					<div className="relative">
						<textarea 
							rows={2}
							value={preferences}
							onChange={e => setPreferences(e.target.value)}
							placeholder="Nature de vos cheveux, allergies, souhaits particuliers..."
							className="w-full px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-900 focus:bg-white focus:border-deep-teal-500 focus:outline-none transition-all resize-none"
						/>
					</div>
				</div>

				<button
					type="submit"
					disabled={submitting}
					className="w-full mt-2 py-3 px-5 rounded-xl bg-deep-teal-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-deep-teal-700 active:scale-[0.99] transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
				>
					{submitting ? (
						<span>Enregistrement en cours...</span>
					) : (
						<>
							<span>Continuer vers mon espace</span>
							<ArrowRight size={15} />
						</>
					)}
				</button>
			</form>
		</div>
	);
}
