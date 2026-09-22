import React, { useState, useEffect, useMemo } from 'react';
import { 
	getActiveProRole, 
	setActiveProRole, 
	getTeamMembers, 
	addTeamMember, 
	updateTeamMember, 
	deleteTeamMember, 
	getBannedClients, 
	banClient, 
	unbanClient, 
	deleteClientAccount,
	type TeamMember, 
	type ProRole, 
	type BannedClientRecord 
} from '@/lib/permissions';
import { getAllClients, getPrimaryProfessional, getDemoTag, updateClient, type Client } from '@/lib/queries';
import { DEMO_DIAMANT_CLIENTS } from '@/lib/diamantDemoData';
import { 
	ShieldCheck, 
	UserCheck, 
	UserX, 
	Trash2, 
	UserPlus, 
	Lock, 
	Unlock, 
	Search, 
	CheckCircle2, 
	XCircle, 
	AlertTriangle, 
	Eye, 
	User, 
	Mail, 
	Sparkles, 
	Calendar, 
	MessageSquare, 
	Scissors, 
	BarChart3, 
	Settings, 
	Check, 
	X,
	Plus,
	Pencil,
	Phone
} from 'lucide-react';

export default function DiamantRightsPanel() {
	const [activeRole, setActiveRole] = useState<ProRole>('admin');
	const [activeTab, setActiveTab] = useState<'team' | 'clients' | 'matrix'>('team');
	const [proId, setProId] = useState<string>('eff1f7ef-33ee-49a2-9e4f-52ab675a4dc7');
	
	// Team Members State
	const [members, setMembers] = useState<TeamMember[]>([]);
	const [showAddModal, setShowAddModal] = useState(false);
	const [newMemberName, setNewMemberName] = useState('');
	const [newMemberEmail, setNewMemberEmail] = useState('');
	const [newMemberSpecialty, setNewMemberSpecialty] = useState('');
	const [newMemberRole, setNewMemberRole] = useState<ProRole>('employee');
	const [newMemberPassword, setNewMemberPassword] = useState('Pro2026!');

	// Clients State
	const [clients, setClients] = useState<Client[]>([]);
	const [bannedClients, setBannedClients] = useState<Record<string, BannedClientRecord>>({});
	const [clientSearch, setClientSearch] = useState('');
	const [clientFilter, setClientFilter] = useState<'all' | 'active' | 'banned'>('all');
	
	// Edit Client Modal State
	const [editClientModal, setEditClientModal] = useState<Client | null>(null);
	const [editFullName, setEditFullName] = useState('');
	const [editPhone, setEditPhone] = useState('');
	const [editEmail, setEditEmail] = useState('');
	const [isSavingClient, setIsSavingClient] = useState(false);

	// Ban Modal State
	const [banModalClient, setBanModalClient] = useState<Client | null>(null);
	const [banReason, setBanReason] = useState('No-shows répétés (absences non prévenues)');
	const [customBanReason, setCustomBanReason] = useState('');

	// Delete Confirmation State
	const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'client' | 'member'; id: string; name: string } | null>(null);

	// Notification message
	const [toast, setToast] = useState<string | null>(null);

	function showToast(msg: string) {
		setToast(msg);
		setTimeout(() => setToast(null), 3500);
	}

	useEffect(() => {
		const currentRole = getActiveProRole();
		setActiveRole(currentRole);

		async function init() {
			const tag = getDemoTag();
			const pro = await getPrimaryProfessional(tag).catch(() => null);
			const effectiveId = pro?.id || 'eff1f7ef-33ee-49a2-9e4f-52ab675a4dc7';
			setProId(effectiveId);

			// Load team members
			const m = getTeamMembers(effectiveId);
			setMembers(m);

			// Load clients
			const all = await getAllClients(effectiveId, tag, DEMO_DIAMANT_CLIENTS);
			setClients(all);

			// Load banned clients
			setBannedClients(getBannedClients());
		}

		init();

		const onRoleChange = (e: any) => {
			if (e.detail?.role) setActiveRole(e.detail.role);
		};
		const onTeamUpdate = (e: any) => {
			if (e.detail?.members) setMembers(e.detail.members);
		};
		const onBannedUpdate = () => {
			setBannedClients(getBannedClients());
		};
		const onClientUpdated = (e: any) => {
			const upd = e.detail?.client;
			if (upd) {
				setClients(prev => prev.map(c => c.id === upd.id ? { ...c, ...upd } : c));
			}
		};

		window.addEventListener('pro:role-changed', onRoleChange);
		window.addEventListener('diamant:team-updated', onTeamUpdate);
		window.addEventListener('diamant:client-banned', onBannedUpdate);
		window.addEventListener('diamant:client-unbanned', onBannedUpdate);
		window.addEventListener('diamant:client-deleted', onBannedUpdate);
		window.addEventListener('diamant:client-updated', onClientUpdated);

		return () => {
			window.removeEventListener('pro:role-changed', onRoleChange);
			window.removeEventListener('diamant:team-updated', onTeamUpdate);
			window.removeEventListener('diamant:client-banned', onBannedUpdate);
			window.removeEventListener('diamant:client-unbanned', onBannedUpdate);
			window.removeEventListener('diamant:client-deleted', onBannedUpdate);
			window.removeEventListener('diamant:client-updated', onClientUpdated);
		};
	}, []);

	function handleOpenEditClient(client: Client) {
		setEditClientModal(client);
		setEditFullName(client.full_name || '');
		setEditPhone(client.phone || '');
		setEditEmail(client.email || '');
	}

	async function handleSaveClientSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!editClientModal) return;
		setIsSavingClient(true);
		try {
			const updated = await updateClient(editClientModal.id, {
				full_name: editFullName.trim(),
				phone: editPhone.trim() || null,
				email: editEmail.trim() || null
			});

			setClients(prev => prev.map(c => c.id === editClientModal.id ? { ...c, ...updated } : c));
			setEditClientModal(null);
			showToast(`Informations de ${editFullName.trim() || 'ce client'} mises à jour.`);
		} catch (err) {
			console.error('Erreur mise à jour client:', err);
			showToast("Erreur lors de l'enregistrement des modifications.");
		} finally {
			setIsSavingClient(false);
		}
	}

	function handleSwitchRole(role: ProRole) {
		setActiveProRole(role);
		setActiveRole(role);
		showToast(
			role === 'employee' 
				? "Vue passée en mode 'Employé' : Accès restreint au Planning, Clientèle, Messagerie et Recherche."
				: "Vue passée en mode 'Administrateur' : Accès total rétabli."
		);
	}

	function handleCreateMember(e: React.FormEvent) {
		e.preventDefault();
		if (!newMemberName.trim() || !newMemberEmail.trim()) return;

		const created = addTeamMember(proId, {
			name: newMemberName.trim(),
			email: newMemberEmail.trim(),
			role: newMemberRole,
			specialty: newMemberSpecialty.trim() || 'Coiffeur(se) Artisan',
			status: 'active'
		});

		setShowAddModal(false);
		setNewMemberName('');
		setNewMemberEmail('');
		setNewMemberSpecialty('');
		showToast(`Compte professionnel créé pour ${created.name} (${created.role === 'employee' ? 'Employé' : 'Admin'}).`);
	}

	function handleToggleMemberStatus(member: TeamMember) {
		const nextStatus = member.status === 'active' ? 'suspended' : 'active';
		updateTeamMember(proId, member.id, { status: nextStatus });
		showToast(`Statut de ${member.name} mis à jour : ${nextStatus === 'active' ? 'Actif' : 'Suspendu'}.`);
	}

	function handleBanClientSubmit() {
		if (!banModalClient) return;
		const finalReason = banReason === 'Autre motif' ? customBanReason.trim() : banReason;
		banClient(banModalClient.id, banModalClient.full_name || 'Client', finalReason, banModalClient.email);
		setBanModalClient(null);
		setCustomBanReason('');
		showToast(`Client ${banModalClient.full_name || ''} banni avec succès.`);
	}

	function handleUnban(client: Client) {
		unbanClient(client.id);
		showToast(`Le bannissement de ${client.full_name || 'ce client'} a été levé.`);
	}

	async function confirmDelete() {
		if (!deleteConfirm) return;
		if (deleteConfirm.type === 'member') {
			deleteTeamMember(proId, deleteConfirm.id);
			showToast(`Compte collaborateur ${deleteConfirm.name} supprimé.`);
		} else {
			await deleteClientAccount(deleteConfirm.id);
			setClients(prev => prev.filter(c => c.id !== deleteConfirm.id));
			showToast(`Compte client ${deleteConfirm.name} supprimé définitivement.`);
		}
		setDeleteConfirm(null);
	}

	// Filtrage des clients
	const filteredClients = useMemo(() => {
		return clients.filter(c => {
			const isBanned = !!bannedClients[c.id];
			if (clientFilter === 'active' && isBanned) return false;
			if (clientFilter === 'banned' && !isBanned) return false;

			if (clientSearch.trim()) {
				const q = clientSearch.toLowerCase().trim();
				return (
					(c.full_name && c.full_name.toLowerCase().includes(q)) ||
					(c.phone && c.phone.includes(q)) ||
					(c.email && c.email.toLowerCase().includes(q))
				);
			}
			return true;
		});
	}, [clients, bannedClients, clientSearch, clientFilter]);

	return (
		<div className="space-y-8">
			{/* Toast notification */}
			{toast && (
				<div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-bold border border-stone-800 animate-in fade-in slide-in-from-bottom-4">
					<Sparkles size={16} className="text-amber-400" />
					<span>{toast}</span>
				</div>
			)}

			{/* Simulateur de Rôle Actif */}
			<div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
				<div className="flex items-start gap-4">
					<div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
						activeRole === 'admin' 
							? 'bg-amber-50 text-amber-700 border border-amber-200' 
							: 'bg-deep-teal-50 text-deep-teal-700 border border-deep-teal-200'
					}`}>
						{activeRole === 'admin' ? <ShieldCheck size={24} /> : <UserCheck size={24} />}
					</div>
					<div>
						<div className="flex items-center gap-2.5">
							<h2 className="text-lg font-black text-stone-900 tracking-tight">Gestion des Droits & Rôles</h2>
							<span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
								activeRole === 'admin' 
									? 'bg-amber-100 text-amber-800 border border-amber-200' 
									: 'bg-deep-teal-100 text-deep-teal-800 border border-deep-teal-300'
							}`}>
								{activeRole === 'admin' ? 'Mode Administrateur' : 'Mode Employé'}
							</span>
						</div>
						<p className="text-xs text-stone-500 mt-1 max-w-xl leading-relaxed">
							Définissez les comptes de vos collaborateurs, appliquez des sanctions ou restrictions aux clients, et testez les permissions en direct.
						</p>
					</div>
				</div>

				{/* Boutons de bascule rapide de rôle */}
				<div className="flex items-center gap-2 bg-stone-100 p-1.5 rounded-2xl border border-stone-200 self-start md:self-center">
					<button
						type="button"
						onClick={() => handleSwitchRole('admin')}
						className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
							activeRole === 'admin' 
								? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-200' 
								: 'text-stone-500 hover:text-stone-900'
						}`}
					>
						<ShieldCheck size={14} className={activeRole === 'admin' ? 'text-amber-600' : 'text-stone-400'} />
						<span>Administrateur</span>
					</button>
					<button
						type="button"
						onClick={() => handleSwitchRole('employee')}
						className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
							activeRole === 'employee' 
								? 'bg-deep-teal-600 text-white shadow-xs' 
								: 'text-stone-500 hover:text-stone-900'
						}`}
					>
						<UserCheck size={14} className={activeRole === 'employee' ? 'text-white' : 'text-stone-400'} />
						<span>Tester en tant qu'Employé</span>
					</button>
				</div>
			</div>

			{/* Navigation interne des onglets */}
			<div className="flex items-center gap-3 border-b border-stone-200 pb-3">
				<button
					type="button"
					onClick={() => setActiveTab('team')}
					className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
						activeTab === 'team'
							? 'bg-deep-teal-50 text-deep-teal-700 border border-deep-teal-200 shadow-2xs'
							: 'text-stone-500 hover:text-stone-900'
					}`}
				>
					<UserCheck size={16} />
					<span>Comptes Pro Employés ({members.length})</span>
				</button>
				<button
					type="button"
					onClick={() => setActiveTab('clients')}
					className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
						activeTab === 'clients'
							? 'bg-deep-teal-50 text-deep-teal-700 border border-deep-teal-200 shadow-2xs'
							: 'text-stone-500 hover:text-stone-900'
					}`}
				>
					<UserX size={16} />
					<span>Modération & Clients ({clients.length})</span>
					{Object.keys(bannedClients).length > 0 && (
						<span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-rose-600 text-white">
							{Object.keys(bannedClients).length} banni(s)
						</span>
					)}
				</button>
				<button
					type="button"
					onClick={() => setActiveTab('matrix')}
					className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
						activeTab === 'matrix'
							? 'bg-deep-teal-50 text-deep-teal-700 border border-deep-teal-200 shadow-2xs'
							: 'text-stone-500 hover:text-stone-900'
					}`}
				>
					<ShieldCheck size={16} />
					<span>Matrice des Permissions</span>
				</button>
			</div>

			{/* ONGLET 1 : ÉQUIPE & COMPTES EMPLOYÉS */}
			{activeTab === 'team' && (
				<div className="space-y-6">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div>
							<h3 className="text-xl font-bold text-stone-900 tracking-tight">Comptes Professionnels & Collaborateurs</h3>
							<p className="text-xs text-stone-500 mt-1">
								Les employés accèdent uniquement aux 4 onglets opérationnels (Planning, Clientèle, Messagerie, Recherche). Le Profil Maison et les finances leur sont inaccessibles.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setShowAddModal(true)}
							className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-deep-teal-600 text-white text-xs font-bold hover:bg-deep-teal-700 transition-all shadow-xs cursor-pointer shrink-0 self-start sm:self-auto"
						>
							<UserPlus size={16} />
							<span>Créer un compte employé</span>
						</button>
					</div>

					{/* Liste des collaborateurs */}
					<div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-xs">
						<table className="w-full text-left text-sm">
							<thead className="bg-stone-50 text-xs uppercase font-bold text-stone-400 border-b border-stone-100">
								<tr>
									<th className="px-5 py-3.5">Collaborateur</th>
									<th className="px-5 py-3.5">Rôle & Permissions</th>
									<th className="px-5 py-3.5">Statut</th>
									<th className="px-5 py-3.5 text-right">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-stone-100">
								{members.length === 0 ? (
									<tr>
										<td colSpan={4} className="p-8 text-center text-xs text-stone-400">
											Aucun collaborateur configuré pour le moment.
											<div className="mt-3">
												<button
													type="button"
													onClick={() => setShowAddModal(true)}
													className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-deep-teal-600 text-white text-xs font-bold hover:bg-deep-teal-700 transition-all cursor-pointer shadow-2xs"
												>
													<UserPlus size={14} />
													<span>Créer un premier compte employé</span>
												</button>
											</div>
										</td>
									</tr>
								) : (
									members.map((member) => {
										const isOwner = member.role === 'admin';
										return (
											<tr key={member.id} className="hover:bg-stone-50/50 transition-colors">
												<td className="px-5 py-4">
													<div className="flex items-center gap-3">
														<div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
															isOwner 
																? 'bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs' 
																: 'bg-deep-teal-100 text-deep-teal-800 border border-deep-teal-200'
														}`}>
															{member.name.charAt(0).toUpperCase()}
														</div>
														<div>
															<div className="flex items-center gap-2">
																<p className="font-bold text-stone-900">{member.name}</p>
																{isOwner && (
																	<span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
																		Gérant
																	</span>
																)}
															</div>
															<p className="text-xs text-stone-500 mt-0.5">{member.specialty} • {member.email}</p>
														</div>
													</div>
												</td>
												<td className="px-5 py-4">
													{isOwner ? (
														<div>
															<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
																<ShieldCheck size={13} className="text-amber-700" />
																<span>Administrateur (Accès Total)</span>
															</span>
															<p className="text-[11px] text-stone-400 mt-1">Tous les onglets & modification profil</p>
														</div>
													) : (
														<div>
															<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-deep-teal-50 text-deep-teal-800 border border-deep-teal-200">
																<UserCheck size={13} className="text-deep-teal-700" />
																<span>Employé (Accès restreint)</span>
															</span>
															<div className="flex flex-wrap gap-1 mt-1.5">
																<span className="text-[10px] font-semibold bg-stone-100 text-stone-600 px-2 py-0.5 rounded">Planning</span>
																<span className="text-[10px] font-semibold bg-stone-100 text-stone-600 px-2 py-0.5 rounded">Clientèle</span>
																<span className="text-[10px] font-semibold bg-stone-100 text-stone-600 px-2 py-0.5 rounded">Messagerie</span>
																<span className="text-[10px] font-semibold bg-stone-100 text-stone-600 px-2 py-0.5 rounded">Recherche</span>
															</div>
														</div>
													)}
												</td>
											<td className="px-5 py-4">
												<span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
													member.status === 'active' 
														? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
														: 'bg-stone-100 text-stone-600 border-stone-200'
												}`}>
													<span className={`w-1.5 h-1.5 rounded-full ${member.status === 'active' ? 'bg-emerald-500' : 'bg-stone-400'}`}></span>
													{member.status === 'active' ? 'Actif' : 'Suspendu'}
												</span>
											</td>
											<td className="px-5 py-4 text-right">
												{!isOwner && (
													<div className="inline-flex items-center gap-2">
														<button
															type="button"
															onClick={() => handleToggleMemberStatus(member)}
															className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
															title={member.status === 'active' ? 'Suspendre cet accès' : 'Réactiver cet accès'}
														>
															{member.status === 'active' ? <Lock size={15} /> : <Unlock size={15} />}
														</button>
														<button
															type="button"
															onClick={() => setDeleteConfirm({ type: 'member', id: member.id, name: member.name })}
															className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
															title="Supprimer ce compte employé"
														>
															<Trash2 size={15} />
														</button>
													</div>
												)}
											</td>
										</tr>
									);
								})
							)}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* ONGLET 2 : MODÉRATION & GESTION CLIENTS */}
			{activeTab === 'clients' && (
				<div className="space-y-6">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div>
							<h3 className="text-xl font-bold text-stone-900 tracking-tight">Modération & Gestion des Comptes Clients</h3>
							<p className="text-xs text-stone-500 mt-1">
								Bannissez les clients en cas d'absences répétées ou d'impayés, empêchant toute nouvelle réservation, ou supprimez définitivement un compte.
							</p>
						</div>

						{/* Filtres de statut */}
						<div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl border border-stone-200">
							<button
								type="button"
								onClick={() => setClientFilter('all')}
								className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
									clientFilter === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
								}`}
							>
								Tous ({clients.length})
							</button>
							<button
								type="button"
								onClick={() => setClientFilter('active')}
								className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
									clientFilter === 'active' ? 'bg-white text-emerald-700 shadow-xs' : 'text-stone-500'
								}`}
							>
								Actifs ({clients.length - Object.keys(bannedClients).length})
							</button>
							<button
								type="button"
								onClick={() => setClientFilter('banned')}
								className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
									clientFilter === 'banned' ? 'bg-white text-rose-700 shadow-xs' : 'text-stone-500'
								}`}
							>
								Bannis ({Object.keys(bannedClients).length})
							</button>
						</div>
					</div>

					{/* Barre de recherche */}
					<div className="relative">
						<Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
						<input
							type="text"
							value={clientSearch}
							onChange={e => setClientSearch(e.target.value)}
							placeholder="Rechercher par nom, téléphone, email..."
							className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-stone-200 focus:border-deep-teal-500 focus:ring-2 focus:ring-deep-teal-500/20 focus:outline-none text-sm transition-all shadow-xs"
						/>
					</div>

					{/* Liste des clients */}
					<div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-xs">
						<table className="w-full text-left text-sm">
							<thead className="bg-stone-50 text-xs uppercase font-bold text-stone-400 border-b border-stone-100">
								<tr>
									<th className="px-5 py-3.5">Client</th>
									<th className="px-5 py-3.5">Coordonnées</th>
									<th className="px-5 py-3.5">Statut du Compte</th>
									<th className="px-5 py-3.5 text-right">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-stone-100">
								{filteredClients.length === 0 ? (
									<tr>
										<td colSpan={4} className="p-8 text-center text-xs text-stone-400">
											Aucun client ne correspond aux critères de sélection.
										</td>
									</tr>
								) : (
									filteredClients.map((client) => {
										const banInfo = bannedClients[client.id];
										const isBanned = !!banInfo;

										return (
											<tr key={client.id} className="hover:bg-stone-50/50 transition-colors">
												<td className="px-5 py-4">
													<div className="flex items-center gap-3">
														<div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
															isBanned 
																? 'bg-rose-100 text-rose-700 border border-rose-200' 
																: 'bg-stone-200 text-stone-700'
														}`}>
															{client.full_name ? client.full_name.charAt(0).toUpperCase() : <User size={16} />}
														</div>
														<div>
															<p className="font-bold text-stone-900">{client.full_name || 'Client'}</p>
															<p className="text-[11px] text-stone-400 mt-0.5">
																Inscrit le {new Date(client.created_at).toLocaleDateString('fr-FR')}
															</p>
														</div>
													</div>
												</td>
												<td className="px-5 py-4">
													<p className="text-xs text-stone-700 font-medium">{client.phone || 'Tél. non renseigné'}</p>
													<p className="text-xs text-stone-400 mt-0.5">{client.email || 'Email non renseigné'}</p>
												</td>
												<td className="px-5 py-4">
													{isBanned ? (
														<div>
															<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
																<XCircle size={13} />
																<span>Banni / Bloqué</span>
															</span>
															<p className="text-[11px] text-rose-600 font-medium mt-1">
																Motif : {banInfo.reason}
															</p>
														</div>
													) : (
														<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
															<CheckCircle2 size={13} />
															<span>Compte Actif</span>
														</span>
													)}
												</td>
												<td className="px-5 py-4 text-right">
													<div className="inline-flex items-center gap-2">
														<button
															type="button"
															onClick={() => handleOpenEditClient(client)}
															className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-stone-700 hover:text-deep-teal-700 hover:border-deep-teal-300 hover:bg-deep-teal-50 text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
															title="Modifier les coordonnées du client"
														>
															<Pencil size={13} />
															<span>Modifier</span>
														</button>

														{isBanned ? (
															<button
																type="button"
																onClick={() => handleUnban(client)}
																className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-all cursor-pointer shadow-2xs"
															>
																Débannir
															</button>
														) : (
															<button
																type="button"
																onClick={() => setBanModalClient(client)}
																className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-all cursor-pointer shadow-2xs"
															>
																Bannir
															</button>
														)}

														<button
															type="button"
															onClick={() => setDeleteConfirm({ type: 'client', id: client.id, name: client.full_name || 'Client' })}
															className="p-1.5 rounded-lg border border-stone-200 text-stone-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
															title="Supprimer définitivement ce compte client"
														>
															<Trash2 size={15} />
														</button>
													</div>
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* ONGLET 3 : MATRICE DES PERMISSIONS */}
			{activeTab === 'matrix' && (
				<div className="space-y-6">
					<div>
						<h3 className="text-xl font-bold text-stone-900 tracking-tight">Matrice des Permissions & Rôles (RBAC)</h3>
						<p className="text-xs text-stone-500 mt-1">
							Tableau comparatif des droits d'accès stricts configurés pour la plateforme.
						</p>
					</div>

					<div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-xs">
						<table className="w-full text-left text-sm">
							<thead className="bg-stone-50 text-xs uppercase font-bold text-stone-400 border-b border-stone-100">
								<tr>
									<th className="px-5 py-3.5">Module / Onglet</th>
									<th className="px-5 py-3.5">Administrateur (Gérant)</th>
									<th className="px-5 py-3.5">Employé (Collaborateur)</th>
									<th className="px-5 py-3.5">Règle de Sécurité</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-stone-100 text-xs">
								<tr>
									<td className="px-5 py-3.5 font-bold text-stone-900 flex items-center gap-2">
										<Calendar size={15} className="text-deep-teal-600" />
										<span>Planning & Rendez-vous</span>
									</td>
									<td className="px-5 py-3.5">
										<span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
											<Check size={14} />
											<span>Accès total (Lecture / Écriture)</span>
										</span>
									</td>
									<td className="px-5 py-3.5">
										<span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
											<Check size={14} />
											<span>Accès total (Prise & modif RDV)</span>
										</span>
									</td>
									<td className="px-5 py-3.5 text-stone-500">Nécessaire à l'activité quotidienne du salon</td>
								</tr>
								<tr>
									<td className="px-5 py-3.5 font-bold text-stone-900 flex items-center gap-2">
										<User size={15} className="text-deep-teal-600" />
										<span>Fiches Clientèle & Notes</span>
									</td>
									<td className="px-5 py-3.5">
										<span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
											<Check size={14} />
											<span>Accès total</span>
										</span>
									</td>
									<td className="px-5 py-3.5">
										<span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
											<Check size={14} />
											<span>Accès total</span>
										</span>
									</td>
									<td className="px-5 py-3.5 text-stone-500">Pour consulter l'historique et notes techniques</td>
								</tr>
								<tr>
									<td className="px-5 py-3.5 font-bold text-stone-900 flex items-center gap-2">
										<MessageSquare size={15} className="text-deep-teal-600" />
										<span>Messagerie Directe</span>
									</td>
									<td className="px-5 py-3.5">
										<span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
											<Check size={14} />
											<span>Accès total</span>
										</span>
									</td>
									<td className="px-5 py-3.5">
										<span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
											<Check size={14} />
											<span>Accès total</span>
										</span>
									</td>
									<td className="px-5 py-3.5 text-stone-500">Pour échanger en direct avec la clientèle</td>
								</tr>
								<tr>
									<td className="px-5 py-3.5 font-bold text-stone-900 flex items-center gap-2">
										<Search size={15} className="text-deep-teal-600" />
										<span>Moteur de Recherche</span>
									</td>
									<td className="px-5 py-3.5">
										<span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
											<Check size={14} />
											<span>Accès total</span>
										</span>
									</td>
									<td className="px-5 py-3.5">
										<span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
											<Check size={14} />
											<span>Accès total</span>
										</span>
									</td>
									<td className="px-5 py-3.5 text-stone-500">Recherche rapide de réservations et clients</td>
								</tr>
								<tr className="bg-stone-50/40">
									<td className="px-5 py-3.5 font-bold text-stone-900 flex items-center gap-2">
										<Settings size={15} className="text-amber-600" />
										<span>Profil Maison (Coordonnées/Infos)</span>
									</td>
									<td className="px-5 py-3.5">
										<span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
											<Check size={14} />
											<span>Modification autorisée</span>
										</span>
									</td>
									<td className="px-5 py-3.5">
										<span className="inline-flex items-center gap-1 text-amber-700 font-bold">
											<Lock size={14} />
											<span>Lecture seule verrouillée</span>
										</span>
									</td>
									<td className="px-5 py-3.5 text-amber-800 font-medium">L'employé ne peut pas modifier les données de l'établissement</td>
								</tr>
								<tr className="bg-stone-50/40">
									<td className="px-5 py-3.5 font-bold text-stone-900 flex items-center gap-2">
										<Scissors size={15} className="text-rose-600" />
										<span>Gestion des Prestations & Prix</span>
									</td>
									<td className="px-5 py-3.5">
										<span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
											<Check size={14} />
											<span>Ajout / Modif / Prix</span>
										</span>
									</td>
									<td className="px-5 py-3.5">
										<span className="inline-flex items-center gap-1 text-rose-700 font-bold">
											<X size={14} />
											<span>Masqué & Accès refusé</span>
										</span>
									</td>
									<td className="px-5 py-3.5 text-stone-500">Tarification réservée au propriétaire</td>
								</tr>
								<tr className="bg-stone-50/40">
									<td className="px-5 py-3.5 font-bold text-stone-900 flex items-center gap-2">
										<BarChart3 size={15} className="text-rose-600" />
										<span>Performances & Statistiques (CA)</span>
									</td>
									<td className="px-5 py-3.5">
										<span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
											<Check size={14} />
											<span>Chiffre d'affaires & bilans</span>
										</span>
									</td>
									<td className="px-5 py-3.5">
										<span className="inline-flex items-center gap-1 text-rose-700 font-bold">
											<X size={14} />
											<span>Masqué & Accès refusé</span>
										</span>
									</td>
									<td className="px-5 py-3.5 text-stone-500">Données financières confidentielles</td>
								</tr>
								<tr className="bg-stone-50/40">
									<td className="px-5 py-3.5 font-bold text-stone-900 flex items-center gap-2">
										<ShieldCheck size={15} className="text-rose-600" />
										<span>Gestion des Droits & Comptes</span>
									</td>
									<td className="px-5 py-3.5">
										<span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
											<Check size={14} />
											<span>Gestion totale</span>
										</span>
									</td>
									<td className="px-5 py-3.5">
										<span className="inline-flex items-center gap-1 text-rose-700 font-bold">
											<X size={14} />
											<span>Masqué & Accès refusé</span>
										</span>
									</td>
									<td className="px-5 py-3.5 text-stone-500">Réservé exclusivement à l'administrateur</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* MODAL AJOUT COLLABORATEUR EMPLOYÉ */}
			{showAddModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
						<div className="flex items-center justify-between pb-4 border-b border-stone-100">
							<div className="flex items-center gap-2.5">
								<div className="w-9 h-9 rounded-xl bg-deep-teal-100 text-deep-teal-700 flex items-center justify-center">
									<UserPlus size={18} />
								</div>
								<div>
									<h4 className="font-bold text-stone-900 text-base">Nouveau Compte Collaborateur</h4>
									<p className="text-xs text-stone-400">Création d'un accès pro sécurisé</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setShowAddModal(false)}
								className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg"
							>
								<X size={18} />
							</button>
						</div>

						<form onSubmit={handleCreateMember} className="mt-4 space-y-4">
							<div>
								<label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
									Nom complet *
								</label>
								<input
									type="text"
									required
									value={newMemberName}
									onChange={e => setNewMemberName(e.target.value)}
									placeholder="Ex : Sarah Delorme"
									className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm focus:border-deep-teal-500 focus:bg-white focus:outline-none transition-all"
								/>
							</div>

							<div>
								<label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
									Adresse Email Professionnelle *
								</label>
								<input
									type="email"
									required
									value={newMemberEmail}
									onChange={e => setNewMemberEmail(e.target.value)}
									placeholder="Ex : sarah.d@prestige-diamant.fr"
									className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm focus:border-deep-teal-500 focus:bg-white focus:outline-none transition-all"
								/>
							</div>

							<div>
								<label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
									Spécialité / Fonction
								</label>
								<input
									type="text"
									value={newMemberSpecialty}
									onChange={e => setNewMemberSpecialty(e.target.value)}
									placeholder="Ex : Experte Soins & Brushing"
									className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm focus:border-deep-teal-500 focus:bg-white focus:outline-none transition-all"
								/>
							</div>

							<div>
								<label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
									Rôle assigné
								</label>
								<div className="grid grid-cols-2 gap-2">
									<button
										type="button"
										onClick={() => setNewMemberRole('employee')}
										className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
											newMemberRole === 'employee' 
												? 'border-deep-teal-500 bg-deep-teal-50/80 ring-1 ring-deep-teal-300' 
												: 'border-stone-200 hover:border-stone-300'
										}`}
									>
										<div className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
											<UserCheck size={14} className="text-deep-teal-600" />
											<span>Employé</span>
										</div>
										<p className="text-[10px] text-stone-500 mt-0.5">Accès limité (4 onglets)</p>
									</button>
									<button
										type="button"
										onClick={() => setNewMemberRole('admin')}
										className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
											newMemberRole === 'admin' 
												? 'border-amber-500 bg-amber-50/80 ring-1 ring-amber-300' 
												: 'border-stone-200 hover:border-stone-300'
										}`}
									>
										<div className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
											<ShieldCheck size={14} className="text-amber-600" />
											<span>Administrateur</span>
										</div>
										<p className="text-[10px] text-stone-500 mt-0.5">Accès intégral</p>
									</button>
								</div>
							</div>

							<div className="pt-2 flex items-center justify-end gap-2.5">
								<button
									type="button"
									onClick={() => setShowAddModal(false)}
									className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-bold hover:bg-stone-50"
								>
									Annuler
								</button>
								<button
									type="submit"
									className="px-5 py-2.5 rounded-xl bg-deep-teal-600 text-white text-xs font-bold hover:bg-deep-teal-700 shadow-xs cursor-pointer"
								>
									Créer le collaborateur
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* MODAL BANNIR CLIENT */}
			{banModalClient && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
						<div className="flex items-center gap-3 pb-4 border-b border-stone-100">
							<div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
								<AlertTriangle size={20} />
							</div>
							<div>
								<h4 className="font-bold text-stone-900 text-base">Bannir le client</h4>
								<p className="text-xs text-stone-500">{banModalClient.full_name || 'Client'}</p>
							</div>
						</div>

						<div className="mt-4 space-y-3">
							<p className="text-xs text-stone-600 leading-relaxed">
								Le bannissement empêchera ce client d'effectuer toute nouvelle réservation en ligne auprès de votre établissement.
							</p>

							<div>
								<label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
									Motif de la sanction
								</label>
								<select
									value={banReason}
									onChange={e => setBanReason(e.target.value)}
									className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs focus:border-deep-teal-500 focus:outline-none"
								>
									<option value="No-shows répétés (absences non prévenues)">No-shows répétés (absences non prévenues)</option>
									<option value="Comportement inapproprié ou irrespectueux">Comportement inapproprié ou irrespectueux</option>
									<option value="Facture ou acompte impayé">Facture ou acompte impayé</option>
									<option value="Retards systématiques pénalisant le planning">Retards systématiques pénalisant le planning</option>
									<option value="Autre motif">Autre motif personnalisé</option>
								</select>
							</div>

							{banReason === 'Autre motif' && (
								<div>
									<textarea
										rows={2}
										value={customBanReason}
										onChange={e => setCustomBanReason(e.target.value)}
										placeholder="Précisez la raison du bannissement..."
										className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs focus:border-deep-teal-500 focus:outline-none"
									/>
								</div>
							)}
						</div>

						<div className="mt-6 flex items-center justify-end gap-2.5">
							<button
								type="button"
								onClick={() => setBanModalClient(null)}
								className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-bold hover:bg-stone-50"
							>
								Annuler
							</button>
							<button
								type="button"
								onClick={handleBanClientSubmit}
								className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-xs cursor-pointer"
							>
								Confirmer le bannissement
							</button>
						</div>
					</div>
				</div>
			)}

			{/* MODAL DE CONFIRMATION DE SUPPRESSION */}
			{deleteConfirm && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
					<div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
						<div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-3">
							<Trash2 size={24} />
						</div>
						<h4 className="font-bold text-stone-900 text-center text-base">Confirmer la suppression</h4>
						<p className="text-xs text-stone-500 text-center mt-2 leading-relaxed">
							Êtes-vous certain de vouloir supprimer le compte de <strong className="text-stone-900">{deleteConfirm.name}</strong> ? Cette action est irréversible.
						</p>

						<div className="mt-6 flex items-center justify-center gap-3">
							<button
								type="button"
								onClick={() => setDeleteConfirm(null)}
								className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-bold hover:bg-stone-50"
							>
								Annuler
							</button>
							<button
								type="button"
								onClick={confirmDelete}
								className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-xs cursor-pointer"
							>
								Supprimer
							</button>
						</div>
					</div>
				</div>
			)}

			{/* MODAL MODIFICATION CLIENT */}
			{editClientModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
						<div className="flex items-center justify-between pb-4 border-b border-stone-100">
							<div className="flex items-center gap-2.5">
								<div className="w-9 h-9 rounded-xl bg-deep-teal-100 text-deep-teal-700 flex items-center justify-center">
									<Pencil size={18} />
								</div>
								<div>
									<h4 className="font-bold text-stone-900 text-base">Modifier la fiche client</h4>
									<p className="text-xs text-stone-400">Mise à jour des coordonnées par l'administrateur</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setEditClientModal(null)}
								className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg cursor-pointer"
							>
								<X size={18} />
							</button>
						</div>

						<form onSubmit={handleSaveClientSubmit} className="mt-4 space-y-4">
							<div>
								<label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
									Nom complet *
								</label>
								<input
									type="text"
									required
									value={editFullName}
									onChange={e => setEditFullName(e.target.value)}
									placeholder="Ex : Sophie Martin"
									className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm focus:border-deep-teal-500 focus:bg-white focus:outline-none transition-all"
								/>
							</div>

							<div>
								<label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
									Numéro de téléphone
								</label>
								<input
									type="tel"
									value={editPhone}
									onChange={e => setEditPhone(e.target.value)}
									placeholder="Ex : 06 12 34 56 78"
									className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm focus:border-deep-teal-500 focus:bg-white focus:outline-none transition-all"
								/>
							</div>

							<div>
								<label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
									Adresse Email
								</label>
								<input
									type="email"
									value={editEmail}
									onChange={e => setEditEmail(e.target.value)}
									placeholder="Ex : sophie.martin@email.com"
									className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm focus:border-deep-teal-500 focus:bg-white focus:outline-none transition-all"
								/>
							</div>

							<div className="pt-2 flex items-center justify-end gap-2.5">
								<button
									type="button"
									onClick={() => setEditClientModal(null)}
									className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-bold hover:bg-stone-50 cursor-pointer"
								>
									Annuler
								</button>
								<button
									type="submit"
									disabled={isSavingClient}
									className="px-5 py-2.5 rounded-xl bg-deep-teal-600 text-white text-xs font-bold hover:bg-deep-teal-700 shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
								>
									{isSavingClient ? (
										<span>Enregistrement...</span>
									) : (
										<>
											<Check size={14} />
											<span>Enregistrer</span>
										</>
									)}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
