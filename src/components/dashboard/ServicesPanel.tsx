import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthedProfessional } from '@/lib/useAuthedProfessional';
import { createService, deleteService, getAllServices, updateService, type Service } from '@/lib/queries';

const schema = z.object({
	name: z.string().min(2, 'Nom trop court'),
	description: z.string().optional(),
	durationMinutes: z.coerce.number().int().positive('Doit être positif'),
	price: z.coerce.number().nonnegative('Doit être positif ou nul'),
});

type FormValues = z.infer<typeof schema>;

export default function ServicesPanel() {
	const { loading, professional, error } = useAuthedProfessional();
	const [services, setServices] = useState<Service[]>([]);
	const [formError, setFormError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<FormValues>({ resolver: zodResolver(schema) });

	useEffect(() => {
		if (!professional) return;
		getAllServices(professional.id).then(setServices);
	}, [professional]);

	async function onSubmit(values: FormValues) {
		if (!professional) return;
		setFormError(null);
		try {
			const created = await createService({
				professional_id: professional.id,
				name: values.name,
				description: values.description ?? null,
				duration_minutes: values.durationMinutes,
				price: values.price,
			});
			setServices((prev) => [...prev, created]);
			reset();
		} catch (err) {
			setFormError(err instanceof Error ? err.message : 'Erreur lors de la création.');
		}
	}

	async function handleToggleActive(service: Service) {
		const updated = await updateService(service.id, { is_active: !service.is_active });
		setServices((prev) => prev.map((s) => (s.id === service.id ? updated : s)));
	}

	async function handleDelete(id: string) {
		await deleteService(id);
		setServices((prev) => prev.filter((s) => s.id !== id));
	}

	if (loading) return <p className="text-sm text-gray-500">Chargement...</p>;
	if (error) return <p className="text-sm text-red-600">{error}</p>;

	return (
		<div>
			<h1 className="text-2xl font-bold text-gray-900">Mes prestations</h1>

			<div className="mt-6 overflow-hidden rounded-xl border border-border">
				<table className="w-full text-left text-sm">
					<thead className="bg-gray-50 text-xs uppercase text-gray-500">
						<tr>
							<th className="px-4 py-3">Nom</th>
							<th className="px-4 py-3">Durée</th>
							<th className="px-4 py-3">Prix</th>
							<th className="px-4 py-3">Statut</th>
							<th className="px-4 py-3" />
						</tr>
					</thead>
					<tbody>
						{services.length === 0 && (
							<tr>
								<td className="px-4 py-4 text-gray-500" colSpan={5}>
									Aucune prestation pour le moment.
								</td>
							</tr>
						)}
						{services.map((service) => (
							<tr key={service.id} className="border-t border-border">
								<td className="px-4 py-3 font-medium text-gray-900">{service.name}</td>
								<td className="px-4 py-3 text-gray-600">{service.duration_minutes} min</td>
								<td className="px-4 py-3 text-gray-600">{service.price} €</td>
								<td className="px-4 py-3">
									<button
										onClick={() => handleToggleActive(service)}
										className={`rounded-full px-2 py-1 text-xs font-medium ${
											service.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
										}`}
									>
										{service.is_active ? 'Active' : 'Masquée'}
									</button>
								</td>
								<td className="px-4 py-3 text-right">
									<button
										onClick={() => handleDelete(service.id)}
										className="text-xs font-medium text-red-600 hover:underline"
									>
										Supprimer
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid gap-4 rounded-xl border border-border p-6 sm:grid-cols-2">
				<p className="col-span-full text-sm font-semibold text-gray-900">Ajouter une prestation</p>
				<div>
					<label className="text-sm text-gray-700" htmlFor="name">
						Nom
					</label>
					<input
						id="name"
						className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
						{...register('name')}
					/>
					{errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
				</div>
				<div>
					<label className="text-sm text-gray-700" htmlFor="durationMinutes">
						Durée (minutes)
					</label>
					<input
						id="durationMinutes"
						type="number"
						className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
						{...register('durationMinutes')}
					/>
					{errors.durationMinutes && (
						<p className="mt-1 text-xs text-red-600">{errors.durationMinutes.message}</p>
					)}
				</div>
				<div>
					<label className="text-sm text-gray-700" htmlFor="price">
						Prix (€)
					</label>
					<input
						id="price"
						type="number"
						step="0.01"
						className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
						{...register('price')}
					/>
					{errors.price && <p className="mt-1 text-xs text-red-600">{errors.price.message}</p>}
				</div>
				<div className="sm:col-span-2">
					<label className="text-sm text-gray-700" htmlFor="description">
						Description
					</label>
					<textarea
						id="description"
						rows={2}
						className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
						{...register('description')}
					/>
				</div>
				{formError && <p className="col-span-full text-sm text-red-600">{formError}</p>}
				<button
					type="submit"
					className="col-span-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
				>
					Ajouter
				</button>
			</form>
		</div>
	);
}
