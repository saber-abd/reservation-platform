import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
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
	type Professional,
} from '@/lib/queries';
import { isRoleReadOnly } from '@/lib/permissions';
import MessageThread from '@/components/premium/ui/PremiumMessageThread';
import { LECTURE_SEULE } from '@/components/premium/ui/PremiumToaster';
import { Phone, Mail, Search, Pencil, Check, ChevronRight, X } from 'lucide-react';
import { MAX_NAME_LENGTH } from '@/lib/limits';
import { EmptyState, PageHead, PageSkeleton, RowsSkeleton, StatusTag, type Statut } from './kit/Base';
import { SidePanel } from './kit/Interactive';

function Initiale({ client, size = 40 }: { client: Client; size?: number }) {
	const hasPhoto = client.avatar_url && client.avatar_url.startsWith('http');
	return (
		<span
			className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[2px] bg-pe-encre font-extrabold text-pe-blanc [font-stretch:115%]"
			style={{ width: size, height: size, fontSize: size * 0.42 }}
			aria-hidden="true"
		>
			{hasPhoto ? (
				<img src={client.avatar_url as string} alt="" className="h-full w-full object-cover" />
			) : (
				(client.full_name?.trim().charAt(0) || '?').toUpperCase()
			)}
		</span>
	);
}

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
			toast.error(LECTURE_SEULE);
			return;
		}
		setSaving(true);
		try {
			await upsertClientNote(professionalId, client.id, note);
			toast.success('Note enregistrée avec succès.');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
		} finally {
			setSaving(false);
		}
	}

	return (
		<section className="pe-card" aria-labelledby="note-titre">
			<div className="pe-card__tete">
				<h3 id="note-titre" className="pe-h2">Note privée & fiche technique</h3>
				<span className="pe-tech">Visible par vous seul</span>
			</div>
			<div className="pe-card__corps grid gap-3">
				<label htmlFor="note-client" className="text-sm text-pe-acier">
					Véhicule, préférences, points de vigilance, remarques d'atelier...
				</label>
				<textarea
					id="note-client"
					rows={3}
					value={note}
					disabled={loading}
					onChange={(e) => setNote(e.target.value)}
					placeholder="Ex : Clio 2019 diesel, pneus hiver à prévoir, préfère être rappelé après 18h..."
					className="pe-input"
				/>
				<div>
					<button type="button" onClick={handleSave} disabled={saving || loading} className="pe-btn pe-btn--encre pe-btn--sm">
						{saving ? 'Enregistrement…' : 'Enregistrer la note'}
					</button>
				</div>
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

	if (loading) return <RowsSkeleton rows={3} />;
	if (appointments.length === 0) {
		return <EmptyState kind="pont" title="Aucune intervention enregistrée pour ce client pour le moment." />;
	}

	return (
		<table className="pe-table">
			<thead>
				<tr>
					<th>Date & heure</th>
					<th>Prestation</th>
					<th className="!text-right">Statut</th>
				</tr>
			</thead>
			<tbody>
				{appointments.map((apt) => (
					<tr key={apt.id}>
						<td className="whitespace-nowrap font-semibold tabular-nums">
							{new Date(apt.start_time).toLocaleString('fr-FR', {
								day: '2-digit',
								month: 'short',
								year: 'numeric',
								hour: '2-digit',
								minute: '2-digit',
							})}
						</td>
						<td className="text-pe-acier">{apt.services?.name ?? '—'}</td>
						<td className="text-right">
							<StatusTag status={apt.status as Statut} />
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

export default function ClientsPanel() {
	const [professional, setProfessional] = useState<Professional | null>(null);
	const [clients, setClients] = useState<Client[]>([]);
	const [selectedClient, setSelectedClient] = useState<Client | null>(null);
	const [panelOpen, setPanelOpen] = useState(false);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');

	// Édition des coordonnées client (dans le panneau)
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
			toast.error(LECTURE_SEULE);
			return;
		}
		if (!selectedClient) return;
		setIsSavingClient(true);
		try {
			const updated = await updateClient(selectedClient.id, {
				full_name: editFullName.trim(),
				phone: editPhone.trim() || null,
				email: editEmail.trim() || null,
			});

			setSelectedClient((prev) => (prev ? { ...prev, ...updated } : null));
			setClients((prev) => prev.map((c) => (c.id === selectedClient.id ? { ...c, ...updated } : c)));
			setIsEditModalOpen(false);
			toast.success(`Fiche de ${editFullName.trim() || 'ce client'} mise à jour avec succès.`);
		} catch (err) {
			console.error('Error updating client in ClientsPanel:', err);
			toast.error('Erreur lors de la mise à jour des coordonnées.');
		} finally {
			setIsSavingClient(false);
		}
	}

	function openClient(client: Client) {
		setSelectedClient(client);
		setIsEditModalOpen(false);
		setPanelOpen(true);
	}

	useEffect(() => {
		let isMounted = true;

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
				const allClients = await getAllClients(effectiveProId, tag);

				if (isMounted) {
					setClients(allClients);

					// Présélectionner le client passé en paramètre URL ?clientId=... (sa fiche s'ouvre)
					const params = new URLSearchParams(window.location.search);
					const targetId = params.get('clientId');
					if (targetId) {
						const found = allClients.find((c) => c.id === targetId);
						if (found) {
							setSelectedClient(found);
							setPanelOpen(true);
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

		return () => {
			isMounted = false;
		};
	}, []);

	// Filtrage des clients par recherche
	const filteredClients = useMemo(() => {
		if (!searchQuery.trim()) return clients;
		const q = searchQuery.toLowerCase().trim();
		return clients.filter(
			(c) =>
				(c.full_name && c.full_name.toLowerCase().includes(q)) ||
				(c.phone && c.phone.includes(q)) ||
				(c.email && c.email.toLowerCase().includes(q)),
		);
	}, [clients, searchQuery]);

	if (loading) return <PageSkeleton cards={1} />;

	const inscrit = (c: Client) =>
		new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

	return (
		<div className="pe-entree">
			<PageHead
				title="Clientèle"
				sub={
					<>
						<strong>{clients.length} client{clients.length > 1 ? 's' : ''}</strong> : coordonnées, historique d'interventions et échanges directs. Cliquez
						sur une ligne pour ouvrir la fiche.
					</>
				}
			/>

			<section className="pe-card" aria-label="Annuaire des clients">
				<div className="flex flex-wrap items-center justify-between gap-3 border-b border-pe-filet p-3 md:px-[22px]">
					<div className="relative w-full max-w-md">
						<Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pe-acier" aria-hidden="true" />
						<input
							type="search"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Rechercher par nom, tél, email..."
							aria-label="Rechercher un client"
							className="pe-input !pl-9"
						/>
					</div>
					<span className="pe-tech" role="status">
						{filteredClients.length} client{filteredClients.length > 1 ? 's' : ''} trouvé{filteredClients.length > 1 ? 's' : ''}
					</span>
				</div>

				{filteredClients.length === 0 ? (
					<EmptyState
						kind="recherche"
						title="Aucun client ne correspond à votre recherche."
						action={
							searchQuery ? (
								<button type="button" className="pe-btn pe-btn--ligne pe-btn--sm" onClick={() => setSearchQuery('')}>
									Effacer la recherche
								</button>
							) : undefined
						}
					/>
				) : (
					<>
						{/* Bureau : tableau dense */}
						<table className="pe-table hidden md:table">
							<thead>
								<tr>
									<th>Client</th>
									<th>Téléphone</th>
									<th>Email</th>
									<th>Inscrit le</th>
									<th>
										<span className="sr-only">Ouvrir</span>
									</th>
								</tr>
							</thead>
							<tbody>
								{filteredClients.map((client) => (
									<tr
										key={client.id}
										data-clic
										onClick={() => openClient(client)}
										className={selectedClient?.id === client.id && panelOpen ? '!bg-white' : ''}
									>
										<td>
											<span className="flex items-center gap-3">
												<Initiale client={client} size={34} />
												<button
													type="button"
													className="pe-ligne-nom text-left"
													onClick={(e) => {
														e.stopPropagation();
														openClient(client);
													}}
												>
													{client.full_name || 'Client'}
												</button>
											</span>
										</td>
										<td className="whitespace-nowrap tabular-nums text-pe-acier">{client.phone || '—'}</td>
										<td className="max-w-[16rem] truncate text-pe-acier">{client.email || '—'}</td>
										<td className="whitespace-nowrap tabular-nums text-pe-acier">{inscrit(client)}</td>
										<td className="w-10 text-right text-pe-acier">
											<ChevronRight size={18} aria-hidden="true" />
										</td>
									</tr>
								))}
							</tbody>
						</table>

						{/* Mobile : liste */}
						<ul className="pe-rows md:hidden">
							{filteredClients.map((client) => (
								<li key={client.id}>
									<button type="button" className="pe-row-btn" onClick={() => openClient(client)}>
										<Initiale client={client} size={40} />
										<span className="min-w-0 flex-1">
											<span className="pe-ligne-nom block truncate">{client.full_name || 'Client'}</span>
											<span className="block truncate text-sm text-pe-acier">{client.phone || client.email || 'Client enregistré'}</span>
										</span>
										<ChevronRight size={18} className="text-pe-acier" aria-hidden="true" />
									</button>
								</li>
							))}
						</ul>
					</>
				)}
			</section>

			{/* Fiche client en panneau latéral */}
			<SidePanel
				open={panelOpen && !!selectedClient}
				onClose={() => {
					setPanelOpen(false);
					setIsEditModalOpen(false);
				}}
				title="Fiche client"
				wide
			>
				{selectedClient && professional ? (
					<div className="grid gap-5">
						{/* Dossier client */}
						<section className="pe-card pe-card--sombre">
							<div className="pe-card__corps grid gap-5">
								<div className="flex flex-wrap items-start justify-between gap-4">
									<div className="flex min-w-0 items-center gap-4">
										<span className="relative">
											<Initiale client={selectedClient} size={64} />
											<span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 -skew-x-[14deg] bg-pe-rouge" aria-hidden="true" />
										</span>
										<div className="min-w-0">
											<h3 className="break-words text-[1.6rem] font-extrabold uppercase leading-none tracking-[-0.01em] [font-stretch:120%]">
												{selectedClient.full_name || 'Client'}
											</h3>
											<p className="pe-tech mt-2">
												Client Premium · Inscrit le{' '}
												{new Date(selectedClient.created_at).toLocaleDateString('fr-FR', {
													day: 'numeric',
													month: 'long',
													year: 'numeric',
												})}
											</p>
										</div>
									</div>
									{!isEditModalOpen && (
										<button
											type="button"
											onClick={() => handleOpenEdit(selectedClient)}
											className="pe-btn pe-btn--fantome pe-btn--sm"
											title="Modifier les coordonnées du client"
										>
											<Pencil aria-hidden="true" />
											Modifier la fiche
										</button>
									)}
								</div>

								{isEditModalOpen ? (
									<form onSubmit={handleSaveEdit} className="grid gap-4 rounded-[2px] bg-pe-carte p-4 text-pe-encre">
										<p className="pe-h3">Modifier la fiche client</p>
										<div>
											<label className="pe-label" htmlFor="edit-nom">
												Nom complet *
											</label>
											<input
												id="edit-nom"
												type="text"
												required
												value={editFullName}
												maxLength={MAX_NAME_LENGTH}
												onChange={(e) => setEditFullName(e.target.value)}
												placeholder="Ex : Sophie Martin"
												className="pe-input"
											/>
										</div>
										<div className="grid gap-4 sm:grid-cols-2">
											<div>
												<label className="pe-label" htmlFor="edit-tel">
													Numéro de téléphone
												</label>
												<input
													id="edit-tel"
													type="tel"
													value={editPhone}
													onChange={(e) => setEditPhone(e.target.value)}
													placeholder="Ex : 06 12 34 56 78"
													className="pe-input"
												/>
											</div>
											<div>
												<label className="pe-label" htmlFor="edit-mail">
													Adresse Email
												</label>
												<input
													id="edit-mail"
													type="email"
													value={editEmail}
													onChange={(e) => setEditEmail(e.target.value)}
													placeholder="Ex : sophie.martin@email.com"
													className="pe-input"
												/>
											</div>
										</div>
										<div className="flex flex-wrap gap-2.5">
											<button type="submit" disabled={isSavingClient} className="pe-btn">
												{isSavingClient ? (
													'Enregistrement…'
												) : (
													<>
														<Check aria-hidden="true" />
														Enregistrer
													</>
												)}
											</button>
											<button type="button" onClick={() => setIsEditModalOpen(false)} className="pe-btn pe-btn--ligne">
												<X aria-hidden="true" />
												Annuler
											</button>
										</div>
									</form>
								) : (
									<dl className="grid gap-px overflow-hidden rounded-[2px] bg-pe-filet-sombre sm:grid-cols-2">
										<div className="grid gap-1 bg-pe-carbone p-3 sm:pr-4">
											<dt className="pe-tech flex items-center gap-2">
												<Phone size={13} aria-hidden="true" /> Téléphone
											</dt>
											<dd>
												{selectedClient.phone ? (
													<a href={`tel:${selectedClient.phone}`} className="font-semibold tabular-nums hover:text-pe-rouge">
														{selectedClient.phone}
													</a>
												) : (
													<span className="text-pe-acier-clair">Non renseigné</span>
												)}
											</dd>
										</div>
										<div className="grid gap-1 bg-pe-carbone p-3 sm:pl-4">
											<dt className="pe-tech flex items-center gap-2">
												<Mail size={13} aria-hidden="true" /> Email
											</dt>
											<dd className="min-w-0">
												{selectedClient.email ? (
													<a href={`mailto:${selectedClient.email}`} className="block truncate font-semibold hover:text-pe-rouge">
														{selectedClient.email}
													</a>
												) : (
													<span className="text-pe-acier-clair">Non renseigné</span>
												)}
											</dd>
										</div>
									</dl>
								)}
							</div>
						</section>

						{/* Note privée */}
						<ClientNoteCard professionalId={professional.id} client={selectedClient} />

						{/* Historique des rendez-vous */}
						<section className="pe-card" aria-labelledby="historique-titre">
							<div className="pe-card__tete">
								<h3 id="historique-titre" className="pe-h2">
									Historique des interventions
								</h3>
							</div>
							<ClientAppointments clientId={selectedClient.id} />
						</section>

						{/* Messagerie directe */}
						<section aria-labelledby="fil-titre">
							<h3 id="fil-titre" className="pe-h2 mb-3">
								Fil de discussion direct
							</h3>
							<MessageThread professionalId={professional.id} clientId={selectedClient.id} role="professional" />
						</section>
					</div>
				) : (
					<EmptyState
						kind="liste"
						title="Sélectionnez un client"
						text="Cliquez sur un client dans la liste pour consulter sa fiche détaillée, son historique et lui envoyer un message."
					/>
				)}
			</SidePanel>
		</div>
	);
}
