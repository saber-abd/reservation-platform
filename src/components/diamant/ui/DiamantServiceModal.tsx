import React, { useEffect } from 'react';
import type { Service } from '@/lib/queries';
import { getServiceImageFallback } from '@/lib/serviceImages';

interface ServiceModalProps {
	service: Service | null;
	onClose: () => void;
}

export default function ServiceModal({ service, onClose }: ServiceModalProps) {
	// Prevent body scroll when modal is open
	useEffect(() => {
		if (service) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = 'unset';
		}
		return () => {
			document.body.style.overflow = 'unset';
		};
	}, [service]);

	if (!service) return null;

	const imageUrl = service.image_url || getServiceImageFallback(service.name);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
			{/* Backdrop */}
			<div 
				className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity" 
				onClick={onClose}
				aria-hidden="true"
			/>
			
			{/* Modal Content */}
			<div 
				className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:flex-row max-h-[90vh]"
				role="dialog"
				aria-modal="true"
				aria-labelledby="modal-title"
			>
				<button
					onClick={onClose}
					className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/70 sm:text-stone-500 sm:bg-stone-100 sm:hover:bg-stone-200"
					aria-label="Fermer"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
				</button>

				{/* Image Section */}
				<div className="h-64 w-full shrink-0 bg-stone-100 sm:h-auto sm:w-1/2">
					<img 
						src={imageUrl} 
						alt={service.name} 
						className="h-full w-full object-cover" 
					/>
				</div>

				{/* Details Section */}
				<div className="flex flex-col p-6 sm:w-1/2 sm:p-8 overflow-y-auto">
					<h2 id="modal-title" className="text-2xl font-bold text-stone-900">{service.name}</h2>
					
					<div className="mt-4 flex flex-wrap gap-3">
						<span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-sm font-medium text-stone-800">
							<svg className="mr-1.5 h-4 w-4 text-stone-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
							{service.duration_minutes} min
						</span>
						<span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-700">
							{service.price} €
						</span>
					</div>

					<div className="mt-6 flex-1">
						<h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500">Description</h3>
						<p className="mt-2 text-stone-600 leading-relaxed">
							{service.description || "Aucune description pour cette prestation."}
						</p>
					</div>

					<div className="mt-8 pt-6 border-t border-border">
						<a
							href={`/reservation?service=${service.id}`}
							className="flex w-full items-center justify-center rounded-xl bg-rose-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-600 focus:ring-offset-2"
						>
							Réserver ce créneau
						</a>
					</div>
				</div>
			</div>
		</div>
	);
}
