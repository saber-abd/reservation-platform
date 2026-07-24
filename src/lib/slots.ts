import type { AvailabilityRule, Appointment } from './queries';

export interface GeneratedSlot {
	start: Date;
	end: Date;
	isBooked: boolean;
}

/**
 * Calcule les créneaux réservables pour une date donnée (YYYY-MM-DD), à partir
 * des règles de disponibilité du professionnel et des rendez-vous déjà pris.
 * Si une règle exceptionnelle existe pour cette date précise, elle remplace
 * entièrement les règles récurrentes de ce jour-là.
 */
export function generateSlotsForDate(
	rules: AvailabilityRule[],
	date: string,
	existingAppointments: Pick<Appointment, 'start_time' | 'end_time'>[],
): GeneratedSlot[] {
	const weekday = new Date(`${date}T00:00:00`).getDay();

	const exceptions = rules.filter((rule) => rule.is_exception && rule.exception_date === date);
	const applicableRules =
		exceptions.length > 0
			? exceptions
			: rules.filter((rule) => !rule.is_exception && rule.days_of_week.includes(weekday));

	const bookedRanges = existingAppointments.map((a) => ({
		start: new Date(a.start_time),
		end: new Date(a.end_time),
	}));

	const slots: GeneratedSlot[] = [];

	for (const rule of applicableRules) {
		const [startHour, startMinute] = rule.start_time.split(':').map(Number);
		const [endHour, endMinute] = rule.end_time.split(':').map(Number);

		let cursor = new Date(`${date}T00:00:00`);
		cursor.setHours(startHour, startMinute, 0, 0);

		const boundary = new Date(`${date}T00:00:00`);
		boundary.setHours(endHour, endMinute, 0, 0);

		while (cursor < boundary) {
			const slotEnd = new Date(cursor.getTime() + rule.slot_duration_minutes * 60_000);
			if (slotEnd > boundary) break;

			const isBooked = bookedRanges.some((range) => cursor < range.end && slotEnd > range.start);
			slots.push({ start: new Date(cursor), end: slotEnd, isBooked });
			cursor = slotEnd;
		}
	}

	return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export const weekdayLabels = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/** Regroupe les jours consécutifs pour un affichage compact ("Lun - Ven"). */
export function formatDaysOfWeek(days: number[]): string {
	if (days.length === 0) return '';
	const sorted = [...days].sort((a, b) => a - b);
	const groups: number[][] = [];
	let current: number[] = [sorted[0]];

	for (let i = 1; i < sorted.length; i++) {
		if (sorted[i] === current[current.length - 1] + 1) {
			current.push(sorted[i]);
		} else {
			groups.push(current);
			current = [sorted[i]];
		}
	}
	groups.push(current);

	return groups
		.map((group) =>
			group.length > 1
				? `${weekdayLabels[group[0]].slice(0, 3)} - ${weekdayLabels[group[group.length - 1]].slice(0, 3)}`
				: weekdayLabels[group[0]].slice(0, 3),
		)
		.join(', ');
}
