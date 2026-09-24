import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { resendConfirmationEmail, signIn, getSession, getUser } from '@/lib/auth';
import { getAccountType, createProfessional, enrollClientInDemo, getDemoTag } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { getBannedClientRecord, checkIsClientBannedInDb, findProAccount, setProSession, setActiveProRole } from '@/lib/permissions';
import { ShieldAlert } from 'lucide-react';

const schema = z.object({
	email: z.string().email('Email invalide'),
	password: z.string().min(6, '6 caractères minimum'),
});

type FormValues = z.infer<typeof schema>;

interface LoginFormProps {
	basePath?: string;
}

export default function LoginForm({ basePath: propBasePath }: LoginFormProps = {}) {
	const [error, setError] = useState<string | null>(null);
	const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
	const [resendStatus, setResendStatus] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<FormValues>({ resolver: zodResolver(schema) });

	function getEffectiveBasePath() {
		if (propBasePath) return propBasePath;
		if (typeof window !== 'undefined') {
			const match = window.location.pathname.match(/^\/(demo-[^/]+)/);
			if (match) return `/${match[1]}`;
			const stored = sessionStorage.getItem('oauth_demo_redirect') || localStorage.getItem('preferred_demo');
			if (stored) return stored;
		}
		return '/demo-premium';
	}

	useEffect(() => {
		// Check for ban error from OAuth redirect
		if (typeof window !== 'undefined') {
			const storedBanErr = sessionStorage.getItem('ban_error_message');
			if (storedBanErr) {
				setError(storedBanErr);
				sessionStorage.removeItem('ban_error_message');
			}
		}

		async function checkExisting() {
			try {
				const session = await getSession();
				if (session) {
					const user = await getUser();
					if (user) {
						// Ban check (Local + BDD Supabase)
						let ban = getBannedClientRecord(
							user.id,
							user.email,
							user.user_metadata?.full_name || user.user_metadata?.name
						);
						if (!ban) {
							const dbBan = await checkIsClientBannedInDb(user.id, user.email);
							if (dbBan) {
								ban = {
									clientId: user.id,
									clientName: user.user_metadata?.full_name || user.user_metadata?.name || 'Client',
									clientEmail: user.email,
									reason: dbBan.reason || 'Compte suspendu par l’établissement',
									bannedAt: new Date().toISOString()
								};
							}
						}
						if (ban) {
							await supabase.auth.signOut();
							localStorage.removeItem('diamant_client_avatar');
							localStorage.removeItem('diamant_client_email');
							setError(`Connexion refusée : votre compte est suspendu par l'établissement. Motif : « ${ban.reason} ». L'accès à votre espace client et aux réservations est bloqué.`);
							return;
						}
						await routeUser(user);
					}
				}
			} catch (e) {
				// Ignore
			}
		}
		checkExisting();
	}, []);

	async function routeUser(user: any) {
		const basePath = getEffectiveBasePath();
		const currentTag = getDemoTag(basePath);

		// Save user email to cache & map for consistent ban and pro lookup
		if (typeof window !== 'undefined' && user.email) {
			localStorage.setItem('diamant_client_email', user.email);
			try {
				const map = JSON.parse(localStorage.getItem('diamant_client_emails') || '{}');
				map[user.id] = user.email;
				localStorage.setItem('diamant_client_emails', JSON.stringify(map));
			} catch (e) {}
		}

		const accountType = await getAccountType(user.id, currentTag);
		if (accountType === 'professional') {
			window.location.href = `${basePath}/dashboard`;
			return;
		}

		// Client ban check (Local + BDD Supabase)
		let ban = getBannedClientRecord(
			user.id,
			user.email,
			user.user_metadata?.full_name || user.user_metadata?.name
		);
		if (!ban) {
			const dbBan = await checkIsClientBannedInDb(user.id, user.email);
			if (dbBan) {
				ban = {
					clientId: user.id,
					clientName: user.user_metadata?.full_name || user.user_metadata?.name || 'Client',
					clientEmail: user.email,
					reason: dbBan.reason || 'Compte suspendu par l’établissement',
					bannedAt: new Date().toISOString()
				};
			}
		}
		if (ban) {
			await supabase.auth.signOut();
			localStorage.removeItem('diamant_client_avatar');
			localStorage.removeItem('diamant_client_email');
			setError(`Connexion refusée : votre compte a été suspendu par l'établissement. Motif : « ${ban.reason} ». L'accès à votre espace client et aux réservations est bloqué.`);
			return;
		}

		const meta = user.user_metadata;
		if (meta?.account_role === 'professional') {
			await createProfessional({
				user_id: user.id,
				business_name: meta.business_name || 'Mon activité',
				email: user.email!,
			}, currentTag);
			window.location.href = `${basePath}/dashboard`;
			return;
		}

		// Enrôler systématiquement le client dans la démo courante (avec son email et avatar)
		// sans effacer ses inscriptions précédentes s'il appartenait à une autre démo
		await enrollClientInDemo(user.id, currentTag, {
			full_name: meta?.full_name || meta?.name || 'Client',
			email: user.email || null,
			avatar_url: meta?.avatar_url || meta?.picture || null
		});

		window.location.href = `${basePath}/espace-client`;
	}

	async function onSubmit(values: FormValues) {
		setSubmitting(true);
		setError(null);
		setUnconfirmedEmail(null);

		// Pre-check if client email is already banned (Local + BDD Supabase)
		let preBan = getBannedClientRecord(null, values.email);
		if (!preBan) {
			const dbBan = await checkIsClientBannedInDb(null, values.email);
			if (dbBan) {
				preBan = {
					clientId: 'unknown',
					clientName: 'Client',
					clientEmail: values.email,
					reason: dbBan.reason || 'Compte suspendu par l’établissement',
					bannedAt: new Date().toISOString()
				};
			}
		}
		if (preBan) {
			setError(`Connexion refusée : votre compte est suspendu par l'établissement. Motif : « ${preBan.reason} ». L'accès à votre espace client et aux réservations est bloqué.`);
			setSubmitting(false);
			return;
		}

		// Check if credentials match a created Pro/Admin account
		const proAccount = findProAccount(values.email);
		if (proAccount) {
			if (proAccount.password && proAccount.password !== values.password) {
				setError('Mot de passe incorrect pour ce compte.');
				setSubmitting(false);
				return;
			}
			if (proAccount.status === 'suspended') {
				setError("Connexion refusée : votre compte collaborateur est actuellement suspendu par l'administrateur.");
				setSubmitting(false);
				return;
			}

			// Initialiser la session professionnelle
			setProSession(proAccount);
			setActiveProRole(proAccount.role);

			// Tenter en arrière-plan une synchronisation Supabase si possible
			try {
				await signIn(values.email, values.password).catch(() => null);
			} catch (e) {}

			const basePath = getEffectiveBasePath();
			window.location.href = proAccount.role === 'employee'
				? `${basePath}/dashboard/disponibilites`
				: `${basePath}/dashboard`;
			return;
		}

		try {
			const { user } = await signIn(values.email, values.password);
			if (!user) throw new Error('Connexion impossible.');
			await routeUser(user);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Erreur de connexion.';
			if (message.toLowerCase().includes('confirm')) {
				setError("Votre adresse email n'a pas encore été confirmée. Vérifiez votre boîte mail (et vos spams).");
				setUnconfirmedEmail(values.email);
			} else {
				setError(message);
			}
		} finally {
			setSubmitting(false);
		}
	}

	async function handleResendConfirmation() {
		if (!unconfirmedEmail) return;
		setResendStatus(null);
		try {
			const basePath = getEffectiveBasePath();
			await resendConfirmationEmail(unconfirmedEmail, `${window.location.origin}${basePath}/connexion`);
			setResendStatus("Email de confirmation renvoyé. Pensez à vérifier vos spams !");
		} catch (err) {
			setResendStatus(err instanceof Error ? err.message : "Erreur lors de l'envoi.");
		}
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
			<div>
				<label className="text-sm text-stone-500" htmlFor="email">
					Email <span className="text-primary">*</span>
				</label>
				<input
					id="email"
					type="email"
					className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
					{...register('email')}
				/>
				{errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
			</div>
			<div>
				<label className="text-sm text-stone-500" htmlFor="password">
					Mot de passe <span className="text-primary">*</span>
				</label>
				<input
					id="password"
					type="password"
					className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
					{...register('password')}
				/>
				{errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
				<a href={`${getEffectiveBasePath()}/mot-de-passe-oublie`} className="mt-1 inline-block text-xs font-medium text-primary hover:underline">
					Mot de passe oublié ?
				</a>
			</div>
			{error && (
				<div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs md:text-sm text-rose-800 animate-in fade-in">
					<div className="font-bold flex items-center gap-2 mb-1 text-rose-900">
						<ShieldAlert size={16} className="text-rose-600 shrink-0" />
						<span>{error.includes('suspendu') || error.includes('refusée') ? 'Accès suspendu' : 'Erreur'}</span>
					</div>
					<p className="leading-relaxed">{error}</p>
				</div>
			)}
			{unconfirmedEmail && (
				<div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
					<p className="mb-2">Le message de confirmation a pu être filtré comme spam.</p>
					<button
						type="button"
						onClick={handleResendConfirmation}
						className="font-bold underline text-amber-900 hover:text-amber-700"
					>
						Renvoyer l'email de confirmation
					</button>
					{resendStatus && <p className="mt-1 font-medium">{resendStatus}</p>}
				</div>
			)}
			<button
				type="submit"
				disabled={submitting}
				className="rounded-xl bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-[0_0_15px_rgba(255,50,50,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_25px_rgba(255,50,50,0.6)] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
			>
				{submitting ? 'Connexion...' : 'Démarrer'}
			</button>

			<div className="relative my-4 flex items-center py-2">
				<div className="flex-grow border-t border-stone-200"></div>
				<span className="shrink-0 px-4 text-xs text-stone-400">Ou continuer avec</span>
				<div className="flex-grow border-t border-stone-200"></div>
			</div>

			<button
				type="button"
				onClick={async () => {
					const { signInWithGoogle } = await import('@/lib/auth');
					const basePath = getEffectiveBasePath();
					await signInWithGoogle(`${window.location.origin}${basePath}/connexion`);
				}}
				className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100"
			>
				<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
					<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
					<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
					<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
					<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
					<path d="M1 1h22v22H1z" fill="none" />
				</svg>
				Google
			</button>
		</form>
	);
}
