// GoalPost.tsx
import { Box, Sphere } from '@react-three/drei';
import { useSphere } from '@react-three/cannon';

function GoalPost() {
  // Размеры ворот в метрах
  const GOAL_WIDTH = 7.32;
  const GOAL_HEIGHT = 2.44;
  const GOAL_DEPTH = 2;

  // Штанги ворот (статические объекты, без физики)
  const Crossbar = () => (
    <Box
      args={[GOAL_WIDTH, 0.1, 0.1]}
      position={[0, GOAL_HEIGHT, 0]}
      receiveShadow
      castShadow
    >
      <meshStandardMaterial color="#ffffff" metalness={0.5} />
    </Box>
  );

  const LeftPost = () => (
    <Box
      args={[0.1, GOAL_HEIGHT, 0.1]}
      position={[-GOAL_WIDTH / 2, GOAL_HEIGHT / 2, 0]}
      receiveShadow
      castShadow
    >
      <meshStandardMaterial color="#ffffff" metalness={0.5} />
    </Box>
  );

  const RightPost = () => (
    <Box
      args={[0.1, GOAL_HEIGHT, 0.1]}
      position={[GOAL_WIDTH / 2, GOAL_HEIGHT / 2, 0]}
      receiveShadow
      castShadow
    >
      <meshStandardMaterial color="#ffffff" metalness={0.5} />
    </Box>
  );

  // Сетка с физикой
  const Net = () => {
    const netPoints = [];
    const NET_SEGMENTS_X = 20;
    const NET_SEGMENTS_Y = 10;

    for (let i = 0; i <= NET_SEGMENTS_X; i++) {
      for (let j = 0; j <= NET_SEGMENTS_Y; j++) {
        const x = (i / NET_SEGMENTS_X) * GOAL_WIDTH - GOAL_WIDTH / 2;
        const y = (j / NET_SEGMENTS_Y) * GOAL_HEIGHT;
        const z = -(j / NET_SEGMENTS_Y) * GOAL_DEPTH;

        // Используем useSphere для добавления физики к каждой сфере
        const [ref] = useSphere(() => ({
          mass: 0.1,
          position: [x, y, z],
          args: [0.05], // радиус сферы
        }));

        netPoints.push(
          <Sphere
            key={`${i}-${j}`}
            ref={ref}
            args={[0.05, 8, 8]}
          >
            <meshPhysicalMaterial
              color="#ffffff"
              transparent
              opacity={0.8}
            />
          </Sphere>
        );
      }
    }

    return <group>{netPoints}</group>;
  };

  return (
    <group>
      <Crossbar />
      <LeftPost />
      <RightPost />
      <Net />
    </group>
  );
}

export default GoalPost;
