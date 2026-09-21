import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar as CalendarIcon, MapPin, Clock, Star, Edit2 } from 'lucide-react';
import type { Appointment } from '@/lib/queries';

export default function DiamantClientAppointments() {
	const [appointments, setAppointments] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [editingAppt, setEditingAppt] = useState<any | null>(null);
	const [newDate, setNewDate] = useState('');

	useEffect(() => {
		fetchAppointments();
	}, []);

	async function fetchAppointments() {
		try {
			const { data: { session } } = await supabase.auth.getSession();
			if (!session) return;

			const { data } = await supabase
				.from('appointments')
				.select('*, services(name, duration_minutes, price), professionals(business_name, address)')
				.eq('client_id', session.user.id)
				.gte('start_time', new Date().toISOString())
				.order('start_time', { ascending: true })
				.limit(1);

			setAppointments(data || []);
		} catch (error) {
			console.error(error);
		} finally {
			setLoading(false);
		}
	}

	async function saveDateChange() {
		if (!editingAppt || !newDate) return;
		try {
			const dateObj = new Date(newDate);
			const { error } = await supabase
				.from('appointments')
				.update({ start_time: dateObj.toISOString() })
				.eq('id', editingAppt.id);
			
			if (!error) {
				setEditingAppt(null);
				fetchAppointments(); // Refresh
			}
		} catch (e) {
			console.error(e);
		}
	}

	if (loading) {
		return <div className="p-8 text-center text-stone-500">Chargement de votre prochain rendez-vous...</div>;
	}

	if (appointments.length === 0) {
		return (
			<div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
				<p className="text-stone-500 mb-4">Vous n'avez aucun rendez-vous à venir.</p>
				<a href="/demo-diamant/reservation" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-deep-teal-500 text-white font-bold text-sm hover:bg-deep-teal-400 transition-colors uppercase tracking-widest">
					Réserver maintenant
				</a>
			</div>
		);
	}

	const appt = appointments[0];
	const startDate = new Date(appt.start_time);
	
	// Format HH:MM
	const timeString = startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
	// Format "Jeudi 24 Octobre"
	const dateString = startDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

	return (
		<div className="rounded-2xl border border-jasmine-200 bg-gradient-to-br from-white to-stone-50/50 p-6 md:p-8 shadow-sm relative overflow-hidden group">
			<div className="absolute top-0 right-0 w-32 h-32 bg-jasmine-100/50 blur-[30px] group-hover:bg-jasmine-200/50 transition-colors"></div>
			
			<div className="flex items-center gap-3 mb-6 relative z-10">
				<div className="w-10 h-10 rounded-full bg-jasmine-100 text-jasmine-700 flex items-center justify-center border border-jasmine-200">
					<Star size={18} className="fill-current" />
				</div>
				<h2 className="text-xl font-bold text-stone-900 tracking-tight">Prochain rendez-vous</h2>
			</div>
			
			<div className="bg-white rounded-xl border border-stone-200 p-6 mb-6 relative z-10 shadow-sm">
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
					<div>
						<h3 className="text-2xl font-bold text-stone-900 mb-2 font-coolvetica">{appt.services?.name || 'Prestation sur-mesure'}</h3>
						<p className="text-jasmine-700 font-medium">Avec {appt.professionals?.business_name}</p>
					</div>
					<div className="text-left md:text-right">
						<p className="text-3xl font-black text-stone-900 font-coolvetica">{timeString}</p>
						<p className="text-stone-500 uppercase tracking-widest text-sm font-bold">{dateString}</p>
					</div>
				</div>
				
				<div className="mt-6 pt-6 border-t border-stone-100 flex flex-col sm:flex-row gap-4">
					<div className="flex items-center gap-2 text-stone-600 text-sm">
						<Clock size={16} className="text-jasmine-600" />
						Durée estimée : {appt.services?.duration_minutes || 60} min
					</div>
					<div className="flex items-center gap-2 text-stone-600 text-sm">
						<MapPin size={16} className="text-jasmine-600" />
						{appt.professionals?.address || 'Adresse du salon'}
					</div>
				</div>
			</div>

			<div className="flex flex-wrap gap-4 relative z-10">
				{editingAppt ? (
					<div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-stone-200 shadow-sm">
						<div className="flex flex-col w-full sm:w-auto">
							<label className="text-xs text-stone-500 font-bold mb-1">Nouvelle date</label>
							<input 
								type="datetime-local" 
								className="px-3 py-2 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-deep-teal-500 text-stone-700" 
								value={newDate} 
								onChange={(e) => setNewDate(e.target.value)}
							/>
						</div>
						<div className="flex gap-2 w-full sm:w-auto sm:mt-5">
							<button 
								onClick={saveDateChange}
								className="flex-1 sm:flex-none px-4 py-2 bg-deep-teal-500 text-white text-sm font-bold rounded-lg hover:bg-deep-teal-400"
							>
								Enregistrer
							</button>
							<button 
								onClick={() => setEditingAppt(null)}
								className="flex-1 sm:flex-none px-4 py-2 text-stone-500 border border-stone-200 text-sm font-bold rounded-lg hover:bg-stone-50"
							>
								Annuler
							</button>
						</div>
					</div>
				) : (
					<button 
						onClick={() => {
							const localStr = new Date(startDate.getTime() - (startDate.getTimezoneOffset() * 60000)).toISOString().slice(0,16);
							setNewDate(localStr);
							setEditingAppt(appt);
						}}
						className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-stone-900 text-white font-bold text-sm hover:bg-stone-800 transition-colors shadow-sm"
					>
						<Edit2 size={16} />
						Modifier la date
					</button>
				)}
				{!editingAppt && (
					<button className="px-6 py-3 rounded-xl text-stone-500 font-bold text-sm hover:text-stone-900 transition-colors">
						Annuler le RDV
					</button>
				)}
			</div>
		</div>
	);
}
