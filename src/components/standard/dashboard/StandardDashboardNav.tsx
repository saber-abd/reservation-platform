import { UserRound, Wrench } from 'lucide-react';
import StandardSpaceNav, { type SpaceLink } from '@/components/standard/ui/StandardSpaceNav';

// Formule Standard (sans base de données) : les rendez-vous arrivent dans Google Agenda,
// l'espace pro se limite au catalogue des prestations et aux informations du professionnel.
const links: SpaceLink[] = [
	{ label: 'Prestations', href: '/dashboard/services', icon: Wrench },
	{ label: 'Profil', href: '/dashboard/profil', icon: UserRound },
];

export default function DashboardNav({ basePath = '', currentPath = '' }: { basePath?: string; currentPath?: string }) {
	return <StandardSpaceNav basePath={basePath} currentPath={currentPath} links={links} title="Espace pro" />;
}
