import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useAuthedProfessional } from '@/lib/useAuthedProfessional';
import { updateProfessional } from '@/lib/queries';

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

	const {
		register,
		handleSubmit,
		reset,
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
			});
			setSaved(true);
		} catch (err) {
			setFormError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.');
		}
	}

	if (loading) return <p className="text-sm text-gray-500">Chargement...</p>;
	if (error) return <p className="text-sm text-red-600">{error}</p>;

	return (
		<div>
			<h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>

			<form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid max-w-xl gap-4">
				<div>
					<label className="text-sm text-gray-700" htmlFor="businessName">
						Nom de l'activité
					</label>
					<input
						id="businessName"
						className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
						{...register('businessName')}
					/>
					{errors.businessName && <p className="mt-1 text-xs text-red-600">{errors.businessName.message}</p>}
				</div>
				<div>
					<label className="text-sm text-gray-700" htmlFor="activity">
						Activité
					</label>
					<input
						id="activity"
						placeholder="Coiffeur, fleuriste, coach..."
						className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
						{...register('activity')}
					/>
				</div>
				<div>
					<label className="text-sm text-gray-700" htmlFor="description">
						Description
					</label>
					<textarea
						id="description"
						rows={4}
						className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
						{...register('description')}
					/>
				</div>
				<div>
					<label className="text-sm text-gray-700" htmlFor="phone">
						Téléphone
					</label>
					<input
						id="phone"
						className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
						{...register('phone')}
					/>
				</div>
				<div>
					<label className="text-sm text-gray-700" htmlFor="email">
						Email de contact
					</label>
					<input
						id="email"
						type="email"
						className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
						{...register('email')}
					/>
					{errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
				</div>
				<div>
					<label className="text-sm text-gray-700" htmlFor="address">
						Adresse
					</label>
					<input
						id="address"
						className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
						{...register('address')}
					/>
				</div>
				{formError && <p className="text-sm text-red-600">{formError}</p>}
				{saved && <p className="text-sm text-green-700">Profil mis à jour.</p>}
				<button
					type="submit"
					className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
				>
					Enregistrer
				</button>
			</form>
		</div>
	);
}
