import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
	getPrimaryProfessional, 
	getDemoTag, 
	sendMessage, 
	getMessages, 
	getAllClients, 
	getUnreadMessagesCount, 
	markMessagesAsRead, 
	createClient,
	type Message, 
	type Client, 
	type Professional 
} from '@/lib/queries';
import { DEMO_DIAMANT_CLIENTS } from '@/lib/diamantDemoData';
import { Send, ExternalLink, Search, CheckCheck, ArrowLeft, Lock } from 'lucide-react';
import { isRoleReadOnly } from '@/lib/permissions';
import { useReducedMotion } from 'motion/react';
import { Avatar, EnChargement, EtatVide, Squelette, cx } from './kit/primitives';
import { publierClients } from './kit/indexClients';
import { quandEcritureAutorisee, useLectureSeule } from './kit/lectureSeule';
import { avertirLectureSeule } from './kit/notifier';

const MESSAGE_ENVOI_DEMO = 'Envoi désactivé en mode Démo : la messagerie est en lecture seule.';

interface Props {
	isPro: boolean;
}

interface ConversationMeta {
	id: string;
	full_name: string;
	phone?: string | null;
	email?: string | null;
	last_message?: string;
	last_message_at?: string;
	unread_by_pro?: number;
}

export default function DiamantMessenger({ isPro }: Props) {
	const [proId, setProId] = useState<string | null>(null);
	const [proName, setProName] = useState<string>("On'hair");
	const [clients, setClients] = useState<Client[]>([]);
	const [activeClientId, setActiveClientId] = useState<string | null>(null);
	const [clientDisplayName, setClientDisplayName] = useState<string>('Client');
	const [messages, setMessages] = useState<Message[]>([]);
	const [newMessage, setNewMessage] = useState('');
	const [loading, setLoading] = useState(true);
	const [sending, setSending] = useState(false);
	const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
	const [searchQuery, setSearchQuery] = useState('');
	const [recentSnippets, setRecentSnippets] = useState<Record<string, { body: string; time: string }>>({});
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const listeRef = useRef<HTMLDivElement>(null);
	// Sur téléphone (vue pro) : la liste des conversations, puis le fil choisi.
	const [filMobile, setFilMobile] = useState(false);
	const reduit = useReducedMotion();
	// Compte « démo » (vue pro) : consultation seule, ni envoi ni marquage « lu » en base.
	const lectureSeule = useLectureSeule(isPro);

	// Synchroniser le nom du professionnel (DB / localStorage / cookie)
	function resolveProName(pro: Professional | null): string {
		let name = pro?.business_name;
		if (typeof window !== 'undefined') {
			try {
				const saved = localStorage.getItem('diamant_pro_profile');
				if (saved) {
					const parsed = JSON.parse(saved);
					if (parsed && parsed.business_name) name = parsed.business_name;
				}
				if (!name) {
					const match = document.cookie.match(/(?:^|;\s*)diamant_business_name=([^;]+)/);
					if (match) name = decodeURIComponent(match[1]);
				}
			} catch (e) {}
		}
		return name || "On'hair";
	}

	function getStorageKey(pid: string, cid: string) {
		return `diamant_messages_${pid}_${cid}`;
	}

	// Purger les anciens faux messages de démo du cache local s'ils existaient
	function sanitizeStoredMessages(rawList: any[]): Message[] {
		if (!Array.isArray(rawList)) return [];
		return rawList.filter(m => m && !m.id?.startsWith('demo-msg-') && m.body);
	}

	useEffect(() => {
		async function init() {
			try {
				setLoading(true);
				const tag = getDemoTag();
				let pro: Professional | null = null;
				try {
					pro = await getPrimaryProfessional(tag);
				} catch (e) {
					console.warn('Could not fetch professional:', e);
				}
				const effectiveProId = pro?.id || 'eff1f7ef-33ee-49a2-9e4f-52ab675a4dc7';
				setProId(effectiveProId);
				setProName(resolveProName(pro));

				if (isPro) {
					// Vue Professionnel : Charger tous les clients (BDD + RDV + messages + démo)
					const allClients = await getAllClients(effectiveProId, tag, DEMO_DIAMANT_CLIENTS);
					setClients(allClients);
					publierClients(allClients);

					// Charger les compteurs de messages non lus
					const counts = await getUnreadMessagesCount(effectiveProId);
					setUnreadCounts(counts);

					// Charger les snippets récents depuis localStorage
					if (typeof window !== 'undefined') {
						try {
							const saved = localStorage.getItem('diamant_conversations_meta');
							if (saved) {
								const parsed: Record<string, ConversationMeta> = JSON.parse(saved);
								const snippets: Record<string, { body: string; time: string }> = {};
								for (const cid in parsed) {
									if (parsed[cid]?.last_message) {
										snippets[cid] = {
											body: parsed[cid].last_message!,
											time: parsed[cid].last_message_at || ''
										};
									}
								}
								setRecentSnippets(snippets);
							}
						} catch (e) {}
					}

					// Vérifier si un client spécifique est demandé via l'URL ?clientId=...
					const urlParams = new URLSearchParams(window.location.search);
					const targetId = urlParams.get('clientId');
					if (targetId && allClients.some(c => c.id === targetId)) {
						setActiveClientId(targetId);
						setFilMobile(true);
					} else {
						// Priorité au premier client avec un message non lu, sinon au premier client
						const firstUnread = allClients.find(c => (counts[c.id] || 0) > 0);
						if (firstUnread) {
							setActiveClientId(firstUnread.id);
						} else if (allClients.length > 0) {
							setActiveClientId(allClients[0].id);
						}
					}
				} else {
					// Vue Client : Détecter le vrai client connecté
					const { data: { session } } = await supabase.auth.getSession();
					let resolvedClientId = 'demo-client-123';
					let resolvedName = 'Client';

					if (session?.user) {
						resolvedClientId = session.user.id;
						resolvedName = session.user.user_metadata?.full_name || 
							(session.user.email ? session.user.email.split('@')[0] : 'Client');
						
						// Enregistrer / synchroniser le profil client dans la table clients
						try {
							await createClient({
								id: session.user.id,
								full_name: resolvedName,
								phone: session.user.user_metadata?.phone || null
							}, tag);
						} catch (e) {
							console.warn('Could not auto-register client profile:', e);
						}
					} else {
						// Si invité / non connecté : récupérer ou générer un identifiant persistant
						let guestId = localStorage.getItem('diamant_guest_client_id');
						if (!guestId) {
							guestId = 'guest-' + Math.random().toString(36).substring(2, 9);
							localStorage.setItem('diamant_guest_client_id', guestId);
						}
						resolvedClientId = guestId;
						resolvedName = 'Client Invité';
					}

					setActiveClientId(resolvedClientId);
					setClientDisplayName(resolvedName);
				}
			} catch (err) {
				console.error('Initialization error in DiamantMessenger:', err);
			} finally {
				setLoading(false);
			}
		}

		init();
	}, [isPro]);

	// Charger les messages et écouter les changements temps-réel
	useEffect(() => {
		if (!proId || !activeClientId) return;

		fetchMessages();

		// Si le pro ouvre la conversation, marquer les messages de ce client comme lus
		// (attend le rôle réel ; jamais pour le compte démo, en lecture seule).
		let annulerMarquage = () => {};
		if (isPro) {
			annulerMarquage = quandEcritureAutorisee(() => {
				markMessagesAsRead(proId, activeClientId, 'professional');
				setUnreadCounts(prev => {
					if (!prev[activeClientId]) return prev;
					const next = { ...prev };
					delete next[activeClientId];
					return next;
				});
			});
		}

		// Abonnement Realtime Supabase
		let channel: any = null;
		try {
			channel = supabase
				.channel(`diamant-messages-${proId}`)
				.on('postgres_changes', {
					event: 'INSERT',
					schema: 'public',
					table: 'messages',
					filter: `professional_id=eq.${proId}`
				}, (payload) => {
					const newMsg = payload.new as Message;
					if (!newMsg) return;

					// Si le message concerne la conversation active
					if (newMsg.client_id === activeClientId) {
						setMessages(prev => {
							if (prev.some(m => m.id === newMsg.id)) return prev;
							return [...prev, newMsg];
						});
						scrollToBottom();

						if (isPro && newMsg.sender === 'client' && !isRoleReadOnly()) {
							markMessagesAsRead(proId, activeClientId, 'professional');
						}
					} else if (isPro && newMsg.sender === 'client') {
						// Notification pour un autre client dans la liste du pro
						setUnreadCounts(prev => ({
							...prev,
							[newMsg.client_id]: (prev[newMsg.client_id] || 0) + 1
						}));
					}

					// Mettre à jour le snippet récent
					setRecentSnippets(prev => ({
						...prev,
						[newMsg.client_id]: { body: newMsg.body, time: newMsg.created_at }
					}));
				})
				.subscribe();
		} catch (e) {
			console.warn('Realtime channel error:', e);
		}

		// Événements storage et messages-read pour synchronisation instantanée multi-onglets
		const handleStorage = (e: StorageEvent) => {
			if (e.key === getStorageKey(proId, activeClientId) && e.newValue) {
				try {
					const parsed = sanitizeStoredMessages(JSON.parse(e.newValue));
					setMessages(parsed);
					scrollToBottom();
				} catch (err) {
					console.error(err);
				}
			}
			if (e.key === 'diamant_conversations_meta' && e.newValue) {
				try {
					const meta: Record<string, ConversationMeta> = JSON.parse(e.newValue);
					if (isPro) {
						const nextCounts: Record<string, number> = {};
						const nextSnippets: Record<string, { body: string; time: string }> = {};
						for (const cid in meta) {
							if (meta[cid]?.unread_by_pro) nextCounts[cid] = meta[cid].unread_by_pro!;
							if (meta[cid]?.last_message) {
								nextSnippets[cid] = {
									body: meta[cid].last_message!,
									time: meta[cid].last_message_at || ''
								};
							}
						}
						setUnreadCounts(nextCounts);
						setRecentSnippets(nextSnippets);
					}
				} catch (err) {}
			}
		};

		const handleCustomNewMessage = (e: any) => {
			const detail = e.detail;
			if (!detail) return;
			if (detail.clientId === activeClientId) {
				setMessages(prev => {
					if (prev.some(m => m.id === detail.message.id)) return prev;
					return [...prev, detail.message];
				});
				scrollToBottom();
			} else if (isPro && detail.message.sender === 'client') {
				setUnreadCounts(prev => ({
					...prev,
					[detail.clientId]: (prev[detail.clientId] || 0) + 1
				}));
			}

			setRecentSnippets(prev => ({
				...prev,
				[detail.clientId]: { body: detail.message.body, time: detail.message.created_at }
			}));
		};

		const handleProfileUpdate = () => {
			try {
				const saved = localStorage.getItem('diamant_pro_profile');
				if (saved) {
					const p = JSON.parse(saved);
					if (p?.business_name) setProName(p.business_name);
				}
			} catch (e) {}
		};

		window.addEventListener('storage', handleStorage);
		window.addEventListener('diamant:new-message', handleCustomNewMessage);
		window.addEventListener('diamant:profile-updated', handleProfileUpdate);

		return () => {
			annulerMarquage();
			if (channel) supabase.removeChannel(channel);
			window.removeEventListener('storage', handleStorage);
			window.removeEventListener('diamant:new-message', handleCustomNewMessage);
			window.removeEventListener('diamant:profile-updated', handleProfileUpdate);
		};
	}, [proId, activeClientId, isPro]);

	async function fetchMessages() {
		if (!proId || !activeClientId) return;
		try {
			const storageKey = getStorageKey(proId, activeClientId);
			const saved = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
			let localMsgs: Message[] = [];
			if (saved) {
				try {
					localMsgs = sanitizeStoredMessages(JSON.parse(saved));
				} catch (e) {
					console.error(e);
				}
			}

			let dbMsgs: Message[] = [];
			try {
				dbMsgs = await getMessages(proId, activeClientId);
				dbMsgs = sanitizeStoredMessages(dbMsgs);
			} catch (e) {
				console.warn('Could not query Supabase messages:', e);
			}

			if (dbMsgs && dbMsgs.length > 0) {
				setMessages(dbMsgs);
				localStorage.setItem(storageKey, JSON.stringify(dbMsgs));
			} else {
				setMessages(localMsgs);
			}
			scrollToBottom();
		} catch (err) {
			console.error(err);
		}
	}

	// Défile le fil seulement (pas la page) jusqu'au dernier message.
	function scrollToBottom() {
		setTimeout(() => {
			const el = listeRef.current;
			if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduit ? 'auto' : 'smooth' });
		}, 80);
	}

	async function handleSend(e: React.FormEvent) {
		e.preventDefault();
		if (isPro && isRoleReadOnly()) {
			avertirLectureSeule(MESSAGE_ENVOI_DEMO);
			return;
		}
		if (!newMessage.trim() || !proId || !activeClientId) return;

		setSending(true);
		try {
			const bodyText = newMessage.trim();
			const senderRole = isPro ? 'professional' : 'client';
			const tag = getDemoTag();

			// Message optimiste
			const optimisticMsg: Message = {
				id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
				professional_id: proId,
				client_id: activeClientId,
				sender: senderRole,
				body: bodyText,
				created_at: new Date().toISOString(),
				read_at: null,
				tag_bd: tag
			};

			const nextMessages = [...messages, optimisticMsg];
			setMessages(nextMessages);
			scrollToBottom();
			setNewMessage('');

			// Sauvegarder dans le localStorage
			const storageKey = getStorageKey(proId, activeClientId);
			localStorage.setItem(storageKey, JSON.stringify(nextMessages));

			// Mettre à jour l'index des métadonnées de conversation
			try {
				const metaRaw = localStorage.getItem('diamant_conversations_meta');
				const meta: Record<string, ConversationMeta> = metaRaw ? JSON.parse(metaRaw) : {};
				const currentClient = clients.find(c => c.id === activeClientId);
				const existing = meta[activeClientId] || {
					id: activeClientId,
					full_name: currentClient?.full_name || clientDisplayName || 'Client'
				};

				existing.last_message = bodyText;
				existing.last_message_at = optimisticMsg.created_at;
				if (!isPro) {
					// Le client a envoyé un message : incrémenter le compteur non lu pour le pro
					existing.unread_by_pro = (existing.unread_by_pro || 0) + 1;
				} else {
					existing.unread_by_pro = 0;
				}

				meta[activeClientId] = existing;
				localStorage.setItem('diamant_conversations_meta', JSON.stringify(meta));
			} catch (e) {}

			// Diffuser l'événement local
			window.dispatchEvent(new CustomEvent('diamant:new-message', {
				detail: {
					professionalId: proId,
					clientId: activeClientId,
					message: optimisticMsg
				}
			}));

			// Enregistrer dans Supabase
			await sendMessage({
				professional_id: proId,
				client_id: activeClientId,
				sender: senderRole,
				body: bodyText
			}, tag);

		} catch (err) {
			console.error('Error sending message:', err);
		} finally {
			setSending(false);
		}
	}

	// Calculer la liste triée et filtrée des clients (Pro)
	const filteredClients = useMemo(() => {
		let list = [...clients];

		// Filtrer par recherche
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			list = list.filter(c => 
				(c.full_name && c.full_name.toLowerCase().includes(q)) ||
				(c.phone && c.phone.includes(q)) ||
				(c.email && c.email.toLowerCase().includes(q))
			);
		}

		// Trier : les clients ayant des messages non lus en premier, puis les plus récents
		return list.sort((a, b) => {
			const unreadA = unreadCounts[a.id] || 0;
			const unreadB = unreadCounts[b.id] || 0;
			if (unreadA > 0 && unreadB === 0) return -1;
			if (unreadB > 0 && unreadA === 0) return 1;

			const timeA = recentSnippets[a.id]?.time || a.created_at || '';
			const timeB = recentSnippets[b.id]?.time || b.created_at || '';
			return timeB.localeCompare(timeA);
		});
	}, [clients, searchQuery, unreadCounts, recentSnippets]);

	const totalUnreadCount = useMemo(() => {
		return Object.values(unreadCounts).reduce((acc, count) => acc + count, 0);
	}, [unreadCounts]);

	const activeClient = useMemo(() => {
		return clients.find(c => c.id === activeClientId) || null;
	}, [clients, activeClientId]);

	function jourDe(iso: string) {
		const d = new Date(iso);
		const auj = new Date();
		const hier = new Date();
		hier.setDate(auj.getDate() - 1);
		if (d.toDateString() === auj.toDateString()) return "Aujourd'hui";
		if (d.toDateString() === hier.toDateString()) return 'Hier';
		const t = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
		return t.charAt(0).toUpperCase() + t.slice(1);
	}

	function heureOuJour(iso: string) {
		const d = new Date(iso);
		if (d.toDateString() === new Date().toDateString()) {
			return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
		}
		return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
	}

	const hauteur = 'h-[calc(100dvh-15rem)] min-h-[520px] md:h-[min(46rem,calc(100dvh-17rem))]';

	if (loading) {
		return (
			<EnChargement label="Chargement de la messagerie..." className={cx('dx-carte flex overflow-hidden', hauteur)}>
				{isPro && (
					<div className="hidden w-80 flex-col gap-3 border-r border-dx-filet bg-dx-papier p-4 md:flex">
						<Squelette className="h-10 w-full !rounded-full" />
						{[0, 1, 2, 3, 4].map((i) => (
							<div key={i} className="flex items-center gap-3 py-2">
								<Squelette className="h-10 w-10 !rounded-full" />
								<div className="flex-1 space-y-2">
									<Squelette className="h-3.5 w-2/3" />
									<Squelette className="h-3 w-full" />
								</div>
							</div>
						))}
					</div>
				)}
				<div className="flex flex-1 flex-col gap-3 p-6">
					<Squelette className="h-10 w-1/2 !rounded-2xl" />
					<Squelette className="ml-auto h-14 w-2/5 !rounded-2xl" />
					<Squelette className="h-10 w-1/3 !rounded-2xl" />
				</div>
			</EnChargement>
		);
	}

	// Séparateurs de jour dans le fil
	let jourPrecedent = '';

	return (
		<div className={cx('dx-carte flex overflow-hidden', hauteur)}>
			{/* Liste des conversations (vue pro uniquement) */}
			{isPro && (
				<aside className={cx('w-full flex-col border-dx-filet bg-dx-papier md:flex md:w-80 md:border-r lg:w-[22rem]', filMobile ? 'hidden' : 'flex')}>
					<div className="border-b border-dx-filet p-4">
						<div className="mb-3 flex items-center justify-between gap-2">
							<h2 className="dx-h3">Conversations</h2>
							{totalUnreadCount > 0 && (
								<span className="dx-nav-badge !h-6 !px-2.5">
									{totalUnreadCount} non lu{totalUnreadCount > 1 ? 's' : ''}
								</span>
							)}
						</div>
						<div className="dx-recherche">
							<Search size={15} />
							<input
								type="search"
								value={searchQuery}
								onChange={e => setSearchQuery(e.target.value)}
								placeholder="Rechercher un client..."
								aria-label="Rechercher un client"
								className="dx-champ !min-h-10 !text-sm"
							/>
						</div>
					</div>

					<div className="flex-1 overflow-y-auto p-2">
						{filteredClients.length === 0 ? (
							<p className="p-8 text-center text-sm text-dx-gris">Aucun client trouvé.</p>
						) : (
							filteredClients.map(client => {
								const unread = unreadCounts[client.id] || 0;
								const isSelected = activeClientId === client.id;
								const snippet = recentSnippets[client.id];

								return (
									<button
										key={client.id}
										type="button"
										onClick={() => {
											setActiveClientId(client.id);
											setFilMobile(true);
										}}
										aria-current={isSelected ? 'true' : undefined}
										className={cx(
											'relative flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors',
											isSelected ? 'bg-dx-carte shadow-[0_0_0_1px_var(--dx-filet),0_8px_18px_-14px_rgb(31_24_19/0.45)]' : 'hover:bg-dx-carte/70'
										)}
									>
										{isSelected && <span className="absolute inset-y-3 left-0 w-[3px] rounded-r bg-dx-terre" aria-hidden="true" />}
										<span className="relative">
											<Avatar nom={client.full_name || 'Client'} url={client.avatar_url} taille={42} ton={isSelected ? 'encre' : unread > 0 ? 'terre' : undefined} />
											{unread > 0 && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-dx-papier bg-dx-terre" aria-hidden="true" />}
										</span>
										<span className="min-w-0 flex-1">
											<span className="flex items-baseline justify-between gap-2">
												<span className={cx('truncate text-sm text-dx-encre', unread > 0 ? 'font-bold' : 'font-semibold')}>
													{client.full_name || 'Client'}
												</span>
												{snippet?.time && (
													<span className="dx-tabulaire shrink-0 text-[11px] text-dx-gris">{heureOuJour(snippet.time)}</span>
												)}
											</span>
											<span className="mt-0.5 flex items-center justify-between gap-2">
												<span className={cx('truncate text-xs', unread > 0 ? 'font-semibold text-dx-encre-2' : 'text-dx-gris')}>
													{snippet?.body || (client.phone ? client.phone : 'Aucun message échangé')}
												</span>
												{unread > 0 && (
													<span className="dx-nav-badge shrink-0">
														{unread}<span className="sr-only"> nouveau{unread > 1 ? 'x' : ''}</span>
													</span>
												)}
											</span>
										</span>
									</button>
								);
							})
						)}
					</div>
				</aside>
			)}

			{/* Zone de discussion principale */}
			<section className={cx('min-w-0 flex-1 flex-col bg-dx-ivoire', isPro && !filMobile ? 'hidden md:flex' : 'flex')}>
				{/* En-tête de conversation */}
				<div className="flex items-center gap-3 border-b border-dx-filet bg-dx-carte px-4 py-3 sm:px-5">
					{isPro && activeClientId ? (
						<>
							<button type="button" onClick={() => setFilMobile(false)} className="dx-icone-btn -ml-1 md:hidden" aria-label="Retour aux conversations">
								<ArrowLeft size={18} />
							</button>
							<a
								href={`/demo-diamant/dashboard/clients?clientId=${encodeURIComponent(activeClientId)}`}
								className="group flex min-w-0 flex-1 items-center gap-3"
								title="Voir la fiche complète de ce client"
							>
								<Avatar nom={activeClient?.full_name || 'Client'} url={activeClient?.avatar_url} taille={40} ton="terre" />
								<span className="min-w-0">
									<span className="flex flex-wrap items-baseline gap-x-2">
										<span className="dx-h3 truncate group-hover:text-dx-terre">{activeClient?.full_name || 'Client'}</span>
										<span className="text-xs text-dx-gris">Fiche client</span>
									</span>
									<span className="block text-xs text-dx-gris">Client inscrit • Disponible</span>
								</span>
							</a>
							<a
								href={`/demo-diamant/dashboard/clients?clientId=${encodeURIComponent(activeClientId)}`}
								className="dx-btn dx-btn--sm dx-btn--ligne hidden sm:inline-flex"
							>
								<span>Accéder aux infos</span>
								<ExternalLink size={13} />
							</a>
						</>
					) : (
						<div className="flex items-center gap-3">
							<span className="dx-monogramme">{(proName || 'O').charAt(0).toUpperCase()}</span>
							<div>
								<h2 className="dx-h3" data-diamant-business-name>{proName}</h2>
								<p className="text-xs text-dx-gris">Artisan Coiffeur • En ligne</p>
							</div>
						</div>
					)}
				</div>

				{/* Corps des messages */}
				<div ref={listeRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-8" aria-live="polite">
					{messages.length === 0 ? (
						<EtatVide
							dessin="messages"
							className="h-full"
							titre="Aucun message pour le moment"
							texte="Démarrez la conversation dès maintenant en envoyant un message direct ci-dessous."
						/>
					) : (
						<div className="flex flex-col gap-1.5">
							{messages.map((msg, idx) => {
								const isMine = (isPro && msg.sender === 'professional') || (!isPro && msg.sender === 'client');
								const time = new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
								const jour = jourDe(msg.created_at);
								const nouveauJour = jour !== jourPrecedent;
								jourPrecedent = jour;
								const suivant = messages[idx + 1];
								const finDeGroupe = !suivant || suivant.sender !== msg.sender || jourDe(suivant.created_at) !== jour;

								return (
									<React.Fragment key={msg.id || idx}>
										{nouveauJour && <p className="dx-separateur-jour my-4">{jour}</p>}
										<div className={cx('flex flex-col', isMine ? 'items-end' : 'items-start')}>
											<p className={cx('dx-bulle', isMine ? 'dx-bulle--moi' : 'dx-bulle--autre')}>{msg.body}</p>
											{finDeGroupe && (
												<p className="mb-2 mt-1 flex items-center gap-1 px-1 text-[11px] text-dx-gris">
													<span className="dx-tabulaire">{time}</span>
													{isMine && <CheckCheck size={12} className="text-dx-terre" aria-label="Envoyé" />}
												</p>
											)}
										</div>
									</React.Fragment>
								);
							})}
						</div>
					)}
					<div ref={messagesEndRef} />
				</div>

				{/* Barre de saisie */}
				<div className="border-t border-dx-filet bg-dx-carte p-3 sm:p-4">
					{lectureSeule && (
						<p className="mb-2 flex items-center gap-1.5 px-2 text-xs font-semibold text-dx-gris">
							<Lock size={12} /> Lecture seule (mode Démo) : la consultation est libre, l'envoi de messages est désactivé.
						</p>
					)}
					<form
						onSubmit={handleSend}
						onClick={lectureSeule ? () => avertirLectureSeule(MESSAGE_ENVOI_DEMO) : undefined}
						className={cx(
							'flex items-center gap-2 rounded-full border border-dx-filet-fort bg-dx-ivoire p-1.5 pl-4 transition-colors focus-within:border-dx-terre focus-within:shadow-[0_0_0_3px_rgb(168_75_37/0.14)]',
							lectureSeule && 'cursor-not-allowed opacity-70'
						)}
					>
						<label htmlFor="dx-composer" className="sr-only">{isPro ? 'Répondre au client' : 'Écrire à votre artisan'}</label>
						<input
							id="dx-composer"
							type="text"
							value={newMessage}
							onChange={e => setNewMessage(e.target.value)}
							readOnly={lectureSeule}
							aria-disabled={lectureSeule || undefined}
							placeholder={lectureSeule ? 'Lecture seule : envoi désactivé' : isPro ? "Répondre au client..." : "Écrivez votre message à votre artisan..."}
							className={cx('dx-sans-contour min-w-0 flex-1 bg-transparent py-2 text-[0.9375rem] text-dx-encre placeholder:text-dx-gris focus:outline-none', lectureSeule && 'cursor-not-allowed')}
						/>
						<button
							type={lectureSeule ? 'button' : 'submit'}
							disabled={!lectureSeule && (sending || !newMessage.trim())}
							aria-disabled={lectureSeule || undefined}
							className="dx-btn !min-h-10 !px-4"
						>
							<span className="hidden sm:inline">Envoyer</span>
							<Send size={15} />
						</button>
					</form>
				</div>
			</section>
		</div>
	);
}
