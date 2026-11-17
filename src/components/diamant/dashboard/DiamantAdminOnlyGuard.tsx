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
			<div className="mx-auto my-6 max-w-2xl md:my-12">
				<div className="dx-carte overflow-hidden">
					<div className="flex items-center gap-4 border-b border-dx-filet bg-dx-papier px-6 py-5 sm:px-8">
						<span className="inline-grid h-11 w-11 flex-none place-items-center rounded-full bg-dx-encre text-dx-creme">
							<Lock size={18} />
						</span>
						<div>
							<p className="text-sm text-dx-gris">Accès réservé</p>
							<h2 className="dx-h2">Accès Réservé à l'Administrateur</h2>
						</div>
					</div>
					<div className="px-6 py-6 sm:px-8 sm:py-7">
						<p className="text-[0.9375rem] leading-relaxed text-dx-encre-2">
							L'onglet <strong className="font-semibold text-dx-encre">{pageName}</strong> est confidentiel et réservé au gérant / propriétaire de l'établissement. En tant qu'employé, vous avez accès uniquement au <strong className="font-semibold text-dx-encre">Planning & RDV, à la Clientèle, à la Messagerie et à la Recherche</strong>.
						</p>
						<div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
							<a href="/demo-diamant/dashboard/disponibilites" className="dx-btn">
								<span>Accéder au Planning & RDV</span>
								<ArrowRight size={15} />
							</a>
							<a href="/demo-diamant/dashboard/clients" className="dx-btn dx-btn--ligne">
								<span>Accéder à la Clientèle</span>
							</a>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return <>{children}</>;
}
