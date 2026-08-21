import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { resendConfirmationEmail, signIn } from '@/lib/auth';
import { getAccountType } from '@/lib/queries';

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

	async function onSubmit(values: FormValues) {
		setSubmitting(true);
		setError(null);
		setUnconfirmedEmail(null);
		try {
			const { user } = await signIn(values.email, values.password);
			if (!user) throw new Error('Connexion impossible.');

			const accountType = await getAccountType(user.id);
			if (accountType === 'professional') {
				window.location.href = '/dashboard';
			} else if (accountType === 'client') {
				window.location.href = '/espace-client';
			} else {
				window.location.href = '/inscription';
			}
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
		</form>
	);
}
