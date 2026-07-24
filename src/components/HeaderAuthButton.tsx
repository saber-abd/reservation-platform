/**
 * HeaderAuthButton — composant React client:load.
 * Affiche soit :
 * - L'avatar + prénom de l'utilisateur connecté (avec menu déconnexion)
 * - Un bouton "Connexion / Inscription" si non connecté
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { signOut } from '@/lib/auth';
import { getAccountType } from '@/lib/queries';
import { AvatarDisplay } from '@/components/shared/AvatarPicker';

interface UserInfo {
	id: string;
	email: string;
	displayName: string;
	avatarKey: string | null;
	accountType: 'professional' | 'client' | null;
}

export default function HeaderAuthButton() {
	const [user, setUser] = useState<UserInfo | null>(null);
	const [loading, setLoading] = useState(true);
	const [menuOpen, setMenuOpen] = useState(false);

	useEffect(() => {
		let cancelled = false;

		async function loadUser() {
			try {
				const {
					data: { session },
				} = await supabase.auth.getSession();

				if (!session || cancelled) {
					setLoading(false);
					return;
				}

				const accountType = await getAccountType(session.user.id);

				// Try to get avatar from the appropriate table
				let displayName = session.user.email ?? '';
				let avatarKey: string | null = null;

				if (accountType === 'professional') {
					const { data } = await supabase
						.from('professionals')
						.select('business_name, avatar_url')
						.eq('user_id', session.user.id)
						.maybeSingle();
					if (data) {
						displayName = data.business_name ?? displayName;
						avatarKey = data.avatar_url ?? null;
					}
				} else if (accountType === 'client') {
					const { data } = await supabase
						.from('clients')
						.select('full_name, avatar_url')
						.eq('id', session.user.id)
						.maybeSingle();
					if (data) {
						displayName = data.full_name ?? displayName;
						avatarKey = data.avatar_url ?? null;
					}
				}

				if (!cancelled) {
					setUser({
						id: session.user.id,
						email: session.user.email ?? '',
						displayName,
						avatarKey,
						accountType,
					});
				}
			} catch {
				// Silently fail — user is just not logged in
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		loadUser();

		// Listen to auth state changes (login/logout on other tabs)
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(() => {
			loadUser();
		});

		return () => {
			cancelled = true;
			subscription.unsubscribe();
		};
	}, []);

	async function handleSignOut() {
		await signOut();
		window.location.href = '/';
	}

	if (loading) {
		// Skeleton to avoid layout shift
		return <div className="h-9 w-28 animate-pulse rounded-xl bg-stone-200" />;
	}

	if (!user) {
		return (
			<a
				href="/connexion"
				className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm transition-colors hover:border-rose-300 hover:text-rose-600"
			>
				{/* LogIn icon inline SVG */}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
					<polyline points="10 17 15 12 10 7" />
					<line x1="15" y1="12" x2="3" y2="12" />
				</svg>
				Connexion / Inscription
			</a>
		);
	}

	// Logged in — show avatar + name + dropdown
	const dashboardHref = user.accountType === 'professional' ? '/dashboard' : '/espace-client';
	const firstWord = user.displayName.split(' ')[0] ?? user.displayName;

	return (
		<div className="relative">
			<button
				type="button"
				onClick={() => setMenuOpen((v) => !v)}
				className="flex items-center gap-2 rounded-xl border border-transparent px-2 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:border-border hover:bg-white"
			>
				<AvatarDisplay avatarKey={user.avatarKey} size={32} />
				<span className="hidden sm:block">{firstWord}</span>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="text-stone-400"
				>
					<polyline points="6 9 12 15 18 9" />
				</svg>
			</button>

			{menuOpen && (
				<div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-white shadow-lg">
					<div className="border-b border-border px-4 py-3">
						<p className="text-xs text-stone-500">Connecté en tant que</p>
						<p className="truncate text-sm font-semibold text-stone-900">{user.displayName}</p>
					</div>
					<a
						href={dashboardHref}
						className="block px-4 py-2.5 text-sm text-stone-700 hover:bg-rose-50 hover:text-rose-700"
					>
						Mon espace
					</a>
					<button
						type="button"
						onClick={handleSignOut}
						className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
					>
						Se déconnecter
					</button>
				</div>
			)}
		</div>
	);
}
