import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2, Wrench } from 'lucide-react';
import { useAuthedProfessional } from '@/lib/useAuthedProfessional';
import { isRoleReadOnly } from '@/lib/permissions';
import { createService, deleteService, getAllServices, updateService, uploadServiceImage, type Service } from '@/lib/queries';
import { getServiceImageFallback } from '@/lib/serviceImages';
import ImageCropper from '@/components/standard/ui/StandardImageCropper';
import { Busy, EmptyState, PageHeader, PageSkeleton, Panel, TableSkeleton } from '@/components/standard/ui/StandardKit';
import { CATEGORIES, CATEGORIE_PAR_DEFAUT, libelleCategorie, optionsCategorie } from './categories';

const schema = z.object({
	name: z.string().min(2, 'Nom trop court'),
	category: z.string().trim().min(1, 'Choisissez une catégorie'),
	description: z.string().optional(),
	durationMinutes: z.coerce.number().int().positive('Doit être positif'),
	price: z.coerce.number().nonnegative('Doit être positif ou nul'),
});

type FormValues = z.infer<typeof schema>;

const READ_ONLY = 'Action désactivée : cette démonstration est en lecture seule.';

/**
 * Photo de la prestation. Le repli commun ne connaît que des photos locales de coiffure et,
 * à défaut, une photo distante de salon : hors photo locale, on affiche un pictogramme neutre.
 */
function serviceImage(service: Service): string | null {
	if (service.image_url) return service.image_url;
	const fallback = getServiceImageFallback(service.name);
	return fallback.startsWith('/') ? fallback : null;
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
	// Catégorie enregistrée de la prestation modifiée : gardée dans le menu même hors liste.
	const [categorieInitiale, setCategorieInitiale] = useState<string | null>(null);
	const formRef = useRef<HTMLFormElement>(null);

	const {
		register,
		handleSubmit,
		reset,
		setFocus,
		formState: { errors },
	} = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { category: CATEGORIE_PAR_DEFAUT } });

	useEffect(() => {
		if (!professional) return;
		getAllServices(professional.id)
			.then(setServices)
			.finally(() => setLoadingServices(false));
	}, [professional]);

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

	function scrollToForm() {
		formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		window.setTimeout(() => setFocus('name'), 350);
	}

	function handleEdit(service: Service) {
		setEditingId(service.id);
		setImageFile(null);
		setFormError(null);
		setCategorieInitiale(service.category);
		reset({
			name: service.name,
			category: service.category?.trim() || CATEGORIE_PAR_DEFAUT,
			description: service.description ?? '',
			durationMinutes: service.duration_minutes,
			price: service.price,
		});
		scrollToForm();
	}

	function handleCancelEdit() {
		setEditingId(null);
		setImageFile(null);
		setCategorieInitiale(null);
		reset({ name: '', category: CATEGORIE_PAR_DEFAUT, description: '', durationMinutes: undefined, price: undefined });
	}

	async function onSubmit(values: FormValues) {
		if (isRoleReadOnly()) {
			setFormError(READ_ONLY);
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
				toast.success(`« ${values.name} » a été mise à jour.`);
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
				toast.success(`« ${values.name} » a été ajoutée.`);
			}
			reset({ name: '', category: CATEGORIE_PAR_DEFAUT, description: '', durationMinutes: undefined, price: undefined });
			setCategorieInitiale(null);
			setImageFile(null);
		} catch (err: any) {
			console.error(err);
			setFormError(err?.message || "Erreur lors de l'enregistrement.");
		} finally {
			setUploading(false);
		}
	}

	async function handleToggleActive(service: Service) {
		if (isRoleReadOnly()) {
			toast(READ_ONLY);
			return;
		}
		const updated = await updateService(service.id, { is_active: !service.is_active });
		setServices((prev) => prev.map((s) => (s.id === service.id ? updated : s)));
	}

	async function handleDelete(id: string) {
		if (isRoleReadOnly()) {
			toast(READ_ONLY);
			return;
		}
		await deleteService(id);
		setServices((prev) => prev.filter((s) => s.id !== id));
	}

	if (loading) return <PageSkeleton rows={4} figures={false} />;
	if (error) return <p className="sa-alert">{error}</p>;

	const activeCount = services.filter((s) => s.is_active).length;

	return (
		<div>
			<PageHeader
				title="Mes prestations"
				subtitle={
					loadingServices
						? 'Les interventions proposées à la réservation, avec leur durée et leur prix.'
						: `${services.length} prestation${services.length > 1 ? 's' : ''}, dont ${activeCount} visible${activeCount > 1 ? 's' : ''} à la réservation. Une prestation masquée reste dans l'historique mais ne peut plus être réservée.`
				}
				actions={
					<button type="button" onClick={() => { handleCancelEdit(); scrollToForm(); }} className="sa-btn sa-btn--primary">
						<Plus size={16} aria-hidden="true" />
						Ajouter une prestation
					</button>
				}
			/>

			{loadingServices ? (
				<Busy>
					<TableSkeleton rows={4} />
				</Busy>
			) : services.length === 0 ? (
				<div className="sa-panel">
					<EmptyState kind="list" title="Aucune prestation pour le moment.">
						Ajoutez votre première intervention (diagnostic, réparation…) avec le formulaire ci-dessous.
					</EmptyState>
				</div>
			) : (
				<div className="sa-panel overflow-hidden">
					<table className="sa-table sa-table--stack">
						<thead>
							<tr>
								<th scope="col">Prestation</th>
								<th scope="col">Catégorie</th>
								<th scope="col" className="sa-cell-end">Durée</th>
								<th scope="col" className="sa-cell-end">Prix</th>
								<th scope="col">Statut</th>
								<th scope="col">
									<span className="sr-only">Actions</span>
								</th>
							</tr>
						</thead>
						<tbody>
							{services.map((service) => (
								<tr key={service.id} data-editing={editingId === service.id ? '' : undefined} style={editingId === service.id ? { background: 'var(--color-brand-tint)' } : undefined}>
									<td data-cell="main">
										<span className="flex items-center gap-3">
											{serviceImage(service) ? (
												<img
													src={serviceImage(service) as string}
													alt=""
													width={44}
													height={44}
													loading="lazy"
													decoding="async"
													className="h-11 w-11 shrink-0 rounded-[4px] border border-[var(--sa-line)] object-cover"
												/>
											) : (
												<span className="grid h-11 w-11 shrink-0 place-items-center rounded-[4px] bg-[var(--sa-side)] text-ink-mute" aria-hidden="true">
													<Wrench size={18} strokeWidth={1.6} />
												</span>
											)}
											<span className="min-w-0">
												<span className="sa-cell-strong block">{service.name}</span>
												{service.description && (
													<span className="mt-0.5 block max-w-[34ch] truncate text-xs text-ink-mute max-md:hidden">{service.description}</span>
												)}
												<span className="sa-num mt-0.5 block text-xs text-ink-mute md:hidden">
													{libelleCategorie(service.category)} · {service.duration_minutes} min
												</span>
											</span>
										</span>
									</td>
									<td data-cell="hide">{libelleCategorie(service.category)}</td>
									<td data-cell="hide" className="sa-cell-end sa-num">
										{service.duration_minutes} min
									</td>
									<td data-cell="side" className="sa-cell-end sa-num">
										<span className="font-semibold text-ink">{service.price} €</span>
									</td>
									<td data-cell="left">
										<button
											type="button"
											role="switch"
											aria-checked={service.is_active}
											aria-label={`${service.name} : ${service.is_active ? 'visible à la réservation' : 'masquée'}`}
											onClick={() => handleToggleActive(service)}
											className="inline-flex items-center gap-2 rounded-[4px] py-1 text-sm font-medium text-ink-soft hover:text-ink"
										>
											<span className="sa-switch" data-on={service.is_active ? 'true' : 'false'} aria-hidden="true" />
											{service.is_active ? 'Active' : 'Masquée'}
										</button>
									</td>
									<td data-cell="right" className="sa-cell-end">
										<span className="inline-flex gap-1">
											<button type="button" onClick={() => handleEdit(service)} className="sa-btn sa-btn--quiet sa-btn--sm">
												<Pencil size={14} aria-hidden="true" />
												Modifier
											</button>
											<button
												type="button"
												onClick={() => handleDelete(service.id)}
												className="sa-btn sa-btn--danger sa-btn--sm sa-btn--icon"
												aria-label={`Supprimer ${service.name}`}
												title="Supprimer"
											>
												<Trash2 size={15} aria-hidden="true" />
											</button>
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="mt-8 scroll-mt-24">
				<Panel
					title={editingId ? 'Modifier la prestation' : 'Ajouter une prestation'}
					description={editingId ? 'Les changements s’appliquent aux prochaines réservations.' : 'Nom, durée et prix apparaissent tels quels sur la page de réservation.'}
					bodyClassName="sa-panel-body grid gap-5 sm:grid-cols-2"
				>
					<div>
						<label className="sa-label" htmlFor="name">
							Nom
						</label>
						<input id="name" className="sa-input" placeholder="Remplacement d'écran" {...register('name')} />
						{errors.name && <p className="sa-error">{errors.name.message}</p>}
					</div>
					<div>
						<label className="sa-label" htmlFor="category">
							Catégorie
						</label>
						<select id="category" className="sa-input" {...register('category')}>
							{optionsCategorie(categorieInitiale).map((c) => (
								<option key={c} value={c}>
									{(CATEGORIES as readonly string[]).includes(c) ? c : `${c} (ancienne catégorie)`}
								</option>
							))}
						</select>
						{errors.category && <p className="sa-error">{errors.category.message}</p>}
					</div>
					<div>
						<label className="sa-label" htmlFor="durationMinutes">
							Durée (minutes)
						</label>
						<input id="durationMinutes" type="number" className="sa-input sa-num" {...register('durationMinutes')} />
						{errors.durationMinutes && <p className="sa-error">{errors.durationMinutes.message}</p>}
					</div>
					<div>
						<label className="sa-label" htmlFor="price">
							Prix (€)
						</label>
						<input id="price" type="number" step="0.01" className="sa-input sa-num" {...register('price')} />
						{errors.price && <p className="sa-error">{errors.price.message}</p>}
					</div>
					<div className="sm:col-span-2">
						<label className="sa-label" htmlFor="description">
							Description
						</label>
						<textarea id="description" rows={2} className="sa-input" {...register('description')} />
					</div>
					<div className="sm:col-span-2">
						<label className="sa-label" htmlFor="image">
							Photo (optionnelle)
						</label>
						<input id="image" type="file" accept="image/*" onChange={handleFileChange} className="sa-input" />
						<p className="sa-hint">Recadrée en carré avant l'envoi.</p>
						{imageFile && (
							<div className="mt-3 flex items-center gap-4">
								<img src={URL.createObjectURL(imageFile)} alt="Aperçu de la photo" width={80} height={80} className="h-20 w-20 rounded-[5px] border border-[var(--sa-line)] object-cover" />
								<button type="button" onClick={() => setImageFile(null)} className="sa-btn sa-btn--danger sa-btn--sm">
									Retirer la photo
								</button>
							</div>
						)}
					</div>
					{formError && <p className="sa-alert col-span-full">{formError}</p>}
					<div className="col-span-full flex flex-wrap items-center gap-3 border-t border-[var(--sa-line-soft)] pt-5">
						<button type="submit" disabled={uploading} className="sa-btn sa-btn--primary">
							{uploading ? 'Envoi de la photo...' : editingId ? 'Enregistrer les modifications' : 'Ajouter'}
						</button>
						{editingId && (
							<button type="button" onClick={handleCancelEdit} className="sa-btn sa-btn--quiet">
								Annuler la modification
							</button>
						)}
					</div>
				</Panel>
			</form>

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
