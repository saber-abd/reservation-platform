import { ShieldAlert } from 'lucide-react';
import { formatBanDate, type BanNotice } from '@/lib/ban';

interface Props {
	notice: BanNotice;
	basePath: string;
}

export default function PremiumBanNotice({ notice, basePath }: Props) {
	const hasDetails = !!(notice.reason || notice.bannedAt || notice.bannedUntil);
	return (
		<div role="alert" className="overflow-hidden rounded-xl border border-primary/40 bg-stone-950 text-white shadow-[0_0_15px_rgba(255,50,50,0.25)]">
			<div className="flex items-center gap-2 bg-primary px-4 py-2 text-xs font-black uppercase tracking-widest">
				<ShieldAlert size={14} className="shrink-0" />
				Compte suspendu
			</div>
			<div className="p-4 text-sm">
				<p className="leading-relaxed text-stone-300">
					Votre compte a été suspendu par l'établissement : la connexion et les réservations en ligne sont bloquées.
				</p>
				{hasDetails && (
					<dl className="mt-3 space-y-2 text-xs">
						{notice.reason && (
							<div>
								<dt className="font-bold uppercase tracking-widest text-primary">Motif</dt>
								<dd className="mt-0.5 text-white">« {notice.reason} »</dd>
							</div>
						)}
						<div className="flex gap-6">
							{notice.bannedAt && (
								<div>
									<dt className="font-bold uppercase tracking-widest text-stone-400">Depuis le</dt>
									<dd className="mt-0.5">{formatBanDate(notice.bannedAt)}</dd>
								</div>
							)}
							<div>
								<dt className="font-bold uppercase tracking-widest text-stone-400">Fin</dt>
								<dd className="mt-0.5">{notice.bannedUntil ? formatBanDate(notice.bannedUntil) : 'Non définie'}</dd>
							</div>
						</div>
					</dl>
				)}
				<a
					href={`${basePath}/contact`}
					className="mt-4 inline-block text-xs font-bold uppercase tracking-widest text-primary hover:underline"
				>
					Contacter l'établissement →
				</a>
			</div>
		</div>
	);
}
