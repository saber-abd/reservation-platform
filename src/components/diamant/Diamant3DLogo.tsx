// Logo SVG animé simple — ciseaux de coiffeur qui tournent lentement
// Non-interactif, léger, zéro dépendance Three.js

export default function Diamant3DLogo() {
	return (
		<div className="w-full h-full min-h-[340px] flex items-center justify-center select-none pointer-events-none">
			<style>{`
				@keyframes scissors-rotate {
					from { transform: rotate(0deg); }
					to { transform: rotate(360deg); }
				}
				@keyframes scissors-pulse {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.85; }
				}
				.scissors-logo {
					animation: scissors-rotate 14s linear infinite, scissors-pulse 4s ease-in-out infinite;
					transform-origin: center;
				}
				@keyframes orbit-dot {
					from { transform: rotate(0deg) translateX(120px) rotate(0deg); }
					to { transform: rotate(360deg) translateX(120px) rotate(-360deg); }
				}
				.orbit-1 { animation: orbit-dot 8s linear infinite; }
				.orbit-2 { animation: orbit-dot 12s linear infinite reverse; animation-delay: -4s; }
			`}</style>

			<div className="relative w-72 h-72">
				{/* Cercles décoratifs */}
				<div className="absolute inset-0 rounded-full border border-deep-teal-200/50" style={{margin: '16px'}}></div>
				<div className="absolute inset-0 rounded-full border border-dashed border-peach-300/30" style={{margin: '32px'}}></div>

				{/* Petits points en orbite */}
				<div className="absolute inset-0 flex items-center justify-center">
					<div className="orbit-1 w-2.5 h-2.5 rounded-full bg-deep-teal-400" style={{position: 'absolute'}}></div>
				</div>
				<div className="absolute inset-0 flex items-center justify-center">
					<div className="orbit-2 w-1.5 h-1.5 rounded-full bg-jasmine-400" style={{position: 'absolute'}}></div>
				</div>

				{/* SVG Ciseaux principal */}
				<div className="absolute inset-0 flex items-center justify-center">
					<svg
						className="scissors-logo"
						width="140"
						height="140"
						viewBox="0 0 100 100"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						{/* Lame supérieure */}
						<line x1="50" y1="50" x2="85" y2="15" stroke="#f08080" strokeWidth="5" strokeLinecap="round" />
						{/* Lame inférieure */}
						<line x1="50" y1="50" x2="85" y2="85" stroke="#fbc4ab" strokeWidth="5" strokeLinecap="round" />
						{/* Queue supérieure */}
						<line x1="50" y1="50" x2="20" y2="20" stroke="#f08080" strokeWidth="4.5" strokeLinecap="round" />
						{/* Queue inférieure */}
						<line x1="50" y1="50" x2="20" y2="80" stroke="#fbc4ab" strokeWidth="4.5" strokeLinecap="round" />
						{/* Anneau supérieur */}
						<circle cx="14" cy="14" r="8" stroke="#f08080" strokeWidth="4" fill="none" />
						{/* Anneau inférieur */}
						<circle cx="14" cy="86" r="8" stroke="#fbc4ab" strokeWidth="4" fill="none" />
						{/* Pivot central */}
						<circle cx="50" cy="50" r="5" fill="#f08080" />
						<circle cx="50" cy="50" r="2.5" fill="white" />
					</svg>
				</div>

				{/* Texte sous le logo */}
				<div className="absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap">
					<span className="text-xs font-bold tracking-[0.3em] text-stone-400 uppercase">Maison Prestige</span>
				</div>
			</div>
		</div>
	);
}
