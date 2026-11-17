import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2, ImagePlus } from 'lucide-react';
import { useAuthedProfessional } from '@/lib/useAuthedProfessional';
import { isRoleReadOnly } from '@/lib/permissions';
import { createService, deleteService, getAllServices, updateService, uploadServiceImage, type Service } from '@/lib/queries';
import { imagePourPrestation } from '@/components/premium/prestations';
import ImageCropper from '@/components/premium/ui/PremiumImageCropper';
import { LECTURE_SEULE } from '@/components/premium/ui/PremiumToaster';
import { EmptyState, EUROS, PageHead, PageSkeleton, Rolling } from './kit/Base';
import { ActionMenu, SidePanel } from './kit/Interactive';

const schema = z.object({
	name: z.string().min(2, 'Nom trop court'),
	category: z.enum(['Femmes', 'Hommes', 'Enfants']),
	description: z.string().optional(),
	durationMinutes: z.coerce.number().int().positive('Doit être positif'),
	price: z.coerce.number().nonnegative('Doit être positif ou nul'),
});

type FormValues = z.infer<typeof schema>;

const FORM_ID = 'pe-form-prestation';

/** Sans photo : la photo d'atelier du site public qui correspond le mieux à la prestation. */
function vignette(service: Service) {
	if (service.image_url) return service.image_url;
	const img = imagePourPrestation(service.name);
	return `/images/premium/${img.fichier}-${img.largeurs[0]}.webp`;
}

export default function ServicesPanel() {
	const { loading, professional, error } = useAuthedProfessional();
	const [services, setServices] = useState<Service[]>([]);
	const [loadingServices, setLoadingServices] = useState(true);
	const [formError, setFormError] = useState<string | null>(null);
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [croppingImageSrc, setCroppingImageSrc] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [panelOpen, setPanelOpen] = useState(false);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<FormValues>({ resolver: zodResolver(schema) });

	useEffect(() => {
		if (!professional) return;
		getAllServices(professional.id)
			.then(setServices)
			.finally(() => setLoadingServices(false));
	}, [professional]);

	const resume = useMemo(() => {
		const actives = services.filter((s) => s.is_active);
		const prix = services.map((s) => Number(s.price) || 0);
		const duree = services.length ? Math.round(services.reduce((t, s) => t + s.duration_minutes, 0) / services.length) : 0;
		return { actives: actives.length, min: prix.length ? Math.min(...prix) : 0, max: prix.length ? Math.max(...prix) : 0, duree };
	}, [services]);

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			setCroppingImageSrc(reader.result as string);
		};
		reader.readAsDataURL(file);
		e.target.value = '';
	}

	function handleAdd() {
		setEditingId(null);
		setImageFile(null);
		setFormError(null);
		reset({ name: '', category: 'Femmes', description: '', durationMinutes: undefined, price: undefined });
		setPanelOpen(true);
	}

	function handleEdit(service: Service) {
		setEditingId(service.id);
		setImageFile(null);
		setFormError(null);
		reset({
			name: service.name,
			category: (service.category as 'Femmes' | 'Hommes' | 'Enfants') || 'Femmes',
			description: service.description ?? '',
			durationMinutes: service.duration_minutes,
			price: service.price,
		});
		setPanelOpen(true);
	}

	function handleCancelEdit() {
		setEditingId(null);
		setImageFile(null);
		setPanelOpen(false);
		reset({ name: '', category: 'Femmes', description: '', durationMinutes: undefined, price: undefined });
	}

	async function onSubmit(values: FormValues) {
		if (isRoleReadOnly()) {
			setFormError(LECTURE_SEULE);
			toast.error(LECTURE_SEULE);
			return;
		}
		if (!professional) return;
		setFormError(null);
		try {
			let imageUrl: string | null | undefined = undefined;
			if (imageFile) {
				setUploading(true);
				imageUrl = await uploadServiceImage(professional.id, imageFile);
			}

			if (editingId) {
				const updated = await updateService(editingId, {
					name: values.name,
					category: values.category,
					description: values.description ?? null,
					duration_minutes: values.durationMinutes,
					price: values.price,
					...(imageUrl !== undefined ? { image_url: imageUrl } : {}),
				});
				setServices((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
				setEditingId(null);
				toast.success(`« ${values.name} » mise à jour.`);
			} else {
				const created = await createService({
					professional_id: professional.id,
					name: values.name,
					category: values.category,
					description: values.description ?? null,
					duration_minutes: values.durationMinutes,
					price: values.price,
					image_url: imageUrl ?? null,
				});
				setServices((prev) => [...prev, created]);
				toast.success(`« ${values.name} » ajoutée au catalogue.`);
			}
			reset();
			setImageFile(null);
			setPanelOpen(false);
		} catch (err: any) {
			console.error(err);
			setFormError(err?.message || "Erreur lors de l'enregistrement.");
		} finally {
			setUploading(false);
		}
	}

	async function handleToggleActive(service: Service) {
		if (isRoleReadOnly()) {
			toast.error(LECTURE_SEULE);
			return;
		}
		try {
			const updated = await updateService(service.id, { is_active: !service.is_active });
			setServices((prev) => prev.map((s) => (s.id === service.id ? updated : s)));
			toast.success(updated.is_active ? `« ${service.name} » est visible sur le site.` : `« ${service.name} » est masquée.`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'La mise à jour a échoué.');
		}
	}

	async function handleDelete(id: string) {
		if (isRoleReadOnly()) {
			toast.error(LECTURE_SEULE);
			return;
		}
		const nom = services.find((s) => s.id === id)?.name;
		try {
			await deleteService(id);
			setServices((prev) => prev.filter((s) => s.id !== id));
			toast.success(nom ? `« ${nom} » supprimée.` : 'Prestation supprimée.');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'La suppression a échoué.');
		}
	}

	if (loading) return <PageSkeleton cards={2} />;
	if (error) return <p className="pe-erreur">{error}</p>;

	return (
		<div className="pe-entree">
			<PageHead
				title="Mes prestations"
				sub={
					<>
						Le catalogue proposé à la réservation : nom, durée bloquée dans l'agenda et prix affiché sur le site.
					</>
				}
				actions={
					<button type="button" className="pe-btn" onClick={handleAdd}>
						<Plus aria-hidden="true" />
						Ajouter une prestation
					</button>
				}
			/>

			{/* Résumé du catalogue */}
			<section className="pe-card grid grid-cols-2 md:grid-cols-4" aria-label="Résumé du catalogue">
				{[
					{ t: 'Au catalogue', v: <Rolling value={services.length} />, u: 'prestations' },
					{ t: 'Visibles sur le site', v: <Rolling value={resume.actives} />, u: `sur ${services.length}` },
					{ t: 'Prix', v: services.length ? <><Rolling value={resume.min} format={EUROS} /> – <Rolling value={resume.max} format={EUROS} /></> : '—', u: '' },
					{ t: 'Durée moyenne', v: <Rolling value={resume.duree} />, u: 'min' },
				].map((k, i) => (
					<div key={k.t} className={`grid gap-2 p-4 md:p-5 ${i % 2 === 1 ? 'border-l border-pe-filet' : ''} ${i >= 2 ? 'border-t border-pe-filet md:border-t-0 md:border-l' : ''}`}>
						<p className="pe-tech">{k.t}</p>
						<p className="pe-chiffre !text-[clamp(1.4rem,2.2vw,2rem)]">
							{k.v}
							{k.u && <small>{k.u}</small>}
						</p>
					</div>
				))}
			</section>

			{/* Liste des prestations */}
			<section className="pe-card mt-4" aria-label="Liste des prestations">
				<div className="pe-card__tete">
					<h2 className="pe-h2">Catalogue</h2>
					<span className="pe-tech hidden md:block">L’interrupteur masque une prestation sans la supprimer</span>
				</div>
				{loadingServices ? (
					<div className="grid gap-4 p-5" aria-busy="true">
						<span className="sr-only" role="status">Chargement…</span>
						{[0, 1, 2].map((i) => (
							<span key={i} className="pe-skel" style={{ height: 56 }} />
						))}
					</div>
				) : services.length === 0 ? (
					<EmptyState
						kind="pont"
						title="Aucune prestation pour le moment."
						text="Ajoutez votre première prestation : elle apparaîtra dans le formulaire de réservation du site."
						action={
							<button type="button" className="pe-btn pe-btn--sm" onClick={handleAdd}>
								<Plus aria-hidden="true" />
								Ajouter une prestation
							</button>
						}
					/>
				) : (
					<ul className="pe-rows">
						{services.map((service, i) => (
							<li
								key={service.id}
								className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-4 transition-colors hover:bg-white md:grid-cols-[28px_64px_minmax(0,1fr)_90px_110px_150px_auto] md:px-[22px]"
							>
								<span className="pe-tech hidden md:block">{String(i + 1).padStart(2, '0')}</span>
								<img
									src={vignette(service)}
									alt={service.name}
									width={64}
									height={64}
									loading="lazy"
									decoding="async"
									className={`aspect-square w-full rounded-[2px] object-cover ${service.is_active ? '' : 'opacity-50 grayscale'}`}
								/>
								<div className="min-w-0">
									<p className={`pe-h3 break-words ${service.is_active ? '' : 'text-pe-acier'}`}>{service.name}</p>
									<p className="mt-1 truncate text-sm text-pe-acier">
										{service.category || 'Femmes'}
										{service.description ? ` · ${service.description}` : ''}
									</p>
								</div>
								<div className="col-start-3 row-start-1 md:hidden">
									<ServiceMenu service={service} onEdit={handleEdit} onDelete={handleDelete} />
								</div>
								<p className="col-span-2 col-start-2 flex items-baseline gap-4 md:col-span-1 md:col-start-auto md:block">
									<span className="pe-tech md:hidden">Durée</span>
									<span className="font-semibold tabular-nums">{service.duration_minutes} min</span>
								</p>
								<p className="hidden text-right text-[1.35rem] font-extrabold tabular-nums [font-stretch:112%] md:block">{service.price} €</p>
								<div className="col-span-2 col-start-2 flex items-center justify-between gap-4 md:col-span-1 md:col-start-auto md:justify-start">
									<span className="text-lg font-extrabold tabular-nums [font-stretch:112%] md:hidden">{service.price} €</span>
									<button
										type="button"
										role="switch"
										aria-checked={service.is_active}
										aria-label={`${service.name} : ${service.is_active ? 'visible sur le site' : 'masquée'}`}
										onClick={() => handleToggleActive(service)}
										className="pe-switch"
									>
										<span className="pe-switch__piste" aria-hidden="true" />
										{service.is_active ? 'Active' : 'Masquée'}
									</button>
								</div>
								<div className="hidden md:block">
									<ServiceMenu service={service} onEdit={handleEdit} onDelete={handleDelete} />
								</div>
							</li>
						))}
					</ul>
				)}
			</section>

			<SidePanel
				open={panelOpen}
				onClose={handleCancelEdit}
				title={editingId ? 'Modifier la prestation' : 'Ajouter une prestation'}
				footer={
					<>
						<button type="submit" form={FORM_ID} disabled={uploading} className="pe-btn">
							{uploading ? 'Envoi de la photo…' : editingId ? 'Enregistrer les modifications' : 'Ajouter'}
						</button>
						<button type="button" onClick={handleCancelEdit} className="pe-btn pe-btn--ligne">
							{editingId ? 'Annuler la modification' : 'Annuler'}
						</button>
					</>
				}
			>
				<form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="grid gap-5 sm:grid-cols-2">
					<div className="sm:col-span-2">
						<label className="pe-label" htmlFor="name">
							Nom
						</label>
						<input id="name" className="pe-input" {...register('name')} />
						{errors.name && <p className="pe-erreur">{errors.name.message}</p>}
					</div>
					<div>
						<label className="pe-label" htmlFor="category">
							Catégorie
						</label>
						<select id="category" className="pe-input" {...register('category')}>
							<option value="Femmes">Femmes</option>
							<option value="Hommes">Hommes</option>
							<option value="Enfants">Enfants</option>
						</select>
						{errors.category && <p className="pe-erreur">{errors.category.message}</p>}
					</div>
					<div>
						<label className="pe-label" htmlFor="durationMinutes">
							Durée (minutes)
						</label>
						<input id="durationMinutes" type="number" inputMode="numeric" className="pe-input tabular-nums" {...register('durationMinutes')} />
						{errors.durationMinutes && <p className="pe-erreur">{errors.durationMinutes.message}</p>}
					</div>
					<div>
						<label className="pe-label" htmlFor="price">
							Prix (€)
						</label>
						<input id="price" type="number" step="0.01" inputMode="decimal" className="pe-input tabular-nums" {...register('price')} />
						{errors.price && <p className="pe-erreur">{errors.price.message}</p>}
					</div>
					<div className="sm:col-span-2">
						<label className="pe-label" htmlFor="description">
							Description
						</label>
						<textarea id="description" rows={3} className="pe-input" {...register('description')} />
					</div>
					<div className="sm:col-span-2">
						<span className="pe-label">Photo (optionnelle)</span>
						<label
							htmlFor="image"
							className="flex cursor-pointer items-center gap-3 rounded-[2px] border border-dashed border-pe-filet-fort bg-white px-4 py-4 text-sm font-semibold transition-colors hover:border-pe-encre focus-within:border-pe-encre"
						>
							<ImagePlus size={20} className="text-pe-acier" aria-hidden="true" />
							Choisir une image, recadrée ensuite au format carré
							<input id="image" type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
						</label>
						{imageFile && (
							<div className="mt-3 flex items-center gap-4">
								<img src={URL.createObjectURL(imageFile)} alt="Aperçu de la photo" className="h-20 w-20 rounded-[2px] object-cover" />
								<button type="button" onClick={() => setImageFile(null)} className="pe-btn pe-btn--danger pe-btn--sm">
									Retirer la photo
								</button>
							</div>
						)}
					</div>
					{formError && <p className="pe-erreur sm:col-span-2">{formError}</p>}
				</form>
			</SidePanel>

			{croppingImageSrc && (
				<ImageCropper
					imageSrc={croppingImageSrc}
					onCancel={() => setCroppingImageSrc(null)}
					onCropComplete={(blob) => {
						const croppedFile = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
						setImageFile(croppedFile);
						setCroppingImageSrc(null);
					}}
				/>
			)}
		</div>
	);
}

function ServiceMenu({ service, onEdit, onDelete }: { service: Service; onEdit: (s: Service) => void; onDelete: (id: string) => void }) {
	return (
		<ActionMenu
			label={`Actions pour ${service.name}`}
			actions={[
				{ label: 'Modifier', icon: <Pencil />, onSelect: () => onEdit(service) },
				{ label: 'Supprimer', icon: <Trash2 />, onSelect: () => onDelete(service.id), danger: true },
			]}
		/>
	);
}
