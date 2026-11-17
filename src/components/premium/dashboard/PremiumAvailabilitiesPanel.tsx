import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useAuthedProfessional } from '@/lib/useAuthedProfessional';
import { createAvailabilityRule, deleteAvailabilityRule, getAvailabilityRules, type AvailabilityRule } from '@/lib/queries';
import { formatDaysOfWeek, weekdayLabels } from '@/lib/slots';
import TimePicker from '@/components/premium/ui/PremiumTimePicker';
import { EmptyState, PageHead, PageSkeleton } from './kit/Base';
import WeekAgenda, { type AgendaPlage } from './kit/WeekAgenda';
import { ajouterJours, debutSemaine, isoLocal, libelleSemaine } from './kit/dates';

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

// Ordre d'affichage lundi → dimanche (les valeurs restent celles de weekdayLabels : 0 = dimanche).
const ORDRE_JOURS = [1, 2, 3, 4, 5, 6, 0];

const minutes = (hhmm: string) => {
	const [h, m] = hhmm.split(':').map(Number);
	return h * 60 + (m || 0);
};

export default function AvailabilitiesPanel() {
	const { loading, professional, error } = useAuthedProfessional();
	const [rules, setRules] = useState<AvailabilityRule[]>([]);
	const [loadingRules, setLoadingRules] = useState(true);
	const [showExceptionForm, setShowExceptionForm] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [weekOffset, setWeekOffset] = useState(0);

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
		try {
			await deleteAvailabilityRule(id);
			setRules((prev) => prev.filter((r) => r.id !== id));
			toast.success('Horaire supprimé.');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'La suppression a échoué.');
		}
	}

	const recurringRules = rules.filter((r) => !r.is_exception);
	const exceptionRules = rules
		.filter((r) => r.is_exception)
		.sort((a, b) => (a.exception_date ?? '').localeCompare(b.exception_date ?? ''));

	// Semaine affichée : règles récurrentes, remplacées le jour d'une exception.
	const semaine = useMemo(() => ajouterJours(debutSemaine(new Date()), weekOffset * 7), [weekOffset]);
	const { plages, debut, fin, fermes, heuresSemaine } = useMemo(() => {
		const out: AgendaPlage[] = [];
		const fermes: number[] = [];
		let heures = 0;
		for (let i = 0; i < 7; i++) {
			const d = ajouterJours(semaine, i);
			const iso = isoLocal(d);
			const exceptions = rules.filter((r) => r.is_exception && r.exception_date === iso);
			const applicables = exceptions.length ? exceptions : rules.filter((r) => !r.is_exception && r.days_of_week.includes(d.getDay()));
			if (!applicables.length) fermes.push(i);
			for (const r of applicables) {
				const s = minutes(r.start_time);
				const e = minutes(r.end_time);
				heures += Math.max(0, e - s) / 60;
				out.push({
					day: i,
					start: s,
					end: e,
					exception: r.is_exception,
					label: `${r.start_time.slice(0, 5)}–${r.end_time.slice(0, 5)} · ${r.slot_duration_minutes} min`,
				});
			}
		}
		const debut = Math.min(8, ...out.map((p) => Math.floor(p.start / 60)));
		const fin = Math.max(18, ...out.map((p) => Math.ceil(p.end / 60)));
		return { plages: out, debut, fin, fermes, heuresSemaine: Math.round(heures * 10) / 10 };
	}, [rules, semaine]);

	if (loading) return <PageSkeleton cards={2} />;
	if (error) return <p className="pe-erreur">{error}</p>;

	const joursChoisis = recurringForm.watch('daysOfWeek') ?? [];

	return (
		<div className="pe-entree">
			<PageHead
				title="Mes disponibilités"
				sub="Définissez vos horaires récurrents (ex : Lun-Ven, 8h-16h, créneaux de 30 min) et, si besoin, des disponibilités exceptionnelles pour une date précise."
			/>

			<div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
				<div className="grid min-w-0 gap-4">
					{/* Semaine : vue calculée à partir des règles */}
					<section className="pe-card" aria-labelledby="semaine-titre">
						<div className="pe-card__tete flex-wrap">
							<div>
								<h2 id="semaine-titre" className="pe-h2">
									Semaine du {libelleSemaine(semaine)}
								</h2>
								<p className="pe-tech mt-1">{heuresSemaine} h d'ouverture réservable</p>
							</div>
							<div className="flex items-center gap-1">
								<button type="button" className="pe-icone-btn" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Semaine précédente">
									<ChevronLeft />
								</button>
								<button type="button" className="pe-btn pe-btn--ligne pe-btn--sm" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>
									Cette semaine
								</button>
								<button type="button" className="pe-icone-btn" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Semaine suivante">
									<ChevronRight />
								</button>
							</div>
						</div>
						{loadingRules ? (
							<div className="p-5" aria-busy="true">
								<span className="sr-only" role="status">Chargement…</span>
								<span className="pe-skel" style={{ height: 300 }} />
							</div>
						) : (
							<WeekAgenda
								weekStart={semaine}
								plages={plages}
								closedDays={fermes}
								startHour={debut}
								endHour={fin}
								label={`Ouvertures de la semaine du ${libelleSemaine(semaine)}`}
							/>
						)}
						<div className="pe-legende border-t border-pe-filet px-[18px] py-3 md:px-[22px]">
							<span className="pe-tag">Horaire récurrent</span>
							<span className="pe-tag" data-s="pending">Disponibilité exceptionnelle</span>
							<span className="pe-tag" data-s="cancelled">Fermé</span>
						</div>
					</section>

					{/* Règles récurrentes */}
					<section className="pe-card" aria-labelledby="recurrents-titre">
						<div className="pe-card__tete">
							<h2 id="recurrents-titre" className="pe-h2">Horaires récurrents</h2>
							<span className="pe-tech">{recurringRules.length} règle{recurringRules.length > 1 ? 's' : ''}</span>
						</div>
						{recurringRules.length === 0 ? (
							<EmptyState kind="agenda" title="Aucun horaire récurrent défini pour le moment." text="Ajoutez vos jours et heures d'ouverture : les clients ne pourront réserver que dans ces plages." />
						) : (
							<ul className="pe-rows">
								{recurringRules.map((rule) => (
									<li key={rule.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-[18px] py-3.5 md:px-[22px]">
										<span className="min-w-[9rem] font-bold [font-stretch:110%]">{formatDaysOfWeek(rule.days_of_week)}</span>
										<span className="text-lg font-extrabold tabular-nums [font-stretch:112%]">
											{rule.start_time.slice(0, 5)} – {rule.end_time.slice(0, 5)}
										</span>
										<span className="pe-tech">créneaux de {rule.slot_duration_minutes} min</span>
										<button
											type="button"
											onClick={() => handleDelete(rule.id)}
											className="pe-btn pe-btn--danger pe-btn--sm ml-auto"
											aria-label={`Supprimer l'horaire ${formatDaysOfWeek(rule.days_of_week)} ${rule.start_time.slice(0, 5)} - ${rule.end_time.slice(0, 5)}`}
										>
											<Trash2 aria-hidden="true" />
											Supprimer
										</button>
									</li>
								))}
							</ul>
						)}
					</section>

					{/* Exceptions */}
					{exceptionRules.length > 0 && (
						<section className="pe-card" aria-labelledby="exceptions-titre">
							<div className="pe-card__tete">
								<h2 id="exceptions-titre" className="pe-h2">Dates particulières</h2>
								<span className="pe-tech">Remplacent l'horaire habituel ce jour-là</span>
							</div>
							<ul className="pe-rows">
								{exceptionRules.map((rule) => {
									const d = rule.exception_date ? new Date(`${rule.exception_date}T00:00:00`) : null;
									return (
										<li key={rule.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-[18px] py-3.5 md:px-[22px]">
											{d && (
												<span className="pe-date">
													<span>{d.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
													<b>{d.getDate()}</b>
													<span>{d.toLocaleDateString('fr-FR', { month: 'short' })}</span>
												</span>
											)}
											<div className="grid gap-1">
												<span className="font-semibold first-letter:uppercase">
													{d && d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
												</span>
												<span className="flex flex-wrap items-baseline gap-x-4">
													<span className="text-lg font-extrabold tabular-nums [font-stretch:112%]">
														{rule.start_time.slice(0, 5)} – {rule.end_time.slice(0, 5)}
													</span>
													<span className="pe-tech">créneaux de {rule.slot_duration_minutes} min</span>
												</span>
											</div>
											<button type="button" onClick={() => handleDelete(rule.id)} className="pe-btn pe-btn--danger pe-btn--sm ml-auto">
												<Trash2 aria-hidden="true" />
												Supprimer
											</button>
										</li>
									);
								})}
							</ul>
						</section>
					)}
				</div>

				{/* Formulaires d'ajout */}
				<aside className="grid gap-4 xl:sticky xl:top-6">
					<form onSubmit={recurringForm.handleSubmit(onSubmitRecurring)} className="pe-card">
						<div className="pe-card__tete">
							<h2 className="pe-h2">Ajouter un horaire récurrent</h2>
						</div>
						<div className="pe-card__corps grid gap-5">
							<div>
								<span className="pe-label" id="jours-label">Jours concernés</span>
								<div className="pe-segments pe-segments--plein" role="group" aria-labelledby="jours-label">
									{ORDRE_JOURS.map((index) => {
										const label = weekdayLabels[index];
										const selected = joursChoisis.includes(index);
										return (
											<button
												type="button"
												key={index}
												aria-pressed={selected}
												aria-label={label}
												onClick={() => {
													const current = recurringForm.getValues('daysOfWeek') ?? [];
													recurringForm.setValue('daysOfWeek', selected ? current.filter((d) => d !== index) : [...current, index]);
												}}
												className="pe-segment"
											>
												{label.slice(0, 3)}
											</button>
										);
									})}
								</div>
								{recurringForm.formState.errors.daysOfWeek && <p className="pe-erreur">{recurringForm.formState.errors.daysOfWeek.message}</p>}
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<TimePicker
										label="Heure de début"
										value={recurringForm.watch('startTime') || ''}
										onChange={(v) => recurringForm.setValue('startTime', v)}
									/>
									{recurringForm.formState.errors.startTime && <p className="pe-erreur">{recurringForm.formState.errors.startTime.message}</p>}
								</div>
								<div>
									<TimePicker label="Heure de fin" value={recurringForm.watch('endTime') || ''} onChange={(v) => recurringForm.setValue('endTime', v)} />
									{recurringForm.formState.errors.endTime && <p className="pe-erreur">{recurringForm.formState.errors.endTime.message}</p>}
								</div>
							</div>
							<div>
								<span className="pe-label" id="duree-label">Durée des créneaux</span>
								<div className="pe-segments pe-segments--plein" role="group" aria-labelledby="duree-label">
									<button
										type="button"
										aria-pressed={recurringForm.watch('slotDuration') === '30'}
										onClick={() => recurringForm.setValue('slotDuration', '30')}
										className="pe-segment"
									>
										30 min (prestations courtes)
									</button>
									<button
										type="button"
										aria-pressed={recurringForm.watch('slotDuration') === '60'}
										onClick={() => recurringForm.setValue('slotDuration', '60')}
										className="pe-segment"
									>
										1h (prestations longues)
									</button>
								</div>
							</div>
							<button type="submit" className="pe-btn pe-btn--bloc">
								<Plus aria-hidden="true" />
								Ajouter l'horaire
							</button>
						</div>
					</form>

					<div className="pe-card">
						<div className="pe-card__corps grid gap-3">
							<label className="flex cursor-pointer items-start gap-3">
								<input
									type="checkbox"
									checked={showExceptionForm}
									onChange={(e) => setShowExceptionForm(e.target.checked)}
									className="mt-0.5 h-5 w-5 shrink-0 accent-pe-rouge"
								/>
								<span className="pe-h3">Ajouter une disponibilité exceptionnelle</span>
							</label>
							<p className="text-sm text-pe-acier">
								Pour une date précise (jour férié travaillé, horaires spéciaux...), en remplacement de l'horaire récurrent habituel ce jour-là.
							</p>
							{showExceptionForm && (
								<form onSubmit={exceptionForm.handleSubmit(onSubmitException)} className="mt-2 grid gap-4 border-t border-pe-filet pt-4">
									<div>
										<label className="pe-label" htmlFor="exception-date">
											Date
										</label>
										<input id="exception-date" type="date" className="pe-input" {...exceptionForm.register('date')} />
										{exceptionForm.formState.errors.date && <p className="pe-erreur">{exceptionForm.formState.errors.date.message}</p>}
									</div>
									<div className="grid grid-cols-2 gap-3">
										<div>
											<TimePicker
												label="Heure de début"
												value={exceptionForm.watch('startTime') || ''}
												onChange={(v) => exceptionForm.setValue('startTime', v)}
											/>
											{exceptionForm.formState.errors.startTime && <p className="pe-erreur">{exceptionForm.formState.errors.startTime.message}</p>}
										</div>
										<div>
											<TimePicker label="Heure de fin" value={exceptionForm.watch('endTime') || ''} onChange={(v) => exceptionForm.setValue('endTime', v)} />
											{exceptionForm.formState.errors.endTime && <p className="pe-erreur">{exceptionForm.formState.errors.endTime.message}</p>}
										</div>
									</div>
									<div>
										<span className="pe-label">Durée des créneaux</span>
										<div className="pe-segments pe-segments--plein" role="group" aria-label="Durée des créneaux">
											<button
												type="button"
												aria-pressed={exceptionForm.watch('slotDuration') === '30'}
												onClick={() => exceptionForm.setValue('slotDuration', '30')}
												className="pe-segment"
											>
												30 min
											</button>
											<button
												type="button"
												aria-pressed={exceptionForm.watch('slotDuration') === '60'}
												onClick={() => exceptionForm.setValue('slotDuration', '60')}
												className="pe-segment"
											>
												1h
											</button>
										</div>
									</div>
									<button type="submit" className="pe-btn pe-btn--encre pe-btn--bloc">
										<Plus aria-hidden="true" />
										Ajouter l'exception
									</button>
								</form>
							)}
						</div>
					</div>

					{formError && (
						<p className="pe-erreur" role="alert">
							{formError}
						</p>
					)}
				</aside>
			</div>
		</div>
	);
}

