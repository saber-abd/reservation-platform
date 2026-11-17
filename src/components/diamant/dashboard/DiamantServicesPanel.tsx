import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, useReducedMotion } from 'motion/react';
import { Clock, ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useAuthedProfessional } from '@/lib/useAuthedProfessional';
import { isRoleReadOnly } from '@/lib/permissions';
import { createService, deleteService, getAllServices, updateService, uploadServiceImage, type Service } from '@/lib/queries';
import { getServiceImageFallback } from '@/lib/serviceImages';
import ImageCropper from '@/components/diamant/ui/DiamantImageCropper';
import { EASE, EnChargement, EtatVide, MenuActions, Squelette, cx } from './kit/primitives';
import { avertirLectureSeule, confirmer, signalerErreur } from './kit/notifier';

const schema = z.object({
	name: z.string().min(2, 'Nom trop court'),
	category: z.enum(['Femmes', 'Hommes', 'Enfants']),
	description: z.string().optional(),
	durationMinutes: z.coerce.number().int().positive('Doit être positif'),
	price: z.coerce.number().nonnegative('Doit être positif ou nul'),
});

type FormValues = z.infer<typeof schema>;

export default function ServicesPanel() {
	const { loading, professional, error } = useAuthedProfessional();
	const [services, setServices] = useState<Service[]>([]);
	const [formError, setFormError] = useState<string | null>(null);
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [croppingImageSrc, setCroppingImageSrc] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const formRef = useRef<HTMLFormElement>(null);
	const reduit = useReducedMotion();

	const {
		register,
		handleSubmit,
		reset,
		setFocus,
		formState: { errors },
	} = useForm<FormValues>({ resolver: zodResolver(schema) });

	useEffect(() => {
		if (!professional) return;
		getAllServices(professional.id).then(setServices);
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

	// Amène le formulaire à l'écran (utile sur mobile, où il passe sous la liste) et place le curseur.
	function montrerFormulaire() {
		formRef.current?.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth', block: 'nearest' });
		window.setTimeout(() => setFocus('name'), reduit ? 0 : 250);
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
		montrerFormulaire();
	}

	function handleCancelEdit() {
		setEditingId(null);
		setImageFile(null);
		reset({ name: '', category: 'Femmes', description: '', durationMinutes: undefined, price: undefined });
	}

	function nouvellePrestation() {
		handleCancelEdit();
		setFormError(null);
		montrerFormulaire();
	}

	async function onSubmit(values: FormValues) {
		if (isRoleReadOnly()) {
			setFormError("Action désactivée en mode Démo : Ce rôle est réservé à la présentation commerciale en lecture seule.");
			avertirLectureSeule("Action désactivée en mode Démo : Ce rôle est réservé à la présentation commerciale en lecture seule.");
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
				confirmer(`« ${values.name} » mise à jour.`);
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
				confirmer(`« ${values.name} » ajoutée à la carte.`);
			}
			reset();
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
			avertirLectureSeule("Action désactivée en mode Démo : Ce rôle est réservé à la présentation commerciale en lecture seule.");
			return;
		}
		try {
			const updated = await updateService(service.id, { is_active: !service.is_active });
			setServices((prev) => prev.map((s) => (s.id === service.id ? updated : s)));
			confirmer(updated.is_active ? `« ${service.name} » est de nouveau visible.` : `« ${service.name} » est masquée du site.`);
		} catch (err) {
			signalerErreur('La prestation n’a pas pu être mise à jour.');
		}
	}

	async function handleDelete(id: string) {
		if (isRoleReadOnly()) {
			avertirLectureSeule("Action désactivée en mode Démo : Ce rôle est réservé à la présentation commerciale en lecture seule.");
			return;
		}
		try {
			const nom = services.find((s) => s.id === id)?.name;
			await deleteService(id);
			setServices((prev) => prev.filter((s) => s.id !== id));
			confirmer(nom ? `« ${nom} » supprimée.` : 'Prestation supprimée.');
		} catch (err) {
			signalerErreur('La prestation n’a pas pu être supprimée.');
		}
	}

	if (loading) {
		return (
			<EnChargement className="grid gap-6 lg:grid-cols-12">
				<div className="dx-carte divide-y divide-dx-filet overflow-hidden lg:col-span-8">
					{[0, 1, 2, 3].map((i) => (
						<div key={i} className="flex items-center gap-4 p-4">
							<Squelette className="h-14 w-14 !rounded-xl" />
							<div className="flex-1 space-y-2">
								<Squelette className="h-4 w-1/3" />
								<Squelette className="h-3 w-1/2" />
							</div>
							<Squelette className="h-6 w-16" />
						</div>
					))}
				</div>
				<Squelette className="h-[520px] !rounded-[14px] lg:col-span-4" />
			</EnChargement>
		);
	}
	if (error) return <p className="dx-bandeau" data-ton="alerte">{error}</p>;

	const actives = services.filter((s) => s.is_active).length;

	return (
		<div className="grid items-start gap-6 lg:grid-cols-12">
			{/* Carte des prestations */}
			<section className="lg:col-span-8">
				<div className="mb-4 flex flex-wrap items-end justify-between gap-3">
					<div>
						<h2 className="dx-h2">Mes prestations</h2>
						<p className="dx-meta mt-1">
							<span className="dx-tabulaire font-semibold text-dx-encre">{services.length}</span> prestation{services.length > 1 ? 's' : ''} · {actives} visible{actives > 1 ? 's' : ''} sur le site
						</p>
					</div>
					<button type="button" onClick={nouvellePrestation} className="dx-btn">
						<Plus size={16} />
						Nouvelle prestation
					</button>
				</div>

				<div className="dx-carte overflow-hidden">
					{services.length === 0 ? (
						<EtatVide
							dessin="ciseaux"
							titre="Aucune prestation pour le moment."
							texte="Ajoutez votre première prestation : elle apparaîtra sur la carte du site et dans la réservation."
							action={<button type="button" onClick={nouvellePrestation} className="dx-btn dx-btn--sm"><Plus size={14} /> Ajouter</button>}
						/>
					) : (
						<ul className="divide-y divide-dx-filet">
							{services.map((service, i) => (
								<motion.li
									key={service.id}
									initial={reduit ? false : { opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.45, ease: EASE, delay: Math.min(i * 0.05, 0.4) }}
									className={cx(
										'grid grid-cols-[3.5rem_1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-4 transition-colors sm:grid-cols-[4rem_1fr_auto_auto_auto] sm:px-5',
										editingId === service.id && 'bg-dx-terre-pale/60',
										!service.is_active && 'opacity-70'
									)}
								>
									<img
										src={service.image_url || getServiceImageFallback(service.name)}
										alt={service.name}
										width={64}
										height={64}
										loading="lazy"
										decoding="async"
										className="h-14 w-14 rounded-xl object-cover sm:h-16 sm:w-16"
									/>
									<div className="min-w-0">
										<p className="dx-h3 truncate">{service.name}</p>
										<p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-dx-gris">
											<span>{service.category || 'Femmes'}</span>
											<span aria-hidden="true">·</span>
											<span className="inline-flex items-center gap-1 dx-tabulaire"><Clock size={13} /> {service.duration_minutes} min</span>
										</p>
									</div>
									<p className="dx-chiffre text-right text-[1.75rem] text-dx-encre sm:order-none">
										{service.price}<span className="ml-0.5 text-lg">€</span>
									</p>
									<div className="col-span-2 col-start-2 flex items-center gap-2 sm:col-span-1 sm:col-start-auto">
										<button
											type="button"
											role="switch"
											aria-checked={service.is_active}
											onClick={() => handleToggleActive(service)}
											className="group inline-flex items-center gap-2 rounded-full py-1 pr-1 text-xs font-semibold"
											title={service.is_active ? 'Masquer du site' : 'Afficher sur le site'}
										>
											<span aria-hidden="true" className={cx('relative inline-block h-5 w-9 flex-none rounded-full transition-colors', service.is_active ? 'bg-dx-ok' : 'bg-dx-filet-fort')}>
												<span className={cx('absolute left-0 top-0.5 block h-4 w-4 rounded-full bg-white shadow transition-transform', service.is_active ? 'translate-x-[18px]' : 'translate-x-0.5')} />
											</span>
											<span className={cx('w-14 text-left', service.is_active ? 'text-dx-ok' : 'text-dx-gris')}>
												{service.is_active ? 'Active' : 'Masquée'}
											</span>
										</button>
									</div>
									<div className="row-start-1 col-start-3 justify-self-end sm:row-start-auto sm:col-start-auto">
										<MenuActions label={`Actions pour ${service.name}`}>
											<button type="button" role="menuitem" onClick={() => handleEdit(service)}>
												<Pencil size={15} /> Modifier
											</button>
											<button type="button" role="menuitem" data-danger="true" onClick={() => handleDelete(service.id)}>
												<Trash2 size={15} /> Supprimer
											</button>
										</MenuActions>
									</div>
								</motion.li>
							))}
						</ul>
					)}
				</div>
			</section>

			{/* Formulaire : ajout ou modification */}
			<form
				ref={formRef}
				onSubmit={handleSubmit(onSubmit)}
				className={cx('dx-carte scroll-mt-24 p-5 sm:p-6 lg:sticky lg:top-24 lg:col-span-4', editingId && 'ring-2 ring-dx-terre/40')}
			>
				<div className="mb-5 flex items-start justify-between gap-3">
					<div>
						<p className="text-sm text-dx-gris">{editingId ? 'Modification' : 'Nouvelle entrée'}</p>
						<h2 className="dx-h2">{editingId ? 'Modifier la prestation' : 'Ajouter une prestation'}</h2>
					</div>
					{editingId && (
						<button type="button" onClick={handleCancelEdit} className="dx-icone-btn" aria-label="Annuler la modification">
							<X size={17} />
						</button>
					)}
				</div>

				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
					<div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
						<label className="dx-champ-label" htmlFor="name">Nom</label>
						<input id="name" className="dx-champ" placeholder="Ex : Coupe et brushing" {...register('name')} />
						{errors.name && <p className="dx-champ-erreur">{errors.name.message}</p>}
					</div>
					<div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
						<label className="dx-champ-label" htmlFor="category">Catégorie</label>
						<select id="category" className="dx-champ" {...register('category')}>
							<option value="Femmes">Femmes</option>
							<option value="Hommes">Hommes</option>
							<option value="Enfants">Enfants</option>
						</select>
						{errors.category && <p className="dx-champ-erreur">{errors.category.message}</p>}
					</div>
					<div>
						<label className="dx-champ-label" htmlFor="durationMinutes">Durée (minutes)</label>
						<input id="durationMinutes" type="number" inputMode="numeric" className="dx-champ dx-tabulaire" {...register('durationMinutes')} />
						{errors.durationMinutes && <p className="dx-champ-erreur">{errors.durationMinutes.message}</p>}
					</div>
					<div>
						<label className="dx-champ-label" htmlFor="price">Prix (€)</label>
						<input id="price" type="number" step="0.01" inputMode="decimal" className="dx-champ dx-tabulaire" {...register('price')} />
						{errors.price && <p className="dx-champ-erreur">{errors.price.message}</p>}
					</div>
					<div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
						<label className="dx-champ-label" htmlFor="description">Description</label>
						<textarea id="description" rows={3} className="dx-champ" placeholder="Ce qui est compris, pour qui, combien de temps." {...register('description')} />
					</div>
					<div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
						<span className="dx-champ-label">Photo (optionnelle)</span>
						{imageFile ? (
							<div className="flex items-center gap-4 rounded-xl border border-dx-filet bg-dx-ivoire p-3">
								<img src={URL.createObjectURL(imageFile)} alt="Aperçu de la photo" className="h-16 w-16 rounded-lg object-cover" />
								<button type="button" onClick={() => setImageFile(null)} className="dx-btn dx-btn--sm dx-btn--fantome !text-dx-alerte">
									Retirer la photo
								</button>
							</div>
						) : (
							<label
								htmlFor="image"
								className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-dx-filet-fort bg-dx-ivoire px-4 py-4 text-sm text-dx-gris transition-colors hover:border-dx-terre hover:text-dx-encre focus-within:border-dx-terre"
							>
								<ImagePlus size={20} className="text-dx-terre" />
								<span>Choisir une photo, recadrée au carré avant l'envoi</span>
								<input id="image" type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
							</label>
						)}
					</div>
				</div>

				{formError && <p className="dx-bandeau mt-4 !text-sm" data-ton="alerte">{formError}</p>}

				<div className="mt-6 flex flex-wrap items-center gap-3">
					<button type="submit" disabled={uploading} className="dx-btn">
						{uploading ? 'Envoi de la photo...' : editingId ? 'Enregistrer les modifications' : 'Ajouter'}
					</button>
					{editingId && (
						<button type="button" onClick={handleCancelEdit} className="dx-btn dx-btn--fantome">
							Annuler la modification
						</button>
					)}
				</div>
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
