import React, {
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from 'react';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  PerspectiveCamera,
  useTexture,
  useGLTF,
} from '@react-three/drei';
import { Physics, useSphere, usePlane, useTrimesh } from '@react-three/cannon'; // Заменяем useTrimesh на useBox
import * as THREE from 'three';

// Константы остаются теми же
const FIELD_WIDTH = 40;
const FIELD_LENGTH = 30;
const PENALTY_SPOT_Z = -5;
const BALL_RADIUS = 0.11;

function SoccerField() {
  const grassTexture = useTexture('/textures/grass.jpg');
  grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
  grassTexture.repeat.set(20, 20);

  usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
  }));

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[FIELD_WIDTH, FIELD_LENGTH]} />
      <meshStandardMaterial
        map={grassTexture}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  );
}

// Компонент для ворот с физикой (временная замена на useBox)
function SoccerGoalModel() {
  const { scene } = useGLTF('/model/goal/football_goal.glb');
  const goalRef = useRef<THREE.Group>(null);

  // Извлекаем геометрию из модели
  const vertices: number[] = [];
  const indices: number[] = [];

  scene.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry && vertices.length === 0) { // Только первый меш
      const geometry = child.geometry;
      const positionAttribute = geometry.attributes.position;
      const indexAttribute = geometry.index;

      vertices.push(...Array.from(positionAttribute.array));
      if (indexAttribute) {
        indices.push(...Array.from(indexAttribute.array));
      } else {
        indices.push(...Array.from({ length: positionAttribute.count }, (_, i) => i));
      }
    }
  });

  console.log('Total vertices:', vertices.length);
  console.log('Total indices:', indices.length);

  // Добавляем физику с useTrimesh
  try {
    useTrimesh(
      () => ({
        mass: 0,
        position: [0, 0, FIELD_LENGTH / 2],
        rotation: [0, Math.PI, 0],
        args: [vertices, indices],
      }),
      goalRef
    );
  } catch (error) {
    console.error('Error in useTrimesh:', error);
  }

  return (
    <primitive
      ref={goalRef}
      object={scene}
      position={[0, 0, FIELD_LENGTH / 2]}
      rotation={[0, Math.PI, 0]}
      scale={[1, 1, 1]}
      castShadow
      receiveShadow
    />
  );
}

interface SoccerBallHandle {
  api: any;
  power: number;
  kick: (direction: [number, number], power: number) => void;
  resetPower: () => void;
}

const SoccerBall = forwardRef<
  SoccerBallHandle,
  { resetPosition: [number, number, number] }
>((props, ref) => {
  const ballTexture = useTexture('/textures/soccer-ball.png');
  ballTexture.wrapS = ballTexture.wrapT = THREE.RepeatWrapping;
  ballTexture.repeat.set(1, 1);
  const [sphereRef, api] = useSphere(() => ({
    mass: 0.43,
    position: props.resetPosition,
    args: [BALL_RADIUS],
  }));

  const [power, setPower] = useState(0);

  const kick = (direction: [number, number], kickPower: number) => {
    const [dirX, dirY] = direction;
    api.velocity.set(0, 0, 0);
    api.angularVelocity.set(0, 0, 0);
    api.applyImpulse([dirX, dirY, kickPower * 10], [0, 0, 0]);
    setPower(0);
  };

  const resetPower = () => {
    setPower(0);
  };

  useImperativeHandle(ref, () => ({
    api,
    power,
    kick,
    resetPower,
  }));

  return (
    <mesh ref={sphereRef} castShadow>
      <sphereGeometry args={[BALL_RADIUS, 32, 32]} />
      <meshStandardMaterial map={ballTexture} roughness={0.7} metalness={0.2} />
    </mesh>
  );
});

function KickControl({
  onKick,
}: {
  onKick: (direction: [number, number], power: number) => void;
}) {
  const [isCharging, setIsCharging] = useState(false);
  const [power, setPower] = useState(0);
  const [direction, setDirection] = useState<[number, number]>([0, 0]);
  const startPos = useRef({ x: 0, y: 0 });
  const powerDirection = useRef(1);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = () => {
      if (isCharging) {
        setPower((prev) => {
          const speed = 0.03;
          let newPower = prev + speed * powerDirection.current;

          if (newPower >= 5) {
            newPower = 5;
            powerDirection.current = -1;
          } else if (newPower <= 0) {
            newPower = 0;
            powerDirection.current = 1;
          }

          return newPower;
        });
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    if (isCharging) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isCharging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsCharging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    powerDirection.current = 1;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isCharging) {
      const dx = (e.clientX - startPos.current.x) * 0.05;
      const dy = (e.clientY - startPos.current.y) * 0.05;
      setDirection([dx, dy]);
    }
  };

  const handleMouseUp = () => {
    if (isCharging) {
      setIsCharging(false);
      onKick(direction, power);
      setPower(0);
    }
  };

  return (
    <div
      className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-64 h-64 bg-gray-800 bg-opacity-50 border-2 border-white rounded"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="relative w-full h-full">
        <div className="absolute w-full h-4 bg-gray-200 top-0">
          <div
            className="h-full bg-green-500 transition-all duration-0"
            style={{ width: `${(power / 5) * 100}%` }}
          />
        </div>
        {isCharging && (
          <div
            className="absolute w-4 h-4 bg-red-500 rounded-full"
            style={{
              left: `calc(50% + ${direction[0] * 20}px)`,
              top: `calc(50% + ${direction[1] * 20}px)`,
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function SoccerScene() {
  const initialBallPosition: [number, number, number] = [
    0,
    BALL_RADIUS,
    PENALTY_SPOT_Z,
  ];
  const ballRef = useRef<SoccerBallHandle>(null);

  const resetBall = () => {
    if (ballRef.current?.api) {
      ballRef.current.api.position.set(...initialBallPosition);
      ballRef.current.api.velocity.set(0, 0, 0);
      ballRef.current.api.angularVelocity.set(0, 0, 0);
      ballRef.current.resetPower();
    }
  };

  const handleKick = (direction: [number, number], power: number) => {
    ballRef.current?.kick(direction, power);
  };

  return (
    <div
      className="relative w-full h-screen"
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        onClick={resetBall}
        className="absolute top-4 right-4 z-10 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Reset Ball
      </button>

      <Canvas
        shadows
        gl={{ antialias: true }}
        camera={{ position: [0, 5, -10], fov: 50 }}
      >
        <PerspectiveCamera
          makeDefault
          position={[0, 1, -10]}
          fov={50}
          near={0.1}
          far={100}
        />
        <OrbitControls
          target={[0, 0, FIELD_LENGTH / 2]}
          maxPolarAngle={Math.PI / 2}
          minDistance={2}
          maxDistance={30}
        />

        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={1.5}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-near={1}
          shadow-camera-far={50}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />

        <Physics gravity={[0, -9.81, 0]}>
          <SoccerField />
          <SoccerGoalModel />
          <SoccerBall resetPosition={initialBallPosition} ref={ballRef} />
        </Physics>
      </Canvas>

      <KickControl onKick={handleKick} />
    </div>
  );
}
