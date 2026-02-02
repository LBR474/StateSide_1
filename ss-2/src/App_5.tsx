import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls, Plane } from "@react-three/drei";
import * as THREE from "three";
import TWEEN from "@tweenjs/tween.js";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import gsap from "gsap";

/* ---------------- FLOOR ---------------- */

const Floor = () => {
  return (
    <Plane
      args={[100, 100]}
      rotation-x={-Math.PI / 2}
      position={[0, -0.05, 0]}
      receiveShadow
    >
      <meshPhongMaterial color="#808080" />
    </Plane>
  );
};

/* ---------------- MODEL ---------------- */

const Model = ({
  startX,
  onIntroComplete,
  glow,
}: {
  startX: number;
  onIntroComplete: () => void;
  glow: boolean;
}) => {
  const gltf = useLoader(GLTFLoader, "models/SS-1.glb");
  const rootRef = useRef<THREE.Group>(null!);
  gltf.scene.rotation.y = Math.PI; // pre-rotate to face forward

  // clone once so each instance is independent
  const sceneClone = useRef<THREE.Group | null>(null);
  if (!sceneClone.current) {
    sceneClone.current = gltf.scene.clone();
  }

  // base orientation via quaternion (once)
  useEffect(() => {
    if (!rootRef.current) return;

    const euler = new THREE.Euler(Math.PI / -48, Math.PI, 0, "XYZ");

    rootRef.current.quaternion.setFromEuler(euler);
  }, [gltf]);

  // material glow toggle
  useEffect(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: glow ? 2.5 : 0,
      roughness: 0.2,
      metalness: 0.1,
    });

    sceneClone.current!.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = mat;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [glow]);

  // intro slide animationconst ranIntro = useRef(false);

  const ranIntro = useRef(false);

  useEffect(() => {
    if (ranIntro.current) return;
    ranIntro.current = true;

    const dir = startX > 0 ? -1 : 1;
    const overshootX = dir * 16;

    const tl = gsap.timeline({
      onComplete: () => {
        // snap clean final rotation
        gsap.set(rootRef.current.rotation, { y: 0 });
        onIntroComplete();
      },
    });

    // 🌀 spin whole GLB while approaching (about one full turn)
    tl.to(
      rootRef.current.rotation,
      {
        y: "+=6.28", // ~2π radians
        duration: 1.6,
        ease: "none",
      },
      0,
    );

    // 🚀 move in with overshoot
    tl.to(
      rootRef.current.position,
      {
        x: overshootX,
        duration: 1.6,
        ease: "power3.out",
      },
      0,
    ).to(rootRef.current.position, {
      x: 0,
      duration: 1.6,
      ease: "power2.out",
    });

    return () => {
      tl.kill();
    };
  }, [onIntroComplete, startX]);

  return (
    <group ref={rootRef} position={[startX, 0.5, -1]}>
      <primitive object={sceneClone.current!} scale={2.5} />
    </group>
  );
};

/* ---------------- SCENE ---------------- */

const Scene = () => {
  const { camera, gl } = useThree();
  const [introCount, setIntroCount] = useState(0);
  const introDone = introCount >= 2;

  const [bloomIntensity, setBloomIntensity] = useState(0);

  useEffect(() => {
    camera.position.set(0.0, 0.2, 3.1);
    camera.lookAt(0, 0.2, 0);

    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFShadowMap;
  }, [camera, gl]);

  useFrame(() => {
    TWEEN.update();
  });

  // 🌟 animate bloom in when both models arrive
  useEffect(() => {
    if (!introDone) return;

    const bloomObj = { value: 0 };

    const tween = gsap.to(bloomObj, {
      value: 0.4, // target bloom strength
      duration: 2,
      ease: "power2.out",
      onUpdate: () => setBloomIntensity(bloomObj.value),
    });

    return () => {
      tween.kill();
    };
  }, [introDone]);

  const handleOneModelDone = () => {
    setIntroCount((c) => c + 1);
  };

  return (
    <>
      <ambientLight intensity={0.27} />

      <Floor />

      {/* two models converging */}
      <Model startX={56} onIntroComplete={handleOneModelDone} glow={introDone} />
      <Model
        startX={-26}
        onIntroComplete={handleOneModelDone}
        glow={introDone}
      />

      <OrbitControls
        target={[0, 0.5, 0]}
        maxPolarAngle={Math.PI / 2}
        minDistance={1}
        maxDistance={10}
      />

      {/* 🌟 bloom always mounted once intro is done — intensity animates */}
      {introDone && (
        <EffectComposer>
          <Bloom
            intensity={bloomIntensity}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            radius={0.6}
          />
        </EffectComposer>
      )}
    </>
  );
};


/* ---------------- APP ---------------- */

export default function App() {
  return (
    <Canvas
      shadows
      orthographic
      camera={{ zoom: 50, position: [0, 1, 25], near: 0.01, far: 1000 }}
      gl={{ toneMapping: THREE.ACESFilmicToneMapping }}
    >
      <Scene />
    </Canvas>
  );
}
