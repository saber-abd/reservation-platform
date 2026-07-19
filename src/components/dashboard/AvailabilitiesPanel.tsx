import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthedProfessional } from '@/lib/useAuthedProfessional';
import { createAvailability, deleteAvailability, getAllSlots, type Availability } from '@/lib/queries';

const schema = z
	.object({
		date: z.string().min(1, 'Date requise'),
		startTime: z.string().min(1, 'Heure de début requise'),
		endTime: z.string().min(1, 'Heure de fin requise'),
	})
	.refine((data) => data.endTime > data.startTime, {
		message: 'L\'heure de fin doit être après l\'heure de début',
		path: ['endTime'],
	});

type FormValues = z.infer<typeof schema>;

function formatSlot(slot: Availability) {
	return new Date(slot.start_time).toLocaleString('fr-FR', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
	});
}

export default function AvailabilitiesPanel() {
	const { loading, professional, error } = useAuthedProfessional();
	const [slots, setSlots] = useState<Availability[]>([]);
	const [formError, setFormError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<FormValues>({ resolver: zodResolver(schema) });

	useEffect(() => {
		if (!professional) return;
		getAllSlots(professional.id).then(setSlots);
	}, [professional]);

	async function onSubmit(values: FormValues) {
		if (!professional) return;
		setFormError(null);
		try {
			const startIso = new Date(`${values.date}T${values.startTime}`).toISOString();
			const endIso = new Date(`${values.date}T${values.endTime}`).toISOString();
			const created = await createAvailability({
				professional_id: professional.id,
				start_time: startIso,
				end_time: endIso,
			});
			setSlots((prev) => [...prev, created].sort((a, b) => a.start_time.localeCompare(b.start_time)));
			reset();
		} catch (err) {
			setFormError(err instanceof Error ? err.message : 'Erreur lors de la création.');
		}
	}

	async function handleDelete(id: string) {
		await deleteAvailability(id);
		setSlots((prev) => prev.filter((s) => s.id !== id));
	}

	if (loading) return <p className="text-sm text-stone-500">Chargement...</p>;
	if (error) return <p className="text-sm text-red-600">{error}</p>;

	return (
		<div>
			<h1 className="text-2xl font-bold text-stone-900">Mes disponibilités</h1>

			<div className="mt-6 grid gap-2">
				{slots.length === 0 && <p className="text-sm text-stone-500">Aucun créneau créé pour le moment.</p>}
				{slots.map((slot) => (
					<div
						key={slot.id}
						className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3 text-sm"
					>
						<span className="capitalize text-stone-700">{formatSlot(slot)}</span>
						<div className="flex items-center gap-3">
							<span
								className={`rounded-full px-2 py-1 text-xs font-medium ${
									slot.is_booked ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
								}`}
							>
								{slot.is_booked ? 'Réservé' : 'Libre'}
							</span>
							{!slot.is_booked && (
								<button
									onClick={() => handleDelete(slot.id)}
									className="text-xs font-medium text-red-600 hover:underline"
								>
									Supprimer
								</button>
							)}
						</div>
					</div>
				))}
			</div>

			<form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid gap-4 rounded-xl border border-border p-6 sm:grid-cols-3">
				<p className="col-span-full text-sm font-semibold text-stone-900">Ajouter un créneau</p>
				<div>
					<label className="text-sm text-stone-700" htmlFor="date">
						Date
					</label>
					<input
						id="date"
						type="date"
						className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
						{...register('date')}
					/>
					{errors.date && <p className="mt-1 text-xs text-red-600">{errors.date.message}</p>}
				</div>
				<div>
					<label className="text-sm text-stone-700" htmlFor="startTime">
						Heure de début
					</label>
					<input
						id="startTime"
						type="time"
						className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
						{...register('startTime')}
					/>
					{errors.startTime && <p className="mt-1 text-xs text-red-600">{errors.startTime.message}</p>}
				</div>
				<div>
					<label className="text-sm text-stone-700" htmlFor="endTime">
						Heure de fin
					</label>
					<input
						id="endTime"
						type="time"
						className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
						{...register('endTime')}
					/>
					{errors.endTime && <p className="mt-1 text-xs text-red-600">{errors.endTime.message}</p>}
				</div>
				{formError && <p className="col-span-full text-sm text-red-600">{formError}</p>}
				<button
					type="submit"
					className="col-span-full rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
				>
					Ajouter le créneau
				</button>
			</form>
		</div>
	);
}
