import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthedProfessional } from '@/lib/useAuthedProfessional';
import { createAvailabilityRule, deleteAvailabilityRule, getAvailabilityRules, type AvailabilityRule } from '@/lib/queries';
import { formatDaysOfWeek, weekdayLabels } from '@/lib/slots';

const recurringSchema = z
	.object({
		daysOfWeek: z.array(z.number()).min(1, 'Choisissez au moins un jour'),
		startTime: z.string().min(1, 'Heure de début requise'),
		endTime: z.string().min(1, 'Heure de fin requise'),
		slotDuration: z.enum(['30', '60']),
	})
	.refine((data) => data.endTime > data.startTime, {
		message: "L'heure de fin doit être après l'heure de début",
		path: ['endTime'],
	});

const exceptionSchema = z
	.object({
		date: z.string().min(1, 'Date requise'),
		startTime: z.string().min(1, 'Heure de début requise'),
		endTime: z.string().min(1, 'Heure de fin requise'),
		slotDuration: z.enum(['30', '60']),
	})
	.refine((data) => data.endTime > data.startTime, {
		message: "L'heure de fin doit être après l'heure de début",
		path: ['endTime'],
	});

type RecurringValues = z.infer<typeof recurringSchema>;
type ExceptionValues = z.infer<typeof exceptionSchema>;

export default function AvailabilitiesPanel() {
	const { loading, professional, error } = useAuthedProfessional();
	const [rules, setRules] = useState<AvailabilityRule[]>([]);
	const [showExceptionForm, setShowExceptionForm] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const recurringForm = useForm<RecurringValues>({
		resolver: zodResolver(recurringSchema),
		defaultValues: { daysOfWeek: [], slotDuration: '30' },
	});
	const exceptionForm = useForm<ExceptionValues>({
		resolver: zodResolver(exceptionSchema),
		defaultValues: { slotDuration: '30' },
	});

	useEffect(() => {
		if (!professional) return;
		getAvailabilityRules(professional.id).then(setRules);
	}, [professional]);

	async function onSubmitRecurring(values: RecurringValues) {
		if (!professional) return;
		setFormError(null);
		try {
			const created = await createAvailabilityRule({
				professional_id: professional.id,
				days_of_week: values.daysOfWeek,
				start_time: values.startTime,
				end_time: values.endTime,
				slot_duration_minutes: Number(values.slotDuration),
				is_exception: false,
				exception_date: null,
			});
			setRules((prev) => [...prev, created]);
			recurringForm.reset({ daysOfWeek: [], slotDuration: '30', startTime: '', endTime: '' });
		} catch (err) {
			setFormError(err instanceof Error ? err.message : 'Erreur lors de la création.');
		}
	}

	async function onSubmitException(values: ExceptionValues) {
		if (!professional) return;
		setFormError(null);
		try {
			const created = await createAvailabilityRule({
				professional_id: professional.id,
				days_of_week: [],
				start_time: values.startTime,
				end_time: values.endTime,
				slot_duration_minutes: Number(values.slotDuration),
				is_exception: true,
				exception_date: values.date,
			});
			setRules((prev) => [...prev, created]);
			exceptionForm.reset({ slotDuration: '30', date: '', startTime: '', endTime: '' });
		} catch (err) {
			setFormError(err instanceof Error ? err.message : 'Erreur lors de la création.');
		}
	}

	async function handleDelete(id: string) {
		await deleteAvailabilityRule(id);
		setRules((prev) => prev.filter((r) => r.id !== id));
	}

	if (loading) return <p className="text-sm text-stone-500">Chargement...</p>;
	if (error) return <p className="text-sm text-red-600">{error}</p>;

	const recurringRules = rules.filter((r) => !r.is_exception);
	const exceptionRules = rules
		.filter((r) => r.is_exception)
		.sort((a, b) => (a.exception_date ?? '').localeCompare(b.exception_date ?? ''));

	return (
		<div>
			<h1 className="text-2xl font-bold text-stone-900">Mes disponibilités</h1>
			<p className="mt-1 text-sm text-stone-500">
				Définissez vos horaires récurrents (ex : Lun-Ven, 8h-16h, créneaux de 30 min) et, si besoin, des
				disponibilités exceptionnelles pour une date précise.
			</p>

			{/* Règles récurrentes */}
			<div className="mt-6">
				<p className="text-sm font-semibold text-stone-900">Horaires récurrents</p>
				<div className="mt-3 grid gap-2">
					{recurringRules.length === 0 && (
						<p className="text-sm text-stone-500">Aucun horaire récurrent défini pour le moment.</p>
					)}
					{recurringRules.map((rule) => (
						<div
							key={rule.id}
							className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3 text-sm"
						>
							<div>
								<span className="font-medium text-stone-900">{formatDaysOfWeek(rule.days_of_week)}</span>
								<span className="ml-2 text-stone-600">
									{rule.start_time.slice(0, 5)} - {rule.end_time.slice(0, 5)}
								</span>
								<span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
									créneaux de {rule.slot_duration_minutes} min
								</span>
							</div>
							<button onClick={() => handleDelete(rule.id)} className="text-xs font-medium text-red-600 hover:underline">
								Supprimer
							</button>
						</div>
					))}
				</div>

				<form
					onSubmit={recurringForm.handleSubmit(onSubmitRecurring)}
					className="mt-4 grid gap-4 rounded-xl border border-border p-6 sm:grid-cols-2"
				>
					<p className="col-span-full text-sm font-semibold text-stone-900">Ajouter un horaire récurrent</p>
					<div className="col-span-full">
						<span className="text-sm text-stone-700">Jours concernés</span>
						<div className="mt-2 flex flex-wrap gap-2">
							{weekdayLabels.map((label, index) => {
								const selected = recurringForm.watch('daysOfWeek')?.includes(index);
								return (
									<button
										type="button"
										key={index}
										onClick={() => {
											const current = recurringForm.getValues('daysOfWeek') ?? [];
											recurringForm.setValue(
												'daysOfWeek',
												selected ? current.filter((d) => d !== index) : [...current, index],
											);
										}}
										className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
											selected
												? 'border-rose-600 bg-rose-50 text-rose-700'
												: 'border-border text-stone-600 hover:bg-stone-50'
										}`}
									>
										{label.slice(0, 3)}
									</button>
								);
							})}
						</div>
						{recurringForm.formState.errors.daysOfWeek && (
							<p className="mt-1 text-xs text-red-600">{recurringForm.formState.errors.daysOfWeek.message}</p>
						)}
					</div>
					<div>
						<label className="text-sm text-stone-700">Heure de début</label>
						<input
							type="time"
							className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
							{...recurringForm.register('startTime')}
						/>
						{recurringForm.formState.errors.startTime && (
							<p className="mt-1 text-xs text-red-600">{recurringForm.formState.errors.startTime.message}</p>
						)}
					</div>
					<div>
						<label className="text-sm text-stone-700">Heure de fin</label>
						<input
							type="time"
							className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
							{...recurringForm.register('endTime')}
						/>
						{recurringForm.formState.errors.endTime && (
							<p className="mt-1 text-xs text-red-600">{recurringForm.formState.errors.endTime.message}</p>
						)}
					</div>
					<div className="col-span-full">
						<label className="text-sm text-stone-700">Durée des créneaux</label>
						<div className="mt-2 flex gap-2">
							<button
								type="button"
								onClick={() => recurringForm.setValue('slotDuration', '30')}
								className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
									recurringForm.watch('slotDuration') === '30'
										? 'border-rose-600 bg-rose-50 text-rose-700'
										: 'border-border text-stone-600 hover:bg-stone-50'
								}`}
							>
								30 min (prestations courtes)
							</button>
							<button
								type="button"
								onClick={() => recurringForm.setValue('slotDuration', '60')}
								className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
									recurringForm.watch('slotDuration') === '60'
										? 'border-rose-600 bg-rose-50 text-rose-700'
										: 'border-border text-stone-600 hover:bg-stone-50'
								}`}
							>
								1h (prestations longues)
							</button>
						</div>
					</div>
					<button
						type="submit"
						className="col-span-full rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
					>
						Ajouter l'horaire
					</button>
				</form>
			</div>

			{/* Exceptions */}
			<div className="mt-10">
				<label className="flex items-center gap-2 text-sm font-semibold text-stone-900">
					<input
						type="checkbox"
						checked={showExceptionForm}
						onChange={(e) => setShowExceptionForm(e.target.checked)}
						className="h-4 w-4 rounded border-border text-rose-600 focus:ring-rose-600"
					/>
					Ajouter une disponibilité exceptionnelle
				</label>
				<p className="mt-1 text-sm text-stone-500">
					Pour une date précise (jour férié travaillé, horaires spéciaux...), en remplacement de l'horaire récurrent
					habituel ce jour-là.
				</p>

				{exceptionRules.length > 0 && (
					<div className="mt-3 grid gap-2">
						{exceptionRules.map((rule) => (
							<div
								key={rule.id}
								className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm"
							>
								<div>
									<span className="font-medium text-stone-900">
										{rule.exception_date &&
											new Date(`${rule.exception_date}T00:00:00`).toLocaleDateString('fr-FR', {
												weekday: 'long',
												day: 'numeric',
												month: 'long',
											})}
									</span>
									<span className="ml-2 text-stone-600">
										{rule.start_time.slice(0, 5)} - {rule.end_time.slice(0, 5)}
									</span>
									<span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs text-stone-500">
										créneaux de {rule.slot_duration_minutes} min
									</span>
								</div>
								<button onClick={() => handleDelete(rule.id)} className="text-xs font-medium text-red-600 hover:underline">
									Supprimer
								</button>
							</div>
						))}
					</div>
				)}

				{showExceptionForm && (
					<form
						onSubmit={exceptionForm.handleSubmit(onSubmitException)}
						className="mt-4 grid gap-4 rounded-xl border border-amber-200 bg-amber-50/40 p-6 sm:grid-cols-3"
					>
						<div>
							<label className="text-sm text-stone-700">Date</label>
							<input
								type="date"
								className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
								{...exceptionForm.register('date')}
							/>
							{exceptionForm.formState.errors.date && (
								<p className="mt-1 text-xs text-red-600">{exceptionForm.formState.errors.date.message}</p>
							)}
						</div>
						<div>
							<label className="text-sm text-stone-700">Heure de début</label>
							<input
								type="time"
								className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
								{...exceptionForm.register('startTime')}
							/>
							{exceptionForm.formState.errors.startTime && (
								<p className="mt-1 text-xs text-red-600">{exceptionForm.formState.errors.startTime.message}</p>
							)}
						</div>
						<div>
							<label className="text-sm text-stone-700">Heure de fin</label>
							<input
								type="time"
								className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
								{...exceptionForm.register('endTime')}
							/>
							{exceptionForm.formState.errors.endTime && (
								<p className="mt-1 text-xs text-red-600">{exceptionForm.formState.errors.endTime.message}</p>
							)}
						</div>
						<div className="col-span-full">
							<label className="text-sm text-stone-700">Durée des créneaux</label>
							<div className="mt-2 flex gap-2">
								<button
									type="button"
									onClick={() => exceptionForm.setValue('slotDuration', '30')}
									className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
										exceptionForm.watch('slotDuration') === '30'
											? 'border-rose-600 bg-rose-50 text-rose-700'
											: 'border-border text-stone-600 hover:bg-stone-50'
									}`}
								>
									30 min
								</button>
								<button
									type="button"
									onClick={() => exceptionForm.setValue('slotDuration', '60')}
									className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
										exceptionForm.watch('slotDuration') === '60'
											? 'border-rose-600 bg-rose-50 text-rose-700'
											: 'border-border text-stone-600 hover:bg-stone-50'
									}`}
								>
									1h
								</button>
							</div>
						</div>
						<button
							type="submit"
							className="col-span-full rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
						>
							Ajouter l'exception
						</button>
					</form>
				)}
			</div>

			{formError && <p className="mt-4 text-sm text-red-600">{formError}</p>}
		</div>
	);
}
