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
	pending: 'bg-amber-50 text-amber-700',
	confirmed: 'bg-rose-50 text-rose-700',
	cancelled: 'bg-red-50 text-red-700',
	completed: 'bg-green-50 text-green-700',
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
}: {
	appointment: AppointmentWithService;
	onClose: () => void;
	onCancel: (id: string) => void;
	onConfirm: (id: string) => void;
}) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
			<div
				className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-lg"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-start justify-between">
					<h2 className="text-lg font-semibold text-stone-900">Détail du rendez-vous</h2>
					<button onClick={onClose} className="text-sm text-stone-400 hover:text-stone-600">
						✕
					</button>
				</div>
				<dl className="mt-4 space-y-3 text-sm">
					<div>
						<dt className="text-xs uppercase text-stone-400">Client</dt>
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
						<dt className="text-xs uppercase text-stone-400">Statut</dt>
						<dd>
							<span className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[appointment.status]}`}>
								{statusLabels[appointment.status]}
							</span>
						</dd>
					</div>
				</dl>
				{appointment.status === 'confirmed' && (
					<button
						onClick={() => {
							onCancel(appointment.id);
							onClose();
						}}
						className="mt-6 text-sm font-medium text-red-600 hover:underline"
					>
						Annuler ce rendez-vous
					</button>
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

	if (loading) return <p className="text-sm text-stone-500">Chargement...</p>;
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
			<h1 className="text-2xl font-bold text-stone-900">Rendez-vous</h1>
			<p className="mt-1 text-sm text-stone-500">Bienvenue, {professional?.business_name}.</p>

			<div className="mt-6 flex flex-wrap gap-2">
				{(Object.keys(tabLabels) as Tab[]).map((t) => (
					<button
						key={t}
						type="button"
						onClick={() => setTab(t)}
						className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
							tab === t
								? 'border-rose-600 bg-rose-600 text-white'
								: 'border-border bg-white text-stone-600 hover:border-rose-300'
						}`}
					>
						{tabLabels[t]}
					</button>
				))}
			</div>

			<div className="mt-6 overflow-x-auto rounded-xl border border-border">
				<table className="w-full text-left text-sm">
					<thead className="bg-stone-50 text-xs uppercase text-stone-500">
						<tr>
							<th className="px-4 py-3">Client</th>
							<th className="px-4 py-3">Créneau</th>
							<th className="px-4 py-3">Statut</th>
							<th className="px-4 py-3" />
						</tr>
					</thead>
					<tbody>
						{loadingAppointments && (
							<tr>
								<td className="px-4 py-4 text-stone-500" colSpan={4}>
									Chargement des rendez-vous...
								</td>
							</tr>
						)}
						{!loadingAppointments && appointments.length === 0 && (
							<tr>
								<td className="px-4 py-4 text-stone-500" colSpan={4}>
									Aucun rendez-vous pour le moment.
								</td>
							</tr>
						)}
						{!loadingAppointments && appointments.length > 0 && filteredAppointments.length === 0 && (
							<tr>
								<td className="px-4 py-4 text-stone-500" colSpan={4}>
									Aucun rendez-vous dans cet onglet.
								</td>
							</tr>
						)}
						{filteredAppointments.map((appointment) => (
							<tr
								key={appointment.id}
								onClick={() => setSelectedAppointment(appointment)}
								className="cursor-pointer border-t border-border hover:bg-stone-50"
							>
								<td className="px-4 py-3">
									<p className="font-medium text-stone-900">{appointment.client_name}</p>
									<p className="text-xs text-stone-500">{appointment.client_email}</p>
								</td>
								<td className="px-4 py-3 text-stone-600">{formatDate(appointment.start_time)}</td>
								<td className="px-4 py-3">
									<span
										className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[appointment.status]}`}
									>
										{statusLabels[appointment.status]}
									</span>
								</td>
								<td className="px-4 py-3 text-right">
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
				/>
			)}
		</div>
	);
}
