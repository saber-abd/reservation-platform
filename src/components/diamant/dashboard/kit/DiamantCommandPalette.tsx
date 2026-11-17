// Palette de commandes de l'espace pro (Ctrl+K / ⌘K) : aller à une page, ouvrir la fiche d'un
// client déjà chargé (index publié par les panneaux, voir indexClients.ts) ou lancer la recherche
// existante des rendez-vous. Aucune écriture, aucune requête.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Command } from 'cmdk';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
	ArrowRight,
	BarChart3,
	Calendar,
	CornerDownLeft,
	Home,
	MessageSquare,
	Scissors,
	Search,
	Settings,
	ShieldCheck,
	Users,
	ArrowLeft,
} from 'lucide-react';
import { getActiveProRole, type ProRole } from '@/lib/permissions';
import { lireClients, surClientsPublies, type ClientIndexe } from './indexClients';
import { Avatar, EASE } from './primitives';

interface Props {
	basePath: string;
}

export default function DiamantCommandPalette({ basePath }: Props) {
	const [ouvert, setOuvert] = useState(false);
	const [recherche, setRecherche] = useState('');
	const [role, setRole] = useState<ProRole>('admin');
	const [clients, setClients] = useState<ClientIndexe[]>([]);
	const [cible, setCible] = useState<HTMLElement | null>(null);
	const [mac, setMac] = useState(false);
	const reduit = useReducedMotion();
	const precedent = useRef<HTMLElement | null>(null);

	useEffect(() => {
		setCible(document.body);
		setRole(getActiveProRole());
		setClients(lireClients());
		setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
		const offClients = surClientsPublies(() => setClients([...lireClients()]));
		const onRole = (e: any) => {
			if (e.detail?.role) setRole(e.detail.role);
		};
		function onKey(e: KeyboardEvent) {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				setOuvert((o) => !o);
			}
		}
		window.addEventListener('pro:role-changed', onRole);
		document.addEventListener('keydown', onKey);
		return () => {
			offClients();
			window.removeEventListener('pro:role-changed', onRole);
			document.removeEventListener('keydown', onKey);
		};
	}, []);

	useEffect(() => {
		if (ouvert) {
			precedent.current = document.activeElement as HTMLElement | null;
			setClients([...lireClients()]);
		} else {
			setRecherche('');
			precedent.current?.focus?.();
		}
	}, [ouvert]);

	const pages = useMemo(() => {
		const toutes = [
			{ href: `${basePath}/dashboard`, label: 'Tableau de bord', icon: Home, roles: ['admin', 'demo'], mots: "vue d'ensemble accueil chiffre affaires" },
			{ href: `${basePath}/dashboard/disponibilites`, label: 'Planning & RDV', icon: Calendar, roles: ['admin', 'employee', 'demo'], mots: 'agenda rendez-vous semaine jour' },
			{ href: `${basePath}/dashboard/clients`, label: 'Clientèle', icon: Users, roles: ['admin', 'employee', 'demo'], mots: 'clients fiches' },
			{ href: `${basePath}/dashboard/messages`, label: 'Messagerie', icon: MessageSquare, roles: ['admin', 'employee', 'demo'], mots: 'messages conversations' },
			{ href: `${basePath}/dashboard/services`, label: 'Gestion des prestations', icon: Scissors, roles: ['admin', 'demo'], mots: 'tarifs prix services' },
			{ href: `${basePath}/dashboard/statistiques`, label: 'Statistiques', icon: BarChart3, roles: ['admin', 'demo'], mots: 'performances bilan' },
			{ href: `${basePath}/dashboard/recherche`, label: 'Recherche', icon: Search, roles: ['admin', 'employee', 'demo'], mots: 'trouver rendez-vous' },
			{ href: `${basePath}/dashboard/profil`, label: 'Profil Maison', icon: Settings, roles: ['admin', 'demo'], mots: 'établissement adresse abonnement' },
			{ href: `${basePath}/dashboard/droits`, label: 'Gestion des droits', icon: ShieldCheck, roles: ['admin', 'demo'], mots: 'équipe rôles bannissement' },
		];
		return toutes.filter((p) => p.roles.includes(role));
	}, [basePath, role]);

	function aller(href: string) {
		setOuvert(false);
		window.location.href = href;
	}

	const q = recherche.trim();

	return (
		<>
			<button
				type="button"
				onClick={() => setOuvert(true)}
				className="group inline-flex h-10 items-center gap-2.5 rounded-full border border-dx-filet-fort bg-dx-carte pl-3.5 pr-2 text-sm text-dx-gris transition-colors hover:border-dx-encre hover:text-dx-encre"
				aria-label="Ouvrir la palette de commandes"
				aria-keyshortcuts="Control+K Meta+K"
			>
				<Search size={15} />
				<span className="hidden pr-6 lg:inline">Aller à, chercher un client…</span>
				<span className="dx-kbd hidden sm:inline-flex">{mac ? '⌘' : 'Ctrl'} K</span>
			</button>

			{cible &&
				createPortal(
					<AnimatePresence>
						{ouvert && (
							<>
								<motion.div
									key="voile"
									className="dx-voile"
									onClick={() => setOuvert(false)}
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									transition={{ duration: reduit ? 0 : 0.18 }}
								/>
								<div className="fixed inset-x-0 top-[12dvh] z-[72] flex justify-center px-3">
									<motion.div
										key="palette"
										className="dx-palette"
										initial={reduit ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.98 }}
										animate={reduit ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
										exit={reduit ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
										transition={reduit ? { duration: 0 } : { duration: 0.28, ease: EASE }}
									>
										<Command
											label="Palette de commandes"
											loop
											onKeyDown={(e) => {
												if (e.key === 'Escape') {
													e.preventDefault();
													setOuvert(false);
												}
											}}
										>
											<div className="relative">
												<Search size={18} className="pointer-events-none absolute left-[18px] top-1/2 -translate-y-1/2 text-dx-gris" />
												<Command.Input
													autoFocus
													value={recherche}
													onValueChange={setRecherche}
													placeholder="Aller à une page, chercher un client…"
												/>
											</div>
											<Command.List>
												<Command.Empty>Aucun résultat pour « {q} ».</Command.Empty>

												<Command.Group heading="Aller à">
													{pages.map((p) => {
														const Icon = p.icon;
														return (
															<Command.Item key={p.href} value={`page ${p.label} ${p.mots}`} onSelect={() => aller(p.href)}>
																<Icon size={17} className="text-dx-gris" />
																<span>{p.label}</span>
																<ArrowRight size={15} className="dx-palette__fleche" />
															</Command.Item>
														);
													})}
												</Command.Group>

												{clients.length > 0 ? (
													<Command.Group heading="Clients">
														{clients.map((c) => (
															<Command.Item
																key={c.id}
																value={`client ${c.nom} ${c.telephone ?? ''} ${c.email ?? ''} ${c.id}`}
																onSelect={() => aller(`${basePath}/dashboard/clients?clientId=${encodeURIComponent(c.id)}`)}
															>
																<Avatar nom={c.nom} taille={28} />
																<span className="min-w-0 flex-1 truncate">
																	{c.nom}
																	<span className="ml-2 text-xs text-dx-gris">{c.telephone || c.email || ''}</span>
																</span>
																<ArrowRight size={15} className="dx-palette__fleche" />
															</Command.Item>
														))}
													</Command.Group>
												) : (
													<Command.Group heading="Clients">
														<Command.Item value="client ouvrir la clientèle liste" onSelect={() => aller(`${basePath}/dashboard/clients`)}>
															<Users size={17} className="text-dx-gris" />
															<span>Ouvrir la clientèle pour charger les fiches</span>
															<ArrowRight size={15} className="dx-palette__fleche" />
														</Command.Item>
													</Command.Group>
												)}

												{q && (
													<Command.Group heading="Rendez-vous">
														<Command.Item
															value={`recherche rendez-vous ${q}`}
															onSelect={() => aller(`${basePath}/dashboard/recherche?q=${encodeURIComponent(q)}`)}
														>
															<Search size={17} className="text-dx-gris" />
															<span className="min-w-0 truncate">
																Chercher « {q} » dans les rendez-vous
															</span>
															<ArrowRight size={15} className="dx-palette__fleche" />
														</Command.Item>
													</Command.Group>
												)}

												<Command.Group heading="Site">
													<Command.Item value="retour au site public accueil" onSelect={() => aller(`${basePath}/`)}>
														<ArrowLeft size={17} className="text-dx-gris" />
														<span>Retour au site</span>
														<ArrowRight size={15} className="dx-palette__fleche" />
													</Command.Item>
												</Command.Group>
											</Command.List>
											<div className="flex items-center gap-4 border-t border-dx-filet bg-dx-papier px-4 py-2.5 text-xs text-dx-gris">
												<span className="inline-flex items-center gap-1.5"><span className="dx-kbd">↑</span><span className="dx-kbd">↓</span> parcourir</span>
												<span className="inline-flex items-center gap-1.5"><span className="dx-kbd"><CornerDownLeft size={11} /></span> ouvrir</span>
												<span className="ml-auto inline-flex items-center gap-1.5"><span className="dx-kbd">Échap</span> fermer</span>
											</div>
										</Command>
									</motion.div>
								</div>
							</>
						)}
					</AnimatePresence>,
					cible
				)}
		</>
	);
}
