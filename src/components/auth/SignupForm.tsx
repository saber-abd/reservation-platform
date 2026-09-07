import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signUp } from '@/lib/auth';
import { createProfessional, createClient } from '@/lib/queries';

const schema = z.object({
	role: z.enum(['professional', 'client']),
	businessName: z.string().optional(),
	fullName: z.string().optional(),
	email: z.string().email('Email invalide'),
	password: z.string().min(6, '6 caractères minimum'),
});

type FormValues = z.infer<typeof schema>;

function sendWelcomeEmail(email: string, name: string) {
	fetch('/api/send-email', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			to: [email],
			subject: 'Bienvenue — votre compte a bien été créé',
			html: `<p>Bonjour ${name},</p>
				   <p>Votre compte vient d'être créé avec succès.</p>
				   <p>Vous pouvez dès maintenant vous connecter et profiter de votre espace personnel.</p>
				   <p>À très bientôt !</p>`,
		}),
	}).catch((err) => console.error("Erreur d'envoi d'email de bienvenue:", err));
}

export default function SignupForm() {
	const [role, setRole] = useState<'professional' | 'client'>('client');
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const {
		register,
		handleSubmit,
		setValue,
		formState: { errors },
	} = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { role: 'client' } });

	function handleRoleChange(nextRole: 'professional' | 'client') {
		setRole(nextRole);
		setValue('role', nextRole);
	}

	async function onSubmit(values: FormValues) {
		setSubmitting(true);
		setError(null);
		try {
			const metadata = {
				account_role: values.role,
				business_name: values.businessName || null,
				full_name: values.fullName || null
			};
			const { user, session } = await signUp(values.email, values.password, metadata);
			if (!user) throw new Error('Inscription impossible.');

			if (!session) {
				setError(
					"Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse avant de vous connecter.",
				);
				return;
			}

			// If no email verification required, session exists. Let's redirect to connexion page to handle routing and profile creation.
			window.location.href = '/connexion';
		} catch (err) {
			setError(err instanceof Error ? err.message : "Erreur lors de l'inscription.");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
			<div>
				<span className="text-sm text-stone-700">Je suis...</span>
				<div className="mt-1 grid grid-cols-2 gap-2">
					<button
						type="button"
						onClick={() => handleRoleChange('client')}
						className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
							role === 'client'
								? 'border-rose-600 bg-rose-50 text-rose-700'
								: 'border-border text-stone-600 hover:bg-stone-50'
						}`}
					>
						Client
					</button>
					<button
						type="button"
						onClick={() => handleRoleChange('professional')}
						className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
							role === 'professional'
								? 'border-rose-600 bg-rose-50 text-rose-700'
								: 'border-border text-stone-600 hover:bg-stone-50'
						}`}
					>
						Professionnel
					</button>
				</div>
			</div>

			{role === 'professional' ? (
				<div>
					<label className="text-sm text-stone-700" htmlFor="businessName">
						Nom de votre activité
					</label>
					<input
						id="businessName"
						className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
						{...register('businessName')}
					/>
					{errors.businessName && <p className="mt-1 text-xs text-red-600">{errors.businessName.message}</p>}
				</div>
			) : (
				<div>
					<label className="text-sm text-stone-700" htmlFor="fullName">
						Nom complet
					</label>
					<input
						id="fullName"
						className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
						{...register('fullName')}
					/>
					{errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>}
				</div>
			)}
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
			</div>
			{error && <p className="text-sm text-amber-700">{error}</p>}
			<button
				type="submit"
				disabled={submitting}
				className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
			>
				{submitting ? 'Création...' : 'Créer mon compte'}
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
