import React, { useState, useEffect, useMemo, useRef } from 'react';
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
	getProSession,
	setProSession,
	clearProSession,
	isRoleReadOnly,
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
	EyeOff, 
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
	Phone,
	RefreshCw
} from 'lucide-react';
import { MAX_NAME_LENGTH } from '@/lib/limits';
import { supabase } from '@/lib/supabase';

const ROLE_OPTIONS: { role: ProRole; label: string }[] = [
	{ role: 'admin', label: 'Administrateur' },
	{ role: 'employee', label: 'Employé' },
	{ role: 'demo', label: 'Démo' },
];

type Access = 'full' | 'read' | 'none';

const PERMISSION_ROWS: { label: string; icon: typeof Calendar; admin: string; employee: string; employeeAccess: Access; reason: string }[] = [
	{ label: 'Planning & RDV', icon: Calendar, admin: 'Lecture et modification', employee: 'Prise et modification des RDV', employeeAccess: 'full', reason: "Nécessaire à l'activité quotidienne du salon" },
	{ label: 'Clientèle', icon: User, admin: 'Accès complet', employee: 'Accès complet', employeeAccess: 'full', reason: "Historique et notes techniques des clients" },
	{ label: 'Messagerie', icon: MessageSquare, admin: 'Accès complet', employee: 'Accès complet', employeeAccess: 'full', reason: 'Échanges directs avec la clientèle' },
	{ label: 'Recherche', icon: Search, admin: 'Accès complet', employee: 'Accès complet', employeeAccess: 'full', reason: 'Retrouver rapidement un RDV ou un client' },
	{ label: 'Profil Maison', icon: Settings, admin: 'Modification', employee: 'Masqué', employeeAccess: 'none', reason: "Les informations de l'établissement restent au gérant" },
	{ label: 'Gestion des prestations', icon: Scissors, admin: 'Ajout, modification, prix', employee: 'Masqué', employeeAccess: 'none', reason: 'Tarifs fixés par le propriétaire' },
	{ label: 'Statistiques', icon: BarChart3, admin: "Chiffre d'affaires et bilans", employee: 'Masqué', employeeAccess: 'none', reason: 'Données financières confidentielles' },
	{ label: 'Gestion des droits', icon: ShieldCheck, admin: 'Gestion complète', employee: 'Masqué', employeeAccess: 'none', reason: "Réservé à l'administrateur" },
];

function AccessCell({ access, label }: { access: Access; label: string }) {
	if (access === 'full') {
		return (
			<span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
				<Check size={14} className="shrink-0" />
				<span>{label}</span>
			</span>
		);
	}
	if (access === 'read') {
		return (
			<span className="inline-flex items-center gap-1 text-stone-600 font-bold">
				<Eye size={14} className="shrink-0" />
				<span>{label}</span>
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 text-rose-700 font-bold">
			<X size={14} className="shrink-0" />
			<span>{label}</span>
		</span>
	);
}

export default function DiamantRightsPanel() {
	const [activeRole, setActiveRole] = useState<ProRole>('admin');
	const [activeTab, setActiveTab] = useState<'team' | 'clients' | 'matrix'>('team');
	const [proId, setProId] = useState<string>('eff1f7ef-33ee-49a2-9e4f-52ab675a4dc7');
	
	// Team Members State
	const [members, setMembers] = useState<TeamMember[]>([]);
	const [showAddModal, setShowAddModal] = useState(false);
	const [showCreateChooser, setShowCreateChooser] = useState(false);
	const [confirmClientSignup, setConfirmClientSignup] = useState(false);
	const [newMemberName, setNewMemberName] = useState('');
	const [newMemberEmail, setNewMemberEmail] = useState('');
	const [newMemberSpecialty, setNewMemberSpecialty] = useState('');
	const [newMemberRole, setNewMemberRole] = useState<ProRole>('employee');
	const [newMemberPassword, setNewMemberPassword] = useState('Pro2026!');
	const [showNewPassword, setShowNewPassword] = useState(false);

	// Edit Member Modal State
	const [editMemberModal, setEditMemberModal] = useState<TeamMember | null>(null);
	const [editMemberName, setEditMemberName] = useState('');
	const [editMemberEmail, setEditMemberEmail] = useState('');
	const [editMemberSpecialty, setEditMemberSpecialty] = useState('');
	const [editMemberRole, setEditMemberRole] = useState<ProRole>('admin');
	const [editMemberPassword, setEditMemberPassword] = useState('');
	const [showEditPassword, setShowEditPassword] = useState(false);
	const [isSavingMember, setIsSavingMember] = useState(false);

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

	const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	function showToast(msg: string) {
		setToast(msg);
		if (toastTimer.current) clearTimeout(toastTimer.current);
		toastTimer.current = setTimeout(() => setToast(null), 3500);
	}

	// Échap ferme la fenêtre ouverte
	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key !== 'Escape') return;
			setShowCreateChooser(false);
			setShowAddModal(false);
			setEditMemberModal(null);
			setBanModalClient(null);
			setDeleteConfirm(null);
			setEditClientModal(null);
		}
		window.addEventListener('keydown', onKey);
		return () => {
			window.removeEventListener('keydown', onKey);
			if (toastTimer.current) clearTimeout(toastTimer.current);
		};
	}, []);

	useEffect(() => {
		const currentRole = getActiveProRole();
		setActiveRole(currentRole);

		async function init() {
			// Comptes locaux affichés tout de suite, sans attendre la réponse de Supabase
			setMembers(getTeamMembers('eff1f7ef-33ee-49a2-9e4f-52ab675a4dc7'));
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

			// Load banned clients (Local + BDD Supabase)
			const localBanned = getBannedClients();
			const dbBanned: Record<string, BannedClientRecord> = {};
			for (const c of all) {
				if (c.is_banned || c.ban === 'oui') {
					dbBanned[c.id] = {
						clientId: c.id,
						clientName: c.full_name || 'Client',
						clientEmail: c.email || null,
						reason: c.ban_reason || 'Non-respect des conditions de réservation',
						bannedAt: c.banned_at || c.created_at || new Date().toISOString()
					};
				}
			}
			setBannedClients({ ...localBanned, ...dbBanned });
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

	function checkReadOnly(): boolean {
		if (isRoleReadOnly(activeRole)) {
			showToast("Mode démo : les modifications sont désactivées.");
			return true;
		}
		return false;
	}

	function handleOpenEditMember(member: TeamMember) {
		if (checkReadOnly()) return;
		setEditMemberModal(member);
		setEditMemberName(member.name);
		setEditMemberEmail(member.email);
		setEditMemberSpecialty(member.specialty || '');
		setEditMemberRole(member.role);
		setEditMemberPassword(member.password || '');
		setShowEditPassword(false);
	}

	async function handleSaveMemberSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (checkReadOnly()) return;
		if (!editMemberModal) return;
		if (!editMemberName.trim() || !editMemberEmail.trim()) {
			showToast("Veuillez renseigner le nom et l'adresse email.");
			return;
		}
		const editedEmail = editMemberEmail.trim().toLowerCase();
		if (members.some(m => m.id !== editMemberModal.id && m.email.toLowerCase() === editedEmail)) {
			showToast('Un compte utilise déjà cette adresse email.');
			return;
		}
		if (editMemberPassword && editMemberPassword.length < 6) {
			showToast("Le mot de passe doit comporter au moins 6 caractères.");
			return;
		}

		setIsSavingMember(true);
		try {
			const changes: Partial<TeamMember> = {
				name: editMemberName.trim(),
				email: editMemberEmail.trim(),
				specialty: editMemberSpecialty.trim(),
				role: editMemberRole,
				...(editMemberPassword ? { password: editMemberPassword } : {})
			};

			updateTeamMember(proId, editMemberModal.id, changes);

			// Si le compte modifié est la session active, synchroniser la session locale
			const currentSession = getProSession();
			if (currentSession && currentSession.id === editMemberModal.id) {
				const updatedSession: TeamMember = { ...editMemberModal, ...changes };
				setProSession(updatedSession);
				if (editMemberRole !== activeRole) {
					setActiveProRole(editMemberRole);
					setActiveRole(editMemberRole);
				}
			}

			setEditMemberModal(null);
			showToast(`Compte de ${editMemberName.trim()} mis à jour.`);
		} catch (err) {
			console.error(err);
			showToast("Erreur lors de l'enregistrement des modifications.");
		} finally {
			setIsSavingMember(false);
		}
	}

	function handleOpenEditClient(client: Client) {
		if (checkReadOnly()) return;
		setEditClientModal(client);
		setEditFullName(client.full_name || '');
		setEditPhone(client.phone || '');
		setEditEmail(client.email || '');
	}

	async function handleSaveClientSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (checkReadOnly()) return;
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
		if (role === 'employee') {
			showToast("Vue employé : planning, clientèle, messagerie et recherche uniquement.");
		} else if (role === 'demo') {
			showToast("Vue démo : tous les onglets en lecture seule.");
		} else {
			showToast("Vue administrateur : accès complet.");
		}
	}

	function openCreateChooser() {
		if (checkReadOnly()) return;
		setConfirmClientSignup(false);
		setShowCreateChooser(true);
	}

	function chooseAccountType(role: ProRole) {
		setShowCreateChooser(false);
		setNewMemberRole(role);
		setShowAddModal(true);
	}

	// Un compte client s'inscrit lui-même : l'inscription ouvre une session client,
	// on ferme donc d'abord la session pro pour ne pas transformer le compte pro en client.
	async function goToClientSignup() {
		try {
			await supabase.auth.signOut();
			clearProSession();
		} catch (e) {
			console.error('Erreur déconnexion:', e);
		}
		window.location.href = '/demo-diamant/inscription';
	}

	function handleCreateMember(e: React.FormEvent) {
		e.preventDefault();
		if (checkReadOnly()) return;
		if (!newMemberName.trim() || !newMemberEmail.trim()) return;
		if (members.some(m => m.email.toLowerCase() === newMemberEmail.trim().toLowerCase())) {
			showToast('Un compte utilise déjà cette adresse email.');
			return;
		}
		if (!newMemberPassword || newMemberPassword.length < 6) {
			showToast("Le mot de passe doit comporter au moins 6 caractères.");
			return;
		}

		const created = addTeamMember(proId, {
			name: newMemberName.trim(),
			email: newMemberEmail.trim(),
			role: newMemberRole,
			specialty: newMemberSpecialty.trim() || (newMemberRole === 'admin' ? 'Co-gérant / Administrateur' : newMemberRole === 'demo' ? 'Compte Visite Démo' : 'Coiffeur(se) Artisan'),
			status: 'active',
			password: newMemberPassword
		});

		setShowAddModal(false);
		setNewMemberName('');
		setNewMemberEmail('');
		setNewMemberSpecialty('');
		setNewMemberPassword('Pro2026!');
		setShowNewPassword(false);
		showToast(
			created.role === 'admin'
				? `Compte administrateur créé pour ${created.name}. Connexion avec ${created.email}.`
				: created.role === 'demo'
				? `Compte démo créé pour ${created.name}. Connexion avec ${created.email}.`
				: `Compte employé créé pour ${created.name}. Connexion avec ${created.email}.`
		);
	}

	function handleToggleMemberStatus(member: TeamMember) {
		if (checkReadOnly()) return;
		const nextStatus = member.status === 'active' ? 'suspended' : 'active';
		updateTeamMember(proId, member.id, { status: nextStatus });
		showToast(`Statut de ${member.name} mis à jour : ${nextStatus === 'active' ? 'Actif' : 'Suspendu'}.`);
	}

	async function handleBanClientSubmit() {
		if (checkReadOnly()) return;
		if (!banModalClient) return;
		const finalReason = (banReason === 'Autre motif' ? customBanReason.trim() : banReason) || 'Non-respect des conditions de réservation';
		
		let resolvedEmail = banModalClient.email;
		if (!resolvedEmail && typeof window !== 'undefined') {
			try {
				const map = JSON.parse(localStorage.getItem('diamant_client_emails') || '{}');
				if (map[banModalClient.id]) resolvedEmail = map[banModalClient.id];
			} catch (e) {}
			if (!resolvedEmail) {
				try {
					const overrides = JSON.parse(localStorage.getItem('diamant_client_overrides') || '{}');
					if (overrides[banModalClient.id]?.email) resolvedEmail = overrides[banModalClient.id].email;
				} catch (e) {}
			}
		}

		await banClient(banModalClient.id, banModalClient.full_name || 'Client', finalReason, resolvedEmail);

		// Synchroniser l'état local des clients
		setClients(prev => prev.map(c => c.id === banModalClient.id ? {
			...c,
			is_banned: true,
			ban: 'oui',
			ban_reason: finalReason,
			banned_at: new Date().toISOString()
		} : c));

		setBannedClients(prev => ({
			...prev,
			[banModalClient.id]: {
				clientId: banModalClient.id,
				clientName: banModalClient.full_name || 'Client',
				clientEmail: resolvedEmail,
				reason: finalReason,
				bannedAt: new Date().toISOString()
			}
		}));

		setBanModalClient(null);
		setCustomBanReason('');
		showToast(`Client ${banModalClient.full_name || ''} banni.`);
	}

	async function handleUnban(client: Client) {
		if (checkReadOnly()) return;
		await unbanClient(client.id);

		// Synchroniser l'état local des clients
		setClients(prev => prev.map(c => c.id === client.id ? {
			...c,
			is_banned: false,
			ban: 'non',
			ban_reason: null,
			banned_at: null
		} : c));

		setBannedClients(prev => {
			const next = { ...prev };
			delete next[client.id];
			return next;
		});

		showToast(`Le bannissement de ${client.full_name || 'ce client'} a été levé.`);
	}

	async function confirmDelete() {
		if (checkReadOnly()) return;
		if (!deleteConfirm) return;
		if (deleteConfirm.type === 'member') {
			deleteTeamMember(proId, deleteConfirm.id);
			const currentSession = getProSession();
			if (currentSession && currentSession.id === deleteConfirm.id) {
				clearProSession();
				setActiveProRole('admin');
				setActiveRole('admin');
			}
			showToast(`Compte ${deleteConfirm.name} supprimé.`);
		} else {
			await deleteClientAccount(deleteConfirm.id);
			setClients(prev => prev.filter(c => c.id !== deleteConfirm.id));
			setBannedClients(prev => {
				const next = { ...prev };
				delete next[deleteConfirm.id];
				return next;
			});
			showToast(`Compte client ${deleteConfirm.name} supprimé définitivement.`);
		}
		setDeleteConfirm(null);
	}

	const [isSyncing, setIsSyncing] = useState(false);

	async function handleRefreshClients() {
		setIsSyncing(true);
		try {
			const tag = getDemoTag();
			const all = await getAllClients(proId, tag, DEMO_DIAMANT_CLIENTS);
			setClients(all);

			const localBanned = getBannedClients();
			const dbBanned: Record<string, BannedClientRecord> = {};
			for (const c of all) {
				if (c.is_banned || c.ban === 'oui') {
					dbBanned[c.id] = {
						clientId: c.id,
						clientName: c.full_name || 'Client',
						clientEmail: c.email || null,
						reason: c.ban_reason || 'Non-respect des conditions de réservation',
						bannedAt: c.banned_at || c.created_at || new Date().toISOString()
					};
				}
			}
			setBannedClients({ ...localBanned, ...dbBanned });
			showToast(`Actualisation : ${all.length} client(s) Diamant synchronisé(s).`);
		} catch (e) {
			showToast("Erreur lors de la synchronisation.");
		} finally {
			setIsSyncing(false);
		}
	}

	// Un client est banni s'il l'est en local ou en base
	const isClientBannedInList = (c: Client) => !!bannedClients[c.id] || c.is_banned === true || c.ban === 'oui';
	const bannedCount = useMemo(() => clients.filter(isClientBannedInList).length, [clients, bannedClients]);

	// Filtrage des clients
	const filteredClients = useMemo(() => {
		return clients.filter(c => {
			const isBanned = isClientBannedInList(c);
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
				<div role="status" className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 flex items-center gap-2 bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-bold border border-stone-800 animate-in fade-in slide-in-from-bottom-4">
					<Sparkles size={16} className="text-jasmine-400 shrink-0" />
					<span>{toast}</span>
				</div>
			)}

			{/* En-tête : titre de la page et aperçu de l'espace selon le rôle */}
			<header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
				<div className="min-w-0">
					<h1 className="text-3xl font-black text-stone-900 tracking-tight">Gestion des droits</h1>
					<p className="text-stone-500 mt-1 max-w-xl">
						Comptes de l'équipe, modération des clients et règles d'accès à l'espace pro.
					</p>
				</div>

				<div className="shrink-0">
					<p id="diamant-role-preview" className="text-xs font-bold text-stone-500 mb-1.5">Voir l'espace en tant que</p>
					<div role="radiogroup" aria-labelledby="diamant-role-preview" className="inline-flex rounded-xl border border-border bg-white p-1 shadow-2xs">
						{ROLE_OPTIONS.map((option) => {
							const selected = activeRole === option.role;
							return (
								<button
									key={option.role}
									type="button"
									role="radio"
									aria-checked={selected}
									onClick={() => handleSwitchRole(option.role)}
									className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
										selected
											? 'bg-secondary text-secondary-foreground'
											: 'text-stone-500 hover:text-stone-900'
									}`}
								>
									{option.label}
								</button>
							);
						})}
					</div>
					<p className="text-xs text-stone-500 mt-1.5">
						{activeRole === 'demo'
							? 'Lecture seule : les modifications sont bloquées.'
							: 'Accès complet, modifications autorisées.'}
					</p>
				</div>
			</header>

			{/* Navigation interne des onglets */}
			<div role="tablist" aria-label="Sections de la gestion des droits" className="flex gap-1 overflow-x-auto border-b border-border">
				{([
					{ key: 'team', label: 'Équipe', count: members.length, icon: <UserCheck size={16} /> },
					{ key: 'clients', label: 'Clients & modération', count: clients.length, icon: <UserX size={16} /> },
					{ key: 'matrix', label: 'Permissions', count: null, icon: <ShieldCheck size={16} /> },
				] as const).map((tab) => {
					const selected = activeTab === tab.key;
					return (
						<button
							key={tab.key}
							type="button"
							role="tab"
							aria-selected={selected}
							onClick={() => setActiveTab(tab.key)}
							className={`-mb-px shrink-0 px-4 py-2.5 border-b-2 text-sm font-bold transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
								selected
									? 'border-primary text-stone-900'
									: 'border-transparent text-stone-500 hover:text-stone-900'
							}`}
						>
							<span className={selected ? 'text-primary' : 'text-stone-400'}>{tab.icon}</span>
							<span>{tab.label}</span>
							{tab.count !== null && (
								<span className="text-xs font-bold text-stone-400">{tab.count}</span>
							)}
							{tab.key === 'clients' && bannedCount > 0 && (
								<span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-rose-100 text-rose-700">
									{bannedCount} {bannedCount > 1 ? 'bannis' : 'banni'}
								</span>
							)}
						</button>
					);
				})}
			</div>

			{/* ONGLET 1 : ÉQUIPE & COMPTES EMPLOYÉS */}
			{activeTab === 'team' && (
				<div className="space-y-6">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div>
							<h3 className="text-xl font-bold text-stone-900 tracking-tight">Comptes de l'équipe</h3>
							<p className="text-xs text-stone-500 mt-1">
								Les employés n'ont accès qu'au planning, à la clientèle, à la messagerie et à la recherche.
							</p>
						</div>
						<button
							type="button"
							onClick={openCreateChooser}
							className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-all shadow-xs cursor-pointer shrink-0 self-start sm:self-auto"
						>
							<Plus size={15} />
							<span>Créer un compte</span>
						</button>
					</div>

					{/* Liste des employés */}
					<div className="rounded-2xl border border-stone-200 bg-white overflow-x-auto shadow-xs">
						<table className={`w-full text-left text-sm ${members.length ? 'min-w-[44rem]' : ''}`}>
							<thead className="bg-stone-50 text-xs uppercase font-bold text-stone-400 border-b border-stone-100">
								<tr>
									<th className="px-5 py-3.5">Membre</th>
									<th className="px-5 py-3.5">Rôle</th>
									<th className="px-5 py-3.5">Statut</th>
									<th className="px-5 py-3.5 text-right">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-stone-100">
								{members.length === 0 ? (
									<tr>
										<td colSpan={4} className="p-8 text-center text-xs text-stone-400">
											Aucun compte configuré pour le moment.
											<div className="mt-4 flex justify-center">
												<button
													type="button"
													onClick={openCreateChooser}
													className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-all cursor-pointer shadow-xs"
												>
													<Plus size={14} />
													<span>Créer un compte</span>
												</button>
											</div>
										</td>
									</tr>
								) : (
									members.map((member) => {
										const isAdmin = member.role === 'admin';
										const isDemo = member.role === 'demo';
										return (
											<tr key={member.id} className="hover:bg-stone-50/50 transition-colors">
												<td className="px-5 py-4">
													<div className="flex items-center gap-3">
														<div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
															isAdmin 
																? 'bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs' 
																: isDemo
																? 'bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs'
																: 'bg-secondary text-secondary-foreground border border-border'
														}`}>
															{member.name.charAt(0).toUpperCase()}
														</div>
														<div className="min-w-0 max-w-[18rem]">
															<div className="flex flex-wrap items-center gap-2">
																<p className="font-bold text-stone-900 break-words">{member.name}</p>
																{isAdmin && (
																	<span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
																		Gérant
																	</span>
																)}
																{isDemo && (
																	<span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-bold">
																		Visite Démo
																	</span>
																)}
															</div>
															<p className="text-xs text-stone-500 mt-0.5 break-all">{[member.specialty, member.email].filter(Boolean).join(' · ')}</p>
														</div>
													</div>
												</td>
												<td className="px-5 py-4">
													{isAdmin ? (
														<div>
															<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
																<ShieldCheck size={13} className="text-amber-700" />
																<span>Administrateur</span>
															</span>
															<p className="text-[11px] text-stone-400 mt-1">Tous les onglets, modifications autorisées</p>
														</div>
													) : isDemo ? (
														<div>
															<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
																<Eye size={13} className="text-purple-700" />
																<span>Démo</span>
															</span>
															<p className="text-[11px] text-purple-600/80 mt-1 font-medium">Présentation commerciale en lecture seule</p>
														</div>
													) : (
														<div>
															<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-secondary text-secondary-foreground border border-border">
																<UserCheck size={13} className="text-secondary-foreground" />
																<span>Employé</span>
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
												<div className="inline-flex items-center gap-2">
													<button
														type="button"
														onClick={() => handleOpenEditMember(member)}
														className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
														title="Modifier les informations ou le mot de passe"
														aria-label={`Modifier le compte de ${member.name}`}
													>
														<Pencil size={15} />
													</button>
													<button
														type="button"
														onClick={() => handleToggleMemberStatus(member)}
														className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
														title={member.status === 'active' ? 'Suspendre cet accès' : 'Réactiver cet accès'}
														aria-label={`${member.status === 'active' ? 'Suspendre' : 'Réactiver'} l'accès de ${member.name}`}
													>
														{member.status === 'active' ? <Lock size={15} /> : <Unlock size={15} />}
													</button>
													<button
														type="button"
														onClick={() => { if (!checkReadOnly()) setDeleteConfirm({
															type: 'member',
															id: member.id,
															name: `${member.name} (${isAdmin ? 'administrateur' : isDemo ? 'compte démo' : 'employé'})`
														}); }}
														className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
														title={isAdmin ? 'Supprimer ce compte administrateur' : 'Supprimer ce compte'}
														aria-label={`Supprimer le compte de ${member.name}`}
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

			{/* ONGLET 2 : MODÉRATION & GESTION CLIENTS */}
			{activeTab === 'clients' && (
				<div className="space-y-6">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div>
							<h3 className="text-xl font-bold text-stone-900 tracking-tight">Comptes clients et modération</h3>
							<p className="text-xs text-stone-500 mt-1">
								Un client banni ne peut plus réserver en ligne. La suppression d'un compte est définitive.
							</p>
						</div>

						<div className="flex flex-wrap items-center gap-2.5">
							<button
								type="button"
								onClick={handleRefreshClients}
								disabled={isSyncing}
								className="px-3.5 py-1.5 rounded-xl border border-stone-200 bg-white text-stone-700 hover:text-stone-900 hover:border-stone-300 hover:bg-stone-50 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
								title="Recharger la liste des clients inscrits pour la démo Diamant"
							>
								<RefreshCw size={13} className={isSyncing ? 'animate-spin text-primary' : 'text-stone-500'} />
								<span>{isSyncing ? 'Synchronisation…' : 'Actualiser'}</span>
							</button>

							{/* Filtres de statut */}
							<div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl border border-stone-200">
								<button
									type="button"
									onClick={() => setClientFilter('all')}
									aria-pressed={clientFilter === 'all'}
									className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
										clientFilter === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
									}`}
								>
									Tous ({clients.length})
								</button>
								<button
									type="button"
									onClick={() => setClientFilter('active')}
									aria-pressed={clientFilter === 'active'}
									className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
										clientFilter === 'active' ? 'bg-white text-emerald-700 shadow-xs' : 'text-stone-500'
									}`}
								>
									Actifs ({clients.length - bannedCount})
								</button>
								<button
									type="button"
									onClick={() => setClientFilter('banned')}
									aria-pressed={clientFilter === 'banned'}
									className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
										clientFilter === 'banned' ? 'bg-white text-rose-700 shadow-xs' : 'text-stone-500'
									}`}
								>
									Bannis ({bannedCount})
								</button>
							</div>
						</div>
					</div>

					{/* Barre de recherche */}
					<div className="relative">
						<Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
						<input
							type="text"
							value={clientSearch}
							onChange={e => setClientSearch(e.target.value)}
							placeholder="Rechercher par nom, téléphone, email…"
							aria-label="Rechercher un client"
							className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-stone-200 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm transition-all shadow-xs"
						/>
					</div>

					{/* Liste des clients */}
					<div className="rounded-2xl border border-stone-200 bg-white overflow-x-auto shadow-xs">
						<table className={`w-full text-left text-sm ${filteredClients.length ? 'min-w-[44rem]' : ''}`}>
							<thead className="bg-stone-50 text-xs uppercase font-bold text-stone-400 border-b border-stone-100">
								<tr>
									<th className="px-5 py-3.5">Client</th>
									<th className="px-5 py-3.5">Coordonnées</th>
									<th className="px-5 py-3.5">Statut</th>
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
										const banInfo = bannedClients[client.id] || (client.is_banned || client.ban === 'oui' ? {
											clientId: client.id,
											clientName: client.full_name || 'Client',
											clientEmail: client.email || null,
											reason: client.ban_reason || 'Non-respect des conditions de réservation',
											bannedAt: client.banned_at || client.created_at || new Date().toISOString()
										} : null);
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
														<div className="min-w-0 max-w-[18rem]">
															<p className="font-bold text-stone-900 break-words">{client.full_name || 'Client'}</p>
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
																<span>Banni</span>
															</span>
															<p className="text-[11px] text-rose-600 font-medium mt-1">
																Motif : {banInfo.reason}
															</p>
														</div>
													) : (
														<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
															<CheckCircle2 size={13} />
															<span>Actif</span>
														</span>
													)}
												</td>
												<td className="px-5 py-4 text-right">
													<div className="inline-flex items-center gap-2">
														<button
															type="button"
															onClick={() => handleOpenEditClient(client)}
															className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-stone-700 hover:text-stone-900 hover:border-stone-300 hover:bg-stone-50 text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
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
																onClick={() => { if (!checkReadOnly()) setBanModalClient(client); }}
																className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-all cursor-pointer shadow-2xs"
															>
																Bannir
															</button>
														)}

														<button
															type="button"
															onClick={() => { if (!checkReadOnly()) setDeleteConfirm({ type: 'client', id: client.id, name: client.full_name || 'Client' }); }}
															className="p-1.5 rounded-lg border border-stone-200 text-stone-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
															title="Supprimer définitivement ce compte client"
															aria-label={`Supprimer le compte de ${client.full_name || 'ce client'}`}
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
						<h3 className="text-xl font-bold text-stone-900 tracking-tight">Permissions par rôle</h3>
						<p className="text-xs text-stone-500 mt-1">
							Ce que chaque rôle peut voir et modifier dans l'espace pro.
						</p>
					</div>

					<div className="rounded-2xl border border-stone-200 bg-white overflow-x-auto shadow-xs">
						<table className="w-full min-w-[48rem] text-left text-sm">
							<thead className="bg-stone-50 text-xs uppercase font-bold text-stone-400 border-b border-stone-100">
								<tr>
									<th scope="col" className="px-5 py-3.5">Onglet</th>
									<th scope="col" className="px-5 py-3.5">Administrateur</th>
									<th scope="col" className="px-5 py-3.5">Employé</th>
									<th scope="col" className="px-5 py-3.5">Démo</th>
									<th scope="col" className="px-5 py-3.5">Pourquoi</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-stone-100 text-xs">
								{PERMISSION_ROWS.map((row) => (
									<tr key={row.label}>
										<th scope="row" className="px-5 py-3.5 font-bold text-stone-900">
											<span className="flex items-center gap-2">
												<row.icon size={15} className="text-primary shrink-0" />
												<span>{row.label}</span>
											</span>
										</th>
										<td className="px-5 py-3.5"><AccessCell access="full" label={row.admin} /></td>
										<td className="px-5 py-3.5"><AccessCell access={row.employeeAccess} label={row.employee} /></td>
										<td className="px-5 py-3.5 whitespace-nowrap"><AccessCell access="read" label="Lecture seule" /></td>
										<td className="px-5 py-3.5 text-stone-500">{row.reason}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* CHOIX DU TYPE DE COMPTE */}
			{showCreateChooser && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4" onClick={() => setShowCreateChooser(false)}>
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
						<div className="flex items-center justify-between pb-4 border-b border-stone-100">
							<div>
								<h4 className="font-bold text-stone-900 text-base">Créer un compte</h4>
								<p className="text-xs text-stone-400">Choisissez le type de compte à créer</p>
							</div>
							<button
								type="button"
								onClick={() => setShowCreateChooser(false)}
								className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
								aria-label="Fermer"
							>
								<X size={18} />
							</button>
						</div>

						{confirmClientSignup ? (
							<div className="pt-4 space-y-4">
								<p className="text-sm text-stone-600">
									Le compte client se crée depuis la page d'inscription du site. Vous allez être déconnecté de l'espace pro puis redirigé vers ce formulaire.
								</p>
								<div className="flex justify-end gap-2">
									<button
										type="button"
										onClick={() => setConfirmClientSignup(false)}
										className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
									>
										Retour
									</button>
									<button
										type="button"
										onClick={goToClientSignup}
										className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors cursor-pointer"
									>
										Continuer vers l'inscription
									</button>
								</div>
							</div>
						) : (
							<div className="pt-4 grid gap-2">
								{([
									{ key: 'client', label: 'Compte utilisateur', desc: 'Client du salon : réservations, fidélité, messagerie', icon: <User size={18} />, tone: 'bg-stone-100 text-stone-700' },
									{ key: 'employee', label: 'Compte employé', desc: 'Planning, clientèle, messagerie et recherche', icon: <UserPlus size={18} />, tone: 'bg-secondary text-secondary-foreground' },
									{ key: 'admin', label: 'Compte administrateur', desc: 'Accès à tous les onglets et à la gestion', icon: <ShieldCheck size={18} />, tone: 'bg-amber-100 text-amber-700' },
									{ key: 'demo', label: 'Compte démo', desc: 'Présentation commerciale en lecture seule', icon: <Eye size={18} />, tone: 'bg-purple-100 text-purple-700' },
								] as const).map((option) => (
									<button
										key={option.key}
										type="button"
										onClick={() => (option.key === 'client' ? setConfirmClientSignup(true) : chooseAccountType(option.key))}
										className="flex items-center gap-3 w-full rounded-xl border border-stone-200 p-3 text-left hover:border-stone-300 hover:bg-stone-50 transition-colors cursor-pointer"
									>
										<span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${option.tone}`}>{option.icon}</span>
										<span>
											<span className="block text-sm font-bold text-stone-900">{option.label}</span>
											<span className="block text-xs text-stone-400">{option.desc}</span>
										</span>
									</button>
								))}
							</div>
						)}
					</div>
				</div>
			)}

			{/* MODAL AJOUT EMPLOYÉ / ADMIN / DÉMO */}
			{showAddModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95" role="dialog" aria-modal="true">
						<div className="flex items-center justify-between pb-4 border-b border-stone-100">
							<div className="flex items-center gap-2.5">
								<div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
									newMemberRole === 'admin' 
										? 'bg-amber-100 text-amber-700' 
										: newMemberRole === 'demo'
										? 'bg-purple-100 text-purple-700'
										: 'bg-secondary text-secondary-foreground'
								}`}>
									{newMemberRole === 'admin' ? <ShieldCheck size={18} /> : newMemberRole === 'demo' ? <Eye size={18} /> : <UserPlus size={18} />}
								</div>
								<div>
									<h4 className="font-bold text-stone-900 text-base">
										{newMemberRole === 'admin' 
											? 'Nouveau compte administrateur' 
											: newMemberRole === 'demo' 
											? 'Nouveau compte démo' 
											: 'Nouveau compte employé'}
									</h4>
									<p className="text-xs text-stone-400">
										{newMemberRole === 'admin' 
											? 'Accès à tous les onglets et à la gestion' 
											: newMemberRole === 'demo'
											? 'Présentation commerciale en lecture seule'
											: 'Planning, clientèle, messagerie et recherche'}
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setShowAddModal(false)}
								className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg cursor-pointer"
								aria-label="Fermer"
							>
								<X size={18} />
							</button>
						</div>

						<form onSubmit={handleCreateMember} className="mt-4 space-y-4">
							<div>
								<label htmlFor="rights-field-1" className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
									Nom complet *
								</label>
								<input id="rights-field-1"
									type="text"
									required
									value={newMemberName}
									maxLength={MAX_NAME_LENGTH}
									onChange={e => setNewMemberName(e.target.value)}
									placeholder="Ex : Sarah Bernard"
									className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm focus:border-primary focus:bg-white focus:outline-none transition-all"
								/>
							</div>

							<div>
								<label htmlFor="rights-field-2" className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
									Adresse email (identifiant de connexion) *
								</label>
								<input id="rights-field-2"
									type="email"
									required
									value={newMemberEmail}
									onChange={e => setNewMemberEmail(e.target.value)}
									placeholder="Ex : sarah@diamant-prestige.fr"
									className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm focus:border-primary focus:bg-white focus:outline-none transition-all"
								/>
							</div>

							<div>
								<label htmlFor="rights-field-3" className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
									Mot de passe initial *
								</label>
								<div className="relative">
									<input id="rights-field-3"
										type={showNewPassword ? 'text' : 'password'}
										required
										minLength={6}
										value={newMemberPassword}
										onChange={e => setNewMemberPassword(e.target.value)}
										placeholder="Minimum 6 caractères"
										className="w-full rounded-xl border border-stone-200 bg-stone-50 pl-3.5 pr-11 py-2.5 text-sm focus:border-primary focus:bg-white focus:outline-none transition-all"
									/>
									<button
										type="button"
										onClick={() => setShowNewPassword(!showNewPassword)}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 rounded-md transition-colors cursor-pointer"
										title={showNewPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
										aria-label={showNewPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
									>
										{showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
									</button>
								</div>
								<p className="text-[11px] text-stone-400 mt-1">
									Utilisable tout de suite sur la page de connexion.
								</p>
							</div>

							<div>
								<label htmlFor="rights-field-4" className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
									Spécialité / Fonction
								</label>
								<input id="rights-field-4"
									type="text"
									value={newMemberSpecialty}
									onChange={e => setNewMemberSpecialty(e.target.value)}
									placeholder={newMemberRole === 'admin' ? "Ex : Co-gérant / Responsable" : newMemberRole === 'demo' ? "Ex : Compte Découverte Visiteur" : "Ex : Experte Soins & Brushing"}
									className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm focus:border-primary focus:bg-white focus:outline-none transition-all"
								/>
							</div>

							<div>
								<p className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
									Rôle assigné
								</p>
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
									<button
										type="button"
										onClick={() => setNewMemberRole('admin')}
										className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
											newMemberRole === 'admin' 
												? 'border-amber-500 bg-amber-50/80 ring-1 ring-amber-300' 
												: 'border-stone-200 hover:border-stone-300'
										}`}
									>
										<div className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
											<ShieldCheck size={14} className="text-amber-600" />
											<span>Admin</span>
										</div>
										<p className="text-[10px] text-stone-500 mt-0.5">Accès total</p>
									</button>
									<button
										type="button"
										onClick={() => setNewMemberRole('employee')}
										className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
											newMemberRole === 'employee' 
												? 'border-primary bg-secondary/60 ring-1 ring-primary/40' 
												: 'border-stone-200 hover:border-stone-300'
										}`}
									>
										<div className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
											<UserCheck size={14} className="text-primary" />
											<span>Employé</span>
										</div>
										<p className="text-[10px] text-stone-500 mt-0.5">4 onglets</p>
									</button>
									<button
										type="button"
										onClick={() => setNewMemberRole('demo')}
										className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
											newMemberRole === 'demo' 
												? 'border-purple-500 bg-purple-50/80 ring-1 ring-purple-300' 
												: 'border-stone-200 hover:border-stone-300'
										}`}
									>
										<div className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
											<Eye size={14} className="text-purple-600" />
											<span>Démo</span>
										</div>
										<p className="text-[10px] text-stone-500 mt-0.5">Lecture seule</p>
									</button>
								</div>
							</div>

							<div className="pt-2 flex items-center justify-end gap-2.5">
								<button
									type="button"
									onClick={() => setShowAddModal(false)}
									className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-bold hover:bg-stone-50 cursor-pointer"
								>
									Annuler
								</button>
								<button
									type="submit"
									className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-xs cursor-pointer transition-all ${
										newMemberRole === 'admin' 
											? 'bg-amber-600 hover:bg-amber-700' 
											: newMemberRole === 'demo'
											? 'bg-purple-600 hover:bg-purple-700'
											: 'bg-stone-900 hover:bg-stone-800'
									}`}
								>
									{newMemberRole === 'admin' 
										? 'Créer le compte administrateur' 
										: newMemberRole === 'demo'
										? 'Créer le compte démo'
										: 'Créer le compte employé'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* MODAL MODIFIER COMPTE (ADMIN / EMPLOYÉ / DÉMO) */}
			{editMemberModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95" role="dialog" aria-modal="true">
						<div className="flex items-center justify-between pb-4 border-b border-stone-100">
							<div className="flex items-center gap-2.5">
								<div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
									editMemberRole === 'admin' 
										? 'bg-amber-100 text-amber-700' 
										: editMemberRole === 'demo'
										? 'bg-purple-100 text-purple-700'
										: 'bg-secondary text-secondary-foreground'
								}`}>
									<Pencil size={18} />
								</div>
								<div>
									<h4 className="font-bold text-stone-900 text-base">
										Modifier le compte
									</h4>
									<p className="text-xs text-stone-400">
										Mise à jour des coordonnées, rôle et mot de passe
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setEditMemberModal(null)}
								className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg cursor-pointer"
								aria-label="Fermer"
							>
								<X size={18} />
							</button>
						</div>

						<form onSubmit={handleSaveMemberSubmit} className="mt-4 space-y-4">
							<div>
								<label htmlFor="rights-field-5" className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
									Nom complet *
								</label>
								<input id="rights-field-5"
									type="text"
									required
									value={editMemberName}
									maxLength={MAX_NAME_LENGTH}
									onChange={e => setEditMemberName(e.target.value)}
									placeholder="Ex : Sarah Bernard"
									className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm focus:border-primary focus:bg-white focus:outline-none transition-all"
								/>
							</div>

							<div>
								<label htmlFor="rights-field-6" className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
									Adresse email (identifiant de connexion) *
								</label>
								<input id="rights-field-6"
									type="email"
									required
									value={editMemberEmail}
									onChange={e => setEditMemberEmail(e.target.value)}
									placeholder="Ex : sarah@diamant-prestige.fr"
									className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm focus:border-primary focus:bg-white focus:outline-none transition-all"
								/>
							</div>

							<div>
								<label htmlFor="rights-field-7" className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
									Nouveau mot de passe (optionnel)
								</label>
								<div className="relative">
									<input id="rights-field-7"
										type={showEditPassword ? 'text' : 'password'}
										minLength={6}
										value={editMemberPassword}
										onChange={e => setEditMemberPassword(e.target.value)}
										placeholder="Laisser vide pour ne pas modifier"
										className="w-full rounded-xl border border-stone-200 bg-stone-50 pl-3.5 pr-11 py-2.5 text-sm focus:border-primary focus:bg-white focus:outline-none transition-all"
									/>
									<button
										type="button"
										onClick={() => setShowEditPassword(!showEditPassword)}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 rounded-md transition-colors cursor-pointer"
										title={showEditPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
										aria-label={showEditPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
									>
										{showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
									</button>
								</div>
								<p className="text-[11px] text-stone-400 mt-1">
									Mot de passe utilisé sur la page de connexion.
								</p>
							</div>

							<div>
								<label htmlFor="rights-field-8" className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
									Spécialité / Fonction
								</label>
								<input id="rights-field-8"
									type="text"
									value={editMemberSpecialty}
									onChange={e => setEditMemberSpecialty(e.target.value)}
									placeholder="Ex : Co-gérant / Responsable"
									className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm focus:border-primary focus:bg-white focus:outline-none transition-all"
								/>
							</div>

							<div>
								<p className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
									Rôle assigné
								</p>
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
									<button
										type="button"
										onClick={() => setEditMemberRole('admin')}
										className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
											editMemberRole === 'admin' 
												? 'border-amber-500 bg-amber-50/80 ring-1 ring-amber-300' 
												: 'border-stone-200 hover:border-stone-300'
										}`}
									>
										<div className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
											<ShieldCheck size={14} className="text-amber-600" />
											<span>Admin</span>
										</div>
										<p className="text-[10px] text-stone-500 mt-0.5">Accès total</p>
									</button>
									<button
										type="button"
										onClick={() => setEditMemberRole('employee')}
										className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
											editMemberRole === 'employee' 
												? 'border-primary bg-secondary/60 ring-1 ring-primary/40' 
												: 'border-stone-200 hover:border-stone-300'
										}`}
									>
										<div className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
											<UserCheck size={14} className="text-primary" />
											<span>Employé</span>
										</div>
										<p className="text-[10px] text-stone-500 mt-0.5">4 onglets</p>
									</button>
									<button
										type="button"
										onClick={() => setEditMemberRole('demo')}
										className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
											editMemberRole === 'demo' 
												? 'border-purple-500 bg-purple-50/80 ring-1 ring-purple-300' 
												: 'border-stone-200 hover:border-stone-300'
										}`}
									>
										<div className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
											<Eye size={14} className="text-purple-600" />
											<span>Démo</span>
										</div>
										<p className="text-[10px] text-stone-500 mt-0.5">Lecture seule</p>
									</button>
								</div>
							</div>

							<div className="pt-2 flex items-center justify-end gap-2.5">
								<button
									type="button"
									onClick={() => setEditMemberModal(null)}
									className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-bold hover:bg-stone-50 cursor-pointer"
								>
									Annuler
								</button>
								<button
									type="submit"
									disabled={isSavingMember}
									className="px-5 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
								>
									{isSavingMember ? (
										<span>Enregistrement…</span>
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

			{/* MODAL BANNIR CLIENT */}
			{banModalClient && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95" role="dialog" aria-modal="true">
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
								<label htmlFor="rights-field-9" className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
									Motif de la sanction
								</label>
								<select id="rights-field-9"
									value={banReason}
									onChange={e => setBanReason(e.target.value)}
									className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs focus:border-primary focus:outline-none"
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
										placeholder="Précisez la raison du bannissement…"
										aria-label="Motif personnalisé"
										className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs focus:border-primary focus:outline-none"
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
					<div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95" role="dialog" aria-modal="true">
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
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95" role="dialog" aria-modal="true">
						<div className="flex items-center justify-between pb-4 border-b border-stone-100">
							<div className="flex items-center gap-2.5">
								<div className="w-9 h-9 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center">
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
								aria-label="Fermer"
							>
								<X size={18} />
							</button>
						</div>

						<form onSubmit={handleSaveClientSubmit} className="mt-4 space-y-4">
							<div>
								<label htmlFor="rights-field-10" className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
									Nom complet *
								</label>
								<input id="rights-field-10"
									type="text"
									required
									value={editFullName}
									maxLength={MAX_NAME_LENGTH}
									onChange={e => setEditFullName(e.target.value)}
									placeholder="Ex : Sophie Martin"
									className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm focus:border-primary focus:bg-white focus:outline-none transition-all"
								/>
							</div>

							<div>
								<label htmlFor="rights-field-11" className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
									Téléphone
								</label>
								<input id="rights-field-11"
									type="tel"
									value={editPhone}
									onChange={e => setEditPhone(e.target.value)}
									placeholder="Ex : 06 12 34 56 78"
									className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm focus:border-primary focus:bg-white focus:outline-none transition-all"
								/>
							</div>

							<div>
								<label htmlFor="rights-field-12" className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
									Adresse email
								</label>
								<input id="rights-field-12"
									type="email"
									value={editEmail}
									onChange={e => setEditEmail(e.target.value)}
									placeholder="Ex : sophie.martin@email.com"
									className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm focus:border-primary focus:bg-white focus:outline-none transition-all"
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
									className="px-5 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
								>
									{isSavingClient ? (
										<span>Enregistrement…</span>
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
