import { useEffect, useRef, useState } from 'react';
import { getAppointmentsForClient, getMessages, getProfessionalById, sendMessage, type Message } from '@/lib/queries';

interface Props {
	professionalId: string;
	clientId: string;
	role: 'professional' | 'client';
}

export default function MessageThread({ professionalId, clientId, role }: Props) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [body, setBody] = useState('');
	const [loading, setLoading] = useState(true);
	const [sending, setSending] = useState(false);
	const bottomRef = useRef<HTMLDivElement>(null);

	function getStorageKey(pid: string, cid: string) {
		return `diamant_messages_${pid}_${cid}`;
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

		window.addEventListener('diamant:new-message', handleNewMsg);
		return () => {
			window.removeEventListener('diamant:new-message', handleNewMsg);
		};
	}, [professionalId, clientId]);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ block: 'nearest' });
	}, [messages]);

	/** Retrouve l'email réel du destinataire (le client n'a pas d'email en base, on le déduit de ses réservations). */
	async function resolveRecipientEmail(): Promise<string | null> {
		if (role === 'client') {
			const professional = await getProfessionalById(professionalId);
			return professional?.email ?? null;
		}
		const appointments = await getAppointmentsForClient(clientId);
		return appointments.find((a) => a.professional_id === professionalId)?.client_email ?? null;
	}

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
					const metaRaw = localStorage.getItem('diamant_conversations_meta');
					const meta = metaRaw ? JSON.parse(metaRaw) : {};
					if (!meta[clientId]) meta[clientId] = { id: clientId, full_name: 'Client' };
					meta[clientId].last_message = text;
					meta[clientId].last_message_at = created.created_at;
					if (role === 'client') {
						meta[clientId].unread_by_pro = (meta[clientId].unread_by_pro || 0) + 1;
					} else {
						meta[clientId].unread_by_pro = 0;
					}
					localStorage.setItem('diamant_conversations_meta', JSON.stringify(meta));
				} catch (e) {}

				window.dispatchEvent(new CustomEvent('diamant:new-message', {
					detail: { professionalId, clientId, message: created }
				}));
			}

			// Notification Email (en asynchrone)
			resolveRecipientEmail()
				.then((recipient) => {
					if (!recipient) return;
					return fetch('/api/send-email', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							to: recipient,
							subject: `Nouveau message reçu`,
							html: `<p>Vous avez reçu un nouveau message :</p><p><em>"${text}"</em></p><p>Connectez-vous pour répondre.</p>`,
						}),
					});
				})
				.catch(console.error);

		} finally {
			setSending(false);
		}
	}

	return (
		<div className="flex flex-col rounded-xl border border-border bg-white">
			<div className="max-h-80 min-h-40 flex-1 overflow-y-auto p-4">
				{loading && <p className="text-sm text-stone-500">Chargement des messages...</p>}
				{!loading && messages.length === 0 && (
					<p className="text-sm text-stone-500">Aucun message pour le moment. Démarrez la conversation !</p>
				)}
				<div className="flex flex-col gap-2">
					{messages.map((message) => (
						<div
							key={message.id}
							className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
								message.sender === role ? 'self-end bg-rose-600 text-white' : 'self-start bg-stone-100 text-stone-800'
							}`}
						>
							<p>{message.body}</p>
							<p className={`mt-1 text-[10px] ${message.sender === role ? 'text-rose-100' : 'text-stone-400'}`}>
								{new Date(message.created_at).toLocaleString('fr-FR', {
									day: 'numeric',
									month: 'short',
									hour: '2-digit',
									minute: '2-digit',
								})}
							</p>
						</div>
					))}
				</div>
				<div ref={bottomRef} />
			</div>
			<form onSubmit={handleSend} className="flex gap-2 border-t border-border p-3">
				<input
					value={body}
					onChange={(e) => setBody(e.target.value)}
					placeholder="Écrire un message..."
					className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
				/>
				<button
					type="submit"
					disabled={sending || !body.trim()}
					className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
				>
					Envoyer
				</button>
			</form>
		</div>
	);
}
