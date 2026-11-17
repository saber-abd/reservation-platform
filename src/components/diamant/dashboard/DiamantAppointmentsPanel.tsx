import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, Check, X, Clock, Mail, Phone, Scissors } from 'lucide-react';
import { useAuthedProfessional } from '@/lib/useAuthedProfessional';
import { isRoleReadOnly } from '@/lib/permissions';
import { getAppointmentsForProfessional, updateAppointmentStatus, type Appointment } from '@/lib/queries';
import { Avatar, EASE, EnChargement, EtatVide, Panneau, PastilleStatut, Segments, Squelette, cx } from './kit/primitives';
import { avertirLectureSeule, confirmer, signalerErreur } from './kit/notifier';

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

function heure(iso: string) {
	return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

type Tab = 'pending' | 'confirmed' | 'history';

const tabLabels: Record<Tab, string> = {
	pending: 'En attente de validation',
	confirmed: 'Confirmées',
	history: 'Historique passé',
};

type Vue = 'semaine' | 'jour';

// Hauteur d'une heure de grille : une demi-heure = 32 px.
const HAUTEUR_HEURE = 64;
const PX_MINUTE = HAUTEUR_HEURE / 60;

function debutSemaine(d: Date) {
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	const decalage = (x.getDay() + 6) % 7; // lundi = 0
	x.setDate(x.getDate() - decalage);
	return x;
}

function memeJour(a: Date, b: Date) {
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Durée affichée dans l'agenda : celle de la prestation (services.duration_minutes). L'heure de fin
// enregistrée peut couvrir tout un créneau de disponibilité ; elle ne sert qu'en l'absence de prestation.
function dureeMinutes(a: AppointmentWithService) {
	if (a.services?.duration_minutes && a.services.duration_minutes > 0) return a.services.duration_minutes;
	const fin = a.end_time ? new Date(a.end_time).getTime() : NaN;
	const debut = new Date(a.start_time).getTime();
	const parFin = Number.isFinite(fin) && fin > debut ? (fin - debut) / 60000 : 0;
	return parFin > 0 && parFin <= 8 * 60 ? parFin : 30;
}

/* ------------------------------------------------------------------ */
/* Agenda (grille CSS) : colonnes = jours, lignes = heures              */
/* ------------------------------------------------------------------ */

function Agenda({
	jours,
	rendezVous,
	onOuvrir,
}: {
	jours: Date[];
	rendezVous: AppointmentWithService[];
	onOuvrir: (a: AppointmentWithService) => void;
}) {
	const reduit = useReducedMotion();
	const [maintenant, setMaintenant] = useState<Date | null>(null);

	useEffect(() => {
		setMaintenant(new Date());
		const t = window.setInterval(() => setMaintenant(new Date()), 60_000);
		return () => window.clearInterval(t);
	}, []);

	const parJour = useMemo(
		() =>
			jours.map((j) =>
				rendezVous
					.filter((a) => memeJour(new Date(a.start_time), j))
					.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
			),
		[jours, rendezVous]
	);

	// Plage horaire : 9 h – 19 h, élargie si des rendez-vous en sortent.
	const [hDebut, hFin] = useMemo(() => {
		let debut = 9;
		let fin = 19;
		for (const liste of parJour) {
			for (const a of liste) {
				const d = new Date(a.start_time);
				debut = Math.min(debut, d.getHours());
				fin = Math.max(fin, Math.ceil(d.getHours() + (d.getMinutes() + dureeMinutes(a)) / 60));
			}
		}
		return [Math.max(0, debut), Math.min(24, fin)];
	}, [parJour]);

	const heures = Array.from({ length: hFin - hDebut }, (_, i) => hDebut + i);

	// Couloirs pour les rendez-vous qui se chevauchent
	function couloirs(liste: AppointmentWithService[]) {
		const fins: number[] = [];
		const res = liste.map((a) => {
			const debut = new Date(a.start_time).getTime();
			const fin = debut + dureeMinutes(a) * 60000;
			let c = fins.findIndex((f) => f <= debut);
			if (c === -1) {
				c = fins.length;
				fins.push(fin);
			} else fins[c] = fin;
			return { a, c };
		});
		return { res, total: Math.max(fins.length, 1) };
	}

	const ligneMaintenant =
		maintenant && maintenant.getHours() >= hDebut && maintenant.getHours() < hFin
			? ((maintenant.getHours() - hDebut) * 60 + maintenant.getMinutes()) * PX_MINUTE
			: null;

	return (
		<div className={cx('overflow-x-auto', jours.length > 1 && 'overscroll-x-contain')}>
			<div
				className="dx-agenda"
				style={{ ['--dx-jours' as string]: jours.length, ['--dx-heure' as string]: `${HAUTEUR_HEURE}px`, minWidth: jours.length > 1 ? 760 : undefined } as React.CSSProperties}
			>
				{/* En-têtes */}
				<div className="dx-agenda__tete !border-r-0" aria-hidden="true" />
				{jours.map((j) => {
					const aujourdhui = maintenant ? memeJour(j, maintenant) : false;
					return (
						<div key={j.toISOString()} className="dx-agenda__tete border-l border-dx-filet">
							<p className="text-xs font-medium text-dx-gris first-letter:uppercase">
								{j.toLocaleDateString('fr-FR', { weekday: jours.length > 1 ? 'short' : 'long' })}
							</p>
							<p
								className={cx(
									'dx-chiffre mx-auto mt-1 grid h-9 w-9 place-items-center rounded-full text-[1.35rem]',
									aujourdhui ? 'bg-dx-terre text-white' : 'text-dx-encre'
								)}
							>
								{j.getDate()}
							</p>
						</div>
					);
				})}

				{/* Heures */}
				<div className="pt-0">
					{heures.map((h) => (
						<div key={h} className="dx-agenda__heure">
							{/* Libellé centré sur sa ligne ; le premier, en haut de la grille, reste sous la ligne. */}
							<span style={h === hDebut ? { transform: 'translateY(3px)' } : undefined}>{`${String(h).padStart(2, '0')}:00`}</span>
						</div>
					))}
				</div>

				{/* Colonnes des jours */}
				{jours.map((j, iJour) => {
					const aujourdhui = maintenant ? memeJour(j, maintenant) : false;
					const { res, total } = couloirs(parJour[iJour]);
					return (
						<div
							key={j.toISOString()}
							className="dx-agenda__col"
							data-aujourdhui={aujourdhui}
							style={{ height: heures.length * HAUTEUR_HEURE }}
						>
							{res.map(({ a, c }, i) => {
								const d = new Date(a.start_time);
								// Le bloc commence sur sa ligne horaire et sa hauteur suit la durée de la prestation
								// (1 px de marge en haut et en bas pour séparer deux rendez-vous qui se suivent).
								const top = ((d.getHours() - hDebut) * 60 + d.getMinutes()) * PX_MINUTE;
								const h = Math.max(dureeMinutes(a) * PX_MINUTE - 2, 14);
								const largeur = 100 / total;
								return (
									<motion.button
										key={a.id}
										type="button"
										data-ton={a.status}
										onClick={() => onOuvrir(a)}
										className="dx-agenda__bloc"
										style={{
											top: top + 1,
											padding: h < 30 ? '2px 8px' : undefined,
											height: h,
											left: `calc(${c * largeur}% + 4px)`,
											right: 'auto',
											width: `calc(${largeur}% - 8px)`,
										}}
										initial={reduit ? false : { opacity: 0, y: 6 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.4, ease: EASE, delay: Math.min(i * 0.04 + iJour * 0.03, 0.4) }}
										aria-label={`${a.client_name}, ${a.services?.name ?? 'prestation'}, ${formatDate(a.start_time)}`}
									>
										{h < 44 ? (
											<span className="flex items-baseline gap-1.5 truncate">
												<span className="dx-tabulaire text-[0.6875rem] font-semibold" style={{ color: 'inherit' }}>{heure(a.start_time)}</span>
												<b className="truncate font-semibold">{a.client_name}</b>
											</span>
										) : (
											<>
												<span className="dx-tabulaire block text-[0.6875rem] font-semibold" style={{ color: 'inherit' }}>
													{heure(a.start_time)}
												</span>
												<b className="block truncate font-semibold">{a.client_name}</b>
												{h > 58 && <span className="dx-meta block truncate !text-[0.6875rem]">{a.services?.name ?? '—'}</span>}
											</>
										)}
									</motion.button>
								);
							})}
							{aujourdhui && ligneMaintenant !== null && (
								<div className="dx-maintenant" style={{ top: ligneMaintenant }} aria-hidden="true" />
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Détail d'un rendez-vous (panneau latéral)                           */
/* ------------------------------------------------------------------ */

function AppointmentDetailPanel({
	appointment,
	onClose,
	onCancel,
	onConfirm,
	onComplete,
}: {
	appointment: AppointmentWithService | null;
	onClose: () => void;
	onCancel: (id: string) => void;
	onConfirm: (id: string) => void;
	onComplete: (id: string) => void;
}) {
	// Le contenu reste affiché pendant que le panneau se referme.
	const [garde, setGarde] = useState<AppointmentWithService | null>(appointment);
	useEffect(() => {
		if (appointment) setGarde(appointment);
	}, [appointment]);
	const a = appointment ?? garde;
	return (
		<Panneau
			ouvert={!!appointment}
			onClose={onClose}
			largeur={480}
			entete={<p className="mb-1 text-sm text-dx-gris">Détail du rendez-vous</p>}
			titre={a?.client_name ?? ''}
			sousTitre={a ? <PastilleStatut statut={a.status} /> : null}
			pied={
				a && (a.status === 'confirmed' || a.status === 'pending') ? (
					<div className="flex flex-wrap items-center gap-2">
						{a.status === 'confirmed' && new Date(a.start_time) < new Date() && (
							<button
								type="button"
								onClick={() => {
									onComplete(a.id);
									onClose();
								}}
								className="dx-btn dx-btn--ok"
							>
								<Check size={16} />
								Terminer la prestation (Ajoute les points)
							</button>
						)}
						{a.status === 'pending' && (
							<button
								type="button"
								onClick={() => {
									onConfirm(a.id);
									onClose();
								}}
								className="dx-btn"
							>
								<Check size={16} />
								Confirmer
							</button>
						)}
						<button
							type="button"
							onClick={() => {
								onCancel(a.id);
								onClose();
							}}
							className="dx-btn dx-btn--fantome !text-dx-alerte"
						>
							<X size={16} />
							{a.status === 'pending' ? 'Refuser' : 'Annuler ce rendez-vous'}
						</button>
					</div>
				) : undefined
			}
		>
			{a && (
				<div className="space-y-6">
					<div className="dx-carte dx-carte--plate grid grid-cols-[auto_1fr] items-center gap-x-5 p-5">
						<div className="text-center">
							<p className="text-xs font-medium text-dx-gris first-letter:uppercase">
								{new Date(a.start_time).toLocaleDateString('fr-FR', { weekday: 'long' })}
							</p>
							<p className="dx-chiffre mt-1 text-5xl text-dx-encre">{new Date(a.start_time).getDate()}</p>
							<p className="mt-1 text-xs text-dx-gris">
								{new Date(a.start_time).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
							</p>
						</div>
						<div className="border-l border-dx-filet pl-5">
							<p className="dx-chiffre text-4xl text-dx-terre">{heure(a.start_time)}</p>
							<p className="mt-2 text-sm text-dx-encre-2">{formatDate(a.start_time)}</p>
						</div>
					</div>

					<dl className="divide-y divide-dx-filet border-y border-dx-filet text-sm">
						<div className="grid grid-cols-[7.5rem_1fr] gap-3 py-3.5">
							<dt className="text-dx-gris">Client</dt>
							<dd className="min-w-0 space-y-1">
								<p className="break-words font-semibold text-dx-encre">{a.client_name}</p>
								{a.client_email && (
									<a href={`mailto:${a.client_email}`} className="flex items-center gap-1.5 break-all text-dx-encre-2 hover:text-dx-terre">
										<Mail size={13} className="flex-none" /> {a.client_email}
									</a>
								)}
								{a.client_phone && (
									<a href={`tel:${a.client_phone}`} className="flex items-center gap-1.5 text-dx-encre-2 hover:text-dx-terre">
										<Phone size={13} className="flex-none" /> {a.client_phone}
									</a>
								)}
							</dd>
						</div>
						<div className="grid grid-cols-[7.5rem_1fr] gap-3 py-3.5">
							<dt className="text-dx-gris">Prestation</dt>
							<dd className="text-dx-encre">
								{a.services?.name ?? '—'}
								{a.services && (
									<span className="dx-tabulaire block text-dx-gris">
										{a.services.duration_minutes} min — {a.services.price} €
									</span>
								)}
							</dd>
						</div>
						<div className="grid grid-cols-[7.5rem_1fr] gap-3 py-3.5">
							<dt className="text-dx-gris">Créneau</dt>
							<dd className="text-dx-encre">{formatDate(a.start_time)}</dd>
						</div>
						<div className="grid grid-cols-[7.5rem_1fr] items-center gap-3 py-3.5">
							<dt className="text-dx-gris">Statut</dt>
							<dd>
								<PastilleStatut statut={a.status} />
							</dd>
						</div>
					</dl>
				</div>
			)}
		</Panneau>
	);
}

export default function AppointmentsPanel() {
	const { loading, professional, error } = useAuthedProfessional();
	const [appointments, setAppointments] = useState<AppointmentWithService[]>([]);
	const [loadingAppointments, setLoadingAppointments] = useState(true);
	const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithService | null>(null);
	const [tab, setTab] = useState<Tab>('pending');
	const [vue, setVue] = useState<Vue>('semaine');
	const [reference, setReference] = useState<Date | null>(null);
	const reduit = useReducedMotion();

	useEffect(() => {
		setReference(new Date());
		// Sur téléphone, la vue jour est plus lisible que la semaine.
		if (window.matchMedia('(max-width: 767px)').matches) setVue('jour');
	}, []);

	useEffect(() => {
		if (!professional) return;
		getAppointmentsForProfessional(professional.id)
			.then(setAppointments)
			.finally(() => setLoadingAppointments(false));
	}, [professional]);

	async function handleCancel(id: string) {
		if (isRoleReadOnly()) {
			avertirLectureSeule("Action désactivée en mode Démo : Ce rôle est réservé à la présentation commerciale en lecture seule.");
			return;
		}
		try {
			const updated = await updateAppointmentStatus(id, 'cancelled');
			setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
			confirmer('Rendez-vous annulé.');
		} catch (err) {
			signalerErreur("Le rendez-vous n'a pas pu être mis à jour.");
		}
	}

	async function handleConfirm(id: string) {
		if (isRoleReadOnly()) {
			avertirLectureSeule("Action désactivée en mode Démo : Ce rôle est réservé à la présentation commerciale en lecture seule.");
			return;
		}
		try {
			const updated = await updateAppointmentStatus(id, 'confirmed');
			setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
			confirmer('Rendez-vous confirmé.');
		} catch (err) {
			signalerErreur("Le rendez-vous n'a pas pu être mis à jour.");
		}
	}

	async function handleComplete(id: string) {
		if (isRoleReadOnly()) {
			avertirLectureSeule("Action désactivée en mode Démo : Ce rôle est réservé à la présentation commerciale en lecture seule.");
			return;
		}
		try {
			const updated = await updateAppointmentStatus(id, 'completed');
			setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
			confirmer('Prestation terminée.', 'Les points de fidélité du client sont ajoutés.');
		} catch (err) {
			signalerErreur("Le rendez-vous n'a pas pu être mis à jour.");
		}
	}

	const jours = useMemo(() => {
		if (!reference) return [];
		if (vue === 'jour') {
			const j = new Date(reference);
			j.setHours(0, 0, 0, 0);
			return [j];
		}
		const lundi = debutSemaine(reference);
		return Array.from({ length: 7 }, (_, i) => {
			const d = new Date(lundi);
			d.setDate(lundi.getDate() + i);
			return d;
		});
	}, [reference, vue]);

	if (loading) {
		return (
			<EnChargement className="space-y-6">
				<div className="flex flex-wrap gap-3">
					<Squelette className="h-10 w-56 !rounded-full" />
					<Squelette className="h-10 w-72 !rounded-full" />
				</div>
				<Squelette className="h-[560px] w-full !rounded-[14px]" />
			</EnChargement>
		);
	}
	if (error) return <p className="dx-bandeau" data-ton="alerte">{error}</p>;

	const now = new Date();
	const filteredAppointments = appointments.filter((a) => {
		const isPast = new Date(a.start_time) < now;
		if (tab === 'pending') return a.status === 'pending';
		if (tab === 'confirmed') return a.status === 'confirmed' && !isPast;
		return isPast || a.status === 'cancelled' || a.status === 'completed';
	});
	const compte = (t: Tab) =>
		appointments.filter((a) => {
			const isPast = new Date(a.start_time) < now;
			if (t === 'pending') return a.status === 'pending';
			if (t === 'confirmed') return a.status === 'confirmed' && !isPast;
			return isPast || a.status === 'cancelled' || a.status === 'completed';
		}).length;

	const visibles = jours.length
		? appointments.filter((a) => {
			const d = new Date(a.start_time);
			const debut = jours[0].getTime();
			const fin = jours[jours.length - 1].getTime() + 86_400_000;
			return d.getTime() >= debut && d.getTime() < fin;
		})
		: [];

	function decaler(sens: number) {
		setReference((r) => {
			const d = new Date(r ?? new Date());
			d.setDate(d.getDate() + sens * (vue === 'jour' ? 1 : 7));
			return d;
		});
	}

	const libellePeriode = jours.length
		? vue === 'jour'
			? jours[0].toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
			: `${jours[0].toLocaleDateString('fr-FR', { day: 'numeric', month: jours[0].getMonth() === jours[6].getMonth() ? undefined : 'short' })} – ${jours[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
		: '';

	function boutonsActions(appointment: AppointmentWithService) {
		return (
			<div className="flex items-center justify-end gap-1.5">
				{appointment.status === 'confirmed' && new Date(appointment.start_time) < now && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							handleComplete(appointment.id);
						}}
						className="dx-btn dx-btn--sm dx-btn--ok"
					>
						Terminer
					</button>
				)}
				{appointment.status === 'pending' && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							handleConfirm(appointment.id);
						}}
						className="dx-btn dx-btn--sm"
					>
						<Check size={14} />
						Confirmer
					</button>
				)}
				{(appointment.status === 'confirmed' || appointment.status === 'pending') && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							handleCancel(appointment.id);
						}}
						className="dx-btn dx-btn--sm dx-btn--fantome !text-dx-alerte"
					>
						{appointment.status === 'pending' ? 'Refuser' : 'Annuler'}
					</button>
				)}
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Agenda */}
			<section className="dx-carte overflow-hidden">
				<div className="flex flex-col gap-4 border-b border-dx-filet bg-dx-papier px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex flex-wrap items-center gap-2">
						<button type="button" onClick={() => decaler(-1)} className="dx-icone-btn" aria-label={vue === 'jour' ? 'Jour précédent' : 'Semaine précédente'}>
							<ChevronLeft size={18} />
						</button>
						<button type="button" onClick={() => decaler(1)} className="dx-icone-btn" aria-label={vue === 'jour' ? 'Jour suivant' : 'Semaine suivante'}>
							<ChevronRight size={18} />
						</button>
						<button type="button" onClick={() => setReference(new Date())} className="dx-btn dx-btn--sm dx-btn--ligne ml-1">
							Aujourd'hui
						</button>
						<h2 className="dx-h3 w-full first-letter:uppercase sm:ml-3 sm:w-auto" aria-live="polite">{libellePeriode}</h2>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<span className="dx-meta">
							{loadingAppointments ? ' ' : `${visibles.length} rendez-vous`}
						</span>
						<Segments<Vue>
							label="Affichage de l'agenda"
							value={vue}
							onChange={setVue}
							taille="sm"
							options={[
								{ value: 'semaine', label: 'Semaine' },
								{ value: 'jour', label: 'Jour' },
							]}
						/>
					</div>
				</div>
				{loadingAppointments || !reference ? (
					<EnChargement label="Chargement des rendez-vous…" className="p-6">
						<Squelette className="h-[480px] w-full" />
					</EnChargement>
				) : (
					<div className="relative">
						<Agenda jours={jours} rendezVous={visibles} onOuvrir={setSelectedAppointment} />
						{visibles.length === 0 && (
							<div className="pointer-events-none absolute inset-x-0 top-24 flex justify-center">
								<p className="rounded-full bg-dx-carte px-4 py-2 text-sm text-dx-gris shadow-[0_0_0_1px_var(--dx-filet)]">
									{vue === 'jour' ? 'Aucun rendez-vous ce jour.' : 'Aucun rendez-vous cette semaine.'}
								</p>
							</div>
						)}
					</div>
				)}
				<div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-dx-filet px-6 py-3 text-xs text-dx-gris">
					<span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-dx-terre" /> Confirmé</span>
					<span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-dx-attente" /> En attente</span>
					<span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-dx-ok" /> Terminé</span>
					<span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-dx-sable" /> Annulé</span>
					<span className="ml-auto inline-flex items-center gap-2"><i className="h-0.5 w-4 bg-dx-terre" /> Maintenant</span>
				</div>
			</section>

			{/* Demandes et historique */}
			<section>
				<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h2 className="dx-h2">Rendez-vous</h2>
						<p className="dx-meta mt-1">Bienvenue, {professional?.business_name}.</p>
					</div>
				</div>
				<div className="dx-onglets mb-5" role="tablist" aria-label="Rendez-vous par statut">
					{(Object.keys(tabLabels) as Tab[]).map((t) => (
						<button
							key={t}
							type="button"
							role="tab"
							aria-selected={tab === t}
							onClick={() => setTab(t)}
							className="dx-onglet"
						>
							{tabLabels[t]}
							<span className="dx-compte">{loadingAppointments ? '' : compte(t)}</span>
							{tab === t && (
								<motion.span
									layoutId="dx-onglet-rdv"
									className="dx-onglet-trait"
									transition={reduit ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 38 }}
								/>
							)}
						</button>
					))}
				</div>

				<div className="dx-carte overflow-hidden">
					{loadingAppointments ? (
						<EnChargement label="Chargement des rendez-vous…" className="divide-y divide-dx-filet">
							{[0, 1, 2].map((i) => (
								<div key={i} className="flex items-center gap-4 px-5 py-4">
									<Squelette className="h-9 w-9 !rounded-full" />
									<Squelette className="h-4 w-48" />
									<Squelette className="ml-auto h-4 w-24" />
								</div>
							))}
						</EnChargement>
					) : appointments.length === 0 ? (
						<EtatVide dessin="agenda" titre="Aucun rendez-vous pour le moment." texte="Les réservations faites sur le site arriveront ici." />
					) : filteredAppointments.length === 0 ? (
						<EtatVide dessin="agenda" titre="Aucun rendez-vous dans cet onglet." />
					) : (
						<>
							{/* Bureau : tableau dense */}
							<table className="dx-table hidden md:table">
								<thead>
									<tr>
										<th>Client</th>
										<th>Prestation</th>
										<th>Créneau</th>
										<th>Statut</th>
										<th className="text-right"><span className="sr-only">Actions</span></th>
									</tr>
								</thead>
								<tbody>
									{filteredAppointments.map((appointment) => (
										<tr
											key={appointment.id}
											onClick={() => setSelectedAppointment(appointment)}
											className="dx-ligne-cliquable"
										>
											<td className="max-w-[18rem]">
												<div className="flex items-center gap-3">
													<Avatar nom={appointment.client_name} taille={34} />
													<div className="min-w-0">
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																setSelectedAppointment(appointment);
															}}
															className="block max-w-full truncate text-left font-semibold text-dx-encre hover:text-dx-terre"
														>
															{appointment.client_name}
														</button>
														<p className="truncate text-xs text-dx-gris">{appointment.client_email}</p>
													</div>
												</div>
											</td>
											<td className="text-dx-encre-2">{appointment.services?.name ?? '—'}</td>
											<td className="dx-tabulaire whitespace-nowrap font-medium text-dx-encre">{formatDate(appointment.start_time)}</td>
											<td><PastilleStatut statut={appointment.status} /></td>
											<td>{boutonsActions(appointment)}</td>
										</tr>
									))}
								</tbody>
							</table>

							{/* Mobile : liste de cartes */}
							<ul className="divide-y divide-dx-filet md:hidden">
								{filteredAppointments.map((appointment) => (
									<li key={appointment.id} className="px-4 py-4">
										<button type="button" onClick={() => setSelectedAppointment(appointment)} className="flex w-full items-start gap-3 text-left">
											<Avatar nom={appointment.client_name} taille={36} />
											<div className="min-w-0 flex-1">
												<p className="break-words font-semibold text-dx-encre">{appointment.client_name}</p>
												<p className="mt-0.5 flex items-center gap-1.5 text-sm text-dx-encre-2">
													<Clock size={13} className="flex-none text-dx-gris" /> {formatDate(appointment.start_time)}
												</p>
												{appointment.services?.name && (
													<p className="mt-0.5 flex items-center gap-1.5 text-sm text-dx-gris">
														<Scissors size={13} className="flex-none" /> {appointment.services.name}
													</p>
												)}
											</div>
											<PastilleStatut statut={appointment.status} />
										</button>
										<div className="mt-3 pl-12">{boutonsActions(appointment)}</div>
									</li>
								))}
							</ul>
						</>
					)}
				</div>
			</section>

			<AppointmentDetailPanel
				appointment={selectedAppointment}
				onClose={() => setSelectedAppointment(null)}
				onCancel={handleCancel}
				onConfirm={handleConfirm}
				onComplete={handleComplete}
			/>
		</div>
	);
}
