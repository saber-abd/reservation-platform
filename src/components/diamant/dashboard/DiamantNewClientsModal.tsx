import React from 'react';
import { ArrowRight, Calendar, Phone, Mail, Users } from 'lucide-react';
import { Avatar, EtatVide, Fenetre, Pastille } from './kit/primitives';

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
	return (
		<Fenetre
			ouvert={isOpen}
			onClose={onClose}
			largeur={680}
			icone={<Users size={18} />}
			titre={
				<span className="flex flex-wrap items-center gap-2">
					Nouveaux Clients <Pastille ton="terre" nu>{rangeLabel}</Pastille>
				</span>
			}
			sousTitre={`${clients.length} client${clients.length > 1 ? 's ont' : ' a'} réservé une prestation sur cette période.`}
			pied={
				<>
					<span className="mr-auto self-center text-xs text-dx-gris">Cliquez sur « Fiche » pour consulter l'historique complet</span>
					<button type="button" onClick={onClose} className="dx-btn dx-btn--sm dx-btn--ligne">
						Fermer
					</button>
				</>
			}
		>
			{clients.length === 0 ? (
				<EtatVide dessin="clients" titre="Aucun client enregistré sur cette période." />
			) : (
				<ul className="-mx-2 divide-y divide-dx-filet">
					{clients.map((client, idx) => (
						<li key={client.id || idx} className="flex flex-col gap-3 rounded-xl px-2 py-3.5 transition-colors hover:bg-dx-ivoire sm:flex-row sm:items-center sm:justify-between">
							<div className="flex min-w-0 items-center gap-3">
								<Avatar nom={client.name || 'C'} taille={40} ton="terre" />
								<div className="min-w-0">
									<p className="truncate font-semibold text-dx-encre">{client.name}</p>
									<div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-dx-gris">
										{client.email && (
											<span className="flex items-center gap-1 truncate">
												<Mail size={12} className="shrink-0" />
												{client.email}
											</span>
										)}
										{client.phone && (
											<span className="flex items-center gap-1">
												<Phone size={12} className="shrink-0" />
												{client.phone}
											</span>
										)}
									</div>
								</div>
							</div>

							<div className="flex shrink-0 items-center justify-between gap-4 pl-[52px] sm:justify-end sm:pl-0">
								<div className="text-left sm:text-right">
									<p className="text-sm font-medium text-dx-encre">{client.serviceName}</p>
									<p className="mt-0.5 flex items-center gap-1 text-xs text-dx-gris sm:justify-end">
										<Calendar size={11} />
										{new Date(client.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
										<span className="dx-tabulaire ml-1 font-semibold text-dx-terre">{client.price}€</span>
									</p>
								</div>

								<a
									href={`/demo-diamant/dashboard/clients?clientId=${encodeURIComponent(client.id)}`}
									className="dx-btn dx-btn--sm dx-btn--ligne"
									title="Voir la fiche client"
								>
									<span>Fiche</span>
									<ArrowRight size={13} />
								</a>
							</div>
						</li>
					))}
				</ul>
			)}
		</Fenetre>
	);
}
