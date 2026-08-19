import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { resetPasswordForEmail } from '@/lib/auth';

const schema = z.object({
	email: z.string().email('Email invalide'),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordForm() {
	const [error, setError] = useState<string | null>(null);
	const [sent, setSent] = useState(false);
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
			await resetPasswordForEmail(values.email);
			setSent(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Erreur lors de l'envoi de l'email.");
		} finally {
			setSubmitting(false);
		}
	}

	if (sent) {
		return (
			<p className="text-sm text-stone-600">
				Si un compte existe avec cette adresse, un email contenant un lien de réinitialisation vient de vous être envoyé.
			</p>
		);
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
			{error && <p className="text-sm text-red-600">{error}</p>}
			<button
				type="submit"
				disabled={submitting}
				className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
			>
				{submitting ? 'Envoi...' : 'Envoyer le lien de réinitialisation'}
			</button>
		</form>
	);
}
