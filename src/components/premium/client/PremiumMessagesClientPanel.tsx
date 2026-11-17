import { useEffect, useState } from 'react';
import { useAuthedClient } from '@/lib/useAuthedClient';
import { getPrimaryProfessional, type Professional } from '@/lib/queries';
import MessageThread from '@/components/premium/ui/PremiumMessageThread';
import { EmptyState, PageHead, PageSkeleton } from '@/components/premium/dashboard/kit/Base';

export default function MessagesClientPanel() {
	const { loading, client, error } = useAuthedClient();
	const [professional, setProfessional] = useState<Professional | null>(null);
	const [loadingPro, setLoadingPro] = useState(true);

	useEffect(() => {
		getPrimaryProfessional()
			.then(setProfessional)
			.finally(() => setLoadingPro(false));
	}, []);

	if (loading) return <PageSkeleton cards={1} />;
	if (error) return <p className="pe-erreur">{error}</p>;

	return (
		<div className="pe-entree">
			<PageHead title="Messagerie" sub="Échangez directement avec le garage." />

			<section className="max-w-3xl" aria-label="Conversation avec l'atelier">
				<div className="flex items-center gap-4 rounded-t-[2px] bg-pe-carbone px-5 py-4 text-pe-blanc">
					<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[2px] bg-pe-graphite-2" aria-hidden="true">
						<span className="h-3.5 w-3.5 -skew-x-[14deg] bg-pe-rouge" />
					</span>
					<div className="min-w-0">
						<p className="truncate text-lg font-extrabold uppercase leading-tight [font-stretch:118%]">
							{professional?.business_name ?? (loadingPro ? ' ' : "L'atelier")}
						</p>
						<p className="pe-tech !text-pe-acier-clair">Messagerie directe avec l'atelier</p>
					</div>
				</div>
				{loadingPro ? (
					<div className="pe-fil !rounded-t-none" aria-busy="true">
						<div className="pe-fil__flux">
							<span className="sr-only">Chargement…</span>
							<span className="pe-skel self-start" style={{ height: 46, width: '55%' }} />
							<span className="pe-skel self-end" style={{ height: 46, width: '45%' }} />
						</div>
					</div>
				) : professional && client ? (
					<div className="[&_.pe-fil]:rounded-t-none [&_.pe-fil]:border-t-0">
						<MessageThread professionalId={professional.id} clientId={client.id} role="client" variant="grand" />
					</div>
				) : (
					<div className="pe-card !rounded-t-none !border-t-0">
						<EmptyState kind="bulle" title="Aucun professionnel disponible pour le moment." />
					</div>
				)}
			</section>
		</div>
	);
}
