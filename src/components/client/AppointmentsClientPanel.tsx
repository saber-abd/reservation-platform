import { useEffect, useState } from 'react';
import { useAuthedClient } from '@/lib/useAuthedClient';
import { getAppointmentsForClient, updateAppointmentStatus, type Appointment } from '@/lib/queries';

type ClientAppointment = Appointment & { services: { name: string } | null };

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
	confirmed: 'Confirmé',
	cancelled: 'Annulé',
	completed: 'Terminé',
};

const statusStyles: Record<Appointment['status'], string> = {
	confirmed: 'bg-rose-50 text-rose-700',
	cancelled: 'bg-red-50 text-red-700',
	completed: 'bg-green-50 text-green-700',
};

export default function AppointmentsClientPanel() {
	const { loading, client, error } = useAuthedClient();
	const [appointments, setAppointments] = useState<ClientAppointment[]>([]);
	const [loadingAppointments, setLoadingAppointments] = useState(true);

	useEffect(() => {
		if (!client) return;
		getAppointmentsForClient(client.id)
			.then(setAppointments)
			.finally(() => setLoadingAppointments(false));
	}, [client]);

	async function handleCancel(id: string) {
		const updated = await updateAppointmentStatus(id, 'cancelled');
		setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
	}

	if (loading) return <p className="text-sm text-stone-500">Chargement...</p>;
	if (error) return <p className="text-sm text-red-600">{error}</p>;

	return (
		<div>
			<h1 className="text-2xl font-bold text-stone-900">Mes rendez-vous</h1>
			<p className="mt-1 text-sm text-stone-500">Bienvenue, {client?.full_name ?? 'vous'}.</p>

			<div className="mt-6 overflow-x-auto rounded-xl border border-border bg-white">
				<table className="w-full text-left text-sm">
					<thead className="bg-stone-50 text-xs uppercase text-stone-500">
						<tr>
							<th className="px-4 py-3">Prestation</th>
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
									Vous n'avez pas encore de rendez-vous. <a href="/reservation" className="text-rose-600 hover:underline">Réserver un créneau</a>.
								</td>
							</tr>
						)}
						{appointments.map((appointment) => (
							<tr key={appointment.id} className="border-t border-border">
								<td className="px-4 py-3 font-medium text-stone-900">{appointment.services?.name ?? '—'}</td>
								<td className="px-4 py-3 text-stone-600">{formatDate(appointment.start_time)}</td>
								<td className="px-4 py-3">
									<span
										className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[appointment.status]}`}
									>
										{statusLabels[appointment.status]}
									</span>
								</td>
								<td className="px-4 py-3 text-right">
									{appointment.status === 'confirmed' && (
										<button
											onClick={() => handleCancel(appointment.id)}
											className="text-xs font-medium text-red-600 hover:underline"
										>
											Annuler
										</button>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
