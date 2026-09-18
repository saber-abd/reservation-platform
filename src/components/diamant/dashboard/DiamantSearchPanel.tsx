import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getPrimaryProfessional, getDemoTag, type Appointment } from '@/lib/queries';
import { Search, Calendar, Clock, User, Phone, Mail, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

type AppointmentWithService = Appointment & {
	services: { name: string; duration_minutes: number; price: number } | null;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
	pending: { label: 'En attente', color: 'bg-amber-50 text-amber-700 border-amber-200' },
	confirmed: { label: 'Confirmé', color: 'bg-green-50 text-green-700 border-green-200' },
	cancelled: { label: 'Annulé', color: 'bg-red-50 text-red-600 border-red-200' },
	completed: { label: 'Terminé', color: 'bg-stone-100 text-stone-600 border-stone-200' },
};

function formatDate(iso: string) {
	return new Date(iso).toLocaleString('fr-FR', {
		weekday: 'short',
		day: '2-digit',
		month: 'long',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

export default function DiamantSearchPanel() {
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<AppointmentWithService[]>([]);
	const [loading, setLoading] = useState(false);
	const [searched, setSearched] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSearch(e?: React.FormEvent) {
		e?.preventDefault();
		const q = query.trim();
		if (!q) return;

		setLoading(true);
		setSearched(true);
		setError(null);
		setResults([]);

		try {
			const tag = getDemoTag();
			const pro = await getPrimaryProfessional(tag);
			if (!pro) throw new Error('Professionnel introuvable.');

			// Recherche dans appointments — filtre via ilike sur client_name, client_email, client_phone, et nom du service
			const { data, error: dbError } = await supabase
				.from('appointments')
				.select('*, services(name, duration_minutes, price)')
				.eq('professional_id', pro.id)
				.eq('tag_bd', tag)
				.or(
					`client_name.ilike.%${q}%,client_email.ilike.%${q}%,client_phone.ilike.%${q}%`
				)
				.order('start_time', { ascending: false })
				.limit(50);

			if (dbError) throw dbError;

			// Filtre supplémentaire côté client pour les noms de service
			const rows = (data ?? []) as AppointmentWithService[];
			const filtered = q
				? rows.filter(
					(r) =>
						r.client_name?.toLowerCase().includes(q.toLowerCase()) ||
						r.client_email?.toLowerCase().includes(q.toLowerCase()) ||
						r.client_phone?.includes(q) ||
						r.services?.name?.toLowerCase().includes(q.toLowerCase())
				)
				: rows;

			setResults(filtered);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Erreur de recherche.');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div>
			{/* Barre de recherche */}
			<form onSubmit={handleSearch} className="mb-8 flex gap-3">
				<div className="flex-1 flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm focus-within:border-deep-teal-400 focus-within:ring-2 focus-within:ring-deep-teal-100 transition-all">
					<Search size={17} className="text-stone-400 shrink-0" />
					<input
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Nom du client, email, téléphone ou prestation..."
						className="w-full bg-transparent text-sm text-stone-700 placeholder-stone-400 focus:outline-none"
						autoFocus
					/>
				</div>
				<button
					type="submit"
					disabled={loading || !query.trim()}
					className="px-6 py-3 rounded-xl bg-deep-teal-500 text-white text-sm font-bold uppercase tracking-widest hover:bg-deep-teal-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? '...' : 'Chercher'}
				</button>
			</form>

			{/* État initial */}
			{!searched && (
				<div className="text-center py-16 text-stone-400">
					<Search size={40} className="mx-auto mb-4 opacity-30" />
					<p className="text-base font-medium">Saisissez un nom, email, téléphone ou prestation pour rechercher dans vos rendez-vous.</p>
				</div>
			)}

			{/* Erreur */}
			{error && (
				<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 text-sm flex items-center gap-3">
					<XCircle size={18} />
					{error}
				</div>
			)}

			{/* Résultats */}
			{searched && !loading && !error && (
				<>
					<p className="text-stone-400 text-sm mb-5">
						{results.length === 0
							? 'Aucun rendez-vous trouvé pour cette recherche.'
							: `${results.length} rendez-vous trouvé${results.length > 1 ? 's' : ''}`}
					</p>

					{results.length === 0 && (
						<div className="text-center py-12">
							<AlertCircle size={36} className="mx-auto mb-3 text-stone-300" />
							<p className="text-stone-400">Aucun résultat. Essayez un autre critère de recherche.</p>
						</div>
					)}

					<div className="space-y-4">
						{results.map((rdv) => {
							const status = STATUS_LABELS[rdv.status] ?? STATUS_LABELS.pending;
							return (
								<div
									key={rdv.id}
									className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm hover:border-deep-teal-200 hover:shadow-md transition-all card-hover"
								>
									<div className="flex items-start justify-between gap-4 mb-4">
										<div>
											<p className="font-bold text-stone-900 text-base">{rdv.client_name}</p>
											{rdv.services && (
												<p className="text-deep-teal-600 text-sm font-medium mt-0.5">{rdv.services.name}</p>
											)}
										</div>
										<span className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full border ${status.color}`}>
											{status.label}
										</span>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-stone-600">
										<div className="flex items-center gap-2">
											<Calendar size={14} className="text-stone-400 shrink-0" />
											<span>{formatDate(rdv.start_time)}</span>
										</div>
										{rdv.services && (
											<div className="flex items-center gap-2">
												<Clock size={14} className="text-stone-400 shrink-0" />
												<span>{rdv.services.duration_minutes} min · {rdv.services.price} €</span>
											</div>
										)}
										{rdv.client_email && (
											<div className="flex items-center gap-2">
												<Mail size={14} className="text-stone-400 shrink-0" />
												<span className="truncate">{rdv.client_email}</span>
											</div>
										)}
										{rdv.client_phone && (
											<div className="flex items-center gap-2">
												<Phone size={14} className="text-stone-400 shrink-0" />
												<span>{rdv.client_phone}</span>
											</div>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</>
			)}
		</div>
	);
}
