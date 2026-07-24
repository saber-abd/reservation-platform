import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
	createAppointment,
	getAppointmentsForDate,
	getAvailabilityRules,
	getPrimaryProfessional,
	getServices,
	type Professional,
	type Service,
} from '@/lib/queries';
import { generateSlotsForDate, type GeneratedSlot } from '@/lib/slots';
import { getSession } from '@/lib/auth';

const clientSchema = z.object({
	clientName: z.string().min(2, 'Nom trop court'),
	clientEmail: z.string().email('Email invalide'),
	clientPhone: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

function formatSlot(slot: GeneratedSlot) {
	return slot.start.toLocaleString('fr-FR', {
		weekday: 'short',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function todayISO() {
	return new Date().toISOString().slice(0, 10);
}

export default function ReservationForm() {
	const [professional, setProfessional] = useState<Professional | null>(null);
	const [services, setServices] = useState<Service[]>([]);
	const [selectedServiceId, setSelectedServiceId] = useState<string>('');
	const [selectedDate, setSelectedDate] = useState<string>(todayISO());
	const [slots, setSlots] = useState<GeneratedSlot[] | null>(null);
	const [slotsLoading, setSlotsLoading] = useState(false);
	const [selectedSlot, setSelectedSlot] = useState<GeneratedSlot | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm<ClientFormValues>({ resolver: zodResolver(clientSchema) });

	useEffect(() => {
		async function load() {
			try {
				const pro = await getPrimaryProfessional();
				setProfessional(pro);
				if (pro) {
					const servicesData = await getServices(pro.id);
					setServices(servicesData);
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Erreur de chargement.');
			} finally {
				setLoading(false);
			}
		}
		load();
	}, []);

	const selectedService = useMemo(
		() => services.find((s) => s.id === selectedServiceId) ?? null,
		[services, selectedServiceId],
	);

	async function handleShowAvailabilities() {
		if (!professional) return;
		setSlotsLoading(true);
		setSlots(null);
		setSelectedSlot(null);
		try {
			const [rules, appointments] = await Promise.all([
				getAvailabilityRules(professional.id),
				getAppointmentsForDate(professional.id, selectedDate),
			]);
			setSlots(generateSlotsForDate(rules, selectedDate, appointments));
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Erreur lors du chargement des disponibilités.');
		} finally {
			setSlotsLoading(false);
		}
	}

	async function onSubmit(values: ClientFormValues) {
		if (!professional || !selectedService || !selectedSlot) return;
		setSubmitting(true);
		setError(null);
		try {
			const session = await getSession();
			await createAppointment({
				professional_id: professional.id,
				service_id: selectedService.id,
				client_id: session?.user.id,
				client_name: values.clientName,
				client_email: values.clientEmail,
				client_phone: values.clientPhone,
				start_time: selectedSlot.start.toISOString(),
				end_time: selectedSlot.end.toISOString(),
			});
			setSuccess(true);
			reset();
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Une erreur est survenue, ce créneau n'est peut-être plus disponible.",
			);
			// Recharge les créneaux au cas où celui choisi vient d'être pris entre-temps.
			await handleShowAvailabilities();
		} finally {
			setSubmitting(false);
		}
	}

	if (loading) {
		return <p className="text-sm text-stone-500">Chargement des disponibilités...</p>;
	}

	if (!professional) {
		return (
			<p className="text-sm text-stone-500">
				La réservation en ligne n'est pas encore disponible. Merci de nous contacter directement.
			</p>
		);
	}

	if (success) {
		return (
			<div className="rounded-xl border border-green-200 bg-green-50 p-6 text-green-800">
				<p className="font-semibold">Réservation confirmée !</p>
				<p className="mt-1 text-sm">Vous allez recevoir une confirmation par email.</p>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
			{/* Étape 1 : service */}
			<div>
				<p className="text-sm font-semibold text-stone-900">1. Choisissez une prestation</p>
				<div className="mt-3 grid gap-3 sm:grid-cols-2">
					{services.map((service) => (
						<button
							type="button"
							key={service.id}
							onClick={() => setSelectedServiceId(service.id)}
							className={`rounded-xl border p-4 text-left transition-colors ${
								selectedServiceId === service.id
									? 'border-rose-600 bg-rose-50'
									: 'border-border bg-white hover:border-rose-300'
							}`}
						>
							<p className="font-medium text-stone-900">{service.name}</p>
							<p className="mt-1 text-xs text-stone-500">
								{service.duration_minutes} min — {service.price} €
							</p>
						</button>
					))}
					{services.length === 0 && (
						<p className="text-sm text-stone-500">Aucune prestation disponible pour le moment.</p>
					)}
				</div>
			</div>

			{/* Étape 2 : date + créneau */}
			<div>
				<p className="text-sm font-semibold text-stone-900">2. Choisissez un jour puis un créneau</p>
				<div className="mt-3 flex flex-wrap items-end gap-3">
					<div>
						<label className="text-sm text-stone-700" htmlFor="date">
							Date
						</label>
						<input
							id="date"
							type="date"
							min={todayISO()}
							value={selectedDate}
							onChange={(e) => {
								setSelectedDate(e.target.value);
								setSlots(null);
								setSelectedSlot(null);
							}}
							className="mt-1 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
						/>
					</div>
					<button
						type="button"
						onClick={handleShowAvailabilities}
						disabled={slotsLoading}
						className="rounded-xl border border-rose-600 px-4 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
					>
						{slotsLoading ? 'Chargement...' : 'Voir les disponibilités'}
					</button>
				</div>

				{slots !== null && (
					<div className="mt-4 grid gap-2 sm:grid-cols-3">
						{slots.map((slot) => (
							<button
								type="button"
								key={slot.start.toISOString()}
								disabled={slot.isBooked}
								onClick={() => setSelectedSlot(slot)}
								className={`rounded-xl border p-3 text-center text-sm capitalize transition-colors ${
									slot.isBooked
										? 'cursor-not-allowed border-border bg-stone-100 text-stone-400 line-through'
										: selectedSlot?.start.getTime() === slot.start.getTime()
											? 'border-rose-600 bg-rose-50'
											: 'border-border bg-white hover:border-rose-300'
								}`}
							>
								{formatSlot(slot)}
							</button>
						))}
						{slots.length === 0 && (
							<p className="col-span-full text-sm text-stone-500">
								Aucun créneau disponible ce jour-là. Essayez une autre date.
							</p>
						)}
					</div>
				)}
			</div>

			{/* Étape 3 : coordonnées */}
			<div>
				<p className="text-sm font-semibold text-stone-900">3. Vos coordonnées</p>
				<div className="mt-3 flex flex-col gap-4">
					<div>
						<label className="text-sm text-stone-700" htmlFor="clientName">
							Nom complet
						</label>
						<input
							id="clientName"
							className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
							{...register('clientName')}
						/>
						{errors.clientName && <p className="mt-1 text-xs text-red-600">{errors.clientName.message}</p>}
					</div>
					<div>
						<label className="text-sm text-stone-700" htmlFor="clientEmail">
							Email
						</label>
						<input
							id="clientEmail"
							type="email"
							className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
							{...register('clientEmail')}
						/>
						{errors.clientEmail && <p className="mt-1 text-xs text-red-600">{errors.clientEmail.message}</p>}
					</div>
					<div>
						<label className="text-sm text-stone-700" htmlFor="clientPhone">
							Téléphone (optionnel)
						</label>
						<input
							id="clientPhone"
							className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
							{...register('clientPhone')}
						/>
					</div>
				</div>
			</div>

			{error && <p className="text-sm text-red-600">{error}</p>}

			<button
				type="submit"
				disabled={!selectedService || !selectedSlot || submitting}
				className="rounded-xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{submitting ? 'Confirmation en cours...' : 'Confirmer la réservation'}
			</button>
		</form>
	);
}

