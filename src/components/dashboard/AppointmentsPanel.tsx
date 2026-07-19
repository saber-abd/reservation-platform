import { useEffect, useState } from 'react';
import { useAuthedProfessional } from '@/lib/useAuthedProfessional';
import { getAppointmentsForProfessional, updateAppointmentStatus, type Appointment } from '@/lib/queries';

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
	confirmed: 'bg-blue-50 text-blue-700',
	cancelled: 'bg-red-50 text-red-700',
	completed: 'bg-green-50 text-green-700',
};

export default function AppointmentsPanel() {
	const { loading, professional, error } = useAuthedProfessional();
	const [appointments, setAppointments] = useState<Appointment[]>([]);
	const [loadingAppointments, setLoadingAppointments] = useState(true);

	useEffect(() => {
		if (!professional) return;
		getAppointmentsForProfessional(professional.id)
			.then(setAppointments)
			.finally(() => setLoadingAppointments(false));
	}, [professional]);

	async function handleCancel(id: string) {
		const updated = await updateAppointmentStatus(id, 'cancelled');
		setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
	}

	if (loading) return <p className="text-sm text-gray-500">Chargement...</p>;
	if (error) return <p className="text-sm text-red-600">{error}</p>;

	return (
		<div>
			<h1 className="text-2xl font-bold text-gray-900">Rendez-vous</h1>
			<p className="mt-1 text-sm text-gray-500">Bienvenue, {professional?.business_name}.</p>

			<div className="mt-6 overflow-x-auto rounded-xl border border-border">
				<table className="w-full text-left text-sm">
					<thead className="bg-gray-50 text-xs uppercase text-gray-500">
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
								<td className="px-4 py-4 text-gray-500" colSpan={4}>
									Chargement des rendez-vous...
								</td>
							</tr>
						)}
						{!loadingAppointments && appointments.length === 0 && (
							<tr>
								<td className="px-4 py-4 text-gray-500" colSpan={4}>
									Aucun rendez-vous pour le moment.
								</td>
							</tr>
						)}
						{appointments.map((appointment) => (
							<tr key={appointment.id} className="border-t border-border">
								<td className="px-4 py-3">
									<p className="font-medium text-gray-900">{appointment.client_name}</p>
									<p className="text-xs text-gray-500">{appointment.client_email}</p>
								</td>
								<td className="px-4 py-3 text-gray-600">{formatDate(appointment.start_time)}</td>
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
