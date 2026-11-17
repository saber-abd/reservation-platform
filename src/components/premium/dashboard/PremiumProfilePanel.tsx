import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { MapPin, Phone, Mail } from 'lucide-react';
import { useAuthedProfessional } from '@/lib/useAuthedProfessional';
import { updateProfessional } from '@/lib/queries';
import AvatarPicker, { AvatarDisplay, type AvatarKey } from '@/components/premium/ui/PremiumAvatarPicker';
import { PageHead, PageSkeleton } from './kit/Base';

const schema = z.object({
	businessName: z.string().min(2, 'Nom trop court'),
	activity: z.string().optional(),
	description: z.string().optional(),
	phone: z.string().optional(),
	email: z.string().email('Email invalide').optional().or(z.literal('')),
	address: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ProfilePanel() {
	const { loading, professional, error } = useAuthedProfessional();
	const [saved, setSaved] = useState(false);
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [avatarKey, setAvatarKey] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		reset,
		watch,
		formState: { errors },
	} = useForm<FormValues>({ resolver: zodResolver(schema) });

	useEffect(() => {
		if (!professional) return;
		reset({
			businessName: professional.business_name,
			activity: professional.activity ?? '',
			description: professional.description ?? '',
			phone: professional.phone ?? '',
			email: professional.email ?? '',
			address: professional.address ?? '',
		});
		setAvatarKey(professional.avatar_url ?? null);
	}, [professional, reset]);

	async function onSubmit(values: FormValues) {
		if (!professional) return;
		setFormError(null);
		setSaved(false);
		setSaving(true);
		try {
			await updateProfessional(professional.id, {
				business_name: values.businessName,
				activity: values.activity || null,
				description: values.description || null,
				phone: values.phone || null,
				email: values.email || null,
				address: values.address || null,
				avatar_url: avatarKey,
			});
			setSaved(true);
			toast.success('Profil mis à jour.');
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Erreur lors de la mise à jour.';
			setFormError(msg);
			toast.error(msg);
		} finally {
			setSaving(false);
		}
	}

	if (loading) return <PageSkeleton cards={2} />;
	if (error) return <p className="pe-erreur">{error}</p>;

	const v = watch();

	return (
		<div className="pe-entree">
			<PageHead title="Mon profil" sub="Les informations de l'atelier telles que vos clients les voient : nom, activité, coordonnées." />

			<div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
				<form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
					<section className="pe-card" aria-labelledby="identite-titre">
						<div className="pe-card__tete">
							<h2 id="identite-titre" className="pe-h2">Identité</h2>
						</div>
						<div className="pe-card__corps grid gap-5 sm:grid-cols-2">
							<div>
								<label className="pe-label" htmlFor="businessName">
									Nom de l'activité
								</label>
								<input id="businessName" className="pe-input" {...register('businessName')} />
								{errors.businessName && <p className="pe-erreur">{errors.businessName.message}</p>}
							</div>
							<div>
								<label className="pe-label" htmlFor="activity">
									Activité
								</label>
								<input id="activity" placeholder="Garage, carrosserie, centre de lavage..." className="pe-input" {...register('activity')} />
							</div>
							<div className="sm:col-span-2">
								<label className="pe-label" htmlFor="description">
									Description
								</label>
								<textarea id="description" rows={4} className="pe-input" {...register('description')} />
							</div>
						</div>
					</section>

					<section className="pe-card" aria-labelledby="coord-titre">
						<div className="pe-card__tete">
							<h2 id="coord-titre" className="pe-h2">Coordonnées</h2>
						</div>
						<div className="pe-card__corps grid gap-5 sm:grid-cols-2">
							<div>
								<label className="pe-label" htmlFor="phone">
									Téléphone
								</label>
								<input id="phone" type="tel" className="pe-input" {...register('phone')} />
							</div>
							<div>
								<label className="pe-label" htmlFor="email">
									Email de contact
								</label>
								<input id="email" type="email" className="pe-input" {...register('email')} />
								{errors.email && <p className="pe-erreur">{errors.email.message}</p>}
							</div>
							<div className="sm:col-span-2">
								<label className="pe-label" htmlFor="address">
									Adresse
								</label>
								<input id="address" className="pe-input" {...register('address')} />
							</div>
						</div>
					</section>

					<section className="pe-card" aria-label="Photo de profil">
						<div className="pe-card__corps">
							<AvatarPicker value={avatarKey} onChange={(k: AvatarKey) => setAvatarKey(k)} />
						</div>
					</section>

					<div className="flex flex-wrap items-center gap-4">
						<button type="submit" disabled={saving} className="pe-btn">
							{saving ? 'Enregistrement…' : 'Enregistrer'}
						</button>
						{formError && <p className="pe-erreur !mt-0">{formError}</p>}
						{saved && !formError && <p className="pe-tag" data-s="completed">Profil mis à jour.</p>}
					</div>
				</form>

				{/* Aperçu en direct de la fiche de l'atelier */}
				<aside className="pe-card pe-card--sombre lg:sticky lg:top-6" aria-label="Aperçu de la fiche">
					<div className="pe-card__tete">
						<span className="pe-tech">Aperçu de la fiche</span>
						<span className="h-3 w-3 -skew-x-[14deg] bg-pe-rouge" aria-hidden="true" />
					</div>
					<div className="pe-card__corps grid gap-5">
						<div className="flex items-center gap-4">
							<AvatarDisplay avatarKey={avatarKey} size={56} className="!rounded-[2px] !border-0" />
							<div className="min-w-0">
								<p className="break-words text-[1.5rem] font-extrabold uppercase leading-none tracking-[-0.01em] [font-stretch:122%]">
									{v.businessName || 'Votre atelier'}
								</p>
								{v.activity && <p className="pe-tech mt-2">{v.activity}</p>}
							</div>
						</div>
						{v.description && <p className="text-[0.9375rem] leading-relaxed text-pe-acier-clair">{v.description}</p>}
						<ul className="grid gap-px overflow-hidden rounded-[2px] bg-pe-filet-sombre text-sm">
							{[
								{ icon: <MapPin size={15} />, val: v.address, vide: 'Adresse non renseignée' },
								{ icon: <Phone size={15} />, val: v.phone, vide: 'Téléphone non renseigné' },
								{ icon: <Mail size={15} />, val: v.email, vide: 'Email non renseigné' },
							].map((l, i) => (
								<li key={i} className="flex items-center gap-3 bg-pe-carbone px-3 py-2.5">
									<span className="text-pe-rouge" aria-hidden="true">
										{l.icon}
									</span>
									<span className={`min-w-0 break-words ${l.val ? '' : 'text-pe-acier-clair'}`}>{l.val || l.vide}</span>
								</li>
							))}
						</ul>
					</div>
				</aside>
			</div>
		</div>
	);
}
