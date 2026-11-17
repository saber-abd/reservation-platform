import { useEffect, useRef, useState } from 'react';
import { getMessages, sendMessage, type Message } from '@/lib/queries';
import { getSession } from '@/lib/auth';
import { SendHorizontal } from 'lucide-react';

interface Props {
	professionalId: string;
	clientId: string;
	role: 'professional' | 'client';
	/** « grand » : fil plus haut (page Messagerie de l'espace client). */
	variant?: 'grand';
}

function jourDe(iso: string) {
	return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function MessageThread({ professionalId, clientId, role, variant }: Props) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [body, setBody] = useState('');
	const [loading, setLoading] = useState(true);
	const [sending, setSending] = useState(false);
	const bottomRef = useRef<HTMLDivElement>(null);

	function getStorageKey(pid: string, cid: string) {
		return `premium_messages_${pid}_${cid}`;
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

		window.addEventListener('premium:new-message', handleNewMsg);
		return () => {
			window.removeEventListener('premium:new-message', handleNewMsg);
		};
	}, [professionalId, clientId]);

	useEffect(() => {
		// Fait défiler le fil (et seulement lui) jusqu'au dernier message.
		const flux = bottomRef.current?.parentElement;
		if (flux) flux.scrollTop = flux.scrollHeight;
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
					const metaRaw = localStorage.getItem('premium_conversations_meta');
					const meta = metaRaw ? JSON.parse(metaRaw) : {};
					if (!meta[clientId]) meta[clientId] = { id: clientId, full_name: 'Client' };
					meta[clientId].last_message = text;
					meta[clientId].last_message_at = created.created_at;
					if (role === 'client') {
						meta[clientId].unread_by_pro = (meta[clientId].unread_by_pro || 0) + 1;
					} else {
						meta[clientId].unread_by_pro = 0;
					}
					localStorage.setItem('premium_conversations_meta', JSON.stringify(meta));
				} catch (e) {}

				window.dispatchEvent(new CustomEvent('premium:new-message', {
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
		<div className={`pe-fil ${variant === 'grand' ? 'pe-fil--grand' : ''}`}>
			<div className="pe-fil__flux" role="log" aria-live="polite" aria-label="Messages">
				{loading && messages.length === 0 && (
					<div aria-busy="true" className="flex flex-col gap-3">
						<span className="sr-only">Chargement…</span>
						<span className="pe-skel self-start" style={{ height: 46, width: '55%' }} />
						<span className="pe-skel self-end" style={{ height: 46, width: '45%' }} />
						<span className="pe-skel self-start" style={{ height: 30, width: '35%' }} />
					</div>
				)}
				{!loading && messages.length === 0 && (
					<div className="m-auto grid justify-items-center gap-2 text-center">
						<svg viewBox="0 0 64 40" className="h-10 w-16 text-pe-filet-fort" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
							<path d="M4 4h38v22H22l-8 8v-8H4z" />
							<path d="M30 14h30v20h-6v6l-8-6H30z" />
						</svg>
						<p className="text-sm text-pe-acier">Aucun message pour le moment. Démarrez la conversation !</p>
					</div>
				)}
				{messages.map((message, i) => {
					const mine = message.sender === role;
					const jour = jourDe(message.created_at);
					const nouveauJour = i === 0 || jourDe(messages[i - 1].created_at) !== jour;
					return (
						<div key={message.id} className="contents">
							{nouveauJour && <p className="pe-fil__jour">{jour}</p>}
							<div className={`pe-bulle ${mine ? 'pe-bulle--moi' : 'pe-bulle--eux'}`}>
								<p>{message.body}</p>
								<time dateTime={message.created_at}>
									{new Date(message.created_at).toLocaleString('fr-FR', {
										hour: '2-digit',
										minute: '2-digit',
									})}
								</time>
							</div>
						</div>
					);
				})}
				<div ref={bottomRef} />
			</div>
			<form onSubmit={handleSend} className="pe-fil__saisie">
				<label htmlFor={`msg-${clientId}`} className="sr-only">
					Votre message
				</label>
				<input
					id={`msg-${clientId}`}
					value={body}
					onChange={(e) => setBody(e.target.value)}
					placeholder="Écrire un message..."
					autoComplete="off"
					className="pe-input"
				/>
				<button type="submit" disabled={sending || !body.trim()} className="pe-btn">
					<SendHorizontal aria-hidden="true" />
					<span className="hidden sm:inline">Envoyer</span>
					<span className="sr-only sm:hidden">Envoyer</span>
				</button>
			</form>
		</div>
	);
}
