// Logo animé du salon : une paire de ciseaux qui coupe à intervalles réguliers, entourée du nom
// du salon écrit en couronne qui tourne lentement. Composant sans état ni hook : il est rendu
// côté serveur sans hydratation (aucun JavaScript envoyé), les animations sont en CSS
// (.dia-logo… et @keyframes dia-tourne / dia-coupe dans src/styles/diamant.css), coupées si
// le mouvement est réduit et mises en pause hors de l'écran (classe .is-offscreen).

interface Props {
	/** Nom du salon, écrit en couronne (vient de getSiteConfig()). */
	name: string;
	/** Texte qui suit le nom dans la couronne. */
	suffix?: string;
	className?: string;
}

const RAYON = 80;
const CIRCONFERENCE = 2 * Math.PI * RAYON;

export default function Diamant3DLogo({ name, suffix = 'coupe · couleur · coiffage', className = '' }: Props) {
	const idChemin = 'dia-logo-cercle';
	return (
		<svg className={`dia-logo ${className}`} viewBox="0 0 200 200" role="img" aria-label={`Logo de ${name}`}>
			<defs>
				<path id={idChemin} d={`M100,100 m-${RAYON},0 a${RAYON},${RAYON} 0 1,1 ${RAYON * 2},0 a${RAYON},${RAYON} 0 1,1 -${RAYON * 2},0`} />
			</defs>

			<g className="dia-logo__anneau">
				<text>
					<textPath href={`#${idChemin}`} textLength={CIRCONFERENCE - 6} lengthAdjust="spacing">
						<tspan data-diamant-business-name>{name}</tspan>
						{` — ${suffix} — `}
					</textPath>
				</text>
			</g>

			{/* Ciseaux : deux lames qui se croisent au pivot (100, 100) */}
			<g transform="rotate(-16 100 100)">
				<g className="dia-logo__lame">
					<path d="M97.6 103 L98.4 56 Q100.4 46 102.4 56 L103.2 103 Z" fill="currentColor" />
					<path d="M100.4 103 L100.4 122" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
					<circle cx="100.4" cy="132" r="9.5" fill="none" stroke="currentColor" strokeWidth="3" />
				</g>
			</g>
			<g transform="rotate(16 100 100)">
				<g className="dia-logo__lame dia-logo__lame--b">
					<path d="M97.6 103 L98.4 56 Q100.4 46 102.4 56 L103.2 103 Z" fill="#a84b25" />
					<path d="M100.4 103 L100.4 122" stroke="#a84b25" strokeWidth="3" strokeLinecap="round" />
					<circle cx="100.4" cy="132" r="9.5" fill="none" stroke="#a84b25" strokeWidth="3" />
				</g>
			</g>
			<circle cx="100.4" cy="100" r="3.2" fill="currentColor" />
			<circle cx="100.4" cy="100" r="1.3" fill="#f5efe6" />
		</svg>
	);
}
