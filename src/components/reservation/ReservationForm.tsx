import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
	createAppointment,
	getAvailableSlots,
	getPrimaryProfessional,
	getServices,
	type Availability,
	type Professional,
	type Service,
} from '@/lib/queries';

const clientSchema = z.object({
	clientName: z.string().min(2, 'Nom trop court'),
	clientEmail: z.string().email('Email invalide'),
	clientPhone: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

function formatSlot(slot: Availability) {
	const start = new Date(slot.start_time);
	return start.toLocaleString('fr-FR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		hour: '2-digit',
		minute: '2-digit',
	});
}

export default function ReservationForm() {
	const [professional, setProfessional] = useState<Professional | null>(null);
	const [services, setServices] = useState<Service[]>([]);
	const [slots, setSlots] = useState<Availability[]>([]);
	const [selectedServiceId, setSelectedServiceId] = useState<string>('');
	const [selectedSlotId, setSelectedSlotId] = useState<string>('');
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
					const [servicesData, slotsData] = await Promise.all([
						getServices(pro.id),
						getAvailableSlots(pro.id),
					]);
					setServices(servicesData);
					setSlots(slotsData);
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
	const selectedSlot = useMemo(() => slots.find((s) => s.id === selectedSlotId) ?? null, [slots, selectedSlotId]);

	async function onSubmit(values: ClientFormValues) {
		if (!professional || !selectedService || !selectedSlot) return;
		setSubmitting(true);
		setError(null);
		try {
			await createAppointment({
				professional_id: professional.id,
				service_id: selectedService.id,
				availability_id: selectedSlot.id,
				client_name: values.clientName,
				client_email: values.clientEmail,
				client_phone: values.clientPhone,
				start_time: selectedSlot.start_time,
				end_time: selectedSlot.end_time,
			});
			setSuccess(true);
			reset();
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Une erreur est survenue, ce créneau n'est peut-être plus disponible.",
			);
			// Recharge les créneaux au cas où celui choisi vient d'être pris.
			const freshSlots = await getAvailableSlots(professional.id);
			setSlots(freshSlots);
			setSelectedSlotId('');
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

			{/* Étape 2 : créneau */}
			<div>
				<p className="text-sm font-semibold text-stone-900">2. Choisissez un créneau</p>
				<div className="mt-3 grid gap-2 sm:grid-cols-2">
					{slots.map((slot) => (
						<button
							type="button"
							key={slot.id}
							onClick={() => setSelectedSlotId(slot.id)}
							className={`rounded-xl border p-3 text-left text-sm capitalize transition-colors ${
								selectedSlotId === slot.id
									? 'border-rose-600 bg-rose-50'
									: 'border-border bg-white hover:border-rose-300'
							}`}
						>
							{formatSlot(slot)}
						</button>
					))}
					{slots.length === 0 && (
						<p className="text-sm text-stone-500">Aucun créneau disponible pour le moment.</p>
					)}
				</div>
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
