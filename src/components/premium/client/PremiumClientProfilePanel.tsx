import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuthedClient } from '@/lib/useAuthedClient';
import { updateClient } from '@/lib/queries';
import AvatarPicker, { AvatarDisplay, type AvatarKey } from '@/components/premium/ui/PremiumAvatarPicker';
import { MAX_NAME_LENGTH } from '@/lib/limits';
import { PageHead, PageSkeleton } from '@/components/premium/dashboard/kit/Base';

export default function ClientProfilePanel() {
	const { loading, client, email, error } = useAuthedClient();
	const [fullName, setFullName] = useState('');
	const [phone, setPhone] = useState('');
	const [avatarKey, setAvatarKey] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		if (client) {
			setFullName(client.full_name ?? '');
			setPhone(client.phone ?? '');
			setAvatarKey(client.avatar_url ?? null);
		}
	}, [client]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!client) return;
		setSaving(true);
		setMessage(null);
		try {
			await updateClient(client.id, { full_name: fullName, phone, avatar_url: avatarKey });
			setMessage('Profil mis à jour.');
			toast.success('Profil mis à jour.');
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Erreur lors de la mise à jour.';
			setMessage(msg);
			toast.error(msg);
		} finally {
			setSaving(false);
		}
	}

	if (loading) return <PageSkeleton cards={1} />;
	if (error) return <p className="pe-erreur">{error}</p>;

	return (
		<div className="pe-entree">
			<PageHead title="Mon profil" sub="Vos coordonnées servent à l'atelier pour confirmer et rappeler vos rendez-vous." />

			<div className="grid max-w-4xl items-start gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
				{/* Carte d'identité */}
				<aside className="pe-card pe-card--sombre p-5 md:sticky md:top-6" aria-label="Votre carte">
					<div className="flex items-center gap-4 md:block">
						<AvatarDisplay avatarKey={avatarKey} size={72} className="!border-0" />
						<div className="min-w-0 md:mt-4">
							<p className="break-words text-xl font-extrabold uppercase leading-tight [font-stretch:118%]">{fullName || 'Votre nom'}</p>
							<p className="pe-tech mt-1 break-all !normal-case !tracking-normal">{email ?? ''}</p>
						</div>
					</div>
					<p className="mt-4 border-t border-pe-filet-sombre pt-4 text-sm tabular-nums text-pe-acier-clair">{phone || 'Téléphone non renseigné'}</p>
				</aside>

				<form onSubmit={handleSubmit} className="pe-card">
					<div className="pe-card__corps grid gap-5">
						<div>
							<label className="pe-label" htmlFor="profil-email">
								Email
							</label>
							<input id="profil-email" type="email" value={email ?? ''} disabled className="pe-input" />
						</div>
						<div className="grid gap-5 sm:grid-cols-2">
							<div>
								<label className="pe-label" htmlFor="profil-nom">
									Nom complet
								</label>
								<input
									id="profil-nom"
									type="text"
									value={fullName}
									maxLength={MAX_NAME_LENGTH}
									onChange={(e) => setFullName(e.target.value)}
									className="pe-input"
								/>
							</div>
							<div>
								<label className="pe-label" htmlFor="profil-tel">
									Téléphone
								</label>
								<input id="profil-tel" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="pe-input" />
							</div>
						</div>
						<div className="border-t border-pe-filet pt-5">
							<AvatarPicker value={avatarKey} onChange={(k: AvatarKey) => setAvatarKey(k)} />
						</div>
						<div className="flex flex-wrap items-center gap-4">
							<button type="submit" disabled={saving} className="pe-btn">
								{saving ? 'Enregistrement…' : 'Enregistrer'}
							</button>
							{message && <p className="text-sm text-pe-acier">{message}</p>}
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
