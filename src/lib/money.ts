/** Arrondit un montant au centime (évite les erreurs de flottants : 0.1 + 0.2). */
export function roundMoney(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

const eurosWithCents = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const eurosWhole = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** Formate un montant en euros : « 353,30 € », ou « 350 € » s'il est rond. */
export function formatEuros(value: number | null | undefined): string {
	const rounded = roundMoney(Number(value) || 0);
	return Number.isInteger(rounded) ? eurosWhole.format(rounded) : eurosWithCents.format(rounded);
}
