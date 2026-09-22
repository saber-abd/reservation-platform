import { useEffect, useState, useMemo } from 'react';
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
	type Client, 
	type Appointment, 
	type Professional 
} from '@/lib/queries';
import { DEMO_DIAMANT_CLIENTS } from '@/lib/diamantDemoData';
import MessageThread from '@/components/shared/MessageThread';
import { User, Phone, Mail, Calendar, MessageSquare, Search, ExternalLink, ShieldCheck, Clock, FileText } from 'lucide-react';

function ClientNoteCard({ professionalId, client }: { professionalId: string; client: Client }) {
	const [note, setNote] = useState('');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [status, setStatus] = useState<string | null>(null);

	useEffect(() => {
		setLoading(true);
		setStatus(null);
		getClientNote(professionalId, client.id)
			.then((existing) => setNote(existing?.note ?? ''))
			.finally(() => setLoading(false));
	}, [professionalId, client.id]);

	async function handleSave() {
		setSaving(true);
		setStatus(null);
		try {
			await upsertClientNote(professionalId, client.id, note);
			setStatus('Note enregistrée avec succès.');
			setTimeout(() => setStatus(null), 3000);
		} catch (err) {
			setStatus(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
			<div className="flex items-center gap-2 mb-1">
				<FileText size={16} className="text-deep-teal-600" />
				<p className="text-sm font-bold text-stone-900">Note privée & Fiche technique</p>
			</div>
			<p className="text-xs text-stone-500">
				Visible uniquement par vous — préférences, formules de coloration, sensibilités, allergies...
			</p>
			<textarea
				rows={3}
				value={note}
				disabled={loading}
				onChange={(e) => setNote(e.target.value)}
				placeholder="Ex : coloration 7.1 + 20vol, préfère le thé vert, allergie au latex..."
				className="mt-3 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm focus:border-deep-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-deep-teal-500/20 transition-all placeholder:text-stone-400"
			/>
			<div className="mt-3 flex items-center justify-between">
				<button
					type="button"
					onClick={handleSave}
					disabled={saving || loading}
					className="rounded-xl bg-deep-teal-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-deep-teal-700 disabled:opacity-50 cursor-pointer shadow-2xs"
				>
					{saving ? 'Enregistrement...' : 'Enregistrer la note'}
				</button>
				{status && (
					<span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
						{status}
					</span>
				)}
			</div>
		</div>
	);
}

function ClientAppointments({ clientId }: { clientId: string }) {
	const [appointments, setAppointments] = useState<(Appointment & { services: { name: string } | null })[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		getAppointmentsForClient(clientId)
			.then(setAppointments)
			.finally(() => setLoading(false));
	}, [clientId]);

	if (loading) return <p className="text-sm text-stone-400 py-4">Chargement des rendez-vous...</p>;
	if (appointments.length === 0) {
		return (
			<div className="rounded-2xl border border-dashed border-stone-200 p-6 text-center text-xs text-stone-400 bg-stone-50/50">
				Aucun rendez-vous enregistré pour ce client pour le moment.
			</div>
		);
	}

	const statusLabels: Record<string, { label: string; cls: string }> = {
		pending: { label: 'En attente', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
		confirmed: { label: 'Confirmé', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
		cancelled: { label: 'Annulé', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
		completed: { label: 'Terminé', cls: 'bg-stone-100 text-stone-700 border-stone-200' },
	};

	return (
		<div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-xs">
			<table className="w-full text-left text-sm">
				<thead className="bg-stone-50 text-xs uppercase font-bold text-stone-400 border-b border-stone-100">
					<tr>
						<th className="px-4 py-3">Date & Heure</th>
						<th className="px-4 py-3">Prestation</th>
						<th className="px-4 py-3 text-right">Statut</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-stone-100">
					{appointments.map((apt) => {
						const meta = statusLabels[apt.status] || { label: apt.status, cls: 'bg-stone-100 text-stone-700' };
						return (
							<tr key={apt.id} className="hover:bg-stone-50/50 transition-colors">
								<td className="px-4 py-3 text-stone-900 font-medium">
									{new Date(apt.start_time).toLocaleString('fr-FR', {
										day: '2-digit',
										month: 'short',
										year: 'numeric',
										hour: '2-digit',
										minute: '2-digit'
									})}
								</td>
								<td className="px-4 py-3 text-stone-600">{apt.services?.name ?? '—'}</td>
								<td className="px-4 py-3 text-right">
									<span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${meta.cls}`}>
										{meta.label}
									</span>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

export default function ClientsPanel() {
	const [professional, setProfessional] = useState<Professional | null>(null);
	const [clients, setClients] = useState<Client[]>([]);
	const [selectedClient, setSelectedClient] = useState<Client | null>(null);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');

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
				const extra = tag === 'diamant' ? DEMO_DIAMANT_CLIENTS : [];
				const allClients = await getAllClients(effectiveProId, tag, extra);

				if (isMounted) {
					setClients(allClients);

					// Présélectionner le client passé en paramètre URL ?clientId=...
					const params = new URLSearchParams(window.location.search);
					const targetId = params.get('clientId');
					if (targetId) {
						const found = allClients.find(c => c.id === targetId);
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
		return () => { isMounted = false; };
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

	const basePath = typeof window !== 'undefined' ? (window.location.pathname.match(/^\/(demo-[^/]+)/)?.[0] || '/demo-diamant') : '/demo-diamant';

	if (loading) {
		return (
			<div className="flex justify-center items-center py-20 text-stone-400">
				<p className="text-sm font-semibold">Chargement de la clientèle...</p>
			</div>
		);
	}

	return (
		<div>
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-stone-900 tracking-tight">Fiches Clientèle</h1>
					<p className="mt-1 text-sm text-stone-500">
						Consultez l'historique de vos {clients.length} clients, accédez à leurs coordonnées et échangez directement.
					</p>
				</div>
			</div>

			<div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
				{/* Colonne de gauche : Annuaire des clients */}
				<div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs lg:col-span-1">
					<div className="relative mb-3">
						<Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Rechercher par nom, tél, email..."
							className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-stone-50 border border-stone-200 focus:border-deep-teal-500 focus:bg-white focus:outline-none transition-all placeholder:text-stone-400"
						/>
					</div>

					<div className="flex items-center justify-between px-1 mb-2">
						<span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
							{filteredClients.length} client{filteredClients.length > 1 ? 's' : ''} trouvé{filteredClients.length > 1 ? 's' : ''}
						</span>
					</div>

					<div className="max-h-[580px] overflow-y-auto space-y-1.5 pr-1">
						{filteredClients.length === 0 && (
							<p className="py-8 text-center text-xs text-stone-400">Aucun client ne correspond à votre recherche.</p>
						)}
						{filteredClients.map((client) => {
							const isSelected = selectedClient?.id === client.id;
							return (
								<button
									key={client.id}
									onClick={() => setSelectedClient(client)}
									className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all cursor-pointer ${
										isSelected
											? 'border-deep-teal-500 bg-deep-teal-50/80 text-deep-teal-950 font-medium ring-1 ring-deep-teal-200 shadow-xs'
											: 'border-stone-100 hover:border-stone-200 bg-stone-50/50 hover:bg-white text-stone-700'
									} border`}
								>
									<div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
										isSelected 
											? 'bg-deep-teal-600 text-white shadow-2xs' 
											: 'bg-stone-200 text-stone-600'
									}`}>
										{client.avatar_url && client.avatar_url.startsWith('http') ? (
											<img src={client.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
										) : client.full_name ? (
											client.full_name.charAt(0).toUpperCase()
										) : (
											<User size={16} />
										)}
									</div>
									<div className="flex-1 min-w-0">
										<p className={`font-bold text-sm truncate ${isSelected ? 'text-deep-teal-950' : 'text-stone-900'}`}>
											{client.full_name || 'Client'}
										</p>
										<p className="text-xs text-stone-500 truncate mt-0.5">
											{client.phone || client.email || 'Client enregistré'}
										</p>
									</div>
								</button>
							);
						})}
					</div>
				</div>

				{/* Colonne de droite : Fiche détaillée du client sélectionné */}
				<div className="lg:col-span-2 flex flex-col gap-6">
					{selectedClient && professional ? (
						<>
							{/* Dossier client */}
							<div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-100">
									<div className="flex items-center gap-4">
										<div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-deep-teal-500 to-deep-teal-700 text-white flex items-center justify-center font-bold text-2xl shadow-sm overflow-hidden">
											{selectedClient.avatar_url && selectedClient.avatar_url.startsWith('http') ? (
												<img src={selectedClient.avatar_url} alt="" className="w-full h-full object-cover" />
											) : selectedClient.full_name ? (
												selectedClient.full_name.charAt(0).toUpperCase()
											) : (
												<User size={28} />
											)}
										</div>
										<div>
											<div className="flex items-center gap-2">
												<h2 className="text-xl font-black text-stone-900 tracking-tight">
													{selectedClient.full_name || 'Client'}
												</h2>
												<span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-deep-teal-50 text-deep-teal-700 border border-deep-teal-200 uppercase tracking-wider">
													Client Privilégié
												</span>
											</div>
											<p className="text-xs text-stone-400 mt-1 flex items-center gap-1.5">
												<Calendar size={13} />
												Inscrit le {new Date(selectedClient.created_at).toLocaleDateString('fr-FR', {
													day: 'numeric',
													month: 'long',
													year: 'numeric'
												})}
											</p>
										</div>
									</div>

									{/* Action rapide : ouvrir messagerie */}
									<a
										href={`${basePath}/dashboard/messages?clientId=${encodeURIComponent(selectedClient.id)}`}
										className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-deep-teal-600 text-white text-xs font-bold hover:bg-deep-teal-700 transition-all shadow-xs shrink-0 self-start sm:self-auto"
									>
										<MessageSquare size={15} />
										<span>Ouvrir dans la messagerie</span>
										<ExternalLink size={13} />
									</a>
								</div>

								{/* Grille des coordonnées */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
									<div className="p-4 rounded-xl bg-stone-50 border border-stone-100 flex items-center gap-3">
										<div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-deep-teal-600 shrink-0">
											<Phone size={18} />
										</div>
										<div className="min-w-0">
											<p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Téléphone</p>
											{selectedClient.phone ? (
												<a href={`tel:${selectedClient.phone}`} className="text-sm font-bold text-stone-900 hover:text-deep-teal-600 transition-colors truncate block">
													{selectedClient.phone}
												</a>
											) : (
												<p className="text-sm text-stone-400 italic">Non renseigné</p>
											)}
										</div>
									</div>

									<div className="p-4 rounded-xl bg-stone-50 border border-stone-100 flex items-center gap-3">
										<div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-deep-teal-600 shrink-0">
											<Mail size={18} />
										</div>
										<div className="min-w-0">
											<p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Email</p>
											{selectedClient.email ? (
												<a href={`mailto:${selectedClient.email}`} className="text-sm font-bold text-stone-900 hover:text-deep-teal-600 transition-colors truncate block">
													{selectedClient.email}
												</a>
											) : (
												<p className="text-sm text-stone-400 italic">Non renseigné</p>
											)}
										</div>
									</div>
								</div>
							</div>
							
							{/* Note privée */}
							<ClientNoteCard professionalId={professional.id} client={selectedClient} />
							
							{/* Historique des rendez-vous */}
							<div>
								<h3 className="text-base font-bold text-stone-900 mb-3 flex items-center gap-2">
									<Clock size={18} className="text-deep-teal-600" />
									<span>Historique des réservations</span>
								</h3>
								<ClientAppointments clientId={selectedClient.id} />
							</div>

							{/* Messagerie directe */}
							<div>
								<div className="flex items-center justify-between mb-3">
									<h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
										<MessageSquare size={18} className="text-deep-teal-600" />
										<span>Fil de discussion direct</span>
									</h3>
									<a 
										href={`${basePath}/dashboard/messages?clientId=${encodeURIComponent(selectedClient.id)}`}
										className="text-xs font-bold text-deep-teal-600 hover:underline flex items-center gap-1"
									>
										<span>Mode plein écran</span>
										<ExternalLink size={12} />
									</a>
								</div>
								<MessageThread professionalId={professional.id} clientId={selectedClient.id} role="professional" />
							</div>
						</>
					) : (
						<div className="rounded-2xl border border-dashed border-stone-300 p-12 text-center bg-white shadow-xs">
							<div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mx-auto mb-3">
								<User size={24} />
							</div>
							<p className="text-sm font-bold text-stone-700">Sélectionnez un client</p>
							<p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
								Cliquez sur un client dans la liste de gauche pour consulter sa fiche détaillée, son historique et lui envoyer un message.
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
