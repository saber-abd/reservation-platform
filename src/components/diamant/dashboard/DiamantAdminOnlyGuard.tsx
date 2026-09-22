import React, { useState, useEffect } from 'react';
import { getActiveProRole, type ProRole } from '@/lib/permissions';
import { Lock, ArrowRight } from 'lucide-react';

interface Props {
	children: React.ReactNode;
	pageName?: string;
}

export default function DiamantAdminOnlyGuard({ children, pageName = "cette section" }: Props) {
	const [role, setRole] = useState<ProRole>('admin');
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setRole(getActiveProRole());
		setMounted(true);

		const onRoleChange = (e: any) => {
			if (e.detail?.role) setRole(e.detail.role);
		};
		window.addEventListener('pro:role-changed', onRoleChange);
		return () => window.removeEventListener('pro:role-changed', onRoleChange);
	}, []);

	if (!mounted) return null;

	if (role === 'employee') {
		return (
			<div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-8 md:p-12 text-center shadow-xs max-w-2xl mx-auto my-10">
				<div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 mx-auto mb-4 shadow-xs">
					<Lock size={28} />
				</div>
				<h2 className="text-xl font-bold text-stone-900 tracking-tight">Accès Réservé à l'Administrateur</h2>
				<p className="text-sm text-amber-900 mt-2 max-w-md mx-auto leading-relaxed">
					L'onglet <strong>{pageName}</strong> est confidentiel et réservé au gérant / propriétaire de l'établissement. En tant qu'employé, vous avez accès uniquement au <strong>Planning & RDV, à la Clientèle, à la Messagerie et à la Recherche</strong>.
				</p>
				<div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
					<a
						href="/demo-diamant/dashboard/disponibilites"
						className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-deep-teal-600 text-white font-bold text-xs hover:bg-deep-teal-700 transition-all shadow-xs"
					>
						<span>Accéder au Planning & RDV</span>
						<ArrowRight size={14} />
					</a>
					<a
						href="/demo-diamant/dashboard/clients"
						className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-700 font-bold text-xs hover:bg-stone-50 transition-all"
					>
						<span>Accéder à la Clientèle</span>
					</a>
				</div>
			</div>
		);
	}

	return <>{children}</>;
}
