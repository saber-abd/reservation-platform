import { useEffect, useState } from 'react';
import { useAuthedProfessional } from '@/lib/useAuthedProfessional';
import { getAppointmentsForProfessional, updateAppointmentStatus, type Appointment } from '@/lib/queries';

type AppointmentWithService = Appointment & {
	services: { name: string; duration_minutes: number; price: number } | null;
};

function formatDate(iso: string) {
	return new Date(iso).toLocaleString('fr-FR', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
	});
}

const statusLabels: Record<Appointment['status'], string> = {
	pending: 'En attente',
	confirmed: 'Confirmé',
	cancelled: 'Annulé',
	completed: 'Terminé',
};

const statusStyles: Record<Appointment['status'], string> = {
	pending: 'bg-amber-50 text-amber-700 border border-amber-200',
	confirmed: 'bg-rose-50 text-rose-700 border border-rose-200',
	cancelled: 'bg-stone-50 text-stone-600 border border-stone-200',
	completed: 'bg-green-50 text-green-700 border border-green-200',
};

type Tab = 'pending' | 'confirmed' | 'history';

const tabLabels: Record<Tab, string> = {
	pending: 'En attente de validation',
	confirmed: 'Confirmées',
	history: 'Historique passé',
};

function AppointmentDetailModal({
	appointment,
	onClose,
	onCancel,
	onConfirm,
	onComplete,
}: {
	appointment: AppointmentWithService;
	onClose: () => void;
	onCancel: (id: string) => void;
	onConfirm: (id: string) => void;
	onComplete: (id: string) => void;
}) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
			<div
				className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-start justify-between">
					<h2 className="text-lg font-bold text-stone-900">Détail du rendez-vous</h2>
					<button onClick={onClose} className="text-sm text-stone-400 hover:text-stone-600 transition-colors">
						✕
					</button>
				</div>
				<dl className="mt-4 space-y-3 text-sm">
					<div>
						<dt className="text-xs font-bold tracking-wider uppercase text-stone-400">Client</dt>
						<dd className="font-medium text-stone-900">{appointment.client_name}</dd>
						<dd className="text-stone-500">{appointment.client_email}</dd>
						{appointment.client_phone && <dd className="text-stone-500">{appointment.client_phone}</dd>}
					</div>
					<div>
						<dt className="text-xs uppercase text-stone-400">Prestation</dt>
						<dd className="text-stone-700">
							{appointment.services?.name ?? '—'}
							{appointment.services && ` (${appointment.services.duration_minutes} min — ${appointment.services.price} €)`}
						</dd>
					</div>
					<div>
						<dt className="text-xs uppercase text-stone-400">Créneau</dt>
						<dd className="text-stone-700">{formatDate(appointment.start_time)}</dd>
					</div>
					<div>
						<dt className="text-xs font-bold tracking-wider uppercase text-stone-400">Statut</dt>
						<dd>
							<span className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[appointment.status]}`}>
								{statusLabels[appointment.status]}
							</span>
						</dd>
					</div>
				</dl>
				{appointment.status === 'confirmed' && (
					<div className="mt-6 flex flex-col gap-3">
						{new Date(appointment.start_time) < new Date() && (
							<button
								onClick={() => {
									onComplete(appointment.id);
									onClose();
								}}
								className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
							>
								Terminer la prestation (Ajoute les points)
							</button>
						)}
						<button
							onClick={() => {
								onCancel(appointment.id);
								onClose();
							}}
							className="text-sm font-medium text-red-600 hover:underline self-start"
						>
							Annuler ce rendez-vous
						</button>
					</div>
				)}
				{appointment.status === 'pending' && (
					<div className="mt-6 flex gap-4">
						<button
							onClick={() => {
								onConfirm(appointment.id);
								onClose();
							}}
							className="text-sm font-medium text-green-700 hover:underline"
						>
							Confirmer
						</button>
						<button
							onClick={() => {
								onCancel(appointment.id);
								onClose();
							}}
							className="text-sm font-medium text-red-600 hover:underline"
						>
							Refuser
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

export default function AppointmentsPanel() {
	const { loading, professional, error } = useAuthedProfessional();
	const [appointments, setAppointments] = useState<AppointmentWithService[]>([]);
	const [loadingAppointments, setLoadingAppointments] = useState(true);
	const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithService | null>(null);
	const [tab, setTab] = useState<Tab>('pending');

	useEffect(() => {
		if (!professional) return;
		getAppointmentsForProfessional(professional.id)
			.then(setAppointments)
			.finally(() => setLoadingAppointments(false));
	}, [professional]);

	async function handleCancel(id: string) {
		const updated = await updateAppointmentStatus(id, 'cancelled');
		setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
	}

	async function handleConfirm(id: string) {
		const updated = await updateAppointmentStatus(id, 'confirmed');
		setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
	}

	async function handleComplete(id: string) {
		const updated = await updateAppointmentStatus(id, 'completed');
		setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
	}

	if (loading) return <p className="text-sm text-muted-foreground">Chargement...</p>;
	if (error) return <p className="text-sm text-red-600">{error}</p>;

	const now = new Date();
	const filteredAppointments = appointments.filter((a) => {
		const isPast = new Date(a.start_time) < now;
		if (tab === 'pending') return a.status === 'pending';
		if (tab === 'confirmed') return a.status === 'confirmed' && !isPast;
		return isPast || a.status === 'cancelled' || a.status === 'completed';
	});

	return (
		<div>
			<h1 className="text-2xl font-black text-stone-900 uppercase tracking-widest font-[var(--font-heading)]">Rendez-vous</h1>
			<p className="mt-1 text-sm text-stone-500">Bienvenue, {professional?.business_name}.</p>

			<div className="mt-6 flex flex-wrap gap-2">
				{(Object.keys(tabLabels) as Tab[]).map((t) => (
					<button
						key={t}
						type="button"
						onClick={() => setTab(t)}
						className={`rounded-lg border px-4 py-2 text-sm font-bold transition-colors shadow-sm ${
							tab === t
								? 'border-primary bg-primary text-white shadow-primary/20'
								: 'border-stone-200 bg-white text-stone-500 hover:border-primary hover:text-primary'
						}`}
					>
						{tabLabels[t]}
					</button>
				))}
			</div>

			<div className="mt-8 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
				<table className="w-full text-left text-sm">
					<thead className="bg-stone-50 text-xs font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200">
						<tr>
							<th className="px-6 py-4">Client</th>
							<th className="px-6 py-4">Créneau</th>
							<th className="px-6 py-4">Statut</th>
							<th className="px-6 py-4" />
						</tr>
					</thead>
					<tbody className="divide-y divide-stone-100">
						{loadingAppointments && (
							<tr>
								<td className="px-4 py-4 text-muted-foreground" colSpan={4}>
									Chargement des rendez-vous...
								</td>
							</tr>
						)}
						{!loadingAppointments && appointments.length === 0 && (
							<tr>
								<td className="px-4 py-4 text-muted-foreground" colSpan={4}>
									Aucun rendez-vous pour le moment.
								</td>
							</tr>
						)}
						{!loadingAppointments && appointments.length > 0 && filteredAppointments.length === 0 && (
							<tr>
								<td className="px-4 py-4 text-muted-foreground" colSpan={4}>
									Aucun rendez-vous dans cet onglet.
								</td>
							</tr>
						)}
						{filteredAppointments.map((appointment) => (
							<tr
								key={appointment.id}
								onClick={() => setSelectedAppointment(appointment)}
								className="cursor-pointer hover:bg-stone-50 transition-colors"
							>
								<td className="px-6 py-4">
									<p className="font-bold text-stone-900">{appointment.client_name}</p>
									<p className="text-xs text-stone-500 mt-1">{appointment.client_email}</p>
								</td>
								<td className="px-6 py-4 text-stone-600 font-medium">{formatDate(appointment.start_time)}</td>
								<td className="px-6 py-4">
									<span
										className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[appointment.status]}`}
									>
										{statusLabels[appointment.status]}
									</span>
								</td>
								<td className="px-6 py-4 text-right">
									{appointment.status === 'confirmed' && new Date(appointment.start_time) < now && (
										<button
											onClick={(e) => {
												e.stopPropagation();
												handleComplete(appointment.id);
											}}
											className="mr-3 text-xs font-bold text-green-600 hover:underline"
										>
											Terminer
										</button>
									)}
									{appointment.status === 'pending' && (
										<button
											onClick={(e) => {
												e.stopPropagation();
												handleConfirm(appointment.id);
											}}
											className="mr-3 text-xs font-medium text-green-700 hover:underline"
										>
											Confirmer
										</button>
									)}
									{(appointment.status === 'confirmed' || appointment.status === 'pending') && (
										<button
											onClick={(e) => {
												e.stopPropagation();
												handleCancel(appointment.id);
											}}
											className="text-xs font-medium text-red-600 hover:underline"
										>
											{appointment.status === 'pending' ? 'Refuser' : 'Annuler'}
										</button>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{selectedAppointment && (
				<AppointmentDetailModal
					appointment={selectedAppointment}
					onClose={() => setSelectedAppointment(null)}
					onCancel={handleCancel}
					onConfirm={handleConfirm}
					onComplete={handleComplete}
				/>
			)}
		</div>
	);
}
