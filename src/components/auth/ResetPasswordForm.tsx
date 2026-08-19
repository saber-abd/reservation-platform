import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updatePassword } from '@/lib/auth';

const schema = z.object({
	password: z.string().min(6, '6 caractères minimum'),
});

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordForm() {
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState(false);
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
			await updatePassword(values.password);
			setDone(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du mot de passe.');
		} finally {
			setSubmitting(false);
		}
	}

	if (done) {
		return (
			<div>
				<p className="text-sm text-green-700">Votre mot de passe a bien été mis à jour.</p>
				<a href="/connexion" className="mt-4 inline-block text-sm font-medium text-rose-600 hover:underline">
					Retour à la connexion
				</a>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
			<div>
				<label className="text-sm text-stone-700" htmlFor="password">
					Nouveau mot de passe <span className="text-rose-600">*</span>
				</label>
				<input
					id="password"
					type="password"
					className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
					{...register('password')}
				/>
				{errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
			</div>
			{error && <p className="text-sm text-red-600">{error}</p>}
			<button
				type="submit"
				disabled={submitting}
				className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
			>
				{submitting ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
			</button>
		</form>
	);
}
