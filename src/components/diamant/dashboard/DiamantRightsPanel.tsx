import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
	getActiveProRole, 
	getRealProRole,
	setActiveProRole, 
	refreshTeamMembers,
	loadProContext,
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
import { motion, useReducedMotion } from 'motion/react';
import { Avatar, EtatVide, Fenetre, Pastille } from './kit/primitives';
import { informer } from './kit/notifier';
import { publierClients } from './kit/indexClients';
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
			<span className="inline-flex items-center gap-1.5 font-medium text-dx-ok">
				<Check size={14} className="shrink-0" />
				<span>{label}</span>
			</span>
		);
	}
	if (access === 'read') {
		return (
			<span className="inline-flex items-center gap-1.5 font-medium text-dx-encre-2">
				<Eye size={14} className="shrink-0 text-dx-gris" />
				<span>{label}</span>
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1.5 font-medium text-dx-gris">
			<X size={14} className="shrink-0 text-dx-alerte" />
			<span>{label}</span>
		</span>
	);
}

export default function DiamantRightsPanel() {
	const [activeRole, setActiveRole] = useState<ProRole>('admin');
	const [realRole, setRealRole] = useState<ProRole | null>(null);
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
	const [newMemberPassword, setNewMemberPassword] = useState('');
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

	// Notifications : sonner (îlot DiamantToaster du layout), mêmes messages qu'avant.
	function showToast(msg: string) {
		informer(msg);
	}
	const reduit = useReducedMotion();

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
		setRealRole(getRealProRole());

		async function init() {
			const tag = getDemoTag();
			const ctx = await loadProContext();
			setRealRole(getRealProRole());
			const pro = ctx ? null : await getPrimaryProfessional(tag).catch(() => null);
			const effectiveId = ctx?.professional_id || pro?.id || 'eff1f7ef-33ee-49a2-9e4f-52ab675a4dc7';
			setProId(effectiveId);

			// Équipe chargée depuis la base (visible par les administrateurs)
			setMembers(await refreshTeamMembers());

			// Load clients
			const all = await getAllClients(effectiveId, tag, DEMO_DIAMANT_CLIENTS);
			setClients(all);
			publierClients(all);

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
		setEditMemberPassword('');
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
		if (editMemberPassword && editMemberPassword.length < 8) {
			showToast("Le mot de passe doit comporter au moins 8 caractères.");
			return;
		}

		setIsSavingMember(true);
		try {
			const changes: Partial<TeamMember> & { password?: string } = {
				name: editMemberName.trim(),
				email: editMemberEmail.trim(),
				specialty: editMemberSpecialty.trim(),
				role: editMemberRole,
				...(editMemberPassword ? { password: editMemberPassword } : {})
			};

			await updateTeamMember(proId, editMemberModal.id, changes);

			// Si le compte modifié est la session active, synchroniser la session locale
			const currentSession = getProSession();
			if (currentSession && currentSession.id === editMemberModal.id) {
				// Le rôle réel vient de la base : on le recharge au lieu de le forcer côté navigateur.
				await loadProContext();
				setActiveRole(getActiveProRole());
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

	async function handleCreateMember(e: React.FormEvent) {
		e.preventDefault();
		if (checkReadOnly()) return;
		if (!newMemberName.trim() || !newMemberEmail.trim()) return;
		if (members.some(m => m.email.toLowerCase() === newMemberEmail.trim().toLowerCase())) {
			showToast('Un compte utilise déjà cette adresse email.');
			return;
		}
		if (!newMemberPassword || newMemberPassword.length < 8) {
			showToast("Le mot de passe doit comporter au moins 8 caractères.");
			return;
		}

		let created: TeamMember;
		try {
			created = await addTeamMember(proId, {
				name: newMemberName.trim(),
				email: newMemberEmail.trim(),
				role: newMemberRole,
				specialty: newMemberSpecialty.trim() || (newMemberRole === 'admin' ? 'Co-gérant / Administrateur' : newMemberRole === 'demo' ? 'Compte Visite Démo' : 'Coiffeur(se) Artisan'),
				password: newMemberPassword
			});
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Création du compte impossible.');
			return;
		}

		setShowAddModal(false);
		setNewMemberName('');
		setNewMemberEmail('');
		setNewMemberSpecialty('');
		setNewMemberPassword('');
		setShowNewPassword(false);
		showToast(
			created.role === 'admin'
				? `Compte administrateur créé pour ${created.name}. Connexion avec ${created.email}.`
				: created.role === 'demo'
				? `Compte démo créé pour ${created.name}. Connexion avec ${created.email}.`
				: `Compte employé créé pour ${created.name}. Connexion avec ${created.email}.`
		);
	}

	async function handleToggleMemberStatus(member: TeamMember) {
		if (checkReadOnly()) return;
		const nextStatus = member.status === 'active' ? 'suspended' : 'active';
		try {
			await updateTeamMember(proId, member.id, { status: nextStatus });
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Mise à jour impossible.');
			return;
		}
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

		try {
			await banClient(banModalClient.id, banModalClient.full_name || 'Client', finalReason, resolvedEmail);
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Bannissement impossible.');
			return;
		}

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
		try {
			await unbanClient(client.id);
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Action impossible.');
			return;
		}

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
			try {
				await deleteTeamMember(proId, deleteConfirm.id);
			} catch (err) {
				showToast(err instanceof Error ? err.message : 'Suppression impossible.');
				setDeleteConfirm(null);
				return;
			}
			showToast(`Compte ${deleteConfirm.name} supprimé.`);
		} else {
			try {
				await deleteClientAccount(deleteConfirm.id);
			} catch (err) {
				showToast(err instanceof Error ? err.message : 'Suppression impossible.');
				setDeleteConfirm(null);
				return;
			}
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

	const libelleRole = (r: ProRole) => (r === 'admin' ? 'Administrateur' : r === 'demo' ? 'Démo' : 'Employé');

	// Sélecteur de rôle réutilisé dans les fenêtres de création et de modification
	function choixRole(valeur: ProRole, changer: (r: ProRole) => void) {
		return (
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Rôle assigné">
				{([
					{ r: 'admin', icon: <ShieldCheck size={15} />, titre: 'Admin', aide: 'Accès total' },
					{ r: 'employee', icon: <UserCheck size={15} />, titre: 'Employé', aide: '4 onglets' },
					{ r: 'demo', icon: <Eye size={15} />, titre: 'Démo', aide: 'Lecture seule' },
				] as const).map((o) => {
					const actif = valeur === o.r;
					return (
						<button
							key={o.r}
							type="button"
							role="radio"
							aria-checked={actif}
							onClick={() => changer(o.r)}
							className={`rounded-xl border p-3 text-left transition-colors ${actif ? 'border-dx-terre bg-dx-terre-pale/60 shadow-[0_0_0_1px_var(--dx-terre)]' : 'border-dx-filet-fort hover:border-dx-encre'}`}
						>
							<span className={`flex items-center gap-1.5 text-sm font-semibold ${actif ? 'text-dx-terre-fonce' : 'text-dx-encre'}`}>
								{o.icon} {o.titre}
							</span>
							<span className="mt-0.5 block text-xs text-dx-gris">{o.aide}</span>
						</button>
					);
				})}
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* En-tête : titre de la page et aperçu de l'espace selon le rôle */}
			<header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
				<div className="min-w-0">
					<h1 className="dx-titre">Gestion <em>des droits</em></h1>
					<p className="dx-sous-titre">
						Comptes de l'équipe, modération des clients et règles d'accès à l'espace pro.
					</p>
				</div>

				{realRole === 'admin' && (
				<div className="shrink-0">
					<p id="diamant-role-preview" className="mb-2 text-sm font-semibold text-dx-encre">Voir l'espace en tant que</p>
					<div role="radiogroup" aria-labelledby="diamant-role-preview" className="dx-segments">
						{ROLE_OPTIONS.map((option) => {
							const selected = activeRole === option.role;
							return (
								<button
									key={option.role}
									type="button"
									role="radio"
									aria-checked={selected}
									onClick={() => handleSwitchRole(option.role)}
									className="dx-segment"
								>
									{selected && (
										<motion.span
											layoutId="dx-droits-role"
											className="dx-segment-fond"
											transition={reduit ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }}
										/>
									)}
									{option.label}
								</button>
							);
						})}
					</div>
					<p className="mt-2 text-xs text-dx-gris">
						{activeRole === 'demo'
							? 'Lecture seule : les modifications sont bloquées.'
							: 'Accès complet, modifications autorisées.'}
					</p>
				</div>
				)}
			</header>

			{/* Navigation interne des onglets */}
			<div role="tablist" aria-label="Sections de la gestion des droits" className="dx-onglets">
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
							className="dx-onglet"
						>
							<span className={selected ? 'text-dx-terre' : 'text-dx-sable'}>{tab.icon}</span>
							<span>{tab.label}</span>
							{tab.count !== null && <span className="dx-compte">{tab.count}</span>}
							{tab.key === 'clients' && bannedCount > 0 && (
								<Pastille ton="alerte" nu className="!py-0 !text-[11px]">
									{bannedCount} {bannedCount > 1 ? 'bannis' : 'banni'}
								</Pastille>
							)}
							{selected && (
								<motion.span
									layoutId="dx-droits-onglet"
									className="dx-onglet-trait"
									transition={reduit ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 38 }}
								/>
							)}
						</button>
					);
				})}
			</div>

			{/* ONGLET 1 : ÉQUIPE & COMPTES EMPLOYÉS */}
			{activeTab === 'team' && (
				<div className="space-y-5">
					<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
						<div>
							<h3 className="dx-h2">Comptes de l'équipe</h3>
							<p className="dx-meta mt-1">
								Les employés n'ont accès qu'au planning, à la clientèle, à la messagerie et à la recherche.
							</p>
						</div>
						<button type="button" onClick={openCreateChooser} className="dx-btn dx-btn--encre self-start sm:self-auto">
							<Plus size={15} />
							<span>Créer un compte</span>
						</button>
					</div>

					<div className="dx-carte overflow-x-auto">
						{members.length === 0 ? (
							<EtatVide
								dessin="clients"
								titre="Aucun compte configuré pour le moment."
								action={
									<button type="button" onClick={openCreateChooser} className="dx-btn dx-btn--sm dx-btn--encre">
										<Plus size={14} />
										<span>Créer un compte</span>
									</button>
								}
							/>
						) : (
						<table className="dx-table min-w-[44rem]">
							<thead>
								<tr>
									<th>Membre</th>
									<th>Rôle</th>
									<th>Statut</th>
									<th className="text-right">Actions</th>
								</tr>
							</thead>
							<tbody>
								{members.map((member) => {
									const isAdmin = member.role === 'admin';
									const isDemo = member.role === 'demo';
									return (
										<tr key={member.id}>
											<td>
												<div className="flex items-center gap-3">
													<Avatar nom={member.name} taille={38} ton={isAdmin ? 'encre' : isDemo ? undefined : 'terre'} />
													<div className="min-w-0 max-w-[18rem]">
														<div className="flex flex-wrap items-center gap-2">
															<p className="break-words font-semibold text-dx-encre">{member.name}</p>
															{isAdmin && <Pastille ton="encre" nu className="!py-0 !text-[11px]">Gérant</Pastille>}
															{isDemo && <Pastille ton="neutre" nu className="!py-0 !text-[11px]">Visite Démo</Pastille>}
														</div>
														<p className="mt-0.5 break-all text-xs text-dx-gris">{[member.specialty, member.email].filter(Boolean).join(' · ')}</p>
													</div>
												</div>
											</td>
											<td>
												{isAdmin ? (
													<div>
														<span className="inline-flex items-center gap-1.5 text-sm font-semibold text-dx-encre">
															<ShieldCheck size={14} className="text-dx-terre" /> Administrateur
														</span>
														<p className="mt-0.5 text-xs text-dx-gris">Tous les onglets, modifications autorisées</p>
													</div>
												) : isDemo ? (
													<div>
														<span className="inline-flex items-center gap-1.5 text-sm font-semibold text-dx-encre">
															<Eye size={14} className="text-dx-gris" /> Démo
														</span>
														<p className="mt-0.5 text-xs text-dx-gris">Présentation commerciale en lecture seule</p>
													</div>
												) : (
													<div>
														<span className="inline-flex items-center gap-1.5 text-sm font-semibold text-dx-encre">
															<UserCheck size={14} className="text-dx-terre" /> Employé
														</span>
														<div className="mt-1.5 flex flex-wrap gap-1">
															{['Planning', 'Clientèle', 'Messagerie', 'Recherche'].map((t) => (
																<span key={t} className="rounded-md bg-dx-ivoire-2 px-1.5 py-0.5 text-[11px] font-medium text-dx-encre-2">{t}</span>
															))}
														</div>
													</div>
												)}
											</td>
											<td>
												<Pastille ton={member.status === 'active' ? 'ok' : 'neutre'}>
													{member.status === 'active' ? 'Actif' : 'Suspendu'}
												</Pastille>
											</td>
											<td className="text-right">
												<div className="inline-flex items-center gap-1">
													<button
														type="button"
														onClick={() => handleOpenEditMember(member)}
														className="dx-icone-btn"
														title="Modifier les informations ou le mot de passe"
														aria-label={`Modifier le compte de ${member.name}`}
													>
														<Pencil size={16} />
													</button>
													<button
														type="button"
														onClick={() => handleToggleMemberStatus(member)}
														className="dx-icone-btn"
														title={member.status === 'active' ? 'Suspendre cet accès' : 'Réactiver cet accès'}
														aria-label={`${member.status === 'active' ? 'Suspendre' : 'Réactiver'} l'accès de ${member.name}`}
													>
														{member.status === 'active' ? <Lock size={16} /> : <Unlock size={16} />}
													</button>
													<button
														type="button"
														onClick={() => { if (!checkReadOnly()) setDeleteConfirm({
															type: 'member',
															id: member.id,
															name: `${member.name} (${isAdmin ? 'administrateur' : isDemo ? 'compte démo' : 'employé'})`
														}); }}
														className="dx-icone-btn hover:!bg-dx-alerte-pale hover:!text-dx-alerte"
														title={isAdmin ? 'Supprimer ce compte administrateur' : 'Supprimer ce compte'}
														aria-label={`Supprimer le compte de ${member.name}`}
													>
														<Trash2 size={16} />
													</button>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
						)}
					</div>
				</div>
			)}

			{/* ONGLET 2 : MODÉRATION & GESTION CLIENTS */}
			{activeTab === 'clients' && (
				<div className="space-y-5">
					<div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
						<div>
							<h3 className="dx-h2">Comptes clients et modération</h3>
							<p className="dx-meta mt-1">
								Un client banni ne peut plus réserver en ligne. La suppression d'un compte est définitive.
							</p>
						</div>

						<div className="flex flex-wrap items-center gap-2.5">
							<button
								type="button"
								onClick={handleRefreshClients}
								disabled={isSyncing}
								className="dx-btn dx-btn--sm dx-btn--ligne"
								title="Recharger la liste des clients inscrits pour la démo Diamant"
							>
								<RefreshCw size={13} className={isSyncing ? 'animate-spin text-dx-terre' : ''} />
								<span>{isSyncing ? 'Synchronisation…' : 'Actualiser'}</span>
							</button>

							{/* Filtres de statut */}
							<div className="dx-segments" role="group" aria-label="Filtrer par statut">
								{([
									{ k: 'all', label: `Tous (${clients.length})` },
									{ k: 'active', label: `Actifs (${clients.length - bannedCount})` },
									{ k: 'banned', label: `Bannis (${bannedCount})` },
								] as const).map((f) => (
									<button
										key={f.k}
										type="button"
										onClick={() => setClientFilter(f.k)}
										aria-pressed={clientFilter === f.k}
										className="dx-segment !text-xs"
									>
										{clientFilter === f.k && (
											<motion.span
												layoutId="dx-droits-filtre"
												className="dx-segment-fond"
												transition={reduit ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }}
											/>
										)}
										{f.label}
									</button>
								))}
							</div>
						</div>
					</div>

					{/* Barre de recherche */}
					<div className="dx-recherche max-w-md">
						<Search size={16} />
						<input
							type="search"
							value={clientSearch}
							onChange={e => setClientSearch(e.target.value)}
							placeholder="Rechercher par nom, téléphone, email…"
							aria-label="Rechercher un client"
							className="dx-champ"
						/>
					</div>

					{/* Liste des clients */}
					<div className="dx-carte overflow-x-auto">
						{filteredClients.length === 0 ? (
							<EtatVide dessin="clients" titre="Aucun client ne correspond aux critères de sélection." />
						) : (
						<table className="dx-table min-w-[46rem]">
							<thead>
								<tr>
									<th>Client</th>
									<th>Coordonnées</th>
									<th>Statut</th>
									<th className="text-right">Actions</th>
								</tr>
							</thead>
							<tbody>
								{filteredClients.map((client) => {
									const banInfo = bannedClients[client.id] || (client.is_banned || client.ban === 'oui' ? {
										clientId: client.id,
										clientName: client.full_name || 'Client',
										clientEmail: client.email || null,
										reason: client.ban_reason || 'Non-respect des conditions de réservation',
										bannedAt: client.banned_at || client.created_at || new Date().toISOString()
									} : null);
									const isBanned = !!banInfo;

									return (
										<tr key={client.id}>
											<td>
												<div className="flex items-center gap-3">
													<Avatar nom={client.full_name || 'Client'} taille={36} ton={isBanned ? 'alerte' : undefined} />
													<div className="min-w-0 max-w-[18rem]">
														<p className="break-words font-semibold text-dx-encre">{client.full_name || 'Client'}</p>
														<p className="mt-0.5 text-xs text-dx-gris">
															Inscrit le {new Date(client.created_at).toLocaleDateString('fr-FR')}
														</p>
													</div>
												</div>
											</td>
											<td>
												<p className="dx-tabulaire text-sm text-dx-encre">{client.phone || 'Tél. non renseigné'}</p>
												<p className="mt-0.5 text-xs text-dx-gris">{client.email || 'Email non renseigné'}</p>
											</td>
											<td>
												{isBanned ? (
													<div>
														<Pastille ton="alerte">Banni</Pastille>
														<p className="mt-1 max-w-[14rem] text-xs text-dx-alerte">Motif : {banInfo.reason}</p>
													</div>
												) : (
													<Pastille ton="ok">Actif</Pastille>
												)}
											</td>
											<td className="text-right">
												<div className="inline-flex items-center gap-1.5">
													<button
														type="button"
														onClick={() => handleOpenEditClient(client)}
														className="dx-btn dx-btn--sm dx-btn--fantome"
														title="Modifier les coordonnées du client"
													>
														<Pencil size={13} />
														<span>Modifier</span>
													</button>

													{isBanned ? (
														<button type="button" onClick={() => handleUnban(client)} className="dx-btn dx-btn--sm dx-btn--ligne !text-dx-ok">
															Débannir
														</button>
													) : (
														<button
															type="button"
															onClick={() => { if (!checkReadOnly()) setBanModalClient(client); }}
															className="dx-btn dx-btn--sm dx-btn--ligne !text-dx-alerte"
														>
															Bannir
														</button>
													)}

													<button
														type="button"
														onClick={() => { if (!checkReadOnly()) setDeleteConfirm({ type: 'client', id: client.id, name: client.full_name || 'Client' }); }}
														className="dx-icone-btn hover:!bg-dx-alerte-pale hover:!text-dx-alerte"
														title="Supprimer définitivement ce compte client"
														aria-label={`Supprimer le compte de ${client.full_name || 'ce client'}`}
													>
														<Trash2 size={16} />
													</button>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
						)}
					</div>
				</div>
			)}

			{/* ONGLET 3 : MATRICE DES PERMISSIONS */}
			{activeTab === 'matrix' && (
				<div className="space-y-5">
					<div>
						<h3 className="dx-h2">Permissions par rôle</h3>
						<p className="dx-meta mt-1">Ce que chaque rôle peut voir et modifier dans l'espace pro.</p>
					</div>

					<div className="dx-carte overflow-x-auto">
						<table className="dx-table min-w-[48rem]">
							<thead>
								<tr>
									<th scope="col">Onglet</th>
									<th scope="col">Administrateur</th>
									<th scope="col">Employé</th>
									<th scope="col">Démo</th>
									<th scope="col">Pourquoi</th>
								</tr>
							</thead>
							<tbody className="text-[0.8125rem]">
								{PERMISSION_ROWS.map((row) => (
									<tr key={row.label}>
										<th scope="row" className="!border-b !border-dx-filet !bg-transparent !px-4 !py-3 text-left font-semibold text-dx-encre">
											<span className="flex items-center gap-2">
												<row.icon size={15} className="shrink-0 text-dx-terre" />
												<span>{row.label}</span>
											</span>
										</th>
										<td><AccessCell access="full" label={row.admin} /></td>
										<td><AccessCell access={row.employeeAccess} label={row.employee} /></td>
										<td className="whitespace-nowrap"><AccessCell access="read" label="Lecture seule" /></td>
										<td className="text-dx-gris">{row.reason}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* CHOIX DU TYPE DE COMPTE */}
			<Fenetre
				ouvert={showCreateChooser}
				onClose={() => setShowCreateChooser(false)}
				titre="Créer un compte"
				sousTitre="Choisissez le type de compte à créer"
				icone={<Plus size={18} />}
			>
				{confirmClientSignup ? (
					<div className="space-y-4">
						<p className="text-sm text-dx-encre-2">
							Le compte client se crée depuis la page d'inscription du site. Vous allez être déconnecté de l'espace pro puis redirigé vers ce formulaire.
						</p>
						<div className="flex justify-end gap-2">
							<button type="button" onClick={() => setConfirmClientSignup(false)} className="dx-btn dx-btn--sm dx-btn--ligne">
								Retour
							</button>
							<button type="button" onClick={goToClientSignup} className="dx-btn dx-btn--sm dx-btn--encre">
								Continuer vers l'inscription
							</button>
						</div>
					</div>
				) : (
					<div className="grid gap-2">
						{([
							{ key: 'client', label: 'Compte utilisateur', desc: 'Client du salon : réservations, fidélité, messagerie', icon: <User size={18} /> },
							{ key: 'employee', label: 'Compte employé', desc: 'Planning, clientèle, messagerie et recherche', icon: <UserPlus size={18} /> },
							{ key: 'admin', label: 'Compte administrateur', desc: 'Accès à tous les onglets et à la gestion', icon: <ShieldCheck size={18} /> },
							{ key: 'demo', label: 'Compte démo', desc: 'Présentation commerciale en lecture seule', icon: <Eye size={18} /> },
						] as const).map((option) => (
							<button
								key={option.key}
								type="button"
								onClick={() => (option.key === 'client' ? setConfirmClientSignup(true) : chooseAccountType(option.key))}
								className="group flex w-full items-center gap-3 rounded-xl border border-dx-filet p-3 text-left transition-colors hover:border-dx-encre hover:bg-dx-ivoire"
							>
								<span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-dx-ivoire-2 text-dx-terre">{option.icon}</span>
								<span className="flex-1">
									<span className="block text-sm font-semibold text-dx-encre">{option.label}</span>
									<span className="block text-xs text-dx-gris">{option.desc}</span>
								</span>
							</button>
						))}
					</div>
				)}
			</Fenetre>

			{/* MODAL AJOUT EMPLOYÉ / ADMIN / DÉMO */}
			<Fenetre
				ouvert={showAddModal}
				onClose={() => setShowAddModal(false)}
				fermerSurVoile={false}
				icone={newMemberRole === 'admin' ? <ShieldCheck size={18} /> : newMemberRole === 'demo' ? <Eye size={18} /> : <UserPlus size={18} />}
				titre={newMemberRole === 'admin' ? 'Nouveau compte administrateur' : newMemberRole === 'demo' ? 'Nouveau compte démo' : 'Nouveau compte employé'}
				sousTitre={newMemberRole === 'admin' ? 'Accès à tous les onglets et à la gestion' : newMemberRole === 'demo' ? 'Présentation commerciale en lecture seule' : 'Planning, clientèle, messagerie et recherche'}
			>
				<form onSubmit={handleCreateMember} className="space-y-4">
					<div>
						<label htmlFor="rights-field-1" className="dx-champ-label">Nom complet *</label>
						<input id="rights-field-1" type="text" required value={newMemberName} maxLength={MAX_NAME_LENGTH} onChange={e => setNewMemberName(e.target.value)} placeholder="Ex : Sarah Bernard" className="dx-champ" data-autofocus />
					</div>
					<div>
						<label htmlFor="rights-field-2" className="dx-champ-label">Adresse email (identifiant de connexion) *</label>
						<input id="rights-field-2" type="email" required value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} placeholder="Ex : sarah@diamant-prestige.fr" className="dx-champ" />
					</div>
					<div>
						<label htmlFor="rights-field-3" className="dx-champ-label">Mot de passe initial *</label>
						<div className="relative">
							<input id="rights-field-3" type={showNewPassword ? 'text' : 'password'} required minLength={8} value={newMemberPassword} onChange={e => setNewMemberPassword(e.target.value)} placeholder="Minimum 8 caractères" className="dx-champ !pr-12" />
							<button
								type="button"
								onClick={() => setShowNewPassword(!showNewPassword)}
								className="dx-icone-btn absolute right-1 top-1/2 -translate-y-1/2"
								title={showNewPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
								aria-label={showNewPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
							>
								{showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
							</button>
						</div>
						<p className="dx-champ-aide">Utilisable tout de suite sur la page de connexion.</p>
					</div>
					<div>
						<label htmlFor="rights-field-4" className="dx-champ-label">Spécialité / Fonction</label>
						<input id="rights-field-4" type="text" value={newMemberSpecialty} onChange={e => setNewMemberSpecialty(e.target.value)} placeholder={newMemberRole === 'admin' ? "Ex : Co-gérant / Responsable" : newMemberRole === 'demo' ? "Ex : Compte Découverte Visiteur" : "Ex : Experte Soins & Brushing"} className="dx-champ" />
					</div>
					<div>
						<p className="dx-champ-label">Rôle assigné</p>
						{choixRole(newMemberRole, setNewMemberRole)}
					</div>
					<div className="flex items-center justify-end gap-2 pt-2">
						<button type="button" onClick={() => setShowAddModal(false)} className="dx-btn dx-btn--ligne">Annuler</button>
						<button type="submit" className="dx-btn dx-btn--encre">
							{newMemberRole === 'admin' ? 'Créer le compte administrateur' : newMemberRole === 'demo' ? 'Créer le compte démo' : 'Créer le compte employé'}
						</button>
					</div>
				</form>
			</Fenetre>

			{/* MODAL MODIFIER COMPTE (ADMIN / EMPLOYÉ / DÉMO) */}
			<Fenetre
				ouvert={!!editMemberModal}
				onClose={() => setEditMemberModal(null)}
				fermerSurVoile={false}
				icone={<Pencil size={17} />}
				titre="Modifier le compte"
				sousTitre="Mise à jour des coordonnées, rôle et mot de passe"
			>
				<form onSubmit={handleSaveMemberSubmit} className="space-y-4">
					<div>
						<label htmlFor="rights-field-5" className="dx-champ-label">Nom complet *</label>
						<input id="rights-field-5" type="text" required value={editMemberName} maxLength={MAX_NAME_LENGTH} onChange={e => setEditMemberName(e.target.value)} placeholder="Ex : Sarah Bernard" className="dx-champ" data-autofocus />
					</div>
					<div>
						<label htmlFor="rights-field-6" className="dx-champ-label">Adresse email (identifiant de connexion) *</label>
						<input id="rights-field-6" type="email" required value={editMemberEmail} onChange={e => setEditMemberEmail(e.target.value)} placeholder="Ex : sarah@diamant-prestige.fr" className="dx-champ" />
					</div>
					<div>
						<label htmlFor="rights-field-7" className="dx-champ-label">Nouveau mot de passe (optionnel)</label>
						<div className="relative">
							<input id="rights-field-7" type={showEditPassword ? 'text' : 'password'} minLength={8} value={editMemberPassword} onChange={e => setEditMemberPassword(e.target.value)} placeholder="Laisser vide pour ne pas modifier" className="dx-champ !pr-12" />
							<button
								type="button"
								onClick={() => setShowEditPassword(!showEditPassword)}
								className="dx-icone-btn absolute right-1 top-1/2 -translate-y-1/2"
								title={showEditPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
								aria-label={showEditPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
							>
								{showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
							</button>
						</div>
						<p className="dx-champ-aide">Mot de passe utilisé sur la page de connexion.</p>
					</div>
					<div>
						<label htmlFor="rights-field-8" className="dx-champ-label">Spécialité / Fonction</label>
						<input id="rights-field-8" type="text" value={editMemberSpecialty} onChange={e => setEditMemberSpecialty(e.target.value)} placeholder="Ex : Co-gérant / Responsable" className="dx-champ" />
					</div>
					<div>
						<p className="dx-champ-label">Rôle assigné</p>
						{choixRole(editMemberRole, setEditMemberRole)}
					</div>
					<div className="flex items-center justify-end gap-2 pt-2">
						<button type="button" onClick={() => setEditMemberModal(null)} className="dx-btn dx-btn--ligne">Annuler</button>
						<button type="submit" disabled={isSavingMember} className="dx-btn dx-btn--encre">
							{isSavingMember ? <span>Enregistrement…</span> : (<><Check size={14} /><span>Enregistrer</span></>)}
						</button>
					</div>
				</form>
			</Fenetre>

			{/* MODAL BANNIR CLIENT */}
			<Fenetre
				ouvert={!!banModalClient}
				onClose={() => setBanModalClient(null)}
				icone={<AlertTriangle size={18} className="text-dx-alerte" />}
				titre="Bannir le client"
				sousTitre={banModalClient?.full_name || 'Client'}
				pied={
					<>
						<button type="button" onClick={() => setBanModalClient(null)} className="dx-btn dx-btn--ligne">Annuler</button>
						<button type="button" onClick={handleBanClientSubmit} className="dx-btn dx-btn--danger">Confirmer le bannissement</button>
					</>
				}
			>
				<div className="space-y-4">
					<p className="text-sm text-dx-encre-2">
						Le bannissement empêchera ce client d'effectuer toute nouvelle réservation en ligne auprès de votre établissement.
					</p>
					<div>
						<label htmlFor="rights-field-9" className="dx-champ-label">Motif de la sanction</label>
						<select id="rights-field-9" value={banReason} onChange={e => setBanReason(e.target.value)} className="dx-champ">
							<option value="No-shows répétés (absences non prévenues)">No-shows répétés (absences non prévenues)</option>
							<option value="Comportement inapproprié ou irrespectueux">Comportement inapproprié ou irrespectueux</option>
							<option value="Facture ou acompte impayé">Facture ou acompte impayé</option>
							<option value="Retards systématiques pénalisant le planning">Retards systématiques pénalisant le planning</option>
							<option value="Autre motif">Autre motif personnalisé</option>
						</select>
					</div>
					{banReason === 'Autre motif' && (
						<textarea
							rows={2}
							value={customBanReason}
							onChange={e => setCustomBanReason(e.target.value)}
							placeholder="Précisez la raison du bannissement…"
							aria-label="Motif personnalisé"
							className="dx-champ"
						/>
					)}
				</div>
			</Fenetre>

			{/* MODAL DE CONFIRMATION DE SUPPRESSION */}
			<Fenetre
				ouvert={!!deleteConfirm}
				onClose={() => setDeleteConfirm(null)}
				largeur={420}
				icone={<Trash2 size={18} className="text-dx-alerte" />}
				titre="Confirmer la suppression"
				pied={
					<>
						<button type="button" onClick={() => setDeleteConfirm(null)} className="dx-btn dx-btn--ligne">Annuler</button>
						<button type="button" onClick={confirmDelete} className="dx-btn dx-btn--danger">Supprimer</button>
					</>
				}
			>
				<p className="text-sm leading-relaxed text-dx-encre-2">
					Êtes-vous certain de vouloir supprimer le compte de <strong className="text-dx-encre">{deleteConfirm?.name}</strong> ? Cette action est irréversible.
				</p>
			</Fenetre>

			{/* MODAL MODIFICATION CLIENT */}
			<Fenetre
				ouvert={!!editClientModal}
				onClose={() => setEditClientModal(null)}
				fermerSurVoile={false}
				icone={<Pencil size={17} />}
				titre="Modifier la fiche client"
				sousTitre="Mise à jour des coordonnées par l'administrateur"
			>
				<form onSubmit={handleSaveClientSubmit} className="space-y-4">
					<div>
						<label htmlFor="rights-field-10" className="dx-champ-label">Nom complet *</label>
						<input id="rights-field-10" type="text" required value={editFullName} maxLength={MAX_NAME_LENGTH} onChange={e => setEditFullName(e.target.value)} placeholder="Ex : Sophie Martin" className="dx-champ" data-autofocus />
					</div>
					<div>
						<label htmlFor="rights-field-11" className="dx-champ-label">Téléphone</label>
						<input id="rights-field-11" type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Ex : 06 12 34 56 78" className="dx-champ" />
					</div>
					<div>
						<label htmlFor="rights-field-12" className="dx-champ-label">Adresse email</label>
						<input id="rights-field-12" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Ex : sophie.martin@email.com" className="dx-champ" />
					</div>
					<div className="flex items-center justify-end gap-2 pt-2">
						<button type="button" onClick={() => setEditClientModal(null)} className="dx-btn dx-btn--ligne">Annuler</button>
						<button type="submit" disabled={isSavingClient} className="dx-btn dx-btn--encre">
							{isSavingClient ? <span>Enregistrement…</span> : (<><Check size={14} /><span>Enregistrer</span></>)}
						</button>
					</div>
				</form>
			</Fenetre>
		</div>
	);
}
