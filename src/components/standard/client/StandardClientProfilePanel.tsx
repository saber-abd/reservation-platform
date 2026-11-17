import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuthedClient } from '@/lib/useAuthedClient';
import { updateClient } from '@/lib/queries';
import AvatarPicker, { type AvatarKey } from '@/components/standard/ui/StandardAvatarPicker';
import { MAX_NAME_LENGTH } from '@/lib/limits';
import { PageHeader, PageSkeleton, Panel } from '@/components/standard/ui/StandardKit';

export default function ClientProfilePanel() {
	const { loading, client, email, error } = useAuthedClient();
	const [fullName, setFullName] = useState('');
	const [phone, setPhone] = useState('');
	const [avatarKey, setAvatarKey] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

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
			setMessage({ text: 'Profil mis à jour.', ok: true });
			toast.success('Profil mis à jour.');
		} catch (err) {
			setMessage({ text: err instanceof Error ? err.message : 'Erreur lors de la mise à jour.', ok: false });
		} finally {
			setSaving(false);
		}
	}

	if (loading) return <PageSkeleton rows={3} figures={false} />;
	if (error) return <p className="sa-alert">{error}</p>;

	return (
		<div>
			<PageHeader title="Mon profil" subtitle="Vos coordonnées servent au technicien pour vous joindre avant une intervention." />

			<form onSubmit={handleSubmit} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
				<Panel title="Coordonnées" bodyClassName="sa-panel-body grid gap-5">
					<div>
						<label className="sa-label" htmlFor="sa-client-email">
							Email
						</label>
						<input id="sa-client-email" type="email" value={email ?? ''} disabled className="sa-input" />
						<p className="sa-hint">L'adresse de connexion ne se modifie pas ici.</p>
					</div>
					<div>
						<label className="sa-label" htmlFor="sa-client-name">
							Nom complet
						</label>
						<input
							id="sa-client-name"
							type="text"
							value={fullName}
							maxLength={MAX_NAME_LENGTH}
							onChange={(e) => setFullName(e.target.value)}
							autoComplete="name"
							className="sa-input"
						/>
					</div>
					<div>
						<label className="sa-label" htmlFor="sa-client-phone">
							Téléphone
						</label>
						<input
							id="sa-client-phone"
							type="tel"
							value={phone}
							onChange={(e) => setPhone(e.target.value)}
							autoComplete="tel"
							className="sa-input sa-num"
						/>
					</div>
				</Panel>

				<div className="grid gap-6">
					<Panel title="Photo de profil">
						<AvatarPicker value={avatarKey} onChange={(k: AvatarKey) => setAvatarKey(k)} />
					</Panel>
					<div className="grid gap-3">
						{message && <p className={message.ok ? 'sa-success' : 'sa-alert'}>{message.text}</p>}
						<button type="submit" disabled={saving} className="sa-btn sa-btn--primary sa-btn--block">
							{saving ? 'Enregistrement...' : 'Enregistrer'}
						</button>
					</div>
				</div>
			</form>
		</div>
	);
}
