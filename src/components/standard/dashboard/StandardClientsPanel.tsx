import { useEffect, useState, useMemo, useRef } from 'react';
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
import MessageThread from '@/components/standard/ui/StandardMessageThread';
import { Pencil, Search } from 'lucide-react';
import { MAX_NAME_LENGTH } from '@/lib/limits';
import {
	Busy,
	EmptyState,
	Initial,
	PageHeader,
	Panel,
	Sheet,
	Skeleton,
	StatusPill,
	statusTone,
} from '@/components/standard/ui/StandardKit';

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
			toast('Action désactivée : cette démonstration est en lecture seule.');
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
		<Panel title="Note privée et fiche technique" description="Visible uniquement par vous : matériel du client, pannes déjà traitées, préférences.">
			<label htmlFor={`sa-note-${client.id}`} className="sr-only">
				Note privée sur {client.full_name || 'ce client'}
			</label>
			<textarea
				id={`sa-note-${client.id}`}
				rows={3}
				value={note}
				disabled={loading}
				onChange={(e) => setNote(e.target.value)}
				placeholder="Ex : portable Lenovo 2019, SSD changé en mars, préfère être appelé après 18 h…"
				className="sa-input"
			/>
			<div className="mt-3">
				<button type="button" onClick={handleSave} disabled={saving || loading} className="sa-btn sa-btn--primary sa-btn--sm">
					{saving ? 'Enregistrement...' : 'Enregistrer la note'}
				</button>
			</div>
		</Panel>
	);
}

const statusLabels: Record<string, string> = {
	pending: 'En attente',
	confirmed: 'Confirmé',
	cancelled: 'Annulé',
	completed: 'Terminé',
};

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
			<Busy>
				<div className="grid gap-3 p-5">
					<Skeleton className="h-4 w-2/3" />
					<Skeleton className="h-4 w-1/2" />
				</div>
			</Busy>
		);
	}
	if (appointments.length === 0) {
		return (
			<EmptyState kind="calendar" title="Aucun rendez-vous enregistré pour ce client pour le moment.">
				Ses prochaines réservations apparaîtront ici.
			</EmptyState>
		);
	}

	return (
		<table className="sa-table sa-table--stack">
			<thead>
				<tr>
					<th scope="col">Date et heure</th>
					<th scope="col">Prestation</th>
					<th scope="col" className="sa-cell-end">
						Statut
					</th>
				</tr>
			</thead>
			<tbody>
				{appointments.map((apt) => (
					<tr key={apt.id}>
						<td data-cell="main" className="sa-num font-medium text-ink">
							{new Date(apt.start_time).toLocaleString('fr-FR', {
								day: '2-digit',
								month: 'short',
								year: 'numeric',
								hour: '2-digit',
								minute: '2-digit',
							})}
						</td>
						<td data-cell="full">{apt.services?.name ?? '—'}</td>
						<td data-cell="side" className="sa-cell-end">
							<StatusPill tone={statusTone[apt.status] ?? 'neutral'}>{statusLabels[apt.status] ?? apt.status}</StatusPill>
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
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const detailRef = useRef<HTMLDivElement>(null);

	// Panneau d'édition des infos client
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
			toast('Action désactivée : cette démonstration est en lecture seule.');
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

					// Présélectionner le client passé en paramètre URL ?clientId=...
					const params = new URLSearchParams(window.location.search);
					const targetId = params.get('clientId');
					if (targetId) {
						const found = allClients.find((c) => c.id === targetId);
						if (found) {
							setSelectedClient(found);
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

	function selectClient(client: Client) {
		setSelectedClient(client);
		// Sur mobile, la fiche est sous la liste : on l'amène à l'écran.
		if (window.matchMedia('(max-width: 1023px)').matches) {
			window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
		}
	}

	if (loading) {
		return (
			<Busy>
				<div className="sa-pagehead">
					<div className="grid gap-3">
						<Skeleton className="h-9 w-56" />
						<Skeleton className="h-4 w-96 max-w-full" />
					</div>
				</div>
				<div className="grid items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
					<div className="sa-panel grid gap-4 p-4">
						<Skeleton className="h-10 w-full" />
						{[0, 1, 2, 3].map((i) => (
							<div key={i} className="flex items-center gap-3">
								<Skeleton className="h-9 w-9 rounded-full" />
								<div className="grid flex-1 gap-2">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-3 w-24" />
								</div>
							</div>
						))}
					</div>
					<div className="sa-panel grid gap-4 p-6">
						<Skeleton className="h-14 w-14" />
						<Skeleton className="h-6 w-48" />
						<Skeleton className="h-24 w-full" />
					</div>
				</div>
			</Busy>
		);
	}

	return (
		<div>
			<PageHeader
				title="Fiches clients"
				subtitle={`Consultez l'historique de vos ${clients.length} clients, accédez à leurs coordonnées et échangez directement.`}
			/>

			<div className="grid items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
				{/* Colonne de gauche : annuaire des clients */}
				<div className="sa-panel overflow-hidden lg:sticky lg:top-6">
					<div className="border-b border-[var(--sa-line-soft)] p-3">
						<label htmlFor="sa-client-search" className="sr-only">
							Rechercher un client
						</label>
						<div className="relative">
							<Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" aria-hidden="true" />
							<input
								id="sa-client-search"
								type="search"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Nom, téléphone, email…"
								className="sa-input pl-9"
							/>
						</div>
						<p className="mt-2 px-1 text-xs font-medium text-ink-mute" aria-live="polite">
							{filteredClients.length} client{filteredClients.length > 1 ? 's' : ''} trouvé{filteredClients.length > 1 ? 's' : ''}
						</p>
					</div>

					<div className="max-h-[34rem] overflow-y-auto">
						{filteredClients.length === 0 && (
							<EmptyState kind="search" title="Aucun résultat">
								Aucun client ne correspond à votre recherche.
							</EmptyState>
						)}
						{filteredClients.map((client) => {
							const isSelected = selectedClient?.id === client.id;
							return (
								<button
									key={client.id}
									type="button"
									onClick={() => selectClient(client)}
									aria-current={isSelected ? 'true' : undefined}
									className="sa-clientrow"
								>
									<Initial name={client.full_name} url={client.avatar_url} />
									<span className="min-w-0 flex-1">
										<span className="block truncate font-semibold text-ink">{client.full_name || 'Client'}</span>
										<span className="sa-num mt-0.5 block truncate text-xs text-ink-mute">
											{client.phone || client.email || 'Client enregistré'}
										</span>
									</span>
								</button>
							);
						})}
					</div>
				</div>

				{/* Colonne de droite : fiche détaillée du client sélectionné */}
				<div ref={detailRef} className="grid min-w-0 scroll-mt-20 gap-6">
					{selectedClient && professional ? (
						<>
							{/* Dossier client */}
							<section className="sa-panel" aria-label={`Fiche de ${selectedClient.full_name || 'client'}`}>
								<div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--sa-line-soft)] p-5">
									<div className="flex min-w-0 items-center gap-4">
										<Initial name={selectedClient.full_name} url={selectedClient.avatar_url} large />
										<div className="min-w-0">
											<div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
												<h2 className="break-words text-2xl font-semibold tracking-tight text-ink">{selectedClient.full_name || 'Client'}</h2>
												<StatusPill tone="confirmed">Client privilégié</StatusPill>
											</div>
											<p className="mt-1 text-sm text-ink-mute">
												Inscrit le{' '}
												{new Date(selectedClient.created_at).toLocaleDateString('fr-FR', {
													day: 'numeric',
													month: 'long',
													year: 'numeric',
												})}
											</p>
										</div>
									</div>
									<button
										type="button"
										onClick={() => handleOpenEdit(selectedClient)}
										className="sa-btn sa-btn--secondary sa-btn--sm"
										title="Modifier les coordonnées du client"
									>
										<Pencil size={14} aria-hidden="true" />
										Modifier la fiche
									</button>
								</div>
								<dl className="sa-dl px-5 [&>div:first-child]:border-t-0 [&>div:last-child]:border-b-0">
									<div>
										<dt>Téléphone</dt>
										<dd>
											{selectedClient.phone ? (
												<a href={`tel:${selectedClient.phone}`} className="sa-num hover:text-brand">
													{selectedClient.phone}
												</a>
											) : (
												<span className="text-ink-mute">Non renseigné</span>
											)}
										</dd>
									</div>
									<div>
										<dt>Email</dt>
										<dd>
											{selectedClient.email ? (
												<a href={`mailto:${selectedClient.email}`} className="hover:text-brand">
													{selectedClient.email}
												</a>
											) : (
												<span className="text-ink-mute">Non renseigné</span>
											)}
										</dd>
									</div>
								</dl>
							</section>

							{/* Note privée */}
							<ClientNoteCard professionalId={professional.id} client={selectedClient} />

							{/* Historique des rendez-vous */}
							<Panel title="Historique des réservations" bodyClassName="">
								<ClientAppointments clientId={selectedClient.id} />
							</Panel>

							{/* Messagerie directe */}
							<Panel title="Fil de discussion" description="Le client reçoit vos réponses dans son espace et par email." bodyClassName="">
								<MessageThread professionalId={professional.id} clientId={selectedClient.id} role="professional" />
							</Panel>
						</>
					) : (
						<div className="sa-panel">
							<EmptyState kind="people" title="Sélectionnez un client">
								Choisissez un client dans la liste pour consulter sa fiche, son historique et lui envoyer un message.
							</EmptyState>
						</div>
					)}
				</div>
			</div>

			{/* Panneau d'édition des coordonnées client */}
			<Sheet
				open={isEditModalOpen && !!selectedClient}
				onClose={() => setIsEditModalOpen(false)}
				title="Modifier la fiche client"
				description="Mise à jour des coordonnées par le professionnel"
			>
				<form id="sa-edit-client" onSubmit={handleSaveEdit} className="grid gap-5">
					<div>
						<label htmlFor="sa-edit-name" className="sa-label">
							Nom complet *
						</label>
						<input
							id="sa-edit-name"
							type="text"
							required
							value={editFullName}
							maxLength={MAX_NAME_LENGTH}
							onChange={(e) => setEditFullName(e.target.value)}
							placeholder="Ex : Sophie Martin"
							className="sa-input"
						/>
					</div>
					<div>
						<label htmlFor="sa-edit-phone" className="sa-label">
							Numéro de téléphone
						</label>
						<input
							id="sa-edit-phone"
							type="tel"
							value={editPhone}
							onChange={(e) => setEditPhone(e.target.value)}
							placeholder="Ex : 06 12 34 56 78"
							className="sa-input sa-num"
						/>
					</div>
					<div>
						<label htmlFor="sa-edit-email" className="sa-label">
							Adresse email
						</label>
						<input
							id="sa-edit-email"
							type="email"
							value={editEmail}
							onChange={(e) => setEditEmail(e.target.value)}
							placeholder="Ex : sophie.martin@email.com"
							className="sa-input"
						/>
					</div>
					<div className="flex flex-wrap items-center gap-2 border-t border-[var(--sa-line-soft)] pt-5">
						<button type="submit" disabled={isSavingClient} className="sa-btn sa-btn--primary">
							{isSavingClient ? 'Enregistrement...' : 'Enregistrer'}
						</button>
						<button type="button" onClick={() => setIsEditModalOpen(false)} className="sa-btn sa-btn--quiet">
							Annuler
						</button>
					</div>
				</form>
			</Sheet>
		</div>
	);
}
