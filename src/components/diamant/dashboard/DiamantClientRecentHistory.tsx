import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Clock, Scissors, ArrowRight, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';

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
			<div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-xs text-stone-400">
				Chargement de votre historique récent...
			</div>
		);
	}

	return (
		<div className="rounded-2xl border border-stone-200 bg-white p-6 md:p-7 shadow-xs">
			<div className="flex items-center justify-between mb-6 pb-3 border-b border-stone-100">
				<div>
					<h2 className="text-xl font-bold text-stone-900 tracking-tight">Historique Récent</h2>
					<p className="text-xs text-stone-400 mt-0.5">Dernières prestations réalisées auprès de notre établissement</p>
				</div>
				{pastAppointments.length > 0 && (
					<a 
						href="/demo-diamant/espace-client/historique" 
						className="text-xs font-bold text-deep-teal-600 hover:text-deep-teal-700 hover:underline flex items-center gap-1 cursor-pointer"
					>
						<span>Voir tout l'historique</span>
						<ArrowRight size={13} />
					</a>
				)}
			</div>
			
			{pastAppointments.length === 0 ? (
				<div className="py-8 text-center text-stone-400 space-y-3">
					<div className="w-12 h-12 rounded-2xl bg-stone-50 border border-stone-200/80 text-stone-400 flex items-center justify-center mx-auto">
						<Clock size={20} />
					</div>
					<p className="text-sm font-medium text-stone-600">Aucun historique de rendez-vous pour le moment.</p>
					<p className="text-xs text-stone-400 max-w-sm mx-auto">
						Vos prestations passées s'afficheront ici au fur et à mesure de vos visites chez Diamant Prestige.
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{pastAppointments.map((appt) => (
						<div 
							key={appt.id} 
							className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-stone-100 bg-stone-50/60 hover:bg-white hover:border-stone-200 hover:shadow-2xs transition-all gap-4"
						>
							<div className="flex items-start sm:items-center gap-3.5">
								<div className="w-11 h-11 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-deep-teal-700 shrink-0 shadow-2xs">
									<Scissors size={18} />
								</div>
								<div>
									<div className="flex items-center gap-2">
										<p className="text-stone-900 font-bold text-sm">{appt.serviceName}</p>
										{appt.status === 'completed' ? (
											<span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
												<CheckCircle2 size={10} />
												<span>Réalisé</span>
											</span>
										) : (
											<span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
												<XCircle size={10} />
												<span>Annulé</span>
											</span>
										)}
									</div>
									<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 mt-1">
										<span className="font-medium text-stone-700">{appt.formattedDate} à {appt.timeString}</span>
										<span>•</span>
										<span>{appt.durationString}</span>
										{appt.price > 0 && (
											<>
												<span>•</span>
												<span className="font-bold text-stone-900">{appt.price} €</span>
											</>
										)}
									</div>
								</div>
							</div>

							<a 
								href={`/demo-diamant/reservation?service=${encodeURIComponent(appt.serviceName)}`}
								className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 bg-white text-deep-teal-700 hover:bg-deep-teal-50 hover:border-deep-teal-300 text-xs font-bold uppercase tracking-wider transition-all shadow-2xs cursor-pointer self-start sm:self-auto shrink-0"
							>
								<RotateCcw size={13} />
								<span>Reprendre</span>
							</a>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
