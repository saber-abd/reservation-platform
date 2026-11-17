import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

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
			className="h-[108px] w-14 overflow-y-scroll scroll-smooth rounded-[5px] border border-[var(--sa-line)] bg-white"
			style={{ scrollbarWidth: 'none' }}
			role="listbox"
		>
			{/* Padding spacers so first/last item can be centered */}
			<li className="h-9" aria-hidden />
			{items.map((item) => (
				<li
					key={item}
					role="option"
					aria-selected={selected === item}
					onClick={() => onSelect(item)}
					className={`sa-num flex h-9 cursor-pointer select-none items-center justify-center text-sm font-semibold transition-colors ${
						selected === item ? 'bg-brand text-white' : 'text-ink-soft hover:bg-[var(--sa-hover)]'
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

	// Close on click outside
	useEffect(() => {
		function handler(e: MouseEvent) {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		if (open) document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, [open]);

	return (
		<div ref={containerRef} className="relative">
			{label && (
				<label htmlFor={id} className="sa-label">
					{label}
				</label>
			)}
			<button
				id={id}
				type="button"
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
				aria-label={label ? `${label} : ${value || 'non définie'}` : undefined}
				className="sa-input flex items-center justify-between text-left"
			>
				<span className={`sa-num ${value ? 'text-ink' : 'text-ink-mute'}`}>{value || '-- : --'}</span>
				<ChevronDown size={16} className="ml-2 text-ink-mute" aria-hidden="true" />
			</button>

			{open && (
				<div
					className="sa-timepop"
					onKeyDown={(e) => {
						if (e.key === 'Escape') {
							e.preventDefault();
							setOpen(false);
						}
					}}
				>
					<div className="flex flex-col items-center gap-1">
						<span className="text-xs font-semibold text-ink-mute">H</span>
						<ScrollColumn
							items={HOURS}
							selected={selectedHour}
							onSelect={(h) => commit(h, selectedMinute)}
							formatItem={pad}
						/>
					</div>
					<div className="flex items-center pt-5 font-bold text-ink-mute">:</div>
					<div className="flex flex-col items-center gap-1">
						<span className="text-xs font-semibold text-ink-mute">Min</span>
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
						className="sa-btn sa-btn--primary sa-btn--sm ml-2 self-end"
					>
						OK
					</button>
				</div>
			)}
		</div>
	);
}
