import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
	/** Page vers laquelle renvoyer l'utilisateur après suppression (ex. /demo-diamant). */
	basePath: string;
}

/**
 * Droits RGPD en libre-service : export des données (art. 20) et suppression du compte (art. 17).
 * S'appuie sur les fonctions SQL export_my_data() et delete_my_account() (migration 0010).
 */
export default function AccountPrivacyActions({ basePath }: Props) {
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [confirming, setConfirming] = useState(false);
	const [confirmText, setConfirmText] = useState('');

	async function handleExport() {
		setBusy(true);
		setMessage(null);
		try {
			const { data, error } = await supabase.rpc('export_my_data');
			if (error) throw error;
			const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'mes-donnees.json';
			a.click();
			URL.revokeObjectURL(url);
			setMessage('Vos données ont été téléchargées.');
		} catch (e) {
			setMessage("L'export a échoué. Réessayez ou contactez l'établissement.");
		} finally {
			setBusy(false);
		}
	}

	async function handleDelete() {
		setBusy(true);
		setMessage(null);
		try {
			const { error } = await supabase.rpc('delete_my_account');
			if (error) throw error;
			await supabase.auth.signOut().catch(() => null);
			try {
				localStorage.clear();
				sessionStorage.clear();
			} catch (e) {}
			window.location.href = basePath;
		} catch (e) {
			setMessage('La suppression a échoué. Réessayez ou contactez l\'établissement.');
			setBusy(false);
		}
	}

	return (
		<section className="mt-10 rounded-2xl border border-stone-200 bg-white p-6">
			<h2 className="text-base font-bold text-stone-900">Mes données personnelles</h2>
			<p className="mt-1 text-sm text-stone-500">
				Vous pouvez télécharger une copie de vos données ou supprimer définitivement votre compte.
			</p>

			<div className="mt-4 flex flex-wrap gap-3">
				<button
					type="button"
					onClick={handleExport}
					disabled={busy}
					className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50"
				>
					Télécharger mes données
				</button>
				{!confirming && (
					<button
						type="button"
						onClick={() => setConfirming(true)}
						disabled={busy}
						className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
					>
						Supprimer mon compte
					</button>
				)}
			</div>

			{confirming && (
				<div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
					<p className="text-sm text-red-800">
						Cette action est définitive : votre profil, vos messages et vos notes seront supprimés, et votre
						historique de rendez-vous sera anonymisé. Tapez <strong>SUPPRIMER</strong> pour confirmer.
					</p>
					<div className="mt-3 flex flex-wrap gap-2">
						<input
							type="text"
							value={confirmText}
							onChange={(e) => setConfirmText(e.target.value)}
							aria-label="Tapez SUPPRIMER pour confirmer"
							className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm"
						/>
						<button
							type="button"
							onClick={handleDelete}
							disabled={busy || confirmText !== 'SUPPRIMER'}
							className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
						>
							Supprimer définitivement
						</button>
						<button
							type="button"
							onClick={() => {
								setConfirming(false);
								setConfirmText('');
							}}
							className="rounded-xl px-4 py-2 text-sm font-semibold text-stone-600"
						>
							Annuler
						</button>
					</div>
				</div>
			)}

			{message && (
				<p role="status" aria-live="polite" className="mt-3 text-sm text-stone-700">
					{message}
				</p>
			)}
		</section>
	);
}
