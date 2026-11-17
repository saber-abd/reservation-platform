import { useEffect, useRef, useState } from 'react';
import { getMessages, sendMessage, type Message } from '@/lib/queries';
import { getSession } from '@/lib/auth';
import { SendHorizontal } from 'lucide-react';
import { Busy, EmptyState, Skeleton } from '@/components/standard/ui/StandardKit';

interface Props {
	professionalId: string;
	clientId: string;
	role: 'professional' | 'client';
	/** Fil plus haut (page Messages de l'espace client) */
	tall?: boolean;
}

/** Libellé de jour pour les séparateurs du fil (« Aujourd'hui », « Hier », « lundi 16 novembre »). */
function dayLabel(iso: string) {
	const d = new Date(iso);
	const today = new Date();
	const yesterday = new Date();
	yesterday.setDate(today.getDate() - 1);
	if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
	if (d.toDateString() === yesterday.toDateString()) return 'Hier';
	return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function MessageThread({ professionalId, clientId, role, tall = false }: Props) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [body, setBody] = useState('');
	const [loading, setLoading] = useState(true);
	const [sending, setSending] = useState(false);
	const bottomRef = useRef<HTMLDivElement>(null);

	function getStorageKey(pid: string, cid: string) {
		return `standard_messages_${pid}_${cid}`;
	}

	useEffect(() => {
		setLoading(true);
		const storageKey = getStorageKey(professionalId, clientId);
		const cached = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
		let localMsgs: Message[] = [];
		if (cached) {
			try {
				localMsgs = JSON.parse(cached).filter((m: any) => m && !m.id?.startsWith('demo-msg-'));
				setMessages(localMsgs);
			} catch (e) {}
		}

		getMessages(professionalId, clientId)
			.then((dbMsgs) => {
				const cleaned = dbMsgs.filter(m => !m.id?.startsWith('demo-msg-'));
				if (cleaned.length > 0) {
					setMessages(cleaned);
					if (typeof window !== 'undefined') {
						localStorage.setItem(storageKey, JSON.stringify(cleaned));
					}
				}
			})
			.finally(() => setLoading(false));

		const handleNewMsg = (e: any) => {
			const detail = e.detail;
			if (detail && detail.clientId === clientId) {
				setMessages(prev => {
					if (prev.some(m => m.id === detail.message.id)) return prev;
					return [...prev, detail.message];
				});
			}
		};

		window.addEventListener('standard:new-message', handleNewMsg);
		return () => {
			window.removeEventListener('standard:new-message', handleNewMsg);
		};
	}, [professionalId, clientId]);

	// Fait défiler le fil (et lui seul, pas la page) jusqu'au dernier message.
	useEffect(() => {
		const scroller = bottomRef.current?.parentElement;
		if (scroller) scroller.scrollTop = scroller.scrollHeight;
	}, [messages]);

	async function handleSend(e: React.FormEvent) {
		e.preventDefault();
		if (!body.trim()) return;
		setSending(true);
		const text = body.trim();
		try {
			const created = await sendMessage({ professional_id: professionalId, client_id: clientId, sender: role, body: text });
			const next = [...messages, created];
			setMessages(next);
			setBody('');

			if (typeof window !== 'undefined') {
				const storageKey = getStorageKey(professionalId, clientId);
				localStorage.setItem(storageKey, JSON.stringify(next));

				try {
					const metaRaw = localStorage.getItem('standard_conversations_meta');
					const meta = metaRaw ? JSON.parse(metaRaw) : {};
					if (!meta[clientId]) meta[clientId] = { id: clientId, full_name: 'Client' };
					meta[clientId].last_message = text;
					meta[clientId].last_message_at = created.created_at;
					if (role === 'client') {
						meta[clientId].unread_by_pro = (meta[clientId].unread_by_pro || 0) + 1;
					} else {
						meta[clientId].unread_by_pro = 0;
					}
					localStorage.setItem('standard_conversations_meta', JSON.stringify(meta));
				} catch (e) {}

				window.dispatchEvent(new CustomEvent('standard:new-message', {
					detail: { professionalId, clientId, message: created }
				}));
			}

			// Notification Email (en asynchrone) : le serveur vérifie la session,
			// retrouve le destinataire et construit le mail lui-même.
			getSession()
				.then((session) => {
					if (!session) return;
					return fetch('/api/send-email', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${session.access_token}`,
						},
						body: JSON.stringify({ type: 'new_message', professionalId, clientId, text }),
					});
				})
				.catch(console.error);

		} finally {
			setSending(false);
		}
	}

	return (
		<div className={`sa-thread${tall ? ' sa-thread--tall' : ''}`}>
			<div className="sa-thread-scroll" aria-live="polite">
				{loading && messages.length === 0 && (
					<Busy label="Chargement des messages…">
						<div className="flex flex-col gap-3">
							<Skeleton className="h-12 w-2/3 self-start rounded-[10px]" />
							<Skeleton className="h-10 w-1/2 self-end rounded-[10px]" />
						</div>
					</Busy>
				)}
				{!loading && messages.length === 0 && (
					<EmptyState kind="chat" title="Aucun message pour le moment.">
						{role === 'client' ? 'Posez votre question : le technicien vous répond ici.' : 'Démarrez la conversation : le client la retrouvera dans son espace.'}
					</EmptyState>
				)}
				<div className="flex flex-col gap-2">
					{messages.map((message, i) => {
						const mine = message.sender === role;
						const showDay = i === 0 || new Date(messages[i - 1].created_at).toDateString() !== new Date(message.created_at).toDateString();
						return (
							<div key={message.id} className="contents">
								{showDay && <p className="sa-thread-day first-letter:uppercase">{dayLabel(message.created_at)}</p>}
								<div className={`sa-bubble ${mine ? 'sa-bubble--mine' : 'sa-bubble--theirs'}`}>
									<p>{message.body}</p>
									<time dateTime={message.created_at}>
										{new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
									</time>
								</div>
							</div>
						);
					})}
				</div>
				<div ref={bottomRef} />
			</div>
			<form onSubmit={handleSend} className="sa-thread-form">
				<label htmlFor={`sa-msg-${clientId}`} className="sr-only">
					Votre message
				</label>
				<input
					id={`sa-msg-${clientId}`}
					value={body}
					onChange={(e) => setBody(e.target.value)}
					placeholder="Écrire un message..."
					autoComplete="off"
					className="sa-input flex-1"
				/>
				<button type="submit" disabled={sending || !body.trim()} className="sa-btn sa-btn--primary">
					<SendHorizontal size={16} aria-hidden="true" />
					<span className="max-sm:sr-only">Envoyer</span>
				</button>
			</form>
		</div>
	);
}
