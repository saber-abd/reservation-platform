import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getPrimaryProfessional, getDemoTag, sendMessage, getMessages, getRegisteredClients, type Message, type Client } from '@/lib/queries';
import { DEMO_DIAMANT_CLIENTS } from '@/lib/diamantDemoData';
import { Send, Image as ImageIcon, User, ExternalLink, Loader2 } from 'lucide-react';

interface Props {
	isPro: boolean;
}

export default function DiamantMessenger({ isPro }: Props) {
	const [proId, setProId] = useState<string | null>(null);
	const [clients, setClients] = useState<Client[]>([]);
	const [activeClientId, setActiveClientId] = useState<string | null>(null);
	const [messages, setMessages] = useState<Message[]>([]);
	const [newMessage, setNewMessage] = useState('');
	const [loading, setLoading] = useState(true);
	const [sending, setSending] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Client info (mocked for demo if client side)
	const demoClientId = 'demo-client-123';
	const demoClientName = 'Victoria Belmont';

	useEffect(() => {
		async function init() {
			try {
				const tag = getDemoTag();
				let pro = null;
				try {
					pro = await getPrimaryProfessional(tag);
				} catch (e) {
					console.warn('Could not fetch professional, using fallback pro ID:', e);
				}
				const effectiveProId = pro?.id || 'demo-pro-diamant';
				setProId(effectiveProId);

				if (isPro) {
					// Load clients who have interacted or booked
					let registered: Client[] = [];
					if (pro?.id) {
						try {
							registered = await getRegisteredClients(pro.id, tag);
						} catch (e) {
							console.warn('Could not fetch registered clients:', e);
						}
					}
					const allClients = [...registered];
					
					// Ensure all demo clients are available for interactive testing
					DEMO_DIAMANT_CLIENTS.forEach(demoClient => {
						if (!allClients.find(c => c.id === demoClient.id)) {
							allClients.push({
								id: demoClient.id,
								full_name: demoClient.full_name,
								phone: demoClient.phone || null,
								avatar_url: demoClient.avatar_url || null,
								created_at: demoClient.created_at || new Date().toISOString(),
								tag_bd: tag
							});
						}
					});

					setClients(allClients);
					if (allClients.length > 0) {
						setActiveClientId(allClients[0].id);
					}
				} else {
					setActiveClientId(demoClientId);
				}
			} catch (err) {
				console.error(err);
			} finally {
				setLoading(false);
			}
		}
		init();
	}, [isPro]);

	useEffect(() => {
		if (proId && activeClientId) {
			fetchMessages();
			
			// Setup realtime subscription
			let channel: any = null;
			try {
				channel = supabase
					.channel(`public:messages:${proId}:${activeClientId}`)
					.on('postgres_changes', { 
						event: 'INSERT', 
						schema: 'public', 
						table: 'messages',
						filter: `professional_id=eq.${proId}` 
					}, (payload) => {
						const newMsg = payload.new as Message;
						if (newMsg.client_id === activeClientId) {
							setMessages(prev => {
								if (prev.some(m => m.id === newMsg.id)) return prev;
								return [...prev, newMsg];
							});
							scrollToBottom();
						}
					})
					.subscribe();
			} catch (e) {
				console.warn('Realtime channel subscription error:', e);
			}

			// LocalStorage sync across browser tabs for demo
			const handleStorage = (e: StorageEvent) => {
				if (e.key === `diamant_messages_${proId}_${activeClientId}` && e.newValue) {
					try {
						const parsed = JSON.parse(e.newValue);
						setMessages(parsed);
						scrollToBottom();
					} catch (err) {
						console.error(err);
					}
				}
			};
			window.addEventListener('storage', handleStorage);

			return () => {
				if (channel) {
					supabase.removeChannel(channel);
				}
				window.removeEventListener('storage', handleStorage);
			};
		}
	}, [proId, activeClientId]);

	function getStorageKey(pid: string, cid: string) {
		return `diamant_messages_${pid}_${cid}`;
	}

	function getInitialDemoMessages(pid: string, cid: string): Message[] {
		return [
			{
				id: 'demo-msg-1',
				professional_id: pid,
				client_id: cid,
				sender: 'client',
				body: 'Bonjour, est-il possible de décaler mon rendez-vous de 15 minutes ?',
				created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
				read_at: null,
				tag_bd: getDemoTag()
			},
			{
				id: 'demo-msg-2',
				professional_id: pid,
				client_id: cid,
				sender: 'professional',
				body: 'Bonjour ! Oui tout à fait, aucun problème, je vous attends à 14h15 avec plaisir.',
				created_at: new Date(Date.now() - 3600000).toISOString(),
				read_at: null,
				tag_bd: getDemoTag()
			}
		];
	}

	async function fetchMessages() {
		if (!proId || !activeClientId) return;
		try {
			// Check localStorage cache first
			const storageKey = getStorageKey(proId, activeClientId);
			const saved = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
			let localMsgs: Message[] = [];
			if (saved) {
				try {
					localMsgs = JSON.parse(saved);
				} catch (e) {
					console.error(e);
				}
			}

			let dbMsgs: Message[] = [];
			try {
				dbMsgs = await getMessages(proId, activeClientId);
			} catch (e) {
				console.warn('Could not query Supabase messages:', e);
			}

			if (dbMsgs && dbMsgs.length > 0) {
				setMessages(dbMsgs);
				localStorage.setItem(storageKey, JSON.stringify(dbMsgs));
			} else if (localMsgs.length > 0) {
				setMessages(localMsgs);
			} else {
				const defaults = getInitialDemoMessages(proId, activeClientId);
				setMessages(defaults);
				localStorage.setItem(storageKey, JSON.stringify(defaults));
			}
			scrollToBottom();
		} catch (err) {
			console.error(err);
		}
	}

	function scrollToBottom() {
		setTimeout(() => {
			messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
		}, 100);
	}

	async function handleSend(e: React.FormEvent) {
		e.preventDefault();
		if (!newMessage.trim() || !proId || !activeClientId) return;

		setSending(true);
		try {
			const bodyText = newMessage.trim();
			// Optimistic UI
			const optimisticMsg: Message = {
				id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
				professional_id: proId,
				client_id: activeClientId,
				sender: isPro ? 'professional' : 'client',
				body: bodyText,
				created_at: new Date().toISOString(),
				read_at: null,
				tag_bd: getDemoTag()
			};

			const nextMessages = [...messages, optimisticMsg];
			setMessages(nextMessages);
			scrollToBottom();
			setNewMessage('');

			// Persist to localStorage for demo reliability & cross-tab sync
			const storageKey = getStorageKey(proId, activeClientId);
			localStorage.setItem(storageKey, JSON.stringify(nextMessages));

			// Persist to Supabase if connected
			await sendMessage({
				professional_id: proId,
				client_id: activeClientId,
				sender: isPro ? 'professional' : 'client',
				body: bodyText
			}).catch(err => {
				console.warn('Message saved locally (Supabase demo mode fallback):', err);
			});
		} catch (err) {
			console.error(err);
		} finally {
			setSending(false);
		}
	}

	if (loading) {
		return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-deep-teal-500" /></div>;
	}

	return (
		<div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden flex h-[600px]">
			{/* Sidebar Contacts (Pro only) */}
			{isPro && (
				<div className="w-1/3 border-r border-stone-100 flex flex-col bg-stone-50/50">
					<div className="p-4 border-b border-stone-100">
						<h2 className="font-bold text-stone-800">Conversations</h2>
					</div>
					<div className="flex-1 overflow-y-auto p-2 space-y-1">
						{clients.map(client => (
							<button 
								key={client.id}
								onClick={() => setActiveClientId(client.id)}
								className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors ${activeClientId === client.id ? 'bg-white border border-stone-200 shadow-sm' : 'hover:bg-white/50 border border-transparent'}`}
							>
								<div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center shrink-0 font-bold text-stone-500">
									{client.full_name ? client.full_name.charAt(0).toUpperCase() : <User size={16} />}
								</div>
								<div className="flex-1 min-w-0">
									<p className="font-bold text-sm text-stone-900 truncate">{client.full_name || 'Client Anonyme'}</p>
									<p className="text-xs text-stone-500 truncate">Cliquez pour voir les messages</p>
								</div>
							</button>
						))}
					</div>
				</div>
			)}

			{/* Chat Area */}
			<div className="flex-1 flex flex-col relative bg-stone-50">
				{/* En-tête */}
				<div className="p-4 border-b border-stone-200 flex items-center justify-between bg-white/80 backdrop-blur-sm z-10 sticky top-0">
					{isPro && activeClientId ? (
						<a 
							href={`/demo-diamant/dashboard/clients?clientId=${encodeURIComponent(activeClientId)}`}
							className="flex items-center gap-4 group cursor-pointer hover:opacity-90 transition-all"
							title="Voir la fiche client détaillée"
						>
							<div className="w-10 h-10 rounded-full bg-deep-teal-100 flex items-center justify-center border border-deep-teal-200 text-deep-teal-600 group-hover:border-deep-teal-400 group-hover:scale-105 transition-all">
								<User size={20} />
							</div>
							<div>
								<div className="flex items-center gap-2">
									<h2 className="text-stone-900 font-bold text-base group-hover:text-deep-teal-600 transition-colors">
										{clients.find(c => c.id === activeClientId)?.full_name || 'Client'}
									</h2>
									<span className="text-[10px] bg-stone-100 text-stone-600 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider group-hover:bg-deep-teal-50 group-hover:text-deep-teal-700 transition-colors">
										Voir fiche client
									</span>
								</div>
								<p className="text-deep-teal-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
									<span className="w-1.5 h-1.5 rounded-full bg-deep-teal-500 animate-pulse"></span>
									En ligne
								</p>
							</div>
						</a>
					) : (
						<div className="flex items-center gap-4">
							<div className="w-10 h-10 rounded-full bg-deep-teal-100 flex items-center justify-center border border-deep-teal-200 text-deep-teal-600">
								<User size={20} />
							</div>
							<div>
								<h2 className="text-stone-900 font-bold text-base">Maison Prestige</h2>
								<p className="text-deep-teal-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
									<span className="w-1.5 h-1.5 rounded-full bg-deep-teal-500 animate-pulse"></span>
									En ligne
								</p>
							</div>
						</div>
					)}
					{isPro && activeClientId && (
						<a 
							href={`/demo-diamant/dashboard/clients?clientId=${encodeURIComponent(activeClientId)}`}
							className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 text-stone-600 hover:text-deep-teal-600 hover:border-deep-teal-300 hover:bg-deep-teal-50 text-xs font-bold transition-colors"
						>
							<span>Fiche client</span>
							<ExternalLink size={13} />
						</a>
					)}
				</div>

				{/* Messages */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					{messages.length === 0 ? (
						<p className="text-center text-stone-400 text-sm mt-10">Aucun message pour l'instant. Dites bonjour !</p>
					) : (
						messages.map((msg, idx) => {
							const isMine = (isPro && msg.sender === 'professional') || (!isPro && msg.sender === 'client');
							const time = new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

							return (
								<div key={msg.id || idx} className={`flex items-end gap-3 max-w-[80%] ${isMine ? 'ml-auto flex-row-reverse' : ''}`}>
									<div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs shadow-sm border ${isMine ? 'bg-deep-teal-500 text-white border-deep-teal-600' : 'bg-white text-stone-500 border-stone-200'}`}>
										{isMine ? (isPro ? 'P' : 'C') : (isPro ? 'C' : 'P')}
									</div>
									<div className={`p-4 bg-white border border-stone-200 shadow-sm ${isMine ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm'}`}>
										<p className="text-stone-900 text-sm leading-relaxed">{msg.body}</p>
										<span className={`text-[10px] uppercase font-bold tracking-widest mt-2 block text-stone-400 ${isMine ? 'text-right' : 'text-left'}`}>{time}</span>
									</div>
								</div>
							);
						})
					)}
					<div ref={messagesEndRef} />
				</div>

				{/* Input */}
				<div className="p-4 border-t border-stone-200 bg-white">
					<form onSubmit={handleSend} className="flex gap-3">
						<button type="button" className="w-12 h-12 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors shrink-0">
							<ImageIcon size={20} />
						</button>
						<input 
							type="text" 
							value={newMessage}
							onChange={e => setNewMessage(e.target.value)}
							placeholder="Écrivez votre message..." 
							className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-stone-900 focus:outline-none focus:border-deep-teal-400 focus:ring-1 focus:ring-deep-teal-400 transition-all placeholder:text-stone-400"
						/>
						<button type="submit" disabled={sending || !newMessage.trim()} className="px-6 rounded-xl bg-deep-teal-500 text-white font-bold hover:bg-deep-teal-600 transition-colors shrink-0 flex items-center gap-2 disabled:opacity-50">
							<span className="hidden sm:inline">Envoyer</span>
							<Send size={18} />
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
