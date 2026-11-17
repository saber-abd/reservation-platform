import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { MapPin, Clock, Edit2, Navigation, ArrowRight, CalendarX } from 'lucide-react';
import { updateAppointmentStatus } from '@/lib/queries';
import { EASE, EnChargement, EtatVide, Fenetre, PastilleStatut, Squelette } from './kit/primitives';
import { confirmer, signalerErreur } from './kit/notifier';

export default function DiamantClientAppointments() {
	const [appointments, setAppointments] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [editingAppt, setEditingAppt] = useState<any | null>(null);
	const [newDate, setNewDate] = useState('');
	const [maintenant, setMaintenant] = useState<number | null>(null);
	// Rendez-vous dont l'annulation attend la confirmation du client.
	const [aAnnuler, setAAnnuler] = useState<any | null>(null);
	const [annulation, setAnnulation] = useState(false);
	const reduit = useReducedMotion();

	useEffect(() => {
		setMaintenant(Date.now());
		fetchAppointments();
	}, []);

	async function fetchAppointments() {
		try {
			const { data: { session } } = await supabase.auth.getSession();
			if (!session) return;

			const { data } = await supabase
				.from('appointments')
				.select('*, services(name, duration_minutes, price), professionals(business_name, address)')
				.eq('client_id', session.user.id)
				.gte('start_time', new Date().toISOString())
				// Un rendez-vous annulé n'est plus « le prochain ».
				.neq('status', 'cancelled')
				.order('start_time', { ascending: true })
				.limit(1);

			setAppointments(data || []);
		} catch (error) {
			console.error(error);
		} finally {
			setLoading(false);
		}
	}

	async function saveDateChange() {
		if (!editingAppt || !newDate) return;
		try {
			const dateObj = new Date(newDate);
			const { error } = await supabase
				.from('appointments')
				.update({ start_time: dateObj.toISOString() })
				.eq('id', editingAppt.id);

			if (!error) {
				setEditingAppt(null);
				fetchAppointments(); // Refresh
			}
		} catch (e) {
			console.error(e);
		}
	}

	// Même requête que les espaces clients Standard et Premium (updateAppointmentStatus → « cancelled »).
	// Comme chez eux, l'annulation reste possible jusqu'au rendez-vous ; la règle des 24 h ne vise que le déplacement.
	async function annulerRdv() {
		if (!aAnnuler) return;
		setAnnulation(true);
		try {
			await updateAppointmentStatus(aAnnuler.id, 'cancelled');
			setAAnnuler(null);
			confirmer('Rendez-vous annulé.', 'Le créneau est libéré ; vous pouvez en réserver un autre quand vous le souhaitez.');
			setLoading(true);
			await fetchAppointments();
		} catch (err) {
			signalerErreur(err instanceof Error ? err.message : "L'annulation a échoué.");
		} finally {
			setAnnulation(false);
		}
	}

	if (loading) {
		return (
			<EnChargement label="Chargement de votre prochain rendez-vous..." className="dx-carte dx-carte--nuit p-7 sm:p-9">
				<Squelette className="h-4 w-40" />
				<Squelette className="mt-6 h-28 w-2/3" />
				<Squelette className="mt-6 h-5 w-1/2" />
				<Squelette className="mt-8 h-11 w-56 !rounded-full" />
			</EnChargement>
		);
	}

	if (appointments.length === 0) {
		return (
			<div className="dx-carte">
				<EtatVide
					dessin="agenda"
					titre="Vous n'avez aucun rendez-vous à venir."
					texte="Choisissez une prestation et un créneau : la durée et le prix s'affichent avant de valider."
					action={
						<a href="/demo-diamant/reservation" className="dx-btn">
							Réserver maintenant <ArrowRight size={15} />
						</a>
					}
				/>
			</div>
		);
	}

	const appt = appointments[0];
	const startDate = new Date(appt.start_time);

	// Format HH:MM
	const timeString = startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
	const jourSemaine = startDate.toLocaleDateString('fr-FR', { weekday: 'long' });
	const mois = startDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
	const adresse = appt.professionals?.address || 'Adresse du salon';

	// Délai avant le rendez-vous (calculé après le montage)
	let delai = '';
	if (maintenant) {
		const jours = Math.round((new Date(startDate).setHours(0, 0, 0, 0) - new Date(maintenant).setHours(0, 0, 0, 0)) / 86_400_000);
		delai = jours <= 0 ? "Aujourd'hui" : jours === 1 ? 'Demain' : `Dans ${jours} jours`;
	}

	return (
		<motion.section
			initial={reduit ? false : { opacity: 0, y: 16 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.7, ease: EASE }}
			className="dx-carte dx-carte--nuit overflow-hidden"
			aria-labelledby="dx-prochain-rdv"
		>
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-dx-filet-nuit px-6 py-4 sm:px-9">
				<p id="dx-prochain-rdv" className="text-sm text-dx-sable">Prochain rendez-vous</p>
				<div className="flex items-center gap-2">
					{delai && <span className="rounded-full bg-dx-terre px-3 py-1 text-xs font-semibold text-white">{delai}</span>}
					<PastilleStatut statut={appt.status} />
				</div>
			</div>

			<div className="grid gap-8 px-6 py-8 sm:px-9 md:grid-cols-[auto_1fr] md:items-end md:gap-12">
				{/* Date en très grand */}
				<div className="flex items-end gap-5">
					<p className="dx-chiffre text-[clamp(6rem,14vw,9.5rem)] leading-[0.8] text-dx-creme">{startDate.getDate()}</p>
					<div className="pb-2">
						<p className="font-heading text-2xl italic text-dx-terre-clair first-letter:uppercase">{jourSemaine}</p>
						<p className="mt-1 text-sm text-dx-sable first-letter:uppercase">{mois}</p>
						<p className="dx-chiffre mt-3 text-4xl text-dx-creme">{timeString}</p>
					</div>
				</div>

				<div className="min-w-0 md:border-l md:border-dx-filet-nuit md:pl-10">
					<h3 className="font-heading text-[clamp(1.6rem,2.6vw,2.2rem)] font-light leading-tight tracking-[-0.025em] text-white">
						{appt.services?.name || 'Prestation sur-mesure'}
					</h3>
					{appt.professionals?.business_name && <p className="mt-1 text-dx-sable">Avec {appt.professionals.business_name}</p>}
					<dl className="mt-5 grid gap-2 text-sm text-dx-creme">
						<div className="flex items-center gap-2.5">
							<Clock size={15} className="text-dx-terre-clair" />
							<dt className="sr-only">Durée</dt>
							<dd>Durée estimée : {appt.services?.duration_minutes || 60} min</dd>
						</div>
						<div className="flex items-start gap-2.5">
							<MapPin size={15} className="mt-0.5 text-dx-terre-clair" />
							<dt className="sr-only">Adresse</dt>
							<dd>{adresse}</dd>
						</div>
					</dl>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-3 border-t border-dx-filet-nuit bg-dx-nuit-2 px-6 py-5 sm:px-9">
				{editingAppt ? (
					<div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
						<div className="flex w-full flex-col sm:w-auto">
							<label htmlFor="dx-nouvelle-date" className="mb-1.5 text-xs font-semibold text-dx-sable">Nouvelle date</label>
							<input
								id="dx-nouvelle-date"
								type="datetime-local"
								className="dx-champ !border-dx-filet-nuit !bg-dx-nuit !text-dx-creme [color-scheme:dark]"
								value={newDate}
								onChange={(e) => setNewDate(e.target.value)}
							/>
						</div>
						<div className="flex gap-2">
							<button type="button" onClick={saveDateChange} className="dx-btn">
								Enregistrer
							</button>
							<button type="button" onClick={() => setEditingAppt(null)} className="dx-btn dx-btn--fantome !text-dx-sable hover:!bg-white/10 hover:!text-white">
								Annuler
							</button>
						</div>
					</div>
				) : (
					<>
						<button
							type="button"
							onClick={() => {
								const localStr = new Date(startDate.getTime() - (startDate.getTimezoneOffset() * 60000)).toISOString().slice(0,16);
								setNewDate(localStr);
								setEditingAppt(appt);
							}}
							className="dx-btn dx-btn--clair"
						>
							<Edit2 size={15} />
							Modifier la date
						</button>
						{appt.professionals?.address && (
							<a
								href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(appt.professionals.address)}`}
								target="_blank"
								rel="noopener noreferrer"
								className="dx-btn dx-btn--fantome !text-dx-creme hover:!bg-white/10"
							>
								<Navigation size={15} />
								Itinéraire
							</a>
						)}
						{(appt.status === 'pending' || appt.status === 'confirmed') && (
							<button
								type="button"
								onClick={() => setAAnnuler(appt)}
								className="dx-btn dx-btn--fantome ml-auto !text-dx-sable hover:!bg-white/10 hover:!text-white"
							>
								Annuler le RDV
							</button>
						)}
					</>
				)}
			</div>

			<Fenetre
				ouvert={!!aAnnuler}
				onClose={() => !annulation && setAAnnuler(null)}
				icone={<CalendarX size={18} />}
				titre="Annuler ce rendez-vous ?"
				sousTitre={
					aAnnuler
						? `${aAnnuler.services?.name || 'Prestation'}, ${new Date(aAnnuler.start_time).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.`
						: undefined
				}
				pied={
					<>
						<button type="button" onClick={() => setAAnnuler(null)} disabled={annulation} className="dx-btn dx-btn--ligne">
							Garder le rendez-vous
						</button>
						<button type="button" onClick={annulerRdv} disabled={annulation} className="dx-btn dx-btn--danger">
							{annulation ? 'Annulation…' : 'Annuler le rendez-vous'}
						</button>
					</>
				}
			>
				<p className="text-sm text-dx-encre-2">Le créneau sera libéré pour d'autres clients. Cette action ne peut pas être défaite.</p>
			</Fenetre>
		</motion.section>
	);
}
