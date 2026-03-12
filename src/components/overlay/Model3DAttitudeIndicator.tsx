import type { JSX } from 'solid-js';

import { type Component, createEffect, createResource, onCleanup } from 'solid-js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { logError } from '@/lib/log';

type Model3DAttitudeIndicatorProps = {
  size: number;
  pitch: number;
  roll: number;
  yaw: number;
  style?: JSX.CSSProperties;
};

const loadModel = async (url: string) => {
  const loader = new GLTFLoader();
  return await loader.loadAsync(url);
};

const Model3DAttitudeIndicator: Component<Model3DAttitudeIndicatorProps> = (props) => {
  const [gltf] = createResource(() => '/base.glb', loadModel);

  let canvasRef: HTMLCanvasElement | undefined;
  let renderer: THREE.WebGLRenderer | undefined;
  let animationId: number | undefined;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 3.5);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(10, 10, 5);
  scene.add(ambientLight);
  scene.add(directionalLight);

  let modelGroup: THREE.Group | undefined;

  createEffect(() => {
    if (gltf.error) {
      logError('Error loading 3D model:', gltf.error);
    }
  });

  createEffect(() => {
    const result = gltf();
    if (!result || !canvasRef) return;

    if (modelGroup) {
      scene.remove(modelGroup);
    }

    modelGroup = new THREE.Group();
    modelGroup.add(result.scene);
    scene.add(modelGroup);

    if (!renderer) {
      renderer = new THREE.WebGLRenderer({
        canvas: canvasRef,
        alpha: true,
        antialias: true,
      });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(props.size, props.size);

      const animate = () => {
        animationId = requestAnimationFrame(animate);
        if (modelGroup) {
          modelGroup.rotation.x = (props.pitch * Math.PI) / 180;
          modelGroup.rotation.z = (props.roll * Math.PI) / 180;
          modelGroup.rotation.y = (props.yaw * Math.PI) / 180;
        }
        renderer!.render(scene, camera);
      };
      animate();
    }
  });

  createEffect(() => {
    const size = props.size;
    if (renderer) {
      renderer.setSize(size, size);
      camera.aspect = 1;
      camera.updateProjectionMatrix();
    }
  });

  onCleanup(() => {
    if (animationId !== undefined) {
      cancelAnimationFrame(animationId);
    }
    renderer?.dispose();
  });

  return (
    <div
      class='bg-background/50 backdrop-blur-sm border border-border/50 rounded-2xl opacity-75 text-foreground relative overflow-hidden'
      style={{ width: `${props.size}px`, height: `${props.size}px`, ...props.style }}
    >
      <canvas ref={canvasRef} class='absolute inset-0' width={props.size} height={props.size} />
      <svg
        width={props.size}
        height={props.size}
        viewBox={`-${props.size * 0.05} -${props.size * 0.05} ${props.size * 1.1} ${props.size * 1.1}`}
        class='absolute top-0 left-0 pointer-events-none'
      >
        <text
          x={props.size * 0.1}
          y={props.size - props.size * 0.05}
          fill='currentColor'
          font-size={`${props.size * 0.06}px`}
        >
          Pitch: {props.pitch.toFixed(1)}°
        </text>
        <text
          x={props.size - props.size * 0.4}
          y={props.size - props.size * 0.05}
          fill='currentColor'
          font-size={`${props.size * 0.06}px`}
        >
          Roll: {props.roll.toFixed(1)}°
        </text>
      </svg>
    </div>
  );
};

export { Model3DAttitudeIndicator };
