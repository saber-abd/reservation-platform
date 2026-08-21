import { useEffect, useState } from 'react';
import { useAuthedProfessional } from '@/lib/useAuthedProfessional';
import { getClientNote, getRegisteredClients, upsertClientNote, type Client } from '@/lib/queries';
import MessageThread from '@/components/shared/MessageThread';

function ClientNoteCard({ professionalId, client }: { professionalId: string; client: Client }) {
	const [note, setNote] = useState('');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [status, setStatus] = useState<string | null>(null);

	useEffect(() => {
		setLoading(true);
		setStatus(null);
		getClientNote(professionalId, client.id)
			.then((existing) => setNote(existing?.note ?? ''))
			.finally(() => setLoading(false));
	}, [professionalId, client.id]);

	async function handleSave() {
		setSaving(true);
		setStatus(null);
		try {
			await upsertClientNote(professionalId, client.id, note);
			setStatus('Note enregistrée.');
		} catch (err) {
			setStatus(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="rounded-xl border border-border bg-white p-4">
			<p className="text-sm font-semibold text-stone-900">Fiche client (note privée)</p>
			<p className="mt-1 text-xs text-stone-500">Visible uniquement par vous — préférences, allergies, historique...</p>
			<textarea
				rows={3}
				value={note}
				disabled={loading}
				onChange={(e) => setNote(e.target.value)}
				placeholder="Ex : préfère les colorations sans ammoniaque, allergie au latex..."
				className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
			/>
			<div className="mt-2 flex items-center gap-3">
				<button
					type="button"
					onClick={handleSave}
					disabled={saving || loading}
					className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
				>
					{saving ? 'Enregistrement...' : 'Enregistrer'}
				</button>
				{status && <p className="text-xs text-stone-500">{status}</p>}
			</div>
		</div>
	);
}

export default function ClientsPanel() {
	const { loading, professional, error } = useAuthedProfessional();
	const [clients, setClients] = useState<Client[]>([]);
	const [selectedClient, setSelectedClient] = useState<Client | null>(null);

	useEffect(() => {
		if (!professional) return;
		getRegisteredClients(professional.id).then(setClients);
	}, [professional]);

	if (loading) return <p className="text-sm text-stone-500">Chargement...</p>;
	if (error) return <p className="text-sm text-red-600">{error}</p>;

	return (
		<div>
			<h1 className="text-2xl font-bold text-stone-900">Mes clients</h1>
			<p className="mt-1 text-sm text-stone-500">
				Les clients inscrits ayant déjà réservé chez vous. Sélectionnez-en un pour lui écrire.
			</p>

			<div className="mt-6 grid items-start gap-6 md:grid-cols-3">
				<div className="grid gap-2 md:col-span-1">
					{clients.length === 0 && <p className="text-sm text-stone-500">Aucun client inscrit pour le moment.</p>}
					{clients.map((client) => (
						<button
							key={client.id}
							onClick={() => setSelectedClient(client)}
							className={`rounded-xl border p-3 text-left text-sm transition-colors ${
								selectedClient?.id === client.id
									? 'border-rose-600 bg-rose-50'
									: 'border-border bg-white hover:border-rose-300'
							}`}
						>
							<p className="font-medium text-stone-900">{client.full_name || 'Client'}</p>
							{client.phone && <p className="text-xs text-stone-500">{client.phone}</p>}
						</button>
					))}
				</div>

				<div className="md:col-span-2 flex flex-col gap-4">
					{selectedClient && professional ? (
						<>
							<ClientNoteCard professionalId={professional.id} client={selectedClient} />
							<MessageThread professionalId={professional.id} clientId={selectedClient.id} role="professional" />
						</>
					) : (
						<p className="text-sm text-stone-500">Sélectionnez un client dans la liste pour ouvrir la conversation.</p>
					)}
				</div>
			</div>
		</div>
	);
}
