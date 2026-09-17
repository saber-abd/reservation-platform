import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { itRepairConfig } from '@/config/site';

const clientSchema = z.object({
	clientName: z.string().min(2, 'Nom trop court'),
	clientEmail: z.string().email('Email invalide'),
	clientPhone: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface Slot {
	start: Date;
	end: Date;
}

function formatSlot(slot: Slot) {
	return slot.start.toLocaleString('fr-FR', {
		weekday: 'short',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function todayISO() {
	return new Date().toISOString().slice(0, 10);
}

function generateSlots(dateStr: string): Slot[] {
	const date = new Date(dateStr);
	const day = date.getDay();
	if (day === 0) return []; // Fermé le dimanche

	const slots: Slot[] = [];
	const startHour = day === 6 ? 10 : 9; // 10h le samedi, 9h en semaine
	const endHour = day === 6 ? 18 : 19; // 18h le samedi, 19h en semaine

	for (let h = startHour; h < endHour; h++) {
		const start = new Date(date);
		start.setHours(h, 0, 0, 0);
		const end = new Date(date);
		end.setHours(h + 1, 0, 0, 0); // créneaux de 1h
		
		// Ne pas générer des créneaux dans le passé
		if (start > new Date()) {
			slots.push({ start, end });
		}
	}
	return slots;
}

export default function StandardReservationForm() {
	const services = itRepairConfig.services;
	const [selectedServiceId, setSelectedServiceId] = useState<string>('');
	const [selectedDate, setSelectedDate] = useState<string>(todayISO());
	const [slots, setSlots] = useState<Slot[] | null>(null);
	const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm<ClientFormValues>({ resolver: zodResolver(clientSchema) });

	const selectedService = services.find((s) => s.name === selectedServiceId) ?? null;

	function handleShowAvailabilities() {
		setSlots(generateSlots(selectedDate));
		setSelectedSlot(null);
	}

	async function onSubmit(values: ClientFormValues) {
		if (!selectedService || !selectedSlot) return;
		setSubmitting(true);
		setError(null);
		
		try {
			const res = await fetch('/api/calendar', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: `Intervention: ${selectedService.name} - ${values.clientName}`,
					description: `Client: ${values.clientName}\nEmail: ${values.clientEmail}\nTéléphone: ${values.clientPhone || 'Non renseigné'}\nService: ${selectedService.name}\n\nVia TechDom (Démo Standard)`,
					start_time: selectedSlot.start.toISOString(),
					end_time: selectedSlot.end.toISOString(),
				})
			});

			if (!res.ok) {
				const errData = await res.json();
				throw new Error(errData.error || "Erreur de synchronisation calendrier");
			}

			// Envoi email (optionnel, on garde l'endpoint s'il marche)
			fetch('/api/send-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					to: [values.clientEmail],
					subject: `Demande d'intervention reçue - ${selectedService.name}`,
					html: `<p>Bonjour ${values.clientName},</p>
						   <p>Votre demande d'intervention pour <strong>${selectedService.name}</strong> a bien été enregistrée dans notre agenda.</p>
						   <p><strong>Date :</strong> ${formatSlot(selectedSlot)}</p>
						   <p>Notre technicien vous contactera prochainement.</p>`
				})
			}).catch(err => console.error("Erreur d'envoi d'email de confirmation:", err));

			setSuccess(true);
			reset();
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Une erreur est survenue lors de l'enregistrement."
			);
		} finally {
			setSubmitting(false);
		}
	}

	if (success) {
		return (
			<div className="rounded-xl border border-green-200 bg-green-50 p-6 text-green-800">
				<p className="font-semibold">Demande d'intervention validée !</p>
				<p className="mt-1 text-sm">Elle a été ajoutée directement dans l'agenda. Vous recevrez un email de confirmation.</p>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
			{/* Étape 1 : service */}
			<div>
				<p className="text-sm font-semibold text-slate-900">1. Choisissez une prestation</p>
				<div className="mt-3">
					<select
						value={selectedServiceId}
						onChange={(e) => setSelectedServiceId(e.target.value)}
						className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors text-slate-900"
					>
						<option value="" disabled>Sélectionnez une prestation...</option>
						{services.map((service) => (
							<option key={service.name} value={service.name}>
								{service.name} ({service.durationMinutes} min — {service.price > 0 ? `${service.price} €` : 'Sur devis'})
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Étape 2 : date + créneau */}
			<div>
				<p className="text-sm font-semibold text-slate-900">2. Choisissez un jour puis un créneau</p>
				<div className="mt-3 flex flex-wrap items-end gap-3">
					<div>
						<label className="text-sm text-slate-700" htmlFor="date">
							Date <span className="text-blue-600">*</span>
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
							className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors"
						/>
					</div>
					<button
						type="button"
						onClick={handleShowAvailabilities}
						className="rounded-xl border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50"
					>
						Voir les disponibilités
					</button>
				</div>

				{slots !== null && (
					<div className="mt-4 grid gap-2 sm:grid-cols-3 md:grid-cols-4">
						{slots.map((slot) => (
							<button
								type="button"
								key={slot.start.toISOString()}
								onClick={() => setSelectedSlot(slot)}
								className={`rounded-xl border p-3 text-center text-sm capitalize transition-colors ${
									selectedSlot?.start.getTime() === slot.start.getTime()
										? 'border-blue-600 bg-blue-600 text-white shadow-md'
										: 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-blue-300'
								}`}
							>
								{formatSlot(slot)}
							</button>
						))}
						{slots.length === 0 && (
							<p className="col-span-full text-sm text-slate-500">
								Aucun créneau disponible ce jour-là (Nous sommes fermés le dimanche).
							</p>
						)}
					</div>
				)}
			</div>

			{/* Étape 3 : coordonnées */}
			<div>
				<p className="text-sm font-semibold text-slate-900">3. Vos coordonnées</p>
				<div className="mt-3 flex flex-col gap-4">
					<div>
						<label className="text-sm text-slate-700" htmlFor="clientName">
							Nom complet <span className="text-blue-600">*</span>
						</label>
						<input
							id="clientName"
							className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors"
							{...register('clientName')}
						/>
						{errors.clientName && <p className="mt-1 text-xs text-red-600">{errors.clientName.message}</p>}
					</div>
					<div>
						<label className="text-sm text-slate-700" htmlFor="clientEmail">
							Email <span className="text-blue-600">*</span>
						</label>
						<input
							id="clientEmail"
							type="email"
							className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors"
							{...register('clientEmail')}
						/>
						{errors.clientEmail && <p className="mt-1 text-xs text-red-600">{errors.clientEmail.message}</p>}
					</div>
					<div>
						<label className="text-sm text-slate-700" htmlFor="clientPhone">
							Téléphone (optionnel)
						</label>
						<input
							id="clientPhone"
							className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors"
							{...register('clientPhone')}
						/>
					</div>
				</div>
			</div>

			{error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>}

			<button
				type="submit"
				disabled={!selectedService || !selectedSlot || submitting}
				className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{submitting ? 'Validation en cours...' : 'Valider l\'intervention'}
			</button>
		</form>
	);
}
