import { Award, CalendarDays, MessageSquare, UserRound } from 'lucide-react';
import StandardSpaceNav, { type SpaceLink } from '@/components/standard/ui/StandardSpaceNav';

const links: SpaceLink[] = [
	{ label: 'Mes rendez-vous', short: 'Rendez-vous', href: '/espace-client', icon: CalendarDays },
	{ label: 'Fidélité', href: '/espace-client/fidelite', icon: Award },
	{ label: 'Messages', href: '/espace-client/messages', icon: MessageSquare },
	{ label: 'Mon profil', short: 'Profil', href: '/espace-client/profil', icon: UserRound },
];

export default function ClientNav({ basePath = '', currentPath = '' }: { basePath?: string; currentPath?: string }) {
	return <StandardSpaceNav basePath={basePath} currentPath={currentPath} links={links} title="Espace client" bottomTabs />;
}
