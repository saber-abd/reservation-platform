import { useEffect, useRef, useState } from 'react';
import { getMessages, sendMessage, type Message } from '@/lib/queries';
import { getSession } from '@/lib/auth';
import { Lock } from 'lucide-react';
import { isRoleReadOnly } from '@/lib/permissions';
import { useLectureSeule } from '@/components/diamant/dashboard/kit/lectureSeule';
import { avertirLectureSeule } from '@/components/diamant/dashboard/kit/notifier';

const MESSAGE_ENVOI_DEMO = 'Envoi désactivé en mode Démo : la messagerie est en lecture seule.';

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
	const listeRef = useRef<HTMLDivElement>(null);
	// Fil côté pro : le compte « démo » consulte sans pouvoir écrire.
	const lectureSeule = useLectureSeule(role === 'professional');

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

	// Défile seulement le fil (pas la page) jusqu'au dernier message.
	useEffect(() => {
		const el = listeRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [messages]);

	async function handleSend(e: React.FormEvent) {
		e.preventDefault();
		if (role === 'professional' && isRoleReadOnly()) {
			avertirLectureSeule(MESSAGE_ENVOI_DEMO);
			return;
		}
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
		<div className="flex flex-col overflow-hidden rounded-xl border border-dx-filet bg-dx-ivoire">
			<div ref={listeRef} className="max-h-80 min-h-40 flex-1 overflow-y-auto px-4 py-4">
				{loading && (
					<div aria-busy="true" className="flex flex-col gap-2">
						<span className="sr-only" role="status">Chargement des messages...</span>
						<span className="dx-squelette block h-9 w-2/3" />
						<span className="dx-squelette ml-auto block h-9 w-1/2" />
					</div>
				)}
				{!loading && messages.length === 0 && (
					<p className="py-6 text-center text-sm text-dx-gris">Aucun message pour le moment. Démarrez la conversation !</p>
				)}
				<div className="flex flex-col gap-1.5">
					{messages.map((message) => {
						const moi = message.sender === role;
						return (
							<div key={message.id} className={`flex flex-col ${moi ? 'items-end' : 'items-start'}`}>
								<p className={`dx-bulle !text-sm ${moi ? 'dx-bulle--moi' : 'dx-bulle--autre'}`}>{message.body}</p>
								<p className="mt-1 px-1 text-[10px] text-dx-gris">
									{new Date(message.created_at).toLocaleString('fr-FR', {
										day: 'numeric',
										month: 'short',
										hour: '2-digit',
										minute: '2-digit',
									})}
								</p>
							</div>
						);
					})}
				</div>
				<div ref={bottomRef} />
			</div>
			{lectureSeule && (
				<p className="flex items-center gap-1.5 border-t border-dx-filet bg-dx-carte px-3.5 pt-2.5 text-xs font-semibold text-dx-gris">
					<Lock size={12} /> Lecture seule (mode Démo) : envoi désactivé.
				</p>
			)}
			<form
				onSubmit={handleSend}
				onClick={lectureSeule ? () => avertirLectureSeule(MESSAGE_ENVOI_DEMO) : undefined}
				className={'flex items-center gap-2 bg-dx-carte p-2.5 focus-within:shadow-[inset_0_0_0_2px_var(--dx-terre)] ' + (lectureSeule ? 'cursor-not-allowed opacity-70' : 'border-t border-dx-filet')}
			>
				<label htmlFor={'fil-' + clientId} className="sr-only">Écrire un message</label>
				<input
					id={'fil-' + clientId}
					value={body}
					onChange={(e) => setBody(e.target.value)}
					readOnly={lectureSeule}
					aria-disabled={lectureSeule || undefined}
					placeholder={lectureSeule ? 'Lecture seule : envoi désactivé' : 'Écrire un message...'}
					className={'dx-sans-contour min-w-0 flex-1 rounded-full bg-transparent px-3 py-2 text-sm text-dx-encre placeholder:text-dx-gris focus:outline-none ' + (lectureSeule ? 'cursor-not-allowed' : '')}
				/>
				<button
					type={lectureSeule ? 'button' : 'submit'}
					disabled={!lectureSeule && (sending || !body.trim())}
					aria-disabled={lectureSeule || undefined}
					className="dx-btn dx-btn--sm"
				>
					Envoyer
				</button>
			</form>
		</div>
	);
}
