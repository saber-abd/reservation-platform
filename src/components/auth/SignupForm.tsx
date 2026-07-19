import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signUp } from '@/lib/auth';
import { createProfessional } from '@/lib/queries';

const schema = z.object({
	businessName: z.string().min(2, 'Nom trop court'),
	email: z.string().email('Email invalide'),
	password: z.string().min(6, '6 caractères minimum'),
});

type FormValues = z.infer<typeof schema>;

export default function SignupForm() {
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<FormValues>({ resolver: zodResolver(schema) });

	async function onSubmit(values: FormValues) {
		setSubmitting(true);
		setError(null);
		try {
			const { user, session } = await signUp(values.email, values.password);
			if (!user) throw new Error('Inscription impossible.');

			if (!session) {
				setError(
					"Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse avant de vous connecter.",
				);
				return;
			}

			await createProfessional({ user_id: user.id, business_name: values.businessName, email: values.email });
			window.location.href = '/dashboard';
		} catch (err) {
			setError(err instanceof Error ? err.message : "Erreur lors de l'inscription.");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
			<div>
				<label className="text-sm text-stone-700" htmlFor="businessName">
					Nom de votre activité
				</label>
				<input
					id="businessName"
					className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
					{...register('businessName')}
				/>
				{errors.businessName && <p className="mt-1 text-xs text-red-600">{errors.businessName.message}</p>}
			</div>
			<div>
				<label className="text-sm text-stone-700" htmlFor="email">
					Email
				</label>
				<input
					id="email"
					type="email"
					className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
					{...register('email')}
				/>
				{errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
			</div>
			<div>
				<label className="text-sm text-stone-700" htmlFor="password">
					Mot de passe
				</label>
				<input
					id="password"
					type="password"
					className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
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
		</form>
	);
}
