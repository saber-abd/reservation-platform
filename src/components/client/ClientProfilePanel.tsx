import { useEffect, useState } from 'react';
import { useAuthedClient } from '@/lib/useAuthedClient';
import { updateClient } from '@/lib/queries';

export default function ClientProfilePanel() {
	const { loading, client, email, error } = useAuthedClient();
	const [fullName, setFullName] = useState('');
	const [phone, setPhone] = useState('');
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		if (client) {
			setFullName(client.full_name ?? '');
			setPhone(client.phone ?? '');
		}
	}, [client]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!client) return;
		setSaving(true);
		setMessage(null);
		try {
			await updateClient(client.id, { full_name: fullName, phone });
			setMessage('Profil mis à jour.');
		} catch (err) {
			setMessage(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.');
		} finally {
			setSaving(false);
		}
	}

	if (loading) return <p className="text-sm text-stone-500">Chargement...</p>;
	if (error) return <p className="text-sm text-red-600">{error}</p>;

	return (
		<div>
			<h1 className="text-2xl font-bold text-stone-900">Mon profil</h1>

			<form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4 rounded-xl border border-border bg-white p-6 shadow-sm">
				<div>
					<label className="block text-sm font-medium text-stone-700">Email</label>
					<input
						type="email"
						value={email ?? ''}
						disabled
						className="mt-1 w-full rounded-lg border border-border bg-stone-50 px-3 py-2 text-sm text-stone-500"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-stone-700">Nom complet</label>
					<input
						type="text"
						value={fullName}
						onChange={(e) => setFullName(e.target.value)}
						className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-rose-400 focus:outline-none"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-stone-700">Téléphone</label>
					<input
						type="tel"
						value={phone}
						onChange={(e) => setPhone(e.target.value)}
						className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-rose-400 focus:outline-none"
					/>
				</div>
				{message && <p className="text-sm text-stone-600">{message}</p>}
				<button
					type="submit"
					disabled={saving}
					className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
				>
					{saving ? 'Enregistrement...' : 'Enregistrer'}
				</button>
			</form>
		</div>
	);
}
