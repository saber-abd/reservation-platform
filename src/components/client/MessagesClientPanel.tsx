import { useEffect, useState } from 'react';
import { useAuthedClient } from '@/lib/useAuthedClient';
import { getPrimaryProfessional, type Professional } from '@/lib/queries';
import MessageThread from '@/components/shared/MessageThread';

export default function MessagesClientPanel() {
	const { loading, client, error } = useAuthedClient();
	const [professional, setProfessional] = useState<Professional | null>(null);

	useEffect(() => {
		getPrimaryProfessional().then(setProfessional);
	}, []);

	if (loading) return <p className="text-sm text-stone-500">Chargement...</p>;
	if (error) return <p className="text-sm text-red-600">{error}</p>;

	return (
		<div>
			<h1 className="text-2xl font-bold text-stone-900">Messagerie</h1>
			<p className="mt-1 text-sm text-stone-500">Échangez directement avec le salon.</p>

			<div className="mt-6">
				{professional && client ? (
					<MessageThread professionalId={professional.id} clientId={client.id} role="client" />
				) : (
					<p className="text-sm text-stone-500">Aucun professionnel disponible pour le moment.</p>
				)}
			</div>
		</div>
	);
}
