import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { EASE, EnChargement, EtatVide, Pastille, Squelette } from './kit/primitives';

interface RecentAppt {
	id: string;
	serviceName: string;
	stylistName: string;
	formattedDate: string;
	timeString: string;
	durationString: string;
	price: number;
	status: 'completed' | 'cancelled' | 'pending';
}

export default function DiamantClientRecentHistory() {
	const [pastAppointments, setPastAppointments] = useState<RecentAppt[]>([]);
	const [loading, setLoading] = useState(true);
	const reduit = useReducedMotion();

	useEffect(() => {
		async function fetchRecentHistory() {
			try {
				const { data: { session } } = await supabase.auth.getSession();
				if (!session?.user) {
					setLoading(false);
					return;
				}

				const { data, error } = await supabase
					.from('appointments')
					.select('id, start_time, status, services(name, duration_minutes, price), professionals(business_name)')
					.eq('client_id', session.user.id)
					.lt('start_time', new Date().toISOString())
					.order('start_time', { ascending: false })
					.limit(5);

				if (!error && data) {
					const mapped: RecentAppt[] = data.map((appt: any) => {
						const dateObj = new Date(appt.start_time);
						const formattedDate = dateObj.toLocaleDateString('fr-FR', {
							weekday: 'long',
							day: 'numeric',
							month: 'long',
							year: 'numeric'
						});
						const timeString = dateObj.toLocaleTimeString('fr-FR', {
							hour: '2-digit',
							minute: '2-digit'
						});

						return {
							id: appt.id,
							serviceName: appt.services?.name || 'Prestation Personnalisée',
							stylistName: appt.professionals?.business_name || 'Diamant Prestige',
							formattedDate: formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1),
							timeString,
							durationString: appt.services?.duration_minutes ? `${appt.services.duration_minutes} min` : '45 min',
							price: appt.services?.price || 0,
							status: appt.status === 'cancelled' ? 'cancelled' : 'completed'
						};
					});

					setPastAppointments(mapped);
				}
			} catch (e) {
				console.error('Erreur chargement historique récent:', e);
			} finally {
				setLoading(false);
			}
		}

		fetchRecentHistory();
	}, []);

	if (loading) {
		return (
			<EnChargement label="Chargement de votre historique récent..." className="space-y-3">
				<Squelette className="h-6 w-48" />
				<Squelette className="h-20 w-full !rounded-[14px]" />
				<Squelette className="h-20 w-full !rounded-[14px]" />
			</EnChargement>
		);
	}

	return (
		<section aria-labelledby="dx-historique-recent">
			<div className="mb-5 flex flex-wrap items-end justify-between gap-3">
				<div>
					<h2 id="dx-historique-recent" className="dx-h2">Historique Récent</h2>
					<p className="dx-meta mt-1">Dernières prestations réalisées auprès de notre établissement</p>
				</div>
				{pastAppointments.length > 0 && (
					<a href="/demo-diamant/espace-client/historique" className="dx-lien">
						<span>Voir tout l'historique</span>
						<ArrowRight size={14} />
					</a>
				)}
			</div>

			{pastAppointments.length === 0 ? (
				<div className="dx-carte">
					<EtatVide
						dessin="ciseaux"
						titre="Aucun historique de rendez-vous pour le moment."
						texte="Vos prestations passées s'afficheront ici au fur et à mesure de vos visites."
					/>
				</div>
			) : (
				<ol className="dx-frise space-y-3">
					{pastAppointments.map((appt, i) => (
						<motion.li
							key={appt.id}
							initial={reduit ? false : { opacity: 0, x: -8 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.5, ease: EASE, delay: 0.1 + i * 0.07 }}
							className="relative"
						>
							<span className="dx-frise__point" data-ton={appt.status === 'cancelled' ? 'annule' : undefined} aria-hidden="true" />
							<div className="dx-carte dx-carte--plate flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
								<div className="min-w-0">
									<div className="flex flex-wrap items-center gap-2">
										<p className="dx-h3">{appt.serviceName}</p>
										{appt.status === 'completed' ? (
											<Pastille ton="ok">Réalisé</Pastille>
										) : (
											<Pastille ton="neutre">Annulé</Pastille>
										)}
									</div>
									<p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-dx-gris">
										<span className="font-medium text-dx-encre-2">{appt.formattedDate} à {appt.timeString}</span>
										<span aria-hidden="true">·</span>
										<span>{appt.durationString}</span>
										{appt.price > 0 && (
											<>
												<span aria-hidden="true">·</span>
												<span className="dx-tabulaire font-semibold text-dx-encre">{appt.price} €</span>
											</>
										)}
									</p>
								</div>

								<a
									href={`/demo-diamant/reservation?service=${encodeURIComponent(appt.serviceName)}`}
									className="dx-btn dx-btn--sm dx-btn--ligne self-start sm:self-auto"
								>
									<RotateCcw size={13} />
									<span>Reprendre</span>
								</a>
							</div>
						</motion.li>
					))}
				</ol>
			)}
		</section>
	);
}
