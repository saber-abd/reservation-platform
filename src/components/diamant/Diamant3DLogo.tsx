import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, PresentationControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// Un composant qui crée une paire de ciseaux stylisée et luxueuse
function StylizedScissors() {
	const groupRef = useRef<THREE.Group>(null);

	useFrame((state) => {
		if (groupRef.current) {
			groupRef.current.rotation.y = state.clock.elapsedTime * 0.3;
		}
	});

	const goldMaterial = new THREE.MeshPhysicalMaterial({
		color: '#ebbc66', // jasmine-400
		metalness: 0.9,
		roughness: 0.1,
		clearcoat: 1,
		clearcoatRoughness: 0.1,
	});

	const darkSteelMaterial = new THREE.MeshPhysicalMaterial({
		color: '#143438', // deep-teal-900
		metalness: 0.7,
		roughness: 0.2,
		clearcoat: 0.5,
	});

	return (
		<group ref={groupRef} scale={1.5}>
			<Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
				{/* Lame 1 (Haut) */}
				<mesh material={darkSteelMaterial} position={[0, 0.8, 0.05]} rotation={[0, 0, -0.2]}>
					<boxGeometry args={[0.2, 2.5, 0.05]} />
				</mesh>
				
				{/* Anneau 1 (Bas) */}
				<mesh material={goldMaterial} position={[-0.4, -0.8, 0.05]} rotation={[0, 0, -0.2]}>
					<torusGeometry args={[0.3, 0.08, 16, 32]} />
				</mesh>

				{/* Lame 2 (Haut) */}
				<mesh material={goldMaterial} position={[0, 0.8, -0.05]} rotation={[0, 0, 0.2]}>
					<boxGeometry args={[0.2, 2.5, 0.05]} />
				</mesh>

				{/* Anneau 2 (Bas) */}
				<mesh material={darkSteelMaterial} position={[0.4, -0.8, -0.05]} rotation={[0, 0, 0.2]}>
					<torusGeometry args={[0.3, 0.08, 16, 32]} />
				</mesh>

				{/* Pivot central */}
				<mesh material={goldMaterial} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
					<cylinderGeometry args={[0.15, 0.15, 0.2, 32]} />
				</mesh>
			</Float>
		</group>
	);
}

export default function Diamant3DLogo() {
	return (
		<div className="w-full h-full min-h-[400px] relative pointer-events-auto">
			<Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
				<ambientLight intensity={0.5} />
				<spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
				
				<PresentationControls
					global
					rotation={[0, 0.3, 0]}
					polar={[-0.4, 0.2]}
					azimuth={[-1, 0.75]}
					config={{ mass: 2, tension: 400 }}
					snap={{ mass: 4, tension: 400 }}
				>
					<StylizedScissors />
				</PresentationControls>

				<Environment preset="city" />
				<ContactShadows position={[0, -2.5, 0]} opacity={0.4} scale={10} blur={2} far={4} />
			</Canvas>
		</div>
	);
}
