import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuthedProfessional } from '@/lib/useAuthedProfessional';
import { updateProfessional } from '@/lib/queries';
import AvatarPicker, { type AvatarKey } from '@/components/standard/ui/StandardAvatarPicker';
import { PageHeader, PageSkeleton, Panel } from '@/components/standard/ui/StandardKit';

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
	const [formError, setFormError] = useState<string | null>(null);
	const [avatarKey, setAvatarKey] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
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
			setFormError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.');
		}
	}

	if (loading) return <PageSkeleton rows={4} figures={false} />;
	if (error) return <p className="sa-alert">{error}</p>;

	return (
		<div>
			<PageHeader
				title="Mon profil"
				subtitle="Les informations de votre activité : nom, coordonnées et présentation utilisées dans vos échanges avec les clients."
			/>

			<form onSubmit={handleSubmit(onSubmit)} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
				<Panel title="Établissement" bodyClassName="sa-panel-body grid gap-5 sm:grid-cols-2">
					<div>
						<label className="sa-label" htmlFor="businessName">
							Nom de l'activité
						</label>
						<input id="businessName" className="sa-input" {...register('businessName')} />
						{errors.businessName && <p className="sa-error">{errors.businessName.message}</p>}
					</div>
					<div>
						<label className="sa-label" htmlFor="activity">
							Activité
						</label>
						<input id="activity" placeholder="Dépannage informatique, réparation de smartphones..." className="sa-input" {...register('activity')} />
					</div>
					<div className="sm:col-span-2">
						<label className="sa-label" htmlFor="description">
							Description
						</label>
						<textarea id="description" rows={4} className="sa-input" {...register('description')} />
					</div>
					<div>
						<label className="sa-label" htmlFor="phone">
							Téléphone
						</label>
						<input id="phone" type="tel" className="sa-input sa-num" {...register('phone')} />
					</div>
					<div>
						<label className="sa-label" htmlFor="email">
							Email de contact
						</label>
						<input id="email" type="email" className="sa-input" {...register('email')} />
						{errors.email && <p className="sa-error">{errors.email.message}</p>}
					</div>
					<div className="sm:col-span-2">
						<label className="sa-label" htmlFor="address">
							Adresse
						</label>
						<input id="address" className="sa-input" {...register('address')} />
					</div>
				</Panel>

				<div className="grid gap-6 lg:sticky lg:top-6">
					<Panel title="Photo de profil">
						<AvatarPicker value={avatarKey} onChange={(k: AvatarKey) => setAvatarKey(k)} />
					</Panel>
					<div className="grid gap-3">
						{formError && <p className="sa-alert">{formError}</p>}
						{saved && !formError && <p className="sa-success">Profil mis à jour.</p>}
						<button type="submit" disabled={isSubmitting} className="sa-btn sa-btn--primary sa-btn--block">
							{isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
						</button>
					</div>
				</div>
			</form>
		</div>
	);
}
