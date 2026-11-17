import { useEffect, useState, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import {
	getClientNote,
	getAllClients,
	upsertClientNote,
	getAppointmentsForClient,
	getPrimaryProfessional,
	getProfessionalByUserId,
	getDemoTag,
	updateClient,
	type Client,
	type Appointment,
	type Professional
} from '@/lib/queries';
import { DEMO_DIAMANT_CLIENTS } from '@/lib/diamantDemoData';
import { isRoleReadOnly } from '@/lib/permissions';
import MessageThread from '@/components/diamant/ui/DiamantMessageThread';
import { Phone, Mail, Calendar, MessageSquare, Search, ExternalLink, FileText, Pencil, Check, ChevronRight, Clock } from 'lucide-react';
import { MAX_NAME_LENGTH } from '@/lib/limits';
import { Avatar, EASE, EnChargement, EtatVide, Fenetre, Panneau, Pastille, PastilleStatut, Squelette } from './kit/primitives';
import { avertirLectureSeule, confirmer, signalerErreur } from './kit/notifier';
import { publierClients } from './kit/indexClients';

function ClientNoteCard({ professionalId, client }: { professionalId: string; client: Client }) {
	const [note, setNote] = useState('');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		setLoading(true);
		getClientNote(professionalId, client.id)
			.then((existing) => setNote(existing?.note ?? ''))
			.finally(() => setLoading(false));
	}, [professionalId, client.id]);

	async function handleSave() {
		if (isRoleReadOnly()) {
			avertirLectureSeule("Action désactivée en mode Démo : Ce rôle est réservé à la présentation commerciale en lecture seule.");
			return;
		}
		setSaving(true);
		try {
			await upsertClientNote(professionalId, client.id, note);
			confirmer('Note enregistrée avec succès.');
		} catch (err) {
			signalerErreur(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
		} finally {
			setSaving(false);
		}
	}

	return (
		<section className="dx-carte dx-carte--plate p-5">
			<div className="flex items-center gap-2">
				<FileText size={16} className="text-dx-terre" />
				<h3 className="dx-h3">Note privée & Fiche technique</h3>
			</div>
			<p className="mt-1 text-xs text-dx-gris">
				Visible uniquement par vous — préférences, formules de coloration, sensibilités, allergies...
			</p>
			<label htmlFor={`note-${client.id}`} className="sr-only">Note privée</label>
			{loading ? (
				<Squelette className="mt-3 h-[88px] w-full !rounded-[10px]" />
			) : (
				<textarea
					id={`note-${client.id}`}
					rows={3}
					value={note}
					onChange={(e) => setNote(e.target.value)}
					placeholder="Ex : coloration 7.1 + 20vol, préfère le thé vert, allergie au latex..."
					className="dx-champ mt-3"
				/>
			)}
			<div className="mt-3 flex items-center justify-end">
				<button
					type="button"
					onClick={handleSave}
					disabled={saving || loading}
					className="dx-btn dx-btn--sm dx-btn--encre"
				>
					{saving ? 'Enregistrement...' : 'Enregistrer la note'}
				</button>
			</div>
		</section>
	);
}

function ClientAppointments({ clientId }: { clientId: string }) {
	const [appointments, setAppointments] = useState<(Appointment & { services: { name: string } | null })[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		setLoading(true);
		getAppointmentsForClient(clientId)
			.then(setAppointments)
			.finally(() => setLoading(false));
	}, [clientId]);

	if (loading) {
		return (
			<EnChargement label="Chargement des rendez-vous…" className="space-y-2">
				<Squelette className="h-12 w-full" />
				<Squelette className="h-12 w-full" />
			</EnChargement>
		);
	}
	if (appointments.length === 0) {
		return (
			<div className="rounded-xl border border-dashed border-dx-filet-fort px-4 py-6 text-center text-sm text-dx-gris">
				Aucun rendez-vous enregistré pour ce client pour le moment.
			</div>
		);
	}

	return (
		<ol className="divide-y divide-dx-filet overflow-hidden rounded-xl border border-dx-filet bg-dx-carte">
			{appointments.map((apt) => {
				const d = new Date(apt.start_time);
				return (
					<li key={apt.id} className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 px-4 py-3">
						<div className="text-center leading-none">
							<p className="dx-chiffre text-2xl text-dx-encre">{d.getDate()}</p>
							<p className="mt-1 text-[0.6875rem] text-dx-gris">{d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}</p>
						</div>
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold text-dx-encre">{apt.services?.name ?? '—'}</p>
							<p className="dx-tabulaire text-xs text-dx-gris">
								{d.toLocaleString('fr-FR', {
									day: '2-digit',
									month: 'short',
									year: 'numeric',
									hour: '2-digit',
									minute: '2-digit'
								})}
							</p>
						</div>
						<PastilleStatut statut={apt.status} />
					</li>
				);
			})}
		</ol>
	);
}

export default function ClientsPanel() {
	const [professional, setProfessional] = useState<Professional | null>(null);
	const [clients, setClients] = useState<Client[]>([]);
	const [selectedClient, setSelectedClient] = useState<Client | null>(null);
	const [ficheOuverte, setFicheOuverte] = useState(false);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [basePath, setBasePath] = useState('/demo-diamant');
	const reduit = useReducedMotion();

	// Modal d'édition des infos client
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [editFullName, setEditFullName] = useState('');
	const [editPhone, setEditPhone] = useState('');
	const [editEmail, setEditEmail] = useState('');
	const [isSavingClient, setIsSavingClient] = useState(false);

	function handleOpenEdit(client: Client) {
		setEditFullName(client.full_name || '');
		setEditPhone(client.phone || '');
		setEditEmail(client.email || '');
		setIsEditModalOpen(true);
	}

	async function handleSaveEdit(e: React.FormEvent) {
		e.preventDefault();
		if (isRoleReadOnly()) {
			avertirLectureSeule("Action désactivée en mode Démo : Ce rôle est réservé à la présentation commerciale en lecture seule.");
			return;
		}
		if (!selectedClient) return;
		setIsSavingClient(true);
		try {
			const updated = await updateClient(selectedClient.id, {
				full_name: editFullName.trim(),
				phone: editPhone.trim() || null,
				email: editEmail.trim() || null
			});

			setSelectedClient(prev => prev ? { ...prev, ...updated } : null);
			setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...c, ...updated } : c));
			setIsEditModalOpen(false);
			confirmer(`Fiche de ${editFullName.trim() || 'ce client'} mise à jour avec succès.`);
		} catch (err) {
			console.error('Error updating client in ClientsPanel:', err);
			signalerErreur("Erreur lors de la mise à jour des coordonnées.");
		} finally {
			setIsSavingClient(false);
		}
	}

	useEffect(() => {
		let isMounted = true;
		setBasePath(window.location.pathname.match(/^\/(demo-[^/]+)/)?.[0] || '/demo-diamant');

		async function loadData() {
			try {
				setLoading(true);
				const tag = getDemoTag();

				// 1. Récupérer le professionnel sans forcer une redirection
				let pro: Professional | null = null;
				try {
					const session = await getSession();
					if (session?.user) {
						pro = await getProfessionalByUserId(session.user.id, tag);
					}
				} catch (e) {}

				if (!pro) {
					try {
						pro = await getPrimaryProfessional(tag);
					} catch (e) {
						console.warn('Could not load primary professional:', e);
					}
				}

				if (isMounted) setProfessional(pro);

				const effectiveProId = pro?.id || 'eff1f7ef-33ee-49a2-9e4f-52ab675a4dc7';

				// 2. Charger l'ensemble complet des clients (BDD + RDV + messages + démo)
				const extra = tag === 'diamant' ? DEMO_DIAMANT_CLIENTS : [];
				const allClients = await getAllClients(effectiveProId, tag, extra);

				if (isMounted) {
					setClients(allClients);
					publierClients(allClients);

					// Présélectionner le client passé en paramètre URL ?clientId=... (fiche ouverte)
					const params = new URLSearchParams(window.location.search);
					const targetId = params.get('clientId');
					if (targetId) {
						const found = allClients.find(c => c.id === targetId);
						if (found) {
							setSelectedClient(found);
							setFicheOuverte(true);
						} else if (allClients.length > 0) {
							setSelectedClient(allClients[0]);
						}
					} else if (allClients.length > 0) {
						setSelectedClient(allClients[0]);
					}
				}
			} catch (e) {
				console.error('Error loading clients in ClientsPanel:', e);
			} finally {
				if (isMounted) setLoading(false);
			}
		}

		loadData();

		const onClientUpdated = (e: any) => {
			const upd = e.detail?.client;
			if (upd && isMounted) {
				setClients(prev => prev.map(c => c.id === upd.id ? { ...c, ...upd } : c));
				setSelectedClient(prev => prev && prev.id === upd.id ? { ...prev, ...upd } : prev);
			}
		};

		window.addEventListener('diamant:client-updated', onClientUpdated);

		return () => {
			isMounted = false;
			window.removeEventListener('diamant:client-updated', onClientUpdated);
		};
	}, []);

	// Filtrage des clients par recherche
	const filteredClients = useMemo(() => {
		if (!searchQuery.trim()) return clients;
		const q = searchQuery.toLowerCase().trim();
		return clients.filter(c =>
			(c.full_name && c.full_name.toLowerCase().includes(q)) ||
			(c.phone && c.phone.includes(q)) ||
			(c.email && c.email.toLowerCase().includes(q))
		);
	}, [clients, searchQuery]);

	function ouvrirFiche(client: Client) {
		setSelectedClient(client);
		setFicheOuverte(true);
	}

	const inscrit = (c: Client) =>
		new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

	if (loading) {
		return (
			<EnChargement label="Chargement de la clientèle…" className="space-y-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<Squelette className="h-11 w-full max-w-md !rounded-full" />
					<Squelette className="h-4 w-40" />
				</div>
				<div className="dx-carte divide-y divide-dx-filet overflow-hidden">
					{[0, 1, 2, 3, 4, 5].map((i) => (
						<div key={i} className="flex items-center gap-4 px-5 py-4">
							<Squelette className="h-9 w-9 !rounded-full" />
							<Squelette className="h-4 w-44" />
							<Squelette className="ml-auto hidden h-4 w-32 sm:block" />
							<Squelette className="hidden h-4 w-48 md:block" />
						</div>
					))}
				</div>
			</EnChargement>
		);
	}

	return (
		<div>
			<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="dx-recherche w-full max-w-md">
					<Search size={16} />
					<input
						type="search"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Rechercher par nom, tél, email..."
						aria-label="Rechercher un client"
						className="dx-champ"
					/>
				</div>
				<p className="dx-meta" aria-live="polite">
					<span className="dx-tabulaire font-semibold text-dx-encre">{filteredClients.length}</span> client{filteredClients.length > 1 ? 's' : ''} trouvé{filteredClients.length > 1 ? 's' : ''}
					{searchQuery.trim() ? '' : ` · Consultez l'historique de vos ${clients.length} clients, leurs coordonnées et vos échanges.`}
				</p>
			</div>

			<div className="dx-carte overflow-hidden">
				{filteredClients.length === 0 ? (
					<EtatVide
						dessin="clients"
						titre="Aucun client ne correspond à votre recherche."
						action={searchQuery ? <button type="button" onClick={() => setSearchQuery('')} className="dx-btn dx-btn--sm dx-btn--ligne">Effacer la recherche</button> : undefined}
					/>
				) : (
					<>
						<table className="dx-table hidden md:table">
							<thead>
								<tr>
									<th>Client</th>
									<th>Téléphone</th>
									<th>Email</th>
									<th className="hidden lg:table-cell">Inscrit le</th>
									<th className="w-10"><span className="sr-only">Ouvrir</span></th>
								</tr>
							</thead>
							<tbody>
								{filteredClients.map((client, i) => {
									const actif = ficheOuverte && selectedClient?.id === client.id;
									return (
										<motion.tr
											key={client.id}
											data-actif={actif}
											onClick={() => ouvrirFiche(client)}
											className="dx-ligne-cliquable group"
											initial={reduit ? false : { opacity: 0 }}
											animate={{ opacity: 1 }}
											transition={{ duration: 0.35, ease: EASE, delay: Math.min(i * 0.025, 0.35) }}
										>
											<td>
												<div className="flex items-center gap-3">
													<Avatar nom={client.full_name || 'Client'} url={client.avatar_url} taille={34} ton={actif ? 'terre' : undefined} />
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															ouvrirFiche(client);
														}}
														className="truncate text-left font-semibold text-dx-encre group-hover:text-dx-terre"
													>
														{client.full_name || 'Client'}
													</button>
												</div>
											</td>
											<td className="dx-tabulaire whitespace-nowrap">{client.phone || <span className="text-dx-sable">—</span>}</td>
											<td className="max-w-[16rem] truncate">{client.email || <span className="text-dx-sable">—</span>}</td>
											<td className="hidden whitespace-nowrap text-dx-gris lg:table-cell">{new Date(client.created_at).toLocaleDateString('fr-FR')}</td>
											<td className="text-right text-dx-sable group-hover:text-dx-terre"><ChevronRight size={16} /></td>
										</motion.tr>
									);
								})}
							</tbody>
						</table>

						<ul className="divide-y divide-dx-filet md:hidden">
							{filteredClients.map((client) => (
								<li key={client.id}>
									<button type="button" onClick={() => ouvrirFiche(client)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
										<Avatar nom={client.full_name || 'Client'} url={client.avatar_url} taille={38} />
										<span className="min-w-0 flex-1">
											<span className="block truncate font-semibold text-dx-encre">{client.full_name || 'Client'}</span>
											<span className="block truncate text-sm text-dx-gris">{client.phone || client.email || 'Client enregistré'}</span>
										</span>
										<ChevronRight size={16} className="text-dx-sable" />
									</button>
								</li>
							))}
						</ul>
					</>
				)}
			</div>

			{/* Fiche détaillée du client sélectionné : panneau latéral */}
			<Panneau
				ouvert={ficheOuverte && !!selectedClient}
				onClose={() => setFicheOuverte(false)}
				largeur={620}
				entete={
					selectedClient && (
						<div className="mb-3 flex items-center gap-3">
							<Avatar nom={selectedClient.full_name || 'Client'} url={selectedClient.avatar_url} taille={52} ton="encre" />
							<div>
								<Pastille ton="terre" nu>Client Privilégié</Pastille>
								<p className="mt-1 flex items-center gap-1.5 text-xs text-dx-gris">
									<Calendar size={12} /> Inscrit le {inscrit(selectedClient)}
								</p>
							</div>
						</div>
					)
				}
				titre={selectedClient?.full_name || 'Client'}
			>
				{selectedClient && professional ? (
					<div className="space-y-7">
						{/* Actions : Modifier informations & ouvrir messagerie */}
						<div className="flex flex-wrap gap-2">
							<button
								type="button"
								onClick={() => handleOpenEdit(selectedClient)}
								className="dx-btn dx-btn--sm dx-btn--ligne"
								title="Modifier les coordonnées du client"
							>
								<Pencil size={14} />
								<span>Modifier la fiche</span>
							</button>
							<a
								href={`${basePath}/dashboard/messages?clientId=${encodeURIComponent(selectedClient.id)}`}
								className="dx-btn dx-btn--sm"
							>
								<MessageSquare size={14} />
								<span>Ouvrir dans la messagerie</span>
								<ExternalLink size={12} />
							</a>
						</div>

						{/* Coordonnées */}
						<dl className="grid grid-cols-1 divide-y divide-dx-filet rounded-xl border border-dx-filet bg-dx-carte sm:grid-cols-2 sm:divide-x sm:divide-y-0">
							<div className="flex items-center gap-3 p-4">
								<Phone size={17} className="flex-none text-dx-terre" />
								<div className="min-w-0">
									<dt className="text-xs text-dx-gris">Téléphone</dt>
									<dd>
										{selectedClient.phone ? (
											<a href={`tel:${selectedClient.phone}`} className="dx-tabulaire block truncate font-semibold text-dx-encre hover:text-dx-terre">
												{selectedClient.phone}
											</a>
										) : (
											<span className="text-sm italic text-dx-gris">Non renseigné</span>
										)}
									</dd>
								</div>
							</div>
							<div className="flex items-center gap-3 p-4">
								<Mail size={17} className="flex-none text-dx-terre" />
								<div className="min-w-0">
									<dt className="text-xs text-dx-gris">Email</dt>
									<dd>
										{selectedClient.email ? (
											<a href={`mailto:${selectedClient.email}`} className="block truncate font-semibold text-dx-encre hover:text-dx-terre">
												{selectedClient.email}
											</a>
										) : (
											<span className="text-sm italic text-dx-gris">Non renseigné</span>
										)}
									</dd>
								</div>
							</div>
						</dl>

						{/* Note privée */}
						<ClientNoteCard professionalId={professional.id} client={selectedClient} />

						{/* Historique des rendez-vous */}
						<section>
							<h3 className="dx-h3 mb-3 flex items-center gap-2">
								<Clock size={16} className="text-dx-terre" />
								<span>Historique des réservations</span>
							</h3>
							<ClientAppointments clientId={selectedClient.id} />
						</section>

						{/* Messagerie directe */}
						<section>
							<div className="mb-3 flex items-center justify-between gap-3">
								<h3 className="dx-h3 flex items-center gap-2">
									<MessageSquare size={16} className="text-dx-terre" />
									<span>Fil de discussion direct</span>
								</h3>
								<a href={`${basePath}/dashboard/messages?clientId=${encodeURIComponent(selectedClient.id)}`} className="dx-lien !text-xs">
									<span>Mode plein écran</span>
									<ExternalLink size={12} />
								</a>
							</div>
							<MessageThread professionalId={professional.id} clientId={selectedClient.id} role="professional" />
						</section>
					</div>
				) : (
					<EtatVide
						dessin="clients"
						titre="Sélectionnez un client"
						texte="Cliquez sur un client dans la liste pour consulter sa fiche détaillée, son historique et lui envoyer un message."
					/>
				)}
			</Panneau>

			{/* Fenêtre d'édition des coordonnées client */}
			<Fenetre
				ouvert={isEditModalOpen && !!selectedClient}
				onClose={() => setIsEditModalOpen(false)}
				icone={<Pencil size={17} />}
				titre="Modifier la fiche client"
				sousTitre="Mise à jour des coordonnées par le professionnel"
				fermerSurVoile={false}
			>
				<form onSubmit={handleSaveEdit} className="space-y-4">
					<div>
						<label htmlFor="client-edit-nom" className="dx-champ-label">Nom complet *</label>
						<input
							id="client-edit-nom"
							type="text"
							required
							value={editFullName}
							maxLength={MAX_NAME_LENGTH}
							onChange={e => setEditFullName(e.target.value)}
							placeholder="Ex : Sophie Martin"
							className="dx-champ"
							data-autofocus
						/>
					</div>
					<div>
						<label htmlFor="client-edit-tel" className="dx-champ-label">Numéro de téléphone</label>
						<input
							id="client-edit-tel"
							type="tel"
							value={editPhone}
							onChange={e => setEditPhone(e.target.value)}
							placeholder="Ex : 06 12 34 56 78"
							className="dx-champ"
						/>
					</div>
					<div>
						<label htmlFor="client-edit-email" className="dx-champ-label">Adresse Email</label>
						<input
							id="client-edit-email"
							type="email"
							value={editEmail}
							onChange={e => setEditEmail(e.target.value)}
							placeholder="Ex : sophie.martin@email.com"
							className="dx-champ"
						/>
					</div>
					<div className="flex items-center justify-end gap-2 pt-2">
						<button type="button" onClick={() => setIsEditModalOpen(false)} className="dx-btn dx-btn--ligne">
							Annuler
						</button>
						<button type="submit" disabled={isSavingClient} className="dx-btn">
							{isSavingClient ? (
								<span>Enregistrement...</span>
							) : (
								<>
									<Check size={15} />
									<span>Enregistrer</span>
								</>
							)}
						</button>
					</div>
				</form>
			</Fenetre>
		</div>
	);
}
