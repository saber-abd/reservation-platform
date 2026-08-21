import { useState } from 'react';
import type { Testimonial } from '@/config/site';

interface Props {
	testimonials: Testimonial[];
}

export default function TestimonialsCarousel({ testimonials }: Props) {
	const [index, setIndex] = useState(0);

	if (testimonials.length === 0) return null;

	function goTo(next: number) {
		setIndex((next + testimonials.length) % testimonials.length);
	}

	const testimonial = testimonials[index];

	return (
		<div className="relative mx-auto max-w-2xl">
			<div className="rounded-xl border border-border bg-white p-8 text-center shadow-sm">
				<p className="text-sm text-amber-500">{'★'.repeat(testimonial.rating)}</p>
				<p className="mt-3 text-stone-600">« {testimonial.comment} »</p>
				<p className="mt-4 text-sm font-semibold text-stone-900">{testimonial.name}</p>
			</div>

			{testimonials.length > 1 && (
				<>
					<button
						type="button"
						aria-label="Avis précédent"
						onClick={() => goTo(index - 1)}
						className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full border border-border bg-white p-2 text-stone-600 shadow-sm transition-colors hover:border-rose-300 hover:text-rose-600"
					>
						‹
					</button>
					<button
						type="button"
						aria-label="Avis suivant"
						onClick={() => goTo(index + 1)}
						className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full border border-border bg-white p-2 text-stone-600 shadow-sm transition-colors hover:border-rose-300 hover:text-rose-600"
					>
						›
					</button>

					<div className="mt-6 flex justify-center gap-2">
						{testimonials.map((_, i) => (
							<button
								key={i}
								type="button"
								aria-label={`Aller à l'avis ${i + 1}`}
								onClick={() => goTo(i)}
								className={`h-2 w-2 rounded-full transition-colors ${
									i === index ? 'bg-rose-600' : 'bg-stone-300 hover:bg-rose-300'
								}`}
							/>
						))}
					</div>
				</>
			)}
		</div>
	);
}
