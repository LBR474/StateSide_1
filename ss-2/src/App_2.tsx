import { useRef, useEffect } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { Environment, 
  //OrbitControls, 
  // Plane
 } from "@react-three/drei";
import * as THREE from "three";
import TWEEN from "@tweenjs/tween.js";
//import { SpotLightHelper } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

type SpotlightProps = {
  color: number;
  radius?: number; // orbit radius
  speed?: number; // radians per second
  center?: [number, number, number];
  phase?: number; // radians
};

const Spotlight = ({
  color,
  radius = 3,
  speed = 0.4,
  center = [0, 1.5, 2.5],
  phase = 0,
}: SpotlightProps) => {
  const light = useRef<THREE.SpotLight>(null!);
  const angle = useRef(phase);
  const elapsed = useRef(0);
  const active = useRef(true);
  
  const FADE_START = 5;
  const FADE_DURATION = 2;

  useFrame((_, delta) => {
    if (!light.current) return;

    elapsed.current += delta;

    // motion phase
    if (elapsed.current < FADE_START) {
      angle.current += delta * speed;

      const [cx, , cz] = center;
      const y = 2;

      light.current.position.set(
        cx + Math.sin(angle.current) * radius * 0.6,
        y,
        cz + Math.cos(angle.current) * radius
      );

      light.current.lookAt(0, 0.9, 0);
    }

    // fade phase (run once)
    if (elapsed.current >= FADE_START && active.current) {
      active.current = false;

      new TWEEN.Tween(light.current)
        .to({ intensity: 0, y: 100 }, FADE_DURATION * 1000)
        .easing(TWEEN.Easing.Sinusoidal.InOut)
        .start();
    }
  });

  return (
    <spotLight
      ref={light}
      color={color}
      intensity={10}
      distance={50}
      angle={0.7}
      penumbra={0.1}
      decay={2}
      castShadow
    />
  );
};

// const Box = () => {
//   const boxRef = useRef<THREE.Mesh>(null!);
//   return (
//     <mesh ref={boxRef} position={[0, -0.5, 0]} castShadow receiveShadow>
//       <boxGeometry args={[0.3, 0.1, 0.2]} />
//       <meshPhongMaterial color="#aaaaaa" />
//     </mesh>
//   );
// };

const Model = () => {
  const gltf = useLoader(GLTFLoader, "./models/SS-1.glb");
  const materials = useRef<THREE.MeshPhysicalMaterial[]>([]);

  const FADE_START = 4;
  const FADE_DURATION = 3;

  // setup materials
  useEffect(() => {
    materials.current = [];

    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const mat = new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          metalness: 1,
          roughness: 0.2,
          clearcoat: 0.6,
          transmission: 0.9,
          clearcoatRoughness: 0.15,
        });

        mesh.material = mat;
        materials.current.push(mat);
      }
    });
  }, [gltf]);

  // fade to black
  useEffect(() => {
    const timer = setTimeout(() => {
      materials.current.forEach((mat) => {
        new TWEEN.Tween(mat.color)
          .to({ r: 0, g: 0, b: 0 }, FADE_DURATION * 1000)
          .easing(TWEEN.Easing.Sinusoidal.InOut)
          .start();
      });
    }, FADE_START * 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <primitive
      object={gltf.scene}
      scale={1.0}
      rotation={[Math.PI / -48, 0, 0]}
      position={[0, 0.9, 0]}
    />
  );
};



const Scene = () => {
  const { scene, camera, invalidate } = useThree();
  const ambient = useRef<THREE.AmbientLight>(null!);

  const FadePlane = ({ fadeStart = 5, fadeDuration = 2 }) => {
    const mesh = useRef<THREE.Mesh>(null!);

    useEffect(() => {
      const timer = setTimeout(() => {
        if (!mesh.current) return;

        // scale down smoothly instead of fading opacity
        new TWEEN.Tween(mesh.current.scale)
          .to({ x: 0, y: 0, z: 0 }, fadeDuration * 1000)
          .easing(TWEEN.Easing.Sinusoidal.InOut)
          .onComplete(() => {
            if (mesh.current?.parent) {
              mesh.current.parent.remove(mesh.current);
            }
          })
          .start();
      }, fadeStart * 1000);

      return () => clearTimeout(timer);
    }, [fadeStart, fadeDuration]);

    return (
      <mesh
        ref={mesh}
        rotation-x={-Math.PI / 4}
        position={[0, -0.05, 0]}
        receiveShadow
        scale={[1, 1, 1]}
      >
        <planeGeometry args={[200, 200]} />
        <meshPhongMaterial color="#d4bfbf" />
      </mesh>
    );
  };



  useEffect(() => {
     camera.position.set(0, 1.2, 4.1);
    //camera.position.set(0, 1.2, 7.1);
    camera.lookAt(0, 0.9, 0);
    scene.background = new THREE.Color(0xffffff);
  }, [camera, scene]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!ambient.current) return;

      new TWEEN.Tween(ambient.current)
        .to({ intensity: 1.0 }, 2000)
        .easing(TWEEN.Easing.Sinusoidal.InOut)
        .start();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);


  useFrame(() => {
    TWEEN.update();
    invalidate();
  });

  return (
    <>
      <ambientLight ref={ambient} intensity={0.1} />
      <Environment preset="city" environmentIntensity={2} />
      

      <Spotlight color={0xffffff} radius={7} speed={1.5} phase={0} />

      <Spotlight
        color={0xffffff}
        radius={9}
        speed={2.5}
        phase={(2 * Math.PI) / 3}
      />

      <Spotlight
        color={0xffffff}
        radius={5}
        speed={1.7}
        phase={(4 * Math.PI) / 3}
      />

      <FadePlane fadeStart={4} fadeDuration={3} />

      {/* <Box /> */}
      <Model />
    </>
  );
};

const App = () => {
  return (
    <Canvas
      shadows
      frameloop="demand"
      orthographic
      camera={{ zoom: 50, position: [0, 1, 10], near: 0.1, far: 1000 }}
    >
      <color attach="background" args={["#202020"]} />;
      {/* <OrbitControls
      enableDamping={false}
        target={[0, 0.9, 0]}
        maxPolarAngle={Math.PI / 1}
        minDistance={1}
        maxDistance={10}
      /> */}
      <Scene />
    </Canvas>
  );
};

export default App;
