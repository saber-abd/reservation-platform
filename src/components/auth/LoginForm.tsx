import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { resendConfirmationEmail, signIn, getSession, getUser } from '@/lib/auth';
import { getAccountType, createProfessional, createClient } from '@/lib/queries';

const schema = z.object({
	email: z.string().email('Email invalide'),
	password: z.string().min(6, '6 caractères minimum'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginForm() {
	const [error, setError] = useState<string | null>(null);
	const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
	const [resendStatus, setResendStatus] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<FormValues>({ resolver: zodResolver(schema) });

	useEffect(() => {
		async function checkExisting() {
			try {
				const session = await getSession();
				if (session) {
					const user = await getUser();
					if (user) {
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
		const accountType = await getAccountType(user.id);
		if (accountType === 'professional') {
			window.location.href = '/dashboard';
		} else if (accountType === 'client') {
			window.location.href = '/espace-client';
		} else {
			const meta = user.user_metadata;
			if (meta?.account_role === 'professional') {
				await createProfessional({
					user_id: user.id,
					business_name: meta.business_name || 'Mon activité',
					email: user.email!,
				});
				window.location.href = '/dashboard';
			} else if (meta?.account_role === 'client') {
				await createClient({ id: user.id, full_name: meta.full_name || null });
				window.location.href = '/espace-client';
			} else {
				window.location.href = '/inscription';
			}
		}
	}

	async function onSubmit(values: FormValues) {
		setSubmitting(true);
		setError(null);
		setUnconfirmedEmail(null);
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
			await resendConfirmationEmail(unconfirmedEmail);
			setResendStatus("Email de confirmation renvoyé.");
		} catch (err) {
			setResendStatus(err instanceof Error ? err.message : "Erreur lors de l'envoi.");
		}
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
			<div>
				<label className="text-sm text-stone-700" htmlFor="email">
					Email <span className="text-rose-600">*</span>
				</label>
				<input
					id="email"
					type="email"
					className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
					{...register('email')}
				/>
				{errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
			</div>
			<div>
				<label className="text-sm text-stone-700" htmlFor="password">
					Mot de passe <span className="text-rose-600">*</span>
				</label>
				<input
					id="password"
					type="password"
					className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
					{...register('password')}
				/>
				{errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
				<a href="/mot-de-passe-oublie" className="mt-1 inline-block text-xs font-medium text-rose-600 hover:underline">
					Mot de passe oublié ?
				</a>
			</div>
			{error && <p className="text-sm text-red-600">{error}</p>}
			{unconfirmedEmail && (
				<div>
					<button
						type="button"
						onClick={handleResendConfirmation}
						className="text-xs font-medium text-rose-600 hover:underline"
					>
						Renvoyer l'email de confirmation
					</button>
					{resendStatus && <p className="mt-1 text-xs text-stone-500">{resendStatus}</p>}
				</div>
			)}
			<button
				type="submit"
				disabled={submitting}
				className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
			>
				{submitting ? 'Connexion...' : 'Se connecter'}
			</button>

			<div className="relative my-4 flex items-center py-2">
				<div className="flex-grow border-t border-border"></div>
				<span className="shrink-0 px-4 text-xs text-stone-400">Ou continuer avec</span>
				<div className="flex-grow border-t border-border"></div>
			</div>

			<button
				type="button"
				onClick={async () => {
					const { signInWithGoogle } = await import('@/lib/auth');
					await signInWithGoogle();
				}}
				className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
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
