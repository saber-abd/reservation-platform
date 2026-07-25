import { useEffect, useRef, useState } from 'react';
import { getMessages, sendMessage, type Message } from '@/lib/queries';

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

	useEffect(() => {
		setLoading(true);
		getMessages(professionalId, clientId)
			.then(setMessages)
			.finally(() => setLoading(false));
	}, [professionalId, clientId]);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ block: 'nearest' });
	}, [messages]);

	async function handleSend(e: React.FormEvent) {
		e.preventDefault();
		if (!body.trim()) return;
		setSending(true);
		try {
			const created = await sendMessage({ professional_id: professionalId, client_id: clientId, sender: role, body });
			setMessages((prev) => [...prev, created]);
			setBody('');

			// Notification Email (en asynchrone)
			fetch('/api/send-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					to: role === 'client' ? 'pro-test@example.com' : 'client.test1@example.com', // En mode démo, on utilise des emails de test. En prod, il faudrait faire une requête pour récupérer l'email du destinataire (client.email ou professional.email).
					subject: `Nouveau message reçu`,
					html: `<p>Vous avez reçu un nouveau message :</p><p><em>"${body}"</em></p><p>Connectez-vous pour répondre.</p>`
				})
			}).catch(console.error);

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
					className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
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
