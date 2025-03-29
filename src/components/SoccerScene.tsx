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
} from '@react-three/drei';
import { Physics, useSphere, usePlane } from '@react-three/cannon';
// import * as THREE from 'three';
import Stadium from './Stadium';

const BALL_RADIUS = 0.5;

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
  const [sphereRef, api] = useSphere(() => ({
    mass: 5,
    position: props.resetPosition,
    args: [BALL_RADIUS],
    velocity: [0, 0, 0],
    linearDamping: 0.2,
    angularDamping: 0.5
  }));

  const [power, setPower] = useState(0);

  const kick = (direction: [number, number], kickPower: number) => {
    const [dirX, dirY] = direction;
    api.velocity.set(0, 0, 0);
    api.angularVelocity.set(0, 0, 0);
    api.applyImpulse([dirX, dirY, kickPower * 10000], [0, 0, 0]);
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
  const initialBallPosition: [number, number, number] = [23.5, 10, 45];
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

  const Ground = () => {
    const [planeRef] = usePlane(() => ({
      mass: 0,
      position: [23.5, 1.13, 45],
      rotation: [-Math.PI / 2, 0, 0],
      material: { restitution: 0.8 },
    }));

    return (
      <mesh ref={planeRef} receiveShadow>
        <planeGeometry args={[98, 173]} /> {/* Точные размеры: ширина 98, глубина 173 */}
        <meshStandardMaterial color="red"  wireframe />
      </mesh>
    );
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
        camera={{ position: [23.5, 20, 25], fov: 50 }}
      >
        <PerspectiveCamera
          makeDefault
          position={[23.5, 20, 25]}
          fov={50}
          near={0.1}
          far={1000}
        />
        <OrbitControls
          target={[23.5, 0, 45]}
          maxPolarAngle={Math.PI / 2}
          minDistance={5}
          maxDistance={200}
        />

        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={1.5}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-near={1}
          shadow-camera-far={100}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
        />

        <Physics gravity={[0, -9.81, 0]}>
          <Ground />
          <Stadium />
          <SoccerBall resetPosition={initialBallPosition} ref={ballRef} />
        </Physics>
      </Canvas>

      <KickControl onKick={handleKick} />
    </div>
  );
}
