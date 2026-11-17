import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Check, ChevronLeft, ChevronRight, Flag, Mail, Phone, X, Eye, Ban } from 'lucide-react';
import { useAuthedProfessional } from '@/lib/useAuthedProfessional';
import { isRoleReadOnly } from '@/lib/permissions';
import { getAppointmentsForProfessional, updateAppointmentStatus, type Appointment } from '@/lib/queries';
import { LECTURE_SEULE } from '@/components/premium/ui/PremiumToaster';
import { EmptyState, EUROS, PageHead, PageSkeleton, RowsSkeleton, Rolling, StatusTag } from './kit/Base';
import { ActionMenu, Gauge, SidePanel, Tabs } from './kit/Interactive';
import WeekAgenda, { type AgendaEvent } from './kit/WeekAgenda';
import { ajouterJours, debutSemaine, delaiRelatif, heureCourte, libelleSemaine, memeJour } from './kit/dates';

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

type Tab = 'pending' | 'confirmed' | 'history';

const tabLabels: Record<Tab, string> = {
	pending: 'En attente de validation',
	confirmed: 'Confirmées',
	history: 'Historique passé',
};

const PAS_HISTORIQUE = 25;

function finDe(a: AppointmentWithService) {
	const start = new Date(a.start_time);
	if (a.end_time) return new Date(a.end_time);
	return new Date(start.getTime() + (a.services?.duration_minutes ?? 60) * 60_000);
}

/* ---------- Détail d'un rendez-vous (panneau latéral) ---------- */

function AppointmentDetail({ appointment }: { appointment: AppointmentWithService }) {
	const start = new Date(appointment.start_time);
	const end = finDe(appointment);
	return (
		<div className="grid gap-6">
			<div className="flex items-start gap-5">
				<div className="pe-date">
					<span>{start.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
					<b>{start.getDate()}</b>
					<span>{start.toLocaleDateString('fr-FR', { month: 'short' })}</span>
				</div>
				<div className="min-w-0">
					<p className="pe-chiffre !text-[2.4rem]">{heureCourte(start)}</p>
					<p className="pe-tech mt-2">
						Jusqu'à {heureCourte(end)} · {delaiRelatif(start)}
					</p>
					<div className="mt-3">
						<StatusTag status={appointment.status} />
					</div>
				</div>
			</div>

			<dl className="pe-card divide-y divide-pe-filet text-[0.9375rem]">
				<div className="grid gap-1 p-4">
					<dt className="pe-tech">Client</dt>
					<dd className="pe-h3 break-words">{appointment.client_name}</dd>
					<dd className="flex flex-wrap gap-x-5 gap-y-1 pt-1">
						<a href={`mailto:${appointment.client_email}`} className="pe-lien inline-flex items-center gap-2 break-all">
							<Mail size={14} aria-hidden="true" />
							{appointment.client_email}
						</a>
						{appointment.client_phone && (
							<a href={`tel:${appointment.client_phone}`} className="pe-lien inline-flex items-center gap-2">
								<Phone size={14} aria-hidden="true" />
								{appointment.client_phone}
							</a>
						)}
					</dd>
				</div>
				<div className="grid gap-1 p-4">
					<dt className="pe-tech">Prestation</dt>
					<dd className="font-semibold">{appointment.services?.name ?? '—'}</dd>
					{appointment.services && (
						<dd className="text-pe-acier">
							{appointment.services.duration_minutes} min — {appointment.services.price} €
						</dd>
					)}
				</div>
				<div className="grid gap-1 p-4">
					<dt className="pe-tech">Créneau</dt>
					<dd className="first-letter:uppercase">{formatDate(appointment.start_time)}</dd>
				</div>
			</dl>
		</div>
	);
}

function DetailActions({
	appointment,
	onCancel,
	onConfirm,
	onComplete,
	onClose,
}: {
	appointment: AppointmentWithService;
	onCancel: (id: string) => void;
	onConfirm: (id: string) => void;
	onComplete: (id: string) => void;
	onClose: () => void;
}) {
	if (appointment.status === 'confirmed') {
		return (
			<>
				{new Date(appointment.start_time) < new Date() && (
					<button
						type="button"
						onClick={() => {
							onComplete(appointment.id);
							onClose();
						}}
						className="pe-btn pe-btn--vert"
					>
						<Flag aria-hidden="true" />
						Terminer la prestation (Ajoute les points)
					</button>
				)}
				<button
					type="button"
					onClick={() => {
						onCancel(appointment.id);
						onClose();
					}}
					className="pe-btn pe-btn--danger"
				>
					Annuler ce rendez-vous
				</button>
			</>
		);
	}
	if (appointment.status === 'pending') {
		return (
			<>
				<button
					type="button"
					onClick={() => {
						onConfirm(appointment.id);
						onClose();
					}}
					className="pe-btn"
				>
					<Check aria-hidden="true" />
					Confirmer
				</button>
				<button
					type="button"
					onClick={() => {
						onCancel(appointment.id);
						onClose();
					}}
					className="pe-btn pe-btn--danger"
				>
					Refuser
				</button>
			</>
		);
	}
	return null;
}

/* ---------- Panneau principal ---------- */

export default function AppointmentsPanel() {
	const { loading, professional, error } = useAuthedProfessional();
	const [appointments, setAppointments] = useState<AppointmentWithService[]>([]);
	const [loadingAppointments, setLoadingAppointments] = useState(true);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [tab, setTab] = useState<Tab>('pending');
	const [weekOffset, setWeekOffset] = useState(0);
	const [historyLimit, setHistoryLimit] = useState(PAS_HISTORIQUE);
	const listRef = useRef<HTMLElement>(null);

	useEffect(() => {
		if (!professional) return;
		getAppointmentsForProfessional(professional.id)
			.then(setAppointments)
			.finally(() => setLoadingAppointments(false));
	}, [professional]);

	async function changeStatus(id: string, status: Appointment['status'], message: string) {
		if (isRoleReadOnly()) {
			toast.error(LECTURE_SEULE);
			return;
		}
		try {
			const updated = await updateAppointmentStatus(id, status);
			setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
			toast.success(message);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'La mise à jour a échoué.');
		}
	}

	const handleCancel = (id: string) => {
		const a = appointments.find((x) => x.id === id);
		return changeStatus(id, 'cancelled', a?.status === 'pending' ? 'Demande refusée.' : 'Rendez-vous annulé.');
	};
	const handleConfirm = (id: string) => changeStatus(id, 'confirmed', 'Rendez-vous confirmé.');
	const handleComplete = (id: string) => changeStatus(id, 'completed', 'Prestation terminée : points de fidélité ajoutés.');

	const vue = useMemo(() => {
		const now = new Date();
		const byStart = (a: AppointmentWithService, b: AppointmentWithService) => a.start_time.localeCompare(b.start_time);
		const pending = appointments.filter((a) => a.status === 'pending').sort(byStart);
		const upcoming = appointments
			.filter((a) => a.status === 'confirmed' && new Date(a.start_time) >= now)
			.sort(byStart);
		const semaine = debutSemaine(now);
		const parJour = Array.from({ length: 7 }, (_, i) => {
			const d = ajouterJours(semaine, i);
			return appointments.filter((a) => a.status !== 'cancelled' && memeJour(new Date(a.start_time), d)).length;
		});
		const today = appointments
			.filter((a) => a.status !== 'cancelled' && memeJour(new Date(a.start_time), now))
			.sort(byStart);
		const prochainAujourdhui = today.find((a) => new Date(a.start_time) >= now);
		const dans7 = ajouterJours(now, 7);
		const attendus = appointments.filter(
			(a) => (a.status === 'confirmed' || a.status === 'pending') && new Date(a.start_time) >= now && new Date(a.start_time) <= dans7,
		);
		const attendu = attendus.reduce((s, a) => s + (a.services?.price ?? 0), 0);
		const passes = appointments.filter((a) => new Date(a.start_time) < now);
		const honores = passes.filter((a) => a.status === 'completed').length;
		const annules = passes.filter((a) => a.status === 'cancelled').length;
		const taux = honores + annules > 0 ? honores / (honores + annules) : null;
		return { now, pending, upcoming, parJour, today, prochainAujourdhui, attendu, attendus, taux, honores, annules };
	}, [appointments]);

	if (loading) return <PageSkeleton />;
	if (error) return <p className="pe-erreur">{error}</p>;

	const now = vue.now;
	const filteredAppointments = appointments.filter((a) => {
		const isPast = new Date(a.start_time) < now;
		if (tab === 'pending') return a.status === 'pending';
		if (tab === 'confirmed') return a.status === 'confirmed' && !isPast;
		return isPast || a.status === 'cancelled' || a.status === 'completed';
	});
	const counts: Record<Tab, number> = {
		pending: appointments.filter((a) => a.status === 'pending').length,
		confirmed: appointments.filter((a) => a.status === 'confirmed' && new Date(a.start_time) >= now).length,
		history: appointments.filter((a) => new Date(a.start_time) < now || a.status === 'cancelled' || a.status === 'completed').length,
	};
	const shown = tab === 'history' ? filteredAppointments.slice(0, historyLimit) : filteredAppointments;

	const selected = appointments.find((a) => a.id === selectedId) ?? null;
	const vedette = vue.pending[0] ?? vue.upcoming[0] ?? null;
	const modeConfirmation = vue.pending.length > 0;
	const autres = modeConfirmation ? vue.pending.slice(1, 4) : vue.upcoming.slice(1, 4);

	const semaineAgenda = ajouterJours(debutSemaine(now), weekOffset * 7);
	const finAgenda = ajouterJours(semaineAgenda, 7);
	const events: AgendaEvent[] = appointments
		.filter((a) => {
			const s = new Date(a.start_time);
			return s >= semaineAgenda && s < finAgenda;
		})
		.map((a) => ({
			id: a.id,
			start: new Date(a.start_time),
			end: finDe(a),
			title: a.client_name,
			sub: a.services?.name,
			status: a.status,
		}));
	const heuresDebut = Math.min(8, ...events.map((e) => e.start.getHours()));
	const heuresFin = Math.max(19, ...events.map((e) => Math.min(24, e.end.getHours() + (e.end.getMinutes() > 0 ? 1 : 0))));
	const maxJour = Math.max(1, ...vue.parJour);
	const totalSemaine = vue.parJour.reduce((s, n) => s + n, 0);

	function voirListe(t: Tab) {
		setTab(t);
		listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	return (
		<div className="pe-entree">
			<PageHead
				title="Rendez-vous"
				sub={
					<>
						Bienvenue, <strong>{professional?.business_name}</strong>.{' '}
						<span>
							{now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}.
						</span>
					</>
				}
			/>

			{/* Accueil en bento : ce qui demande une action d'abord, puis les chiffres */}
			<section className="pe-bento" aria-label="Vue d'ensemble">
				<article className="pe-card pe-card--sombre pe-b-7 pe-b-haut flex flex-col">
					<div className="pe-card__tete">
						<h2 className="pe-tech flex items-center gap-3">
							{modeConfirmation ? 'À confirmer' : 'Prochain rendez-vous'}
							{modeConfirmation && (
								<span className="inline-flex h-6 min-w-6 items-center justify-center rounded-[2px] bg-pe-rouge px-1.5 text-[0.8rem] font-bold text-white">
									<Rolling value={vue.pending.length} />
								</span>
							)}
						</h2>
						{vedette && (
							<button type="button" className="pe-icone-btn" onClick={() => setSelectedId(vedette.id)} aria-label="Voir le détail du rendez-vous">
								<Eye />
							</button>
						)}
					</div>
					{loadingAppointments ? (
						<div className="pe-card__corps grid gap-4" aria-busy="true">
							<span className="pe-skel" style={{ height: 14, width: '30%' }} />
							<span className="pe-skel" style={{ height: 80, width: '60%' }} />
							<span className="pe-skel" style={{ height: 14, width: '70%' }} />
						</div>
					) : vedette ? (
						<div className="pe-card__corps flex flex-1 flex-col gap-6">
							<div className="flex flex-wrap items-end gap-x-8 gap-y-3">
								<div>
									<p className="pe-tech">
										{new Date(vedette.start_time).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
									</p>
									<p className="pe-chiffre mt-2 !text-[clamp(3.4rem,7vw,5.6rem)] text-pe-blanc">{heureCourte(new Date(vedette.start_time))}</p>
								</div>
								<p className="pe-tech !text-pe-blanc pb-2">{delaiRelatif(new Date(vedette.start_time), now)}</p>
							</div>
							<div className="grid gap-1.5">
								<p className="text-[clamp(1.4rem,2.4vw,2rem)] font-extrabold uppercase leading-none tracking-[-0.01em] [font-stretch:118%] break-words">
									{vedette.client_name}
								</p>
								<p className="text-pe-acier-clair">
									{vedette.services?.name ?? 'Prestation'}
									{vedette.services && ` · ${vedette.services.duration_minutes} min · ${vedette.services.price} €`}
								</p>
							</div>
							<div className="flex flex-wrap gap-2.5">
								{vedette.status === 'pending' ? (
									<>
										<button type="button" className="pe-btn" onClick={() => handleConfirm(vedette.id)}>
											<Check aria-hidden="true" />
											Confirmer
										</button>
										<button type="button" className="pe-btn pe-btn--fantome" onClick={() => handleCancel(vedette.id)}>
											Refuser
										</button>
									</>
								) : (
									<button type="button" className="pe-btn pe-btn--clair" onClick={() => setSelectedId(vedette.id)}>
										Voir le détail
									</button>
								)}
							</div>
							{autres.length > 0 && (
								<div className="mt-auto">
									<p className="pe-tech mb-2">{modeConfirmation ? 'Autres demandes' : 'Ensuite'}</p>
									<ul className="pe-rows border-t border-pe-filet-sombre">
										{autres.map((a) => (
											<li key={a.id}>
												<button type="button" className="pe-row-btn -mx-2 !w-[calc(100%+1rem)] !px-2" onClick={() => setSelectedId(a.id)}>
													<span className="pe-tech w-28 shrink-0 !text-pe-blanc">{formatDate(a.start_time)}</span>
													<span className="min-w-0 flex-1 truncate font-semibold">{a.client_name}</span>
													<span className="hidden truncate text-sm text-pe-acier-clair sm:block">{a.services?.name}</span>
												</button>
											</li>
										))}
									</ul>
									{modeConfirmation && vue.pending.length > 4 && (
										<button type="button" className="pe-tech mt-3 !text-pe-blanc underline decoration-pe-rouge underline-offset-4" onClick={() => voirListe('pending')}>
											Voir les {vue.pending.length} demandes
										</button>
									)}
								</div>
							)}
						</div>
					) : (
						<EmptyState
							kind="pont"
							title="Aucune demande en attente"
							text="Pas de rendez-vous à venir pour l'instant. Les nouvelles réservations du site apparaîtront ici."
						/>
					)}
				</article>

				<article className="pe-card pe-b-5">
					<div className="pe-card__tete">
						<h2 className="pe-tech">Cette semaine</h2>
						<span className="pe-tech">{libelleSemaine(debutSemaine(now))}</span>
					</div>
					<div className="pe-card__corps grid gap-5 sm:grid-cols-[auto_1fr] sm:items-end">
						<div>
							<p className="pe-chiffre">
								<Rolling value={totalSemaine} />
								<small>rdv</small>
							</p>
							<p className="mt-2 text-sm text-pe-acier">
								{vue.today.length === 0
									? "Aucun aujourd'hui."
									: `${vue.today.length} aujourd'hui${vue.prochainAujourdhui ? `, prochain à ${heureCourte(new Date(vue.prochainAujourdhui.start_time))}` : ''}.`}
							</p>
						</div>
						<div className="pe-minibarres" aria-hidden="true">
							{vue.parJour.map((n, i) => {
								const d = ajouterJours(debutSemaine(now), i);
								return (
									<div key={i} data-auj={memeJour(d, now) ? 'true' : undefined}>
										<i style={{ height: `${Math.max(3, (n / maxJour) * 100)}%`, animationDelay: `${i * 50}ms` }} />
										<span>{d.toLocaleDateString('fr-FR', { weekday: 'narrow' })}</span>
									</div>
								);
							})}
						</div>
					</div>
				</article>

				<article className="pe-card pe-b-5">
					<div className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] items-center gap-5 p-[18px] md:p-[22px]">
						<div>
							<Gauge
								value={vue.taux ?? 0}
								ariaLabel={vue.taux === null ? 'Pas encore de rendez-vous passés' : `Rendez-vous honorés : ${Math.round(vue.taux * 100)} %`}
							>
								<span className="text-[1.35rem]">{vue.taux === null ? '—' : <Rolling value={Math.round(vue.taux * 100)} suffix=" %" />}</span>
							</Gauge>
							<p className="pe-tech mt-1 text-center">Honorés</p>
						</div>
						<div className="min-w-0 border-l border-pe-filet pl-5">
							<h2 className="pe-tech">Attendu sur 7 jours</h2>
							<p className="pe-chiffre mt-2 !text-[clamp(1.8rem,2.8vw,2.5rem)]">
								<Rolling value={Math.round(vue.attendu)} format={EUROS} />
							</p>
							<p className="mt-2 text-sm text-pe-acier">
								{vue.attendus.length} rendez-vous confirmés ou en attente. {vue.honores} passés honorés, {vue.annules} annulés.
							</p>
						</div>
					</div>
				</article>
			</section>

			{/* Agenda de la semaine (vue calculée à partir des rendez-vous déjà chargés) */}
			<section className="pe-card mt-4" aria-labelledby="agenda-titre">
				<div className="pe-card__tete flex-wrap">
					<h2 id="agenda-titre" className="pe-h2">
						Semaine du {libelleSemaine(semaineAgenda)}
					</h2>
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
				{loadingAppointments ? (
					<div className="p-5" aria-busy="true">
						<span className="pe-skel" style={{ height: 320 }} />
					</div>
				) : (
					<WeekAgenda
						weekStart={semaineAgenda}
						events={events}
						startHour={heuresDebut}
						endHour={heuresFin}
						onSelect={setSelectedId}
						label={`Agenda de la semaine du ${libelleSemaine(semaineAgenda)}`}
					/>
				)}
				<div className="pe-legende border-t border-pe-filet px-[18px] py-3 md:px-[22px]">
					<StatusTag status="pending" label="À confirmer" />
					<StatusTag status="confirmed" />
					<StatusTag status="completed" />
					<StatusTag status="cancelled" />
				</div>
			</section>

			{/* Liste par onglets */}
			<section ref={listRef} className="pe-card mt-4 scroll-mt-6" aria-label="Liste des rendez-vous">
				<div className="px-2 md:px-3">
					<Tabs<Tab>
						label="Filtrer les rendez-vous"
						value={tab}
						onChange={(t) => {
							setTab(t);
							setHistoryLimit(PAS_HISTORIQUE);
						}}
						items={(Object.keys(tabLabels) as Tab[]).map((t) => ({ value: t, label: tabLabels[t], count: counts[t], alert: t === 'pending' }))}
					/>
				</div>

				{loadingAppointments ? (
					<RowsSkeleton />
				) : appointments.length === 0 ? (
					<EmptyState kind="agenda" title="Aucun rendez-vous pour le moment." text="Les réservations faites depuis le site s'afficheront ici, avec leur statut." />
				) : filteredAppointments.length === 0 ? (
					<EmptyState kind="liste" title="Aucun rendez-vous dans cet onglet." />
				) : (
					<>
						{/* Bureau : tableau dense */}
						<table className="pe-table hidden md:table">
							<thead>
								<tr>
									<th>Client</th>
									<th>Créneau</th>
									<th>Prestation</th>
									<th>Statut</th>
									<th>
										<span className="sr-only">Actions</span>
									</th>
								</tr>
							</thead>
							<tbody>
								{shown.map((appointment) => (
									<tr key={appointment.id} data-clic onClick={() => setSelectedId(appointment.id)}>
										<td className="max-w-[16rem]">
											<p className="pe-ligne-nom break-words">{appointment.client_name}</p>
											<p className="mt-0.5 break-all text-xs text-pe-acier">{appointment.client_email}</p>
										</td>
										<td className="whitespace-nowrap font-medium tabular-nums first-letter:uppercase">{formatDate(appointment.start_time)}</td>
										<td className="text-pe-acier">{appointment.services?.name ?? '—'}</td>
										<td>
											<StatusTag status={appointment.status} />
										</td>
										<td className="text-right">
											<RowActions
												appointment={appointment}
												now={now}
												onConfirm={handleConfirm}
												onCancel={handleCancel}
												onComplete={handleComplete}
												onOpen={() => setSelectedId(appointment.id)}
											/>
										</td>
									</tr>
								))}
							</tbody>
						</table>

						{/* Mobile : cartes empilées */}
						<ul className="pe-rows md:hidden">
							{shown.map((appointment) => (
								<li key={appointment.id} className="grid gap-3 px-4 py-4">
									<button type="button" className="grid gap-1 text-left" onClick={() => setSelectedId(appointment.id)}>
										<span className="flex items-center justify-between gap-3">
											<span className="pe-tech !text-pe-encre">{formatDate(appointment.start_time)}</span>
											<StatusTag status={appointment.status} />
										</span>
										<span className="pe-ligne-nom break-words">{appointment.client_name}</span>
										<span className="text-sm text-pe-acier">{appointment.services?.name ?? '—'}</span>
									</button>
									<RowActions
										appointment={appointment}
										now={now}
										onConfirm={handleConfirm}
										onCancel={handleCancel}
										onComplete={handleComplete}
										onOpen={() => setSelectedId(appointment.id)}
										align="start"
									/>
								</li>
							))}
						</ul>

						{tab === 'history' && filteredAppointments.length > historyLimit && (
							<div className="border-t border-pe-filet p-4 text-center">
								<button type="button" className="pe-btn pe-btn--ligne pe-btn--sm" onClick={() => setHistoryLimit((n) => n + PAS_HISTORIQUE)}>
									Afficher {Math.min(PAS_HISTORIQUE, filteredAppointments.length - historyLimit)} de plus ({filteredAppointments.length - historyLimit} restants)
								</button>
							</div>
						)}
					</>
				)}
			</section>

			<SidePanel
				open={!!selected}
				onClose={() => setSelectedId(null)}
				title="Détail du rendez-vous"
				footer={
					selected && (selected.status === 'pending' || selected.status === 'confirmed') ? (
						<DetailActions
							appointment={selected}
							onCancel={handleCancel}
							onConfirm={handleConfirm}
							onComplete={handleComplete}
							onClose={() => setSelectedId(null)}
						/>
					) : undefined
				}
			>
				{selected && <AppointmentDetail appointment={selected} />}
			</SidePanel>
		</div>
	);
}

function RowActions({
	appointment,
	now,
	onConfirm,
	onCancel,
	onComplete,
	onOpen,
	align = 'end',
}: {
	appointment: AppointmentWithService;
	now: Date;
	onConfirm: (id: string) => void;
	onCancel: (id: string) => void;
	onComplete: (id: string) => void;
	onOpen: () => void;
	align?: 'start' | 'end';
}) {
	const past = new Date(appointment.start_time) < now;
	return (
		<div className={`flex items-center gap-2 ${align === 'end' ? 'justify-end' : 'justify-start'}`} onClick={(e) => e.stopPropagation()}>
			{appointment.status === 'confirmed' && past && (
				<button type="button" className="pe-btn pe-btn--vert pe-btn--sm" onClick={() => onComplete(appointment.id)}>
					<Flag aria-hidden="true" />
					Terminer
				</button>
			)}
			{appointment.status === 'pending' && (
				<>
					<button type="button" className="pe-btn pe-btn--sm" onClick={() => onConfirm(appointment.id)}>
						<Check aria-hidden="true" />
						Confirmer
					</button>
					<button type="button" className="pe-btn pe-btn--ligne pe-btn--sm" onClick={() => onCancel(appointment.id)}>
						<X aria-hidden="true" />
						Refuser
					</button>
				</>
			)}
			{appointment.status === 'confirmed' && (
				<ActionMenu
					label={`Actions pour le rendez-vous de ${appointment.client_name}`}
					actions={[
						{ label: 'Voir le détail', icon: <Eye />, onSelect: onOpen },
						{ label: 'Annuler', icon: <Ban />, onSelect: () => onCancel(appointment.id), danger: true },
					]}
				/>
			)}
		</div>
	);
}
