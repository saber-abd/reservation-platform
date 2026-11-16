import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updatePassword } from '@/lib/auth';

const schema = z.object({
	password: z.string().min(6, '6 caractères minimum'),
});

type FormValues = z.infer<typeof schema>;

interface ResetPasswordFormProps {
	basePath?: string;
}

export default function ResetPasswordForm({ basePath: propBasePath }: ResetPasswordFormProps = {}) {
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState(false);
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
				<a href={`${getEffectiveBasePath()}/connexion`} className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
					Retour à la connexion
				</a>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
			<div>
				<label className="text-sm text-muted-foreground" htmlFor="password">
					Nouveau mot de passe <span className="text-primary">*</span>
				</label>
				<input
					id="password"
					type="password"
					className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
					{...register('password')}
				/>
				{errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
			</div>
			{error && <p className="text-sm text-red-600">{error}</p>}
			<button
				type="submit"
				disabled={submitting}
				className="min-h-[48px] rounded-full bg-primary px-5 py-2 text-[0.9875rem] font-semibold text-primary-foreground transition-colors hover:bg-[#8c3d1d] disabled:opacity-50"
			>
				{submitting ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
			</button>
		</form>
	);
}
