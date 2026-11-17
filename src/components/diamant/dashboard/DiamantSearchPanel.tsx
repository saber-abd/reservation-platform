import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { getPrimaryProfessional, getDemoTag, type Appointment } from '@/lib/queries';
import { Search, Calendar, Clock, Phone, Mail, ArrowRight } from 'lucide-react';
import { Avatar, EASE, EnChargement, EtatVide, PastilleStatut, Squelette } from './kit/primitives';
import { publierClients } from './kit/indexClients';

type AppointmentWithService = Appointment & {
	services: { name: string; duration_minutes: number; price: number } | null;
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

	const reduit = useReducedMotion();

	// Recherche lancée depuis la palette de commandes : /dashboard/recherche?q=…
	useEffect(() => {
		const q = new URLSearchParams(window.location.search).get('q');
		if (q && q.trim()) {
			setQuery(q);
			handleSearch(undefined, q);
		}
	}, []);

	async function handleSearch(e?: React.FormEvent, valeur?: string) {
		e?.preventDefault();
		const q = (valeur ?? query).trim();
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
			// Les clients trouvés alimentent la palette de commandes (Ctrl+K).
			publierClients(filtered.filter((r) => r.client_id).map((r) => ({ id: r.client_id as string, full_name: r.client_name, phone: r.client_phone, email: r.client_email })));
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Erreur de recherche.');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div>
			{/* Barre de recherche */}
			<form onSubmit={handleSearch} className="mb-8 flex flex-col gap-3 sm:flex-row" role="search">
				<div className="flex flex-1 items-center gap-3 rounded-full border border-dx-filet-fort bg-dx-carte px-5 py-1 transition-shadow focus-within:border-dx-terre focus-within:shadow-[0_0_0_4px_rgb(168_75_37/0.12)]">
					<Search size={19} className="shrink-0 text-dx-terre" />
					<label htmlFor="dx-recherche-rdv" className="sr-only">Rechercher un rendez-vous</label>
					<input
						id="dx-recherche-rdv"
						type="search"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Nom du client, email, téléphone ou prestation..."
						className="dx-sans-contour min-h-12 w-full bg-transparent text-[1.0625rem] text-dx-encre placeholder:text-dx-gris focus:outline-none"
						autoFocus
					/>
				</div>
				<button
					type="submit"
					disabled={loading || !query.trim()}
					className="dx-btn !min-h-14 !px-7"
				>
					{loading ? '...' : 'Chercher'}
				</button>
			</form>

			{/* État initial */}
			{!searched && (
				<div className="dx-carte dx-carte--plate border-dashed">
					<EtatVide
						dessin="recherche"
						titre="Retrouver un rendez-vous"
						texte="Saisissez un nom, email, téléphone ou prestation pour rechercher dans vos rendez-vous."
					/>
				</div>
			)}

			{/* Erreur */}
			{error && (
				<p className="dx-bandeau" data-ton="alerte">{error}</p>
			)}

			{searched && loading && (
				<EnChargement label="Recherche en cours…" className="dx-carte divide-y divide-dx-filet overflow-hidden">
					{[0, 1, 2].map((i) => (
						<div key={i} className="flex items-center gap-4 p-5">
							<Squelette className="h-10 w-10 !rounded-full" />
							<Squelette className="h-4 w-1/3" />
							<Squelette className="ml-auto h-6 w-20 !rounded-full" />
						</div>
					))}
				</EnChargement>
			)}

			{/* Résultats */}
			{searched && !loading && !error && (
				<>
					<p className="dx-meta mb-4" aria-live="polite">
						{results.length === 0
							? 'Aucun rendez-vous trouvé pour cette recherche.'
							: `${results.length} rendez-vous trouvé${results.length > 1 ? 's' : ''}`}
					</p>

					{results.length === 0 ? (
						<div className="dx-carte dx-carte--plate">
							<EtatVide dessin="recherche" titre="Aucun résultat." texte="Essayez un autre critère de recherche." />
						</div>
					) : (
						<ul className="dx-carte divide-y divide-dx-filet overflow-hidden">
							{results.map((rdv, i) => (
								<motion.li
									key={rdv.id}
									initial={reduit ? false : { opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.4, ease: EASE, delay: Math.min(i * 0.04, 0.4) }}
									className="grid gap-4 px-5 py-5 transition-colors hover:bg-dx-ivoire/70 md:grid-cols-[1.2fr_1fr_auto] md:items-center"
								>
									<div className="flex min-w-0 items-center gap-3">
										<Avatar nom={rdv.client_name} taille={40} ton="terre" />
										<div className="min-w-0">
											<p className="break-words font-semibold text-dx-encre">{rdv.client_name}</p>
											{rdv.services && <p className="text-sm text-dx-terre">{rdv.services.name}</p>}
										</div>
									</div>
									<div className="grid gap-1.5 text-sm text-dx-encre-2 sm:grid-cols-2 md:grid-cols-1">
										<span className="flex items-center gap-2"><Calendar size={14} className="shrink-0 text-dx-gris" /> <span className="first-letter:uppercase">{formatDate(rdv.start_time)}</span></span>
										{rdv.services && (
											<span className="dx-tabulaire flex items-center gap-2"><Clock size={14} className="shrink-0 text-dx-gris" /> {rdv.services.duration_minutes} min · {rdv.services.price} €</span>
										)}
										{rdv.client_email && (
											<span className="flex min-w-0 items-center gap-2"><Mail size={14} className="shrink-0 text-dx-gris" /> <span className="truncate">{rdv.client_email}</span></span>
										)}
										{rdv.client_phone && (
											<span className="flex items-center gap-2"><Phone size={14} className="shrink-0 text-dx-gris" /> {rdv.client_phone}</span>
										)}
									</div>
									<div className="flex items-center gap-3 md:flex-col md:items-end">
										<PastilleStatut statut={rdv.status} />
										{rdv.client_id && (
											<a href={`/demo-diamant/dashboard/clients?clientId=${encodeURIComponent(rdv.client_id)}`} className="dx-lien !text-xs">
												Fiche client <ArrowRight size={12} />
											</a>
										)}
									</div>
								</motion.li>
							))}
						</ul>
					)}
				</>
			)}
		</div>
	);
}
