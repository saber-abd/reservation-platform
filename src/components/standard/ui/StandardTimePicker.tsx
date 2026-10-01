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
			className="h-[108px] overflow-y-scroll scroll-smooth rounded-lg border border-border bg-white"
			style={{ scrollbarWidth: 'none' }}
		>
			{/* Padding spacers so first/last item can be centered */}
			<li className="h-9" aria-hidden />
			{items.map((item) => (
				<li
					key={item}
					onClick={() => onSelect(item)}
					className={`flex h-9 cursor-pointer items-center justify-center text-sm font-medium transition-colors select-none ${
						selected === item
							? 'bg-rose-600 text-white'
							: 'text-stone-600 hover:bg-stone-50'
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
				<label htmlFor={id} className="block text-sm text-stone-700">
					{label}
				</label>
			)}
			<button
				id={id}
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="mt-1 flex w-full items-center justify-between rounded-lg border border-border bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-600"
			>
				<span className="font-mono">{value || '-- : --'}</span>
				<span className="ml-2 text-stone-400">▾</span>
			</button>

			{open && (
				<div className="absolute z-50 mt-1 flex gap-1 rounded-xl border border-border bg-white p-2 shadow-lg">
					<div className="flex flex-col items-center gap-1">
						<span className="text-xs text-stone-500">H</span>
						<ScrollColumn
							items={HOURS}
							selected={selectedHour}
							onSelect={(h) => commit(h, selectedMinute)}
							formatItem={pad}
						/>
					</div>
					<div className="flex items-center font-bold text-stone-400">:</div>
					<div className="flex flex-col items-center gap-1">
						<span className="text-xs text-stone-500">Min</span>
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
						className="ml-2 self-end rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
					>
						OK
					</button>
				</div>
			)}
		</div>
	);
}
