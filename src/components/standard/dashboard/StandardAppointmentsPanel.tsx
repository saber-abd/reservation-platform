import { useEffect, useMemo, useRef, useState } from 'react';
import NumberFlow from '@number-flow/react';
import { toast } from 'sonner';
import { useAuthedProfessional } from '@/lib/useAuthedProfessional';
import { isRoleReadOnly } from '@/lib/permissions';
import { getAppointmentsForProfessional, updateAppointmentStatus, type Appointment } from '@/lib/queries';
import {
	DateBlock,
	EmptyState,
	PageHeader,
	PageSkeleton,
	Sheet,
	StatusPill,
	TableSkeleton,
	Tabs,
	statusTone,
	useLastDefined,
	Busy,
} from '@/components/standard/ui/StandardKit';

type AppointmentWithService = Appointment & {
	services: { name: string; duration_minutes: number; price: number } | null;
};

function formatDate(iso: string) {
	return new Date(iso).toLocaleString('fr-FR', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function formatTime(iso: string) {
	return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(iso: string) {
	const s = new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
	return s.charAt(0).toUpperCase() + s.slice(1);
}

const statusLabels: Record<Appointment['status'], string> = {
	pending: 'En attente',
	confirmed: 'Confirmé',
	cancelled: 'Annulé',
	completed: 'Terminé',
};

type Tab = 'pending' | 'confirmed' | 'history';

const tabLabels: Record<Tab, string> = {
	pending: 'En attente de validation',
	confirmed: 'Confirmées',
	history: 'Historique passé',
};

const READ_ONLY = 'Action désactivée : cette démonstration est en lecture seule.';
const WEEK_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const sameDay = (a: Date, b: Date) =>
	a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Détail d'un rendez-vous dans le panneau latéral, avec les mêmes actions que l'ancienne modale. */
function AppointmentDetail({
	appointment,
	open,
	onClose,
	onCancel,
	onConfirm,
	onComplete,
}: {
	appointment: AppointmentWithService | null;
	open: boolean;
	onClose: () => void;
	onCancel: (id: string) => void;
	onConfirm: (id: string) => void;
	onComplete: (id: string) => void;
}) {
	const a = useLastDefined(appointment);
	if (!a) return null;
	const isPast = new Date(a.start_time) < new Date();

	let footer: React.ReactNode = null;
	if (a.status === 'confirmed') {
		footer = (
			<>
				{isPast && (
					<button
						type="button"
						onClick={() => {
							onComplete(a.id);
							onClose();
						}}
						className="sa-btn sa-btn--primary"
					>
						Terminer la prestation (ajoute les points)
					</button>
				)}
				<button
					type="button"
					onClick={() => {
						onCancel(a.id);
						onClose();
					}}
					className="sa-btn sa-btn--danger"
				>
					Annuler ce rendez-vous
				</button>
			</>
		);
	} else if (a.status === 'pending') {
		footer = (
			<>
				<button
					type="button"
					onClick={() => {
						onConfirm(a.id);
						onClose();
					}}
					className="sa-btn sa-btn--primary"
				>
					Confirmer
				</button>
				<button
					type="button"
					onClick={() => {
						onCancel(a.id);
						onClose();
					}}
					className="sa-btn sa-btn--danger"
				>
					Refuser
				</button>
			</>
		);
	}

	return (
		<Sheet open={open} onClose={onClose} title="Détail du rendez-vous" description={formatDay(a.start_time)} footer={footer}>
			<div className="mb-5 flex items-center gap-3">
				<DateBlock iso={a.start_time} />
				<div className="min-w-0">
					<p className="sa-num text-2xl font-semibold tracking-tight text-ink">{formatTime(a.start_time)}</p>
					<StatusPill tone={statusTone[a.status]}>{statusLabels[a.status]}</StatusPill>
				</div>
			</div>
			<dl className="sa-dl">
				<div>
					<dt>Client</dt>
					<dd>
						<span className="block font-semibold">{a.client_name}</span>
						<a href={`mailto:${a.client_email}`} className="block break-all text-ink-soft hover:text-brand">
							{a.client_email}
						</a>
						{a.client_phone && (
							<a href={`tel:${a.client_phone}`} className="block text-ink-soft hover:text-brand">
								{a.client_phone}
							</a>
						)}
					</dd>
				</div>
				<div>
					<dt>Prestation</dt>
					<dd>
						{a.services?.name ?? '—'}
						{a.services && (
							<span className="sa-num block text-sm text-ink-mute">
								{a.services.duration_minutes} min — {a.services.price} €
							</span>
						)}
					</dd>
				</div>
				<div>
					<dt>Créneau</dt>
					<dd className="sa-num">{formatDate(a.start_time)}</dd>
				</div>
			</dl>
		</Sheet>
	);
}

export default function AppointmentsPanel() {
	const { loading, professional, error } = useAuthedProfessional();
	const [appointments, setAppointments] = useState<AppointmentWithService[]>([]);
	const [loadingAppointments, setLoadingAppointments] = useState(true);
	const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithService | null>(null);
	const [tab, setTab] = useState<Tab>('pending');
	const listRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!professional) return;
		getAppointmentsForProfessional(professional.id)
			.then(setAppointments)
			.finally(() => setLoadingAppointments(false));
	}, [professional]);

	async function changeStatus(id: string, status: Appointment['status'], done: string) {
		if (isRoleReadOnly()) {
			toast(READ_ONLY);
			return;
		}
		try {
			const updated = await updateAppointmentStatus(id, status);
			setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
			toast.success(done);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'La mise à jour du rendez-vous a échoué.');
		}
	}

	const handleCancel = (id: string) => changeStatus(id, 'cancelled', 'Rendez-vous annulé.');
	const handleConfirm = (id: string) => changeStatus(id, 'confirmed', 'Rendez-vous confirmé.');
	const handleComplete = (id: string) => changeStatus(id, 'completed', 'Prestation terminée, points ajoutés au client.');

	// Vues calculées à partir des rendez-vous déjà chargés.
	const summary = useMemo(() => {
		const now = new Date();
		const pending = appointments.filter((a) => a.status === 'pending');
		const upcoming = appointments
			.filter((a) => (a.status === 'confirmed' || a.status === 'pending') && new Date(a.start_time) >= now)
			.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
		const monday = new Date(now);
		monday.setHours(0, 0, 0, 0);
		monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
		const week = Array.from({ length: 7 }, (_, i) => {
			const day = new Date(monday);
			day.setDate(monday.getDate() + i);
			const count = appointments.filter((a) => a.status !== 'cancelled' && sameDay(new Date(a.start_time), day)).length;
			return { day, count, today: sameDay(day, now) };
		});
		const counts: Record<Tab, number> = { pending: 0, confirmed: 0, history: 0 };
		for (const a of appointments) {
			const isPast = new Date(a.start_time) < now;
			if (a.status === 'pending') counts.pending++;
			if (a.status === 'confirmed' && !isPast) counts.confirmed++;
			if (isPast || a.status === 'cancelled' || a.status === 'completed') counts.history++;
		}
		return { pending, next: upcoming[0] ?? null, week, weekTotal: week.reduce((s, d) => s + d.count, 0), counts };
	}, [appointments]);

	if (loading) return <PageSkeleton rows={3} />;
	if (error) return <p className="sa-alert">{error}</p>;

	const now = new Date();
	const filteredAppointments = appointments.filter((a) => {
		const isPast = new Date(a.start_time) < now;
		if (tab === 'pending') return a.status === 'pending';
		if (tab === 'confirmed') return a.status === 'confirmed' && !isPast;
		return isPast || a.status === 'cancelled' || a.status === 'completed';
	});

	const pendingCount = summary.pending.length;
	const maxDay = Math.max(1, ...summary.week.map((d) => d.count));
	const next = summary.next;

	function showPending() {
		setTab('pending');
		listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	return (
		<div>
			<PageHeader
				title="Rendez-vous"
				subtitle={
					<>
						Bienvenue, {professional?.business_name}.{' '}
						{!loadingAppointments &&
							(pendingCount > 0
								? `${pendingCount} demande${pendingCount > 1 ? 's attendent' : ' attend'} votre réponse.`
								: 'Aucune demande en attente de réponse.')}
					</>
				}
			/>

			{/* Ce qui demande une action, puis le prochain passage et la semaine */}
			<section aria-label="Résumé" className="sa-panel sa-figs mb-8" style={{ '--sa-figs-cols': 'minmax(0,1fr) minmax(0,1.5fr) minmax(0,1fr)' } as React.CSSProperties}>
				<div>
					<p className="sa-fig-label">À confirmer</p>
					{loadingAppointments ? (
						<span className="sa-skel mt-2 h-10 w-16" aria-hidden="true" />
					) : (
						<p className="sa-fig-value" style={{ color: pendingCount > 0 ? 'var(--color-brand)' : undefined }}>
							<NumberFlow value={pendingCount} />
							<small>demande{pendingCount > 1 ? 's' : ''}</small>
						</p>
					)}
					{pendingCount > 0 ? (
						<button type="button" onClick={showPending} className="sa-textlink mt-3 text-sm">
							Répondre aux demandes
						</button>
					) : (
						<p className="sa-fig-note">Tout est à jour.</p>
					)}
				</div>

				<div>
					<p className="sa-fig-label">Prochain rendez-vous</p>
					{loadingAppointments ? (
						<div className="mt-3 flex gap-3">
							<span className="sa-skel h-12 w-11" aria-hidden="true" />
							<div className="grid flex-1 gap-2">
								<span className="sa-skel h-4 w-32" aria-hidden="true" />
								<span className="sa-skel h-3 w-48" aria-hidden="true" />
							</div>
						</div>
					) : next ? (
						<button type="button" onClick={() => setSelectedAppointment(next)} className="mt-3 flex w-full items-center gap-3 text-left">
							<DateBlock iso={next.start_time} />
							<span className="min-w-0">
								<span className="block truncate font-semibold text-ink">
									<span className="sa-num">{formatTime(next.start_time)}</span> · {next.client_name}
								</span>
								<span className="block truncate text-sm text-ink-mute">
									{next.services?.name ?? 'Prestation'} · {formatDay(next.start_time).toLowerCase()}
								</span>
							</span>
						</button>
					) : (
						<p className="sa-fig-note mt-3">Aucun rendez-vous à venir.</p>
					)}
				</div>

				<div>
					<p className="sa-fig-label">
						Cette semaine <span className="sa-num text-ink-mute">· {summary.weekTotal} rendez-vous</span>
					</p>
					<div className="sa-bars" aria-hidden="true">
						{summary.week.map((d, i) => (
							<div key={i}>
								<div>
									<i
										data-on={d.count > 0 ? '' : undefined}
										style={{ height: `${d.count === 0 ? 3 : Math.max(18, (d.count / maxDay) * 100)}%`, animationDelay: `${i * 40}ms` }}
									/>
								</div>
								<span data-today={d.today ? '' : undefined}>{WEEK_LETTERS[i]}</span>
							</div>
						))}
					</div>
				</div>
			</section>

			<div ref={listRef} className="scroll-mt-20">
				<Tabs
					label="Filtrer les rendez-vous"
					value={tab}
					onChange={setTab}
					panelId="sa-rdv-panel"
					items={(Object.keys(tabLabels) as Tab[]).map((t) => ({
						value: t,
						label: tabLabels[t],
						count: loadingAppointments ? undefined : summary.counts[t],
					}))}
				/>

				<div id="sa-rdv-panel" role="tabpanel" className="mt-5">
					{loadingAppointments ? (
						<Busy>
							<TableSkeleton rows={3} />
						</Busy>
					) : appointments.length === 0 ? (
						<div className="sa-panel">
							<EmptyState kind="calendar" title="Aucun rendez-vous pour le moment.">
								Les demandes de réservation faites sur le site arriveront ici, dans l'onglet « En attente de validation ».
							</EmptyState>
						</div>
					) : filteredAppointments.length === 0 ? (
						<div className="sa-panel">
							<EmptyState kind={tab === 'pending' ? 'calendar' : 'list'} title="Aucun rendez-vous dans cet onglet.">
								{tab === 'pending' ? 'Toutes les demandes ont reçu une réponse.' : 'Les autres onglets contiennent peut-être ce que vous cherchez.'}
							</EmptyState>
						</div>
					) : (
						<div className="sa-panel overflow-hidden">
							<table className="sa-table sa-table--stack">
								<thead>
									<tr>
										<th scope="col">Client</th>
										<th scope="col">Prestation</th>
										<th scope="col">Créneau</th>
										<th scope="col">Statut</th>
										<th scope="col">
											<span className="sr-only">Actions</span>
										</th>
									</tr>
								</thead>
								<tbody>
									{filteredAppointments.map((appointment) => {
										const isPast = new Date(appointment.start_time) < now;
										return (
											<tr
												key={appointment.id}
												data-clickable=""
												tabIndex={0}
												aria-label={`Voir le détail : ${appointment.client_name}, ${formatDate(appointment.start_time)}`}
												onClick={() => setSelectedAppointment(appointment)}
												onKeyDown={(e) => {
													if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
														e.preventDefault();
														setSelectedAppointment(appointment);
													}
												}}
											>
												<td data-cell="main" className="max-w-[16rem]">
													<p className="sa-cell-strong break-words">{appointment.client_name}</p>
													<p className="mt-0.5 break-all text-xs text-ink-mute">{appointment.client_email}</p>
												</td>
												<td data-cell="full">
													<span className="text-ink">{appointment.services?.name ?? '—'}</span>
													{appointment.services && (
														<span className="sa-num block text-xs text-ink-mute">
															{appointment.services.duration_minutes} min · {appointment.services.price} €
														</span>
													)}
												</td>
												<td data-cell="full">
													<span className="flex items-center gap-2.5">
														<DateBlock iso={appointment.start_time} />
														<span className="sa-num">
															<span className="block font-semibold text-ink">{formatTime(appointment.start_time)}</span>
															<span className="block text-xs text-ink-mute">
																{new Date(appointment.start_time).toLocaleDateString('fr-FR', { weekday: 'long' })}
															</span>
														</span>
													</span>
												</td>
												<td data-cell="side">
													<StatusPill tone={statusTone[appointment.status]}>{statusLabels[appointment.status]}</StatusPill>
												</td>
												<td data-cell="full" className="sa-cell-end">
													<span className="inline-flex flex-wrap justify-end gap-1.5 max-md:justify-start">
														{appointment.status === 'pending' && (
															<button
																type="button"
																onClick={(e) => {
																	e.stopPropagation();
																	handleConfirm(appointment.id);
																}}
																className="sa-btn sa-btn--primary sa-btn--sm"
															>
																Confirmer
															</button>
														)}
														{appointment.status === 'confirmed' && isPast && (
															<button
																type="button"
																onClick={(e) => {
																	e.stopPropagation();
																	handleComplete(appointment.id);
																}}
																className="sa-btn sa-btn--secondary sa-btn--sm"
															>
																Terminer
															</button>
														)}
														{(appointment.status === 'confirmed' || appointment.status === 'pending') && (
															<button
																type="button"
																onClick={(e) => {
																	e.stopPropagation();
																	handleCancel(appointment.id);
																}}
																className="sa-btn sa-btn--danger sa-btn--sm"
															>
																{appointment.status === 'pending' ? 'Refuser' : 'Annuler'}
															</button>
														)}
													</span>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>

			<AppointmentDetail
				appointment={selectedAppointment}
				open={selectedAppointment !== null}
				onClose={() => setSelectedAppointment(null)}
				onCancel={handleCancel}
				onConfirm={handleConfirm}
				onComplete={handleComplete}
			/>
		</div>
	);
}
