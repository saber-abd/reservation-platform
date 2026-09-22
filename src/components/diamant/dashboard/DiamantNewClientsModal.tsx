import React from 'react';
import { X, Users, Calendar, ArrowRight, Phone, Mail } from 'lucide-react';

export interface PeriodClientDetail {
	id: string;
	name: string;
	email: string;
	phone?: string;
	date: string;
	serviceName: string;
	price: number;
}

interface Props {
	isOpen: boolean;
	onClose: () => void;
	clients: PeriodClientDetail[];
	rangeLabel: string;
}

export default function DiamantNewClientsModal({ isOpen, onClose, clients, rangeLabel }: Props) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
			<div 
				className="relative w-full max-w-2xl bg-white rounded-3xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Modal Header */}
				<div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
					<div className="flex items-center gap-3">
						<div className="w-11 h-11 rounded-2xl bg-deep-teal-50 border border-deep-teal-100 flex items-center justify-center text-deep-teal-600">
							<Users size={20} />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h3 className="text-lg font-bold text-stone-900">Nouveaux Clients</h3>
								<span className="text-xs bg-deep-teal-100/80 text-deep-teal-700 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
									{rangeLabel}
								</span>
							</div>
							<p className="text-xs text-stone-500 mt-0.5">
								{clients.length} client{clients.length > 1 ? 's ont' : ' a'} réservé une prestation sur cette période.
							</p>
						</div>
					</div>

					<button
						onClick={onClose}
						className="w-9 h-9 rounded-xl border border-stone-200 bg-white text-stone-400 hover:text-stone-700 hover:bg-stone-100 flex items-center justify-center transition-colors"
						aria-label="Fermer"
					>
						<X size={18} />
					</button>
				</div>

				{/* Modal Body: Client List */}
				<div className="flex-1 overflow-y-auto p-6 space-y-3 divide-y divide-stone-100">
					{clients.length === 0 ? (
						<div className="py-12 text-center">
							<p className="text-stone-400 text-sm font-medium">Aucun client enregistré sur cette période.</p>
						</div>
					) : (
						clients.map((client, idx) => (
							<div key={client.id || idx} className={`pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-2xl hover:bg-stone-50/80 transition-colors`}>
								<div className="flex items-center gap-3 min-w-0">
									<div className="w-10 h-10 rounded-full bg-gradient-to-br from-deep-teal-400 to-deep-teal-600 text-white font-bold flex items-center justify-center shrink-0 text-sm shadow-sm">
										{client.name ? client.name.charAt(0).toUpperCase() : 'C'}
									</div>
									<div className="min-w-0">
										<p className="text-sm font-bold text-stone-900 truncate">{client.name}</p>
										<div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs text-stone-500">
											{client.email && (
												<span className="flex items-center gap-1 truncate">
													<Mail size={12} className="text-stone-400 shrink-0" />
													{client.email}
												</span>
											)}
											{client.phone && (
												<span className="flex items-center gap-1">
													<Phone size={12} className="text-stone-400 shrink-0" />
													{client.phone}
												</span>
											)}
										</div>
									</div>
								</div>

								<div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-13 sm:pl-0">
									<div className="text-left sm:text-right">
										<p className="text-xs font-bold text-stone-800">{client.serviceName}</p>
										<p className="text-[11px] text-stone-400 flex items-center gap-1 sm:justify-end mt-0.5">
											<Calendar size={11} />
											{new Date(client.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
											<span className="font-bold text-deep-teal-600 ml-1">{client.price}€</span>
										</p>
									</div>

									<a
										href={`/demo-diamant/dashboard/clients?clientId=${encodeURIComponent(client.id)}`}
										className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:border-deep-teal-300 hover:text-deep-teal-600 hover:bg-deep-teal-50 text-xs font-bold text-stone-600 transition-colors shadow-2xs"
										title="Voir la fiche client"
									>
										<span>Fiche</span>
										<ArrowRight size={12} />
									</a>
								</div>
							</div>
						))
					)}
				</div>

				{/* Modal Footer */}
				<div className="p-4 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between">
					<span className="text-xs text-stone-400">Cliquez sur « Fiche » pour consulter l'historique complet</span>
					<button
						onClick={onClose}
						className="px-5 py-2 rounded-xl bg-stone-200 text-stone-700 hover:bg-stone-300 font-bold text-xs uppercase tracking-wider transition-colors"
					>
						Fermer
					</button>
				</div>
			</div>
		</div>
	);
}
