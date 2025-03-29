import { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { usePlane } from '@react-three/cannon';
import * as THREE from 'three';

export default function Stadium() {
  const { scene } = useGLTF('/model/stadium/scene.gltf');
  const stadiumRef = useRef<THREE.Group>(null);

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const scaledSize = size.multiplyScalar(2);

    console.log('Размеры стадиона (с учётом scale=[2, 2, 2]):', {
      width: scaledSize.x,
      height: scaledSize.y,
      depth: scaledSize.z,
    });

    const center = new THREE.Vector3();
    box.getCenter(center);
    console.log('Центр стадиона (без учёта position):', center.multiplyScalar(2));
  }, [scene]);

  const Wall = ({ position, rotation, size }: { position: [number, number, number]; rotation: [number, number, number]; size: [number, number] }) => {
    const [wallRef] = usePlane(() => ({
      mass: 0,
      position,
      rotation,
    }));

    return (
      <mesh ref={wallRef}>
        <planeGeometry args={size} />
        <meshBasicMaterial color="gray" wireframe visible={true} />
      </mesh>
    );
  };

  // Точные размеры из консоли
  const width = 97.8;   // x (глубина после поворота)
  const height = 29.75; // y
  const depth = 172.95; // z (ширина после поворота)
  const halfWidth = width / 2;  // 48.9
  const halfDepth = depth / 2;  // 86.475
  const wallHeightCenter = height / 2 - 1.1; // 13.775

  // Центр сцены
  const stadiumCenterX = 23.5;
  const stadiumCenterZ = 45;

  // Новая позиция модели с учётом её центра и поворота
  const modelPositionX = stadiumCenterX + 8 + width / 2; // Смещение по Z локальной модели
  const modelPositionY = -1.1;                  // Оставляем нижнюю точку
  const modelPositionZ = stadiumCenterZ * 3 + 6; // Смещение по X локальной модели

  return (
    <group ref={stadiumRef}>
      <primitive
        object={scene}
        scale={[4.4, 4, 4.8]}
        position={[modelPositionX, modelPositionY, modelPositionZ]} // Новая позиция
        rotation={[0, Math.PI / 2, 0]}
        castShadow
        receiveShadow
      />
      {/* Северная стена */}
      <Wall
        position={[stadiumCenterX, wallHeightCenter, stadiumCenterZ - halfDepth]}
        rotation={[0, 0, 0]}
        size={[width, height]}
      />
      {/* Южная стена */}
      <Wall
        position={[stadiumCenterX, wallHeightCenter, stadiumCenterZ + halfDepth]}
        rotation={[0, Math.PI, 0]}
        size={[width, height]}
      />
      {/* Западная стена */}
      <Wall
        position={[stadiumCenterX - halfWidth, wallHeightCenter, stadiumCenterZ]}
        rotation={[0, Math.PI / 2, 0]}
        size={[depth, height]}
      />
      {/* Восточная стена */}
      <Wall
        position={[stadiumCenterX + halfWidth, wallHeightCenter, stadiumCenterZ]}
        rotation={[0, -Math.PI / 2, 0]}
        size={[depth, height]}
      />
    </group>
  );
}
