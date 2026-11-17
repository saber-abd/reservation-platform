// Agenda de la semaine en CSS Grid : colonnes jours (lundi → dimanche), lignes heures,
// blocs positionnés en absolu dans chaque colonne, ligne « maintenant » sur le jour courant.
// Sert aux rendez-vous (événements cliquables) et aux disponibilités (plages d'ouverture).
import { useEffect, useMemo, useState } from 'react';
import { ajouterJours, heureCourte, memeJour } from './dates';

const H = 46; // hauteur d'une heure en px (doit suivre --h de .pe-agenda)

export interface AgendaEvent {
	id: string;
	start: Date;
	end: Date;
	title: string;
	sub?: string;
	status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
}

export interface AgendaPlage {
	/** 0 = lundi … 6 = dimanche */
	day: number;
	/** minutes depuis minuit */
	start: number;
	end: number;
	label?: string;
	exception?: boolean;
}

/** Répartit les événements qui se chevauchent sur des couloirs côte à côte. */
function couloirs(events: AgendaEvent[]) {
	const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
	const out: { ev: AgendaEvent; lane: number; lanes: number }[] = [];
	let cluster: { ev: AgendaEvent; lane: number; lanes: number }[] = [];
	let laneEnds: number[] = [];
	let clusterEnd = 0;
	const flush = () => {
		const n = Math.max(1, laneEnds.length);
		cluster.forEach((c) => (c.lanes = n));
		out.push(...cluster);
		cluster = [];
		laneEnds = [];
	};
	for (const ev of sorted) {
		const s = ev.start.getTime();
		if (cluster.length && s >= clusterEnd) flush();
		let lane = laneEnds.findIndex((end) => end <= s);
		if (lane === -1) {
			lane = laneEnds.length;
			laneEnds.push(ev.end.getTime());
		} else laneEnds[lane] = ev.end.getTime();
		cluster.push({ ev, lane, lanes: 1 });
		clusterEnd = Math.max(clusterEnd, ev.end.getTime());
	}
	flush();
	return out;
}

export default function WeekAgenda({
	weekStart,
	events = [],
	plages = [],
	startHour = 7,
	endHour = 20,
	onSelect,
	closedDays = [],
	label,
}: {
	weekStart: Date;
	events?: AgendaEvent[];
	plages?: AgendaPlage[];
	startHour?: number;
	endHour?: number;
	onSelect?: (id: string) => void;
	closedDays?: number[];
	label: string;
}) {
	const [now, setNow] = useState<Date | null>(null);
	useEffect(() => {
		setNow(new Date());
		const id = window.setInterval(() => setNow(new Date()), 60_000);
		return () => window.clearInterval(id);
	}, []);

	const days = useMemo(() => Array.from({ length: 7 }, (_, i) => ajouterJours(weekStart, i)), [weekStart]);
	const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
	const total = (endHour - startHour) * H;
	const top = (d: Date) => ((d.getHours() * 60 + d.getMinutes() - startHour * 60) / 60) * H;

	return (
		<div className="pe-agenda-defile">
			<div className="pe-agenda" role="region" aria-label={label} style={{ ['--h' as string]: `${H}px` }}>
				<div className="pe-agenda__coin" aria-hidden="true" />
				{days.map((d, i) => {
					const auj = now ? memeJour(d, now) : false;
					return (
						<div key={i} className="pe-agenda__jour" data-auj={auj}>
							<span>{d.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
							<b>{d.getDate()}</b>
						</div>
					);
				})}

				<div aria-hidden="true">
					{hours.map((h) => (
						<div key={h} className="pe-agenda__heure">
							<span>{String(h).padStart(2, '0')}:00</span>
						</div>
					))}
				</div>

				{days.map((d, i) => {
					const auj = now ? memeJour(d, now) : false;
					const dayEvents = events.filter((e) => memeJour(e.start, d));
					const placed = couloirs(dayEvents);
					const dayPlages = plages.filter((p) => p.day === i);
					return (
						<div
							key={i}
							className="pe-agenda__col"
							data-auj={auj}
							data-ferme={closedDays.includes(i) && dayPlages.length === 0 ? 'true' : undefined}
							style={{ height: total }}
						>
							{dayPlages.map((p, k) => {
								const t = ((p.start - startHour * 60) / 60) * H;
								const h = ((p.end - p.start) / 60) * H;
								return (
									<div
										key={k}
										className="pe-agenda__plage"
										data-exception={p.exception ? 'true' : undefined}
										style={{ top: Math.max(0, t), height: Math.max(8, Math.min(h, total - Math.max(0, t))) }}
									>
										{p.label && <span className="pe-agenda__plage-label">{p.label}</span>}
									</div>
								);
							})}
							{placed.map(({ ev, lane, lanes }) => {
								const t = top(ev.start);
								const h = Math.max(24, ((ev.end.getTime() - ev.start.getTime()) / 3_600_000) * H - 2);
								if (t + h < 0 || t > total) return null;
								const w = 100 / lanes;
								return (
									<button
										key={ev.id}
										type="button"
										className="pe-agenda__ev"
										data-s={ev.status}
										onClick={() => onSelect?.(ev.id)}
										style={{
											top: Math.max(0, t),
											height: Math.min(h, total - Math.max(0, t)),
											left: `calc(${lane * w}% + 3px)`,
											width: `calc(${w}% - 6px)`,
											right: 'auto',
										}}
										aria-label={`${heureCourte(ev.start)}, ${ev.title}${ev.sub ? `, ${ev.sub}` : ''}`}
									>
										<b>
											{heureCourte(ev.start)} {ev.title}
										</b>
										{ev.sub && h > 40 && <span>{ev.sub}</span>}
									</button>
								);
							})}
							{auj && now && top(now) >= 0 && top(now) <= total && (
								<div className="pe-agenda__maintenant" style={{ top: top(now) }} aria-hidden="true" />
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
