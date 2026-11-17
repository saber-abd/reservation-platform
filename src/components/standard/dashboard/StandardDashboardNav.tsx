import { BarChart3, CalendarCheck, Clock, UserRound, Users, Wrench } from 'lucide-react';
import StandardSpaceNav, { type SpaceLink } from '@/components/standard/ui/StandardSpaceNav';

const links: SpaceLink[] = [
	{ label: "Vue d'ensemble", href: '/dashboard', icon: CalendarCheck },
	{ label: 'Services', href: '/dashboard/services', icon: Wrench },
	{ label: 'Disponibilités', href: '/dashboard/disponibilites', icon: Clock },
	{ label: 'Clients', href: '/dashboard/clients', icon: Users },
	{ label: 'Statistiques', href: '/dashboard/statistiques', icon: BarChart3 },
	{ label: 'Profil', href: '/dashboard/profil', icon: UserRound },
];

export default function DashboardNav({ basePath = '', currentPath = '' }: { basePath?: string; currentPath?: string }) {
	return <StandardSpaceNav basePath={basePath} currentPath={currentPath} links={links} title="Espace pro" />;
}
