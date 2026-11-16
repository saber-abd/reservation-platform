import { type ReactNode, useEffect, useMemo, useState } from 'react';
import devisJson from '@/data/devis.json';
import {
	type DevisData,
	type FormuleId,
	type Service,
	aDesFrais,
	calculerDevis,
	formatEuros,
	formatFourchette,
	formatJours,
	formulesProposant,
	libellesFrais,
	mainOeuvre,
	tarifDe,
} from '@/lib/devis';

const data = devisJson as DevisData;

// Classes littérales par formule (Tailwind ne génère que ce qu'il lit dans les sources).
const ACCENTS: Record<FormuleId, { carte: string; point: string; texte: string; case: string; bouton: string }> = {
	standard: {
		carte: 'border-sky-600 bg-sky-50 ring-2 ring-sky-600',
		point: 'bg-sky-600',
		texte: 'text-sky-800',
		case: 'accent-sky-700',
		bouton: 'btn-dark',
	},
	premium: {
		carte: 'border-rose-600 bg-rose-50 ring-2 ring-rose-600',
		point: 'bg-rose-600',
		texte: 'text-rose-700',
		case: 'accent-rose-600',
		bouton: 'btn-rose',
	},
	diamant: {
		carte: 'border-violet-600 bg-violet-50 ring-2 ring-violet-600',
		point: 'bg-violet-600',
		texte: 'text-violet-700',
		case: 'accent-violet-600',
		bouton: 'btn-violet',
	},
};

interface Props {
	formuleInitiale: FormuleId;
	optionsInitiales?: string[];
}

export default function DevisSimulateur({ formuleInitiale, optionsInitiales = [] }: Props) {
	const [formule, setFormule] = useState<FormuleId>(formuleInitiale);
	const [options, setOptions] = useState<Set<string>>(() => new Set(optionsInitiales));

	const accent = ACCENTS[formule];
	const formuleCourante = data.formules.find((f) => f.id === formule)!;
	const totaux = useMemo(() => calculerDevis(data, formule, options), [formule, options]);

	// Options cochées et réellement proposées en option dans la formule courante.
	const optionsActives = useMemo(
		() => data.services.filter((s) => tarifDe(s, formule)?.statut === 'option' && options.has(s.id)).map((s) => s.id),
		[formule, options],
	);

	// Garde l'URL partageable à jour (?formule=…&options=…) sans recharger la page.
	useEffect(() => {
		const url = new URL(window.location.href);
		url.searchParams.set('formule', formule);
		if (optionsActives.length) url.searchParams.set('options', optionsActives.join(','));
		else url.searchParams.delete('options');
		window.history.replaceState(null, '', url);
	}, [formule, optionsActives]);

	const groupes = useMemo(
		() =>
			data.categories
				.map((c) => ({ categorie: c, services: data.services.filter((s) => s.categorie === c.id && tarifDe(s, formule)) }))
				.filter((g) => g.services.length > 0),
		[formule],
	);
	const indisponibles = useMemo(
		() => data.services.filter((s) => !tarifDe(s, formule) && formulesProposant(data, s, formule).length > 0),
		[formule],
	);

	const basculer = (id: string, coche: boolean) =>
		setOptions((prev) => {
			const next = new Set(prev);
			if (coche) next.add(id);
			else next.delete(id);
			return next;
		});

	const lienContact = `/contact?formule=${formule}${optionsActives.length ? `&options=${optionsActives.join(',')}` : ''}`;
	const fraisMois = `${formatFourchette(totaux.fraisMensuels)} / mois`;
	const premiereAnnee = formatFourchette(totaux.premiereAnnee);

	return (
		<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
			<div className="min-w-0 space-y-8">
				{/* Choix de la formule */}
				<fieldset className="print:hidden">
					<legend className="text-lg font-bold text-stone-900">1. Choisissez une formule</legend>
					<div className="mt-4 grid gap-3 sm:grid-cols-3">
						{data.formules.map((f) => {
							const actif = f.id === formule;
							return (
								<label
									key={f.id}
									className={`relative flex cursor-pointer flex-col rounded-2xl border bg-white p-4 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-stone-900 ${
										actif ? ACCENTS[f.id].carte : 'border-stone-200 hover:border-stone-400'
									}`}
								>
									<input
										type="radio"
										name="formule"
										value={f.id}
										checked={actif}
										onChange={() => setFormule(f.id)}
										className="sr-only"
									/>
									<span className="flex items-center gap-2 font-bold text-stone-900">
										<span className={`h-2.5 w-2.5 rounded-full ${ACCENTS[f.id].point}`} aria-hidden="true" />
										{f.nom}
									</span>
									<span className="mt-1 text-sm leading-snug text-stone-600">{f.accroche}</span>
								</label>
							);
						})}
					</div>
					<p className="mt-3 text-sm text-stone-600">{formuleCourante.description}</p>
				</fieldset>

				{/* Titre visible uniquement à l'impression */}
				<p className="hidden text-lg font-bold text-stone-900 print:block">Formule {formuleCourante.nom}</p>

				{/* Services */}
				<div className="space-y-6">
					<h2 className="text-lg font-bold text-stone-900 print:hidden">2. Ajustez les prestations</h2>
					{groupes.map(({ categorie, services }) => (
						<fieldset key={categorie.id} className="devis-groupe rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
							<legend className="sr-only">{categorie.nom}</legend>
							<p className="text-xs font-bold uppercase tracking-wider text-stone-500" aria-hidden="true">
								{categorie.nom}
							</p>
							<ul className="mt-2 divide-y divide-stone-100">
								{services.map((s) => (
									<LigneService
										key={s.id}
										service={s}
										formule={formule}
										coche={options.has(s.id)}
										onToggle={basculer}
										classeCase={accent.case}
									/>
								))}
							</ul>
						</fieldset>
					))}
				</div>

				{indisponibles.length > 0 && (
					<details className="group rounded-2xl border border-stone-200 bg-stone-50 print:hidden">
						<summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-stone-700">
							Disponible dans une autre formule ({indisponibles.length})
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 transition-transform group-open:rotate-180" aria-hidden="true">
								<path d="m6 9 6 6 6-6" />
							</svg>
						</summary>
						<ul className="space-y-2 px-4 pb-4 text-sm">
							{indisponibles.map((s) => (
								<li key={s.id} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
									<span className="text-stone-800">{s.nom}</span>
									<span className="text-stone-500">
										{formulesProposant(data, s, formule)
											.map((f) => f.nom)
											.join(', ')}
									</span>
								</li>
							))}
						</ul>
					</details>
				)}
			</div>

			{/* Récapitulatif : collant sur desktop, dans le flux sur mobile (avec barre fixe en bas) */}
			<aside id="recapitulatif" className="scroll-mt-24 lg:sticky lg:top-24 print:order-first" aria-labelledby="recap-titre">
				<div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6 print:shadow-none">
					<h2 id="recap-titre" className="text-lg font-bold text-stone-900">
						Récapitulatif
					</h2>
					<div aria-live="polite" aria-atomic="true">
						<dl className="mt-4 space-y-2.5 text-sm">
							<Ligne terme="Formule">
								<span className={`font-semibold ${accent.texte}`}>{formuleCourante.nom}</span>
							</Ligne>
							<Ligne terme="Options choisies">{totaux.nbOptions}</Ligne>
							<Ligne terme="Durée de travail">{formatJours(totaux.jours)}</Ligne>
							<Ligne terme="Main d’œuvre HT">{formatEuros(totaux.mainOeuvre)}</Ligne>
							<Ligne terme="Frais de fonctionnement">{fraisMois}</Ligne>
						</dl>
						<div className="mt-4 border-t border-stone-200 pt-4">
							<p className="text-sm text-stone-600">Coût estimé la première année</p>
							<p className="mt-1 text-2xl font-extrabold text-stone-900">{premiereAnnee}</p>
							<p className="mt-1 text-xs text-stone-500">
								Main d’œuvre + 12 mois de frais. {data.meta.mentionTva}.
							</p>
						</div>
					</div>
					<div className="mt-5 flex flex-col gap-2 print:hidden">
						<a href={lienContact} className={`btn ${accent.bouton} justify-center`}>
							Demander ce devis
						</a>
						<button type="button" onClick={() => window.print()} className="btn btn-outline justify-center">
							Imprimer
						</button>
					</div>
				</div>
			</aside>

			{/* Barre fixe mobile : total visible pendant le défilement */}
			<div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.25)] backdrop-blur lg:hidden print:hidden">
				<div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
					<div className="min-w-0">
						<p className="truncate text-xs text-stone-500">
							{formuleCourante.nom} · 1re année
						</p>
						<p className="truncate text-base font-extrabold text-stone-900">{premiereAnnee}</p>
					</div>
					<a href="#recapitulatif" className="btn btn-outline btn-sm shrink-0">
						Détail
					</a>
				</div>
			</div>
		</div>
	);
}

function Ligne({ terme, children }: { terme: string; children: ReactNode }) {
	return (
		<div className="flex items-baseline justify-between gap-3">
			<dt className="text-stone-600">{terme}</dt>
			<dd className="text-right font-semibold text-stone-900">{children}</dd>
		</div>
	);
}

interface LigneServiceProps {
	service: Service;
	formule: FormuleId;
	coche: boolean;
	onToggle: (id: string, coche: boolean) => void;
	classeCase: string;
}

function LigneService({ service, formule, coche, onToggle, classeCase }: LigneServiceProps) {
	const tarif = tarifDe(service, formule)!;
	const inclus = tarif.statut === 'inclus';
	const retenu = inclus || coche;
	const idCase = `svc-${service.id}`;
	const idDetail = `svc-${service.id}-detail`;
	const frais = aDesFrais(tarif) ? libellesFrais(tarif) : [];
	const mo = mainOeuvre(tarif, data.meta.tjm);

	return (
		<li className={`flex gap-3 py-4 break-inside-avoid ${retenu ? '' : 'print:hidden'}`}>
			<input
				id={idCase}
				type="checkbox"
				checked={retenu}
				disabled={inclus}
				onChange={(e) => onToggle(service.id, e.target.checked)}
				aria-describedby={idDetail}
				className={`mt-1 h-5 w-5 shrink-0 cursor-pointer rounded disabled:cursor-not-allowed ${classeCase}`}
			/>
			<div className="min-w-0 flex-1">
				<div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
					<label htmlFor={idCase} className={`font-semibold text-stone-900 ${inclus ? '' : 'cursor-pointer'}`}>
						{service.nom}
						{inclus && (
							<span className="ml-2 inline-block rounded-full bg-stone-100 px-2 py-0.5 align-middle text-xs font-medium text-stone-600">
								Inclus
							</span>
						)}
					</label>
					<p className="shrink-0 text-sm text-stone-700 sm:text-right">
						{tarif.jours > 0 ? (
							<>
								<span className="text-stone-500">{formatJours(tarif.jours)} · </span>
								<span className="font-semibold text-stone-900">{formatEuros(mo)}</span>
							</>
						) : tarif.fraisUniques ? (
							<span className="font-semibold text-stone-900">{formatEuros(mo)}</span>
						) : null}
					</p>
				</div>
				<div id={idDetail}>
					<p className="mt-1 text-sm leading-relaxed text-stone-600">{service.description}</p>
					{frais.length > 0 && (
						<p className="mt-1 text-sm text-stone-700">
							<span className="text-stone-500">Frais récurrents : </span>
							{frais.join(' + ')}
						</p>
					)}
					{tarif.fraisUniques ? (
						<p className="mt-1 text-sm text-stone-700">
							<span className="text-stone-500">Dont frais uniques : </span>
							{formatEuros(tarif.fraisUniques)}
						</p>
					) : null}
					{tarif.note && <p className="mt-1 text-xs text-stone-500">{tarif.note}</p>}
				</div>
				{service.outils.length > 0 && (
					<ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Outils">
						{service.outils.map((o) => (
							<li key={o} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
								{o}
							</li>
						))}
					</ul>
				)}
			</div>
		</li>
	);
}
