import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { formatBanDate, type BanNotice } from '@/lib/ban';

interface Props {
	notice: BanNotice;
	basePath: string;
}

export default function DiamantBanNotice({ notice, basePath }: Props) {
	return (
		<div role="alert" className="rounded-2xl border-2 border-rose-200 bg-white p-5 text-center animate-in fade-in">
			<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
				<ShieldAlert size={26} />
			</div>
			<p className="text-lg font-black tracking-tight text-stone-900">Votre compte a été suspendu</p>
			<p className="mt-1 text-xs leading-relaxed text-stone-600">
				La direction de l'établissement a bloqué l'accès à votre espace personnel et à la prise de rendez-vous en ligne.
			</p>
			{notice.reason && (
				<div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-left">
					<p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-rose-700">
						<AlertTriangle size={13} />
						Motif de la suspension
					</p>
					<p className="mt-1 text-sm font-bold text-rose-950">« {notice.reason} »</p>
				</div>
			)}
			{(notice.bannedAt || notice.reason || notice.bannedUntil) && (
				<p className="mt-3 text-xs text-stone-500">
					{notice.bannedAt && <>Depuis le {formatBanDate(notice.bannedAt)} · </>}
					{notice.bannedUntil ? `Jusqu'au ${formatBanDate(notice.bannedUntil)}` : 'Sans date de fin'}
				</p>
			)}
			<p className="mt-4 text-xs text-stone-500">
				Pour toute réclamation, <a href={`${basePath}/contact`} className="font-bold underline">contactez le salon</a>.
			</p>
		</div>
	);
}
