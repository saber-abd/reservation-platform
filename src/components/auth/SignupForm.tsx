import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signUp, getSession, getUser } from '@/lib/auth';
import { createClient } from '@/lib/queries';
import { supabase } from '@/lib/supabase';

const baseSchema = z.object({
	fullName: z.string().min(2, 'Nom obligatoire'),
});

const fullSchema = baseSchema.extend({
	email: z.string().email('Email invalide'),
	password: z.string().min(6, '6 caractères minimum'),
});

type FormValues = z.infer<typeof fullSchema>;

export default function SignupForm() {
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [existingUser, setExistingUser] = useState<any>(null);

	const {
		register,
		handleSubmit,
		setValue,
		formState: { errors },
	} = useForm<FormValues>();

	useEffect(() => {
		async function checkExisting() {
			try {
				const session = await getSession();
				if (session) {
					const user = await getUser();
					if (user) {
						const meta = user.user_metadata;
						
						// Si les métadonnées contiennent déjà qu'il est client, ou si on a son nom complet (ex: Google Auth)
						if (meta?.account_role === 'client' || meta?.full_name || meta?.name) {
							await createClient({ 
								id: user.id, 
								full_name: meta.full_name || meta.name || 'Client',
								avatar_url: meta.avatar_url || null
							});
							const match = window.location.pathname.match(/^\/(demo-[^/]+)/);
							const basePath = match ? `/${match[1]}` : '';
							window.location.href = basePath ? `${basePath}/espace-client` : '/espace-client';
							return;
						}
						
						// Sinon, on a besoin qu'il saisisse son nom complet manuellement
						setExistingUser(user);
					}
				}
			} catch (e) {
				// Ignore
			}
		}
		checkExisting();
	}, []);

	async function onFinishProfile(values: any) {
		if (!existingUser) return;
		setSubmitting(true);
		setError(null);
		try {
			const metadata = {
				account_role: 'client',
				full_name: values.fullName
			};
			
			const { error: updateError } = await supabase.auth.updateUser({ data: metadata });
			if (updateError) throw updateError;

			await createClient({ id: existingUser.id, full_name: values.fullName });
			const match = window.location.pathname.match(/^\/(demo-[^/]+)/);
			const basePath = match ? `/${match[1]}` : '';
			window.location.href = basePath ? `${basePath}/espace-client` : '/espace-client';
		} catch (err) {
			setError(err instanceof Error ? err.message : "Erreur lors de la création du profil.");
		} finally {
			setSubmitting(false);
		}
	}

	async function onSubmit(values: FormValues) {
		if (existingUser) {
			return onFinishProfile(values);
		}
		
		const parsed = fullSchema.safeParse(values);
		if (!parsed.success) {
			setError("Veuillez remplir correctement tous les champs.");
			return;
		}

		setSubmitting(true);
		setError(null);
		try {
			const metadata = {
				account_role: 'client',
				full_name: values.fullName
			};
			const { user, session } = await signUp(values.email, values.password, metadata);
			if (!user) throw new Error('Inscription impossible.');

			if (!session) {
				setError(
					"Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse avant de vous connecter.",
				);
				return;
			}

			const match = window.location.pathname.match(/^\/(demo-[^/]+)/);
			const basePath = match ? `/${match[1]}` : '';
			window.location.href = basePath ? `${basePath}/connexion` : '/connexion';
		} catch (err) {
			setError(err instanceof Error ? err.message : "Erreur lors de l'inscription.");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
			{existingUser && (
				<div className="mb-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
					Vous êtes connecté avec <b>{existingUser.email}</b>. Veuillez renseigner votre nom pour finaliser la création de votre espace client.
				</div>
			)}
			
			<div>
				<label className="text-sm text-muted-foreground" htmlFor="fullName">
					Nom complet <span className="text-rose-600">*</span>
				</label>
				<input
					id="fullName"
					className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
					{...register('fullName')}
				/>
				{errors.fullName && <p className="mt-1 text-xs text-destructive">{errors.fullName.message}</p>}
			</div>
			
			{!existingUser && (
				<>
					<div>
						<label className="text-sm text-muted-foreground" htmlFor="email">
							Email <span className="text-primary">*</span>
						</label>
						<input
							id="email"
							type="email"
							className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
							{...register('email')}
						/>
					</div>
					<div>
						<label className="text-sm text-muted-foreground" htmlFor="password">
							Mot de passe <span className="text-primary">*</span>
						</label>
						<input
							id="password"
							type="password"
							className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
							{...register('password')}
						/>
					</div>
				</>
			)}
			
			{error && <p className="text-sm text-destructive">{error}</p>}
			
			<button
				type="submit"
				disabled={submitting}
				className="rounded-xl bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-[0_0_15px_rgba(255,50,50,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_25px_rgba(255,50,50,0.6)] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
			>
				{submitting ? 'Création...' : (existingUser ? 'Terminer mon profil' : 'Rejoindre')}
			</button>
			
			{!existingUser && (
				<>
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
						className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
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
				</>
			)}
		</form>
	);
}
