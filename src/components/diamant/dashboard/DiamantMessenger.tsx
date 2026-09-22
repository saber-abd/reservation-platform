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
import { Send, User, ExternalLink, Loader2, Search, MessageSquare, CheckCheck, Sparkles } from 'lucide-react';

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
		if (isPro) {
			markMessagesAsRead(proId, activeClientId, 'professional');
			setUnreadCounts(prev => {
				if (!prev[activeClientId]) return prev;
				const next = { ...prev };
				delete next[activeClientId];
				return next;
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

						if (isPro && newMsg.sender === 'client') {
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

	function scrollToBottom() {
		setTimeout(() => {
			messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
		}, 80);
	}

	async function handleSend(e: React.FormEvent) {
		e.preventDefault();
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

	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-stone-200 shadow-sm">
				<Loader2 className="animate-spin text-deep-teal-600 mb-3" size={32} />
				<p className="text-sm font-semibold text-stone-500">Chargement de la messagerie...</p>
			</div>
		);
	}

	return (
		<div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden flex flex-col md:flex-row h-[680px]">
			{/* Sidebar Contacts (Vue Pro uniquement) */}
			{isPro && (
				<div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-stone-200 flex flex-col bg-stone-50/70">
					{/* Header sidebar */}
					<div className="p-4 border-b border-stone-200 bg-white">
						<div className="flex items-center justify-between mb-3">
							<div className="flex items-center gap-2">
								<MessageSquare size={18} className="text-deep-teal-600" />
								<h2 className="font-bold text-stone-900 text-base">Conversations</h2>
							</div>
							{totalUnreadCount > 0 && (
								<span className="px-2.5 py-0.5 text-xs font-black rounded-full bg-deep-teal-600 text-white shadow-sm animate-pulse flex items-center gap-1">
									<Sparkles size={11} />
									<span>{totalUnreadCount} non lu{totalUnreadCount > 1 ? 's' : ''}</span>
								</span>
							)}
						</div>

						{/* Recherche client */}
						<div className="relative">
							<Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
							<input
								type="text"
								value={searchQuery}
								onChange={e => setSearchQuery(e.target.value)}
								placeholder="Rechercher un client..."
								className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-stone-100 border border-transparent focus:border-deep-teal-400 focus:bg-white focus:outline-none transition-all placeholder:text-stone-400"
							/>
						</div>
					</div>

					{/* Liste des conversations clients */}
					<div className="flex-1 overflow-y-auto p-2 space-y-1">
						{filteredClients.length === 0 ? (
							<div className="p-8 text-center text-stone-400 text-xs">
								Aucun client trouvé.
							</div>
						) : (
							filteredClients.map(client => {
								const unread = unreadCounts[client.id] || 0;
								const isSelected = activeClientId === client.id;
								const snippet = recentSnippets[client.id];

								return (
									<button
										key={client.id}
										onClick={() => setActiveClientId(client.id)}
										className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all relative cursor-pointer ${
											isSelected
												? 'bg-white border border-deep-teal-300 shadow-sm ring-1 ring-deep-teal-200'
												: unread > 0
													? 'bg-deep-teal-50/70 border border-deep-teal-200 hover:bg-deep-teal-50'
													: 'hover:bg-white/80 border border-transparent'
										}`}
									>
										{/* Avatar avec badge de notification */}
										<div className="relative shrink-0">
											<div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden ${
												isSelected 
													? 'bg-deep-teal-600 text-white ring-2 ring-deep-teal-200' 
													: unread > 0
														? 'bg-deep-teal-100 text-deep-teal-800 ring-2 ring-deep-teal-400'
														: 'bg-stone-200 text-stone-600'
											}`}>
												{client.avatar_url && client.avatar_url.startsWith('http') ? (
													<img src={client.avatar_url} alt="" className="w-full h-full object-cover" />
												) : client.full_name ? (
													client.full_name.charAt(0).toUpperCase()
												) : (
													<User size={18} />
												)}
											</div>
											{unread > 0 && (
												<span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
											)}
										</div>

										{/* Informations et aperçu */}
										<div className="flex-1 min-w-0">
											<div className="flex items-center justify-between gap-1">
												<p className={`font-bold text-sm truncate ${unread > 0 ? 'text-deep-teal-950 font-black' : 'text-stone-900'}`}>
													{client.full_name || 'Client'}
												</p>
												{snippet?.time && (
													<span className="text-[10px] text-stone-400 whitespace-nowrap">
														{new Date(snippet.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
													</span>
												)}
											</div>

											<div className="flex items-center justify-between gap-2 mt-0.5">
												<p className={`text-xs truncate ${unread > 0 ? 'font-semibold text-deep-teal-800' : 'text-stone-500'}`}>
													{snippet?.body || (client.phone ? client.phone : 'Aucun message échangé')}
												</p>
												{unread > 0 && (
													<span className="shrink-0 px-2 py-0.5 text-[10px] font-black rounded-full bg-deep-teal-600 text-white shadow-xs">
														{unread} nouveau{unread > 1 ? 'x' : ''}
													</span>
												)}
											</div>
										</div>
									</button>
								);
							})
						)}
					</div>
				</div>
			)}

			{/* Zone de discussion principale */}
			<div className="flex-1 flex flex-col relative bg-stone-50/50">
				{/* En-tête de conversation */}
				<div className="p-4 border-b border-stone-200 flex items-center justify-between bg-white z-10 sticky top-0 shadow-xs">
					{isPro && activeClientId ? (
						<div className="flex items-center justify-between w-full">
							<a 
								href={`/demo-diamant/dashboard/clients?clientId=${encodeURIComponent(activeClientId)}`}
								className="flex items-center gap-3.5 group cursor-pointer"
								title="Voir la fiche complète de ce client"
							>
								<div className="w-10 h-10 rounded-full bg-deep-teal-100 flex items-center justify-center border border-deep-teal-200 text-deep-teal-700 group-hover:border-deep-teal-400 group-hover:scale-105 transition-all">
									<User size={20} />
								</div>
								<div>
									<div className="flex items-center gap-2">
										<h2 className="text-stone-900 font-bold text-base group-hover:text-deep-teal-600 transition-colors">
											{activeClient?.full_name || 'Client'}
										</h2>
										<span className="text-[10px] bg-stone-100 text-stone-600 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider group-hover:bg-deep-teal-50 group-hover:text-deep-teal-700 transition-colors">
											Fiche client
										</span>
									</div>
									<p className="text-deep-teal-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
										<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
										Client inscrit • Disponible
									</p>
								</div>
							</a>

							<a 
								href={`/demo-diamant/dashboard/clients?clientId=${encodeURIComponent(activeClientId)}`}
								className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 text-stone-600 hover:text-deep-teal-600 hover:border-deep-teal-300 hover:bg-deep-teal-50 text-xs font-bold transition-all shadow-2xs"
							>
								<span>Accéder aux infos</span>
								<ExternalLink size={13} />
							</a>
						</div>
					) : (
						<div className="flex items-center gap-3.5">
							<div className="w-10 h-10 rounded-full bg-gradient-to-br from-deep-teal-500 to-deep-teal-700 text-white flex items-center justify-center shadow-xs">
								<User size={20} />
							</div>
							<div>
								<h2 className="text-stone-900 font-black text-base" data-diamant-business-name>{proName}</h2>
								<p className="text-deep-teal-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
									<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
									Artisan Coiffeur • En ligne
								</p>
							</div>
						</div>
					)}
				</div>

				{/* Corps des messages */}
				<div className="flex-1 overflow-y-auto p-6 space-y-4">
					{messages.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-full py-16 text-center text-stone-400">
							<div className="w-14 h-14 rounded-2xl bg-white border border-stone-200 flex items-center justify-center text-stone-300 mb-3 shadow-2xs">
								<MessageSquare size={24} />
							</div>
							<p className="text-sm font-bold text-stone-700">Aucun message pour le moment</p>
							<p className="text-xs text-stone-400 mt-1 max-w-xs">
								Démarrez la conversation dès maintenant en envoyant un message direct ci-dessous.
							</p>
						</div>
					) : (
						messages.map((msg, idx) => {
							const isMine = (isPro && msg.sender === 'professional') || (!isPro && msg.sender === 'client');
							const time = new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

							return (
								<div 
									key={msg.id || idx} 
									className={`flex items-end gap-2.5 max-w-[85%] sm:max-w-[75%] ${isMine ? 'ml-auto flex-row-reverse' : ''}`}
								>
									<div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs shadow-2xs border ${
										isMine 
											? 'bg-deep-teal-600 text-white border-deep-teal-700' 
											: 'bg-white text-stone-600 border-stone-200'
									}`}>
										{isMine ? (isPro ? 'P' : 'C') : (isPro ? 'C' : 'P')}
									</div>
									<div className={`p-4 shadow-xs transition-all ${
										isMine 
											? 'bg-deep-teal-600 text-white rounded-2xl rounded-br-sm' 
											: 'bg-white text-stone-900 border border-stone-200 rounded-2xl rounded-bl-sm'
									}`}>
										<p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
										<div className={`flex items-center gap-1.5 mt-1.5 ${isMine ? 'justify-end text-deep-teal-100' : 'justify-start text-stone-400'}`}>
											<span className="text-[10px] font-medium">{time}</span>
											{isMine && <CheckCheck size={12} className="opacity-80" />}
										</div>
									</div>
								</div>
							);
						})
					)}
					<div ref={messagesEndRef} />
				</div>

				{/* Barre de saisie (sans bouton image non fonctionnel) */}
				<div className="p-4 border-t border-stone-200 bg-white">
					<form onSubmit={handleSend} className="flex gap-2.5">
						<input 
							type="text" 
							value={newMessage}
							onChange={e => setNewMessage(e.target.value)}
							placeholder={isPro ? "Répondre au client..." : "Écrivez votre message à votre artisan..."} 
							className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 focus:outline-none focus:border-deep-teal-500 focus:bg-white focus:ring-2 focus:ring-deep-teal-500/20 transition-all placeholder:text-stone-400"
						/>
						<button 
							type="submit" 
							disabled={sending || !newMessage.trim()} 
							className="px-6 rounded-xl bg-deep-teal-600 text-white font-bold hover:bg-deep-teal-700 transition-all shrink-0 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
						>
							<span className="hidden sm:inline">Envoyer</span>
							<Send size={16} />
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
