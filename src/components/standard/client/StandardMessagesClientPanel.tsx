import { useEffect, useState } from 'react';
import { useAuthedClient } from '@/lib/useAuthedClient';
import { getPrimaryProfessional, type Professional } from '@/lib/queries';
import MessageThread from '@/components/standard/ui/StandardMessageThread';
import { Busy, EmptyState, PageHeader, Skeleton } from '@/components/standard/ui/StandardKit';

export default function MessagesClientPanel() {
	const { loading, client, error } = useAuthedClient();
	const [professional, setProfessional] = useState<Professional | null>(null);
	const [loadingPro, setLoadingPro] = useState(true);

	useEffect(() => {
		getPrimaryProfessional()
			.then(setProfessional)
			.finally(() => setLoadingPro(false));
	}, []);

	if (loading) {
		return (
			<Busy>
				<div className="sa-pagehead">
					<div className="grid gap-3">
						<Skeleton className="h-9 w-48" />
						<Skeleton className="h-4 w-72" />
					</div>
				</div>
				<Skeleton className="h-96 w-full" />
			</Busy>
		);
	}
	if (error) return <p className="sa-alert">{error}</p>;

	return (
		<div>
			<PageHeader title="Messagerie" subtitle="Échangez directement avec votre technicien. Pour un changement de créneau, passez plutôt par « Mes rendez-vous »." />

			<div className="sa-panel max-w-3xl">
				{professional && client ? (
					<>
						<div className="flex items-center gap-3 border-b border-[var(--sa-line-soft)] px-5 py-3.5">
							<span className="st-logo-mark shrink-0" aria-hidden="true">
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
									<circle cx="8" cy="8" r="6.2" />
									<path d="M8 4.6v6.8M4.6 8h6.8" />
								</svg>
							</span>
							<div className="min-w-0">
								<p className="truncate font-semibold text-ink">{professional.business_name}</p>
								<p className="text-xs text-ink-mute">Réponse en général dans la journée, du lundi au samedi.</p>
							</div>
						</div>
						<MessageThread professionalId={professional.id} clientId={client.id} role="client" tall />
					</>
				) : loadingPro ? (
					<Busy>
						<Skeleton className="h-96 w-full" />
					</Busy>
				) : (
					<EmptyState kind="chat" title="Aucun professionnel disponible pour le moment." />
				)}
			</div>
		</div>
	);
}
