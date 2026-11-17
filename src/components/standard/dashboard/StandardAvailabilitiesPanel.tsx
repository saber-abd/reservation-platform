import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { useAuthedProfessional } from '@/lib/useAuthedProfessional';
import { createAvailabilityRule, deleteAvailabilityRule, getAvailabilityRules, type AvailabilityRule } from '@/lib/queries';
import { formatDaysOfWeek, weekdayLabels } from '@/lib/slots';
import TimePicker from '@/components/standard/ui/StandardTimePicker';
import { Busy, EmptyState, PageHeader, PageSkeleton, Panel, Skeleton } from '@/components/standard/ui/StandardKit';

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

/** Ordre d'affichage lundi → dimanche (index de weekdayLabels : 0 = dimanche). */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const toHours = (t: string) => {
	const [h, m] = t.split(':').map(Number);
	return (h || 0) + (m || 0) / 60;
};

/** Semaine type calculée à partir des horaires récurrents (colonnes jours, lignes heures). */
function WeekPreview({ rules }: { rules: AvailabilityRule[] }) {
	const starts = rules.map((r) => Math.floor(toHours(r.start_time)));
	const ends = rules.map((r) => Math.ceil(toHours(r.end_time)));
	const from = Math.min(8, ...starts);
	const to = Math.max(19, ...ends);
	const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i);
	const hourRem = 1.5;
	const height = (to - from) * hourRem;

	return (
		<div className="sa-week" style={{ '--sa-hour': `${hourRem}rem` } as React.CSSProperties}>
			<div className="sa-week-head" aria-hidden="true" />
			{WEEK_ORDER.map((d) => (
				<div key={d} className="sa-week-head">
					<abbr title={weekdayLabels[d]} className="no-underline">
						{weekdayLabels[d].slice(0, 3)}
					</abbr>
				</div>
			))}
			<div className="sa-week-hours" style={{ height: `${height}rem` }} aria-hidden="true">
				{hours.map((h, i) =>
					i === 0 ? null : (
						<span key={h} style={{ top: `${i * hourRem}rem` }}>
							{String(h).padStart(2, '0')}h
						</span>
					),
				)}
			</div>
			{WEEK_ORDER.map((d) => {
				const dayRules = rules.filter((r) => r.days_of_week.includes(d));
				return (
					<div key={d} className="sa-week-col" style={{ height: `${height}rem` }}>
						{dayRules.map((r) => {
							const s = toHours(r.start_time);
							const e = toHours(r.end_time);
							return (
								<div
									key={r.id}
									className="sa-week-block"
									style={{ top: `${(s - from) * hourRem}rem`, height: `${(e - s) * hourRem}rem` }}
									title={`${weekdayLabels[d]} : ${r.start_time.slice(0, 5)} - ${r.end_time.slice(0, 5)}, créneaux de ${r.slot_duration_minutes} min`}
								>
									<span className="max-sm:hidden">
										{r.start_time.slice(0, 5)}
										<br />
										{r.end_time.slice(0, 5)}
									</span>
								</div>
							);
						})}
					</div>
				);
			})}
		</div>
	);
}

function DurationChoice({ value, onChange, long }: { value: string | undefined; onChange: (v: '30' | '60') => void; long?: boolean }) {
	return (
		<div className="mt-1 flex flex-wrap gap-2" role="group" aria-label="Durée des créneaux">
			<button type="button" aria-pressed={value === '30'} onClick={() => onChange('30')} className="sa-chip">
				{long ? '30 min (prestations courtes)' : '30 min'}
			</button>
			<button type="button" aria-pressed={value === '60'} onClick={() => onChange('60')} className="sa-chip">
				{long ? '1h (prestations longues)' : '1h'}
			</button>
		</div>
	);
}

export default function AvailabilitiesPanel() {
	const { loading, professional, error } = useAuthedProfessional();
	const [rules, setRules] = useState<AvailabilityRule[]>([]);
	const [loadingRules, setLoadingRules] = useState(true);
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
		getAvailabilityRules(professional.id)
			.then(setRules)
			.finally(() => setLoadingRules(false));
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
			toast.success('Horaire récurrent ajouté.');
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
			toast.success('Disponibilité exceptionnelle ajoutée.');
		} catch (err) {
			setFormError(err instanceof Error ? err.message : 'Erreur lors de la création.');
		}
	}

	async function handleDelete(id: string) {
		await deleteAvailabilityRule(id);
		setRules((prev) => prev.filter((r) => r.id !== id));
	}

	if (loading) return <PageSkeleton rows={3} figures={false} />;
	if (error) return <p className="sa-alert">{error}</p>;

	const recurringRules = rules.filter((r) => !r.is_exception);
	const exceptionRules = rules
		.filter((r) => r.is_exception)
		.sort((a, b) => (a.exception_date ?? '').localeCompare(b.exception_date ?? ''));

	const selectedDays = recurringForm.watch('daysOfWeek') ?? [];

	return (
		<div>
			<PageHeader
				title="Mes disponibilités"
				subtitle="Définissez vos horaires récurrents (ex : Lun-Ven, 8h-16h, créneaux de 30 min) et, si besoin, des disponibilités exceptionnelles pour une date précise."
			/>

			<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
				{/* Semaine type */}
				<Panel title="Semaine type" description="Ce que voient vos clients au moment de réserver.">
					{loadingRules ? (
						<Busy>
							<Skeleton className="h-64 w-full" />
						</Busy>
					) : recurringRules.length === 0 ? (
						<EmptyState kind="clock" title="Aucun horaire récurrent défini pour le moment.">
							Ajoutez une plage horaire ci-contre : elle apparaîtra ici, jour par jour.
						</EmptyState>
					) : (
						<WeekPreview rules={recurringRules} />
					)}
				</Panel>

				<div className="grid gap-6">
					{/* Règles récurrentes */}
					<Panel title="Horaires récurrents" bodyClassName="">
						{loadingRules ? (
							<Busy>
								<div className="grid gap-3 p-5">
									<Skeleton className="h-5 w-3/4" />
									<Skeleton className="h-5 w-1/2" />
								</div>
							</Busy>
						) : recurringRules.length === 0 ? (
							<p className="px-5 py-4 text-sm text-ink-mute">Aucun horaire récurrent défini pour le moment.</p>
						) : (
							<ul>
								{recurringRules.map((rule) => (
									<li key={rule.id} className="flex items-center justify-between gap-3 border-b border-[var(--sa-line-soft)] px-5 py-3 last:border-b-0">
										<div className="min-w-0">
											<p className="font-semibold text-ink">{formatDaysOfWeek(rule.days_of_week)}</p>
											<p className="sa-num text-sm text-ink-soft">
												{rule.start_time.slice(0, 5)} - {rule.end_time.slice(0, 5)}
												<span className="text-ink-mute"> · créneaux de {rule.slot_duration_minutes} min</span>
											</p>
										</div>
										<button
											type="button"
											onClick={() => handleDelete(rule.id)}
											className="sa-btn sa-btn--danger sa-btn--sm sa-btn--icon"
											aria-label={`Supprimer l'horaire ${formatDaysOfWeek(rule.days_of_week)} ${rule.start_time.slice(0, 5)} - ${rule.end_time.slice(0, 5)}`}
											title="Supprimer"
										>
											<Trash2 size={15} aria-hidden="true" />
										</button>
									</li>
								))}
							</ul>
						)}
					</Panel>

					{/* Ajout d'un horaire récurrent */}
					<form onSubmit={recurringForm.handleSubmit(onSubmitRecurring)}>
						<Panel title="Ajouter un horaire récurrent" bodyClassName="sa-panel-body grid gap-5 sm:grid-cols-2">
							<div className="col-span-full">
								<span className="sa-label">Jours concernés</span>
								<div className="flex flex-wrap gap-1.5" role="group" aria-label="Jours concernés">
									{WEEK_ORDER.map((index) => {
										const label = weekdayLabels[index];
										const selected = selectedDays.includes(index);
										return (
											<button
												type="button"
												key={index}
												aria-pressed={selected}
												aria-label={label}
												onClick={() => {
													const current = recurringForm.getValues('daysOfWeek') ?? [];
													recurringForm.setValue(
														'daysOfWeek',
														selected ? current.filter((d) => d !== index) : [...current, index],
													);
												}}
												className="sa-chip min-w-[2.9rem] justify-center px-2.5"
											>
												{label.slice(0, 3)}
											</button>
										);
									})}
								</div>
								{recurringForm.formState.errors.daysOfWeek && (
									<p className="sa-error">{recurringForm.formState.errors.daysOfWeek.message}</p>
								)}
							</div>
							<div>
								<TimePicker
									label="Heure de début"
									value={recurringForm.watch('startTime') || ''}
									onChange={(v) => recurringForm.setValue('startTime', v)}
								/>
								{recurringForm.formState.errors.startTime && (
									<p className="sa-error">{recurringForm.formState.errors.startTime.message}</p>
								)}
							</div>
							<div>
								<TimePicker
									label="Heure de fin"
									value={recurringForm.watch('endTime') || ''}
									onChange={(v) => recurringForm.setValue('endTime', v)}
								/>
								{recurringForm.formState.errors.endTime && (
									<p className="sa-error">{recurringForm.formState.errors.endTime.message}</p>
								)}
							</div>
							<div className="col-span-full">
								<span className="sa-label">Durée des créneaux</span>
								<DurationChoice long value={recurringForm.watch('slotDuration')} onChange={(v) => recurringForm.setValue('slotDuration', v)} />
							</div>
							<div className="col-span-full">
								<button type="submit" className="sa-btn sa-btn--primary">
									Ajouter l'horaire
								</button>
							</div>
						</Panel>
					</form>
				</div>
			</div>

			{/* Exceptions */}
			<Panel className="mt-8" bodyClassName="">
				<div className="flex flex-wrap items-start justify-between gap-4 p-5">
					<div className="max-w-[60ch]">
						<h2 className="sa-panel-title">Disponibilités exceptionnelles</h2>
						<p className="sa-panel-desc">
							Pour une date précise (jour férié travaillé, horaires spéciaux...), en remplacement de l'horaire récurrent
							habituel ce jour-là.
						</p>
					</div>
					<label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink">
						<input
							type="checkbox"
							checked={showExceptionForm}
							onChange={(e) => setShowExceptionForm(e.target.checked)}
							className="peer sr-only"
						/>
						<span className="sa-switch peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand" data-on={showExceptionForm ? 'true' : 'false'} aria-hidden="true" />
						Ajouter une disponibilité exceptionnelle
					</label>
				</div>

				{exceptionRules.length > 0 && (
					<ul className="border-t border-[var(--sa-line-soft)]">
						{exceptionRules.map((rule) => (
							<li key={rule.id} className="flex items-center justify-between gap-3 border-b border-[var(--sa-line-soft)] px-5 py-3 last:border-b-0">
								<div className="flex min-w-0 items-center gap-3">
									{rule.exception_date && (
										<span className="sa-date" aria-hidden="true">
											<b>{new Date(`${rule.exception_date}T00:00:00`).getDate()}</b>
											<span>{new Date(`${rule.exception_date}T00:00:00`).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span>
										</span>
									)}
									<div className="min-w-0">
										<p className="font-semibold text-ink first-letter:uppercase">
											{rule.exception_date &&
												new Date(`${rule.exception_date}T00:00:00`).toLocaleDateString('fr-FR', {
													weekday: 'long',
													day: 'numeric',
													month: 'long',
												})}
										</p>
										<p className="sa-num text-sm text-ink-soft">
											{rule.start_time.slice(0, 5)} - {rule.end_time.slice(0, 5)}
											<span className="text-ink-mute"> · créneaux de {rule.slot_duration_minutes} min</span>
										</p>
									</div>
								</div>
								<button
									type="button"
									onClick={() => handleDelete(rule.id)}
									className="sa-btn sa-btn--danger sa-btn--sm sa-btn--icon"
									aria-label={`Supprimer l'exception du ${rule.exception_date ?? ''}`}
									title="Supprimer"
								>
									<Trash2 size={15} aria-hidden="true" />
								</button>
							</li>
						))}
					</ul>
				)}

				{showExceptionForm && (
					<form
						onSubmit={exceptionForm.handleSubmit(onSubmitException)}
						className="grid gap-5 border-t border-[var(--sa-line-soft)] bg-[var(--sa-bg)] p-5 sm:grid-cols-3"
					>
						<div>
							<label className="sa-label" htmlFor="sa-exception-date">
								Date
							</label>
							<input id="sa-exception-date" type="date" className="sa-input sa-num" {...exceptionForm.register('date')} />
							{exceptionForm.formState.errors.date && <p className="sa-error">{exceptionForm.formState.errors.date.message}</p>}
						</div>
						<div>
							<TimePicker
								label="Heure de début"
								value={exceptionForm.watch('startTime') || ''}
								onChange={(v) => exceptionForm.setValue('startTime', v)}
							/>
							{exceptionForm.formState.errors.startTime && (
								<p className="sa-error">{exceptionForm.formState.errors.startTime.message}</p>
							)}
						</div>
						<div>
							<TimePicker
								label="Heure de fin"
								value={exceptionForm.watch('endTime') || ''}
								onChange={(v) => exceptionForm.setValue('endTime', v)}
							/>
							{exceptionForm.formState.errors.endTime && (
								<p className="sa-error">{exceptionForm.formState.errors.endTime.message}</p>
							)}
						</div>
						<div className="col-span-full">
							<span className="sa-label">Durée des créneaux</span>
							<DurationChoice value={exceptionForm.watch('slotDuration')} onChange={(v) => exceptionForm.setValue('slotDuration', v)} />
						</div>
						<div className="col-span-full">
							<button type="submit" className="sa-btn sa-btn--primary">
								Ajouter l'exception
							</button>
						</div>
					</form>
				)}
			</Panel>

			{formError && <p className="sa-alert mt-4">{formError}</p>}
		</div>
	);
}
