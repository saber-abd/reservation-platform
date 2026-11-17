import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
	/** Valeur au format "HH:MM" */
	value: string;
	onChange: (value: string) => void;
	label?: string;
	id?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 30];

function pad(n: number) {
	return n.toString().padStart(2, '0');
}

function ScrollColumn({
	items,
	selected,
	onSelect,
	formatItem,
}: {
	items: number[];
	selected: number;
	onSelect: (v: number) => void;
	formatItem: (v: number) => string;
}) {
	const listRef = useRef<HTMLUListElement>(null);
	const itemHeight = 36;

	// Scroll to selected item on mount and on selected change
	useEffect(() => {
		const list = listRef.current;
		if (!list) return;
		const idx = items.indexOf(selected);
		if (idx >= 0) {
			list.scrollTo({ top: idx * itemHeight, behavior: 'smooth' });
		}
	}, [selected, items]);

	function handleScroll() {
		const list = listRef.current;
		if (!list) return;
		const idx = Math.round(list.scrollTop / itemHeight);
		const clamped = Math.max(0, Math.min(idx, items.length - 1));
		onSelect(items[clamped]);
	}

	return (
		<ul
			ref={listRef}
			onScroll={handleScroll}
			className="h-[108px] w-14 overflow-y-scroll scroll-smooth rounded-[2px] border border-pe-filet-fort bg-white"
			style={{ scrollbarWidth: 'none' }}
		>
			{/* Padding spacers so first/last item can be centered */}
			<li className="h-9" aria-hidden />
			{items.map((item) => (
				<li
					key={item}
					onClick={() => onSelect(item)}
					className={`flex h-9 cursor-pointer items-center justify-center text-sm font-semibold tabular-nums transition-colors select-none ${
						selected === item
							? 'bg-pe-encre text-white'
							: 'text-pe-acier hover:bg-pe-carte-2'
					}`}
				>
					{formatItem(item)}
				</li>
			))}
			<li className="h-9" aria-hidden />
		</ul>
	);
}

export default function TimePicker({ value, onChange, label, id }: Props) {
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	// Parse value
	const parts = value ? value.split(':') : ['08', '00'];
	const selectedHour = parseInt(parts[0] ?? '8', 10);
	const selectedMinute = parseInt(parts[1] ?? '0', 10);

	const commit = useCallback(
		(h: number, m: number) => {
			onChange(`${pad(h)}:${pad(m)}`);
		},
		[onChange],
	);

	// Fermeture au clic extérieur et avec Échap
	useEffect(() => {
		function handler(e: MouseEvent) {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				e.stopPropagation();
				setOpen(false);
			}
		}
		if (open) {
			document.addEventListener('mousedown', handler);
			containerRef.current?.addEventListener('keydown', onKey);
		}
		const el = containerRef.current;
		return () => {
			document.removeEventListener('mousedown', handler);
			el?.removeEventListener('keydown', onKey);
		};
	}, [open]);

	return (
		<div ref={containerRef} className="relative">
			{label && (
				<label htmlFor={id} className="pe-label">
					{label}
				</label>
			)}
			<button
				id={id}
				type="button"
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
				aria-label={label ? `${label} : ${value || 'non définie'}` : undefined}
				className="flex min-h-[42px] w-full items-center justify-between rounded-[2px] border border-pe-filet-fort bg-white px-3 py-2 text-left transition-colors hover:border-pe-encre"
			>
				<span className="text-[1.05rem] font-bold tabular-nums [font-stretch:110%]">{value || '-- : --'}</span>
				<svg className="ml-2 h-4 w-4 text-pe-acier" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="8" cy="8" r="6.2" /><path d="M8 4.5V8l2.4 1.6" /></svg>
			</button>

			{open && (
				<div className="absolute z-50 mt-1 flex gap-1 rounded-[2px] border border-pe-encre bg-white p-2 shadow-[0_12px_24px_-12px_rgb(18_19_21/0.4)]">
					<div className="flex flex-col items-center gap-1">
						<span className="pe-tech">H</span>
						<ScrollColumn
							items={HOURS}
							selected={selectedHour}
							onSelect={(h) => commit(h, selectedMinute)}
							formatItem={pad}
						/>
					</div>
					<div className="flex items-center font-bold text-pe-rouge">:</div>
					<div className="flex flex-col items-center gap-1">
						<span className="pe-tech">Min</span>
						<ScrollColumn
							items={MINUTES}
							selected={selectedMinute}
							onSelect={(m) => commit(selectedHour, m)}
							formatItem={pad}
						/>
					</div>
					<button
						type="button"
						onClick={() => setOpen(false)}
						className="pe-btn pe-btn--sm ml-2 self-end"
					>
						OK
					</button>
				</div>
			)}
		</div>
	);
}
