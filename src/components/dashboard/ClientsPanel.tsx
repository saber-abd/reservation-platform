import { useEffect, useState } from 'react';
import { useAuthedProfessional } from '@/lib/useAuthedProfessional';
import { getRegisteredClients, type Client } from '@/lib/queries';
import MessageThread from '@/components/shared/MessageThread';

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

			<div className="mt-6 grid gap-6 md:grid-cols-3">
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

				<div className="md:col-span-2">
					{selectedClient && professional ? (
						<MessageThread professionalId={professional.id} clientId={selectedClient.id} role="professional" />
					) : (
						<p className="text-sm text-stone-500">Sélectionnez un client dans la liste pour ouvrir la conversation.</p>
					)}
				</div>
			</div>
		</div>
	);
}
