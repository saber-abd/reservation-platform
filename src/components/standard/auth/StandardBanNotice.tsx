import { ShieldAlert } from 'lucide-react';
import { formatBanDate, type BanNotice } from '@/lib/ban';

interface Props {
	notice: BanNotice;
	basePath: string;
}

export default function StandardBanNotice({ notice, basePath }: Props) {
	const hasDetails = !!(notice.reason || notice.bannedAt || notice.bannedUntil);
	return (
		<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
			<p className="flex items-center gap-2 font-semibold text-rose-900">
				<ShieldAlert size={16} className="shrink-0 text-rose-600" />
				Compte suspendu
			</p>
			<p className="mt-1 leading-relaxed">
				Votre compte a été suspendu par l'établissement : la connexion et la prise de rendez-vous en ligne sont bloquées.
			</p>
			{hasDetails && (
				<dl className="mt-3 space-y-1 border-t border-rose-200 pt-3 text-xs">
					{notice.reason && (
						<div><dt className="inline font-semibold">Motif : </dt><dd className="inline">« {notice.reason} »</dd></div>
					)}
					{notice.bannedAt && (
						<div><dt className="inline font-semibold">Depuis le : </dt><dd className="inline">{formatBanDate(notice.bannedAt)}</dd></div>
					)}
					<div>
						<dt className="inline font-semibold">Fin de la suspension : </dt>
						<dd className="inline">{notice.bannedUntil ? formatBanDate(notice.bannedUntil) : 'non définie'}</dd>
					</div>
				</dl>
			)}
			<p className="mt-3 text-xs">
				Pour plus d'informations, <a href={`${basePath}/contact`} className="font-semibold text-rose-700 underline hover:text-rose-900">contactez l'établissement</a>.
			</p>
		</div>
	);
}
