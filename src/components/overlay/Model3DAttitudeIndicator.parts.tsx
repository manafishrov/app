import { type JSX, type Resource, createEffect, onCleanup } from 'solid-js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { logError } from '@/lib/log';

import {
  AMBIENT_LIGHT_INTENSITY,
  CAMERA_ASPECT,
  CAMERA_FAR,
  CAMERA_FOV,
  CAMERA_NEAR,
  CAMERA_Z,
  DEGREES_HALF_CIRCLE,
  DEGREES_IN_CIRCLE,
  DEGREES_ONE_AND_HALF_CIRCLE,
  DIRECTIONAL_LIGHT_INTENSITY,
  DIRECTIONAL_LIGHT_POS_X,
  DIRECTIONAL_LIGHT_POS_Y,
  DIRECTIONAL_LIGHT_POS_Z,
  LIGHT_COLOR,
} from './model3DAttitudeIndicator.constants';

export type Model3DAttitudeIndicatorProps = {
  size: number;
  pitch: number;
  roll: number;
  yaw: number;
  desiredYaw: number;
  style?: JSX.CSSProperties;
};

export const loadModel = (url: string): Promise<THREE.Group> => {
  const loader = new GLTFLoader();
  return loader.loadAsync(url).then((gltf) => gltf.scene);
};

export const calculateDeltaYaw = (desiredYaw: number, yaw: number): number => {
  const delta = desiredYaw - yaw;
  return ((delta + DEGREES_ONE_AND_HALF_CIRCLE) % DEGREES_IN_CIRCLE) - DEGREES_HALF_CIRCLE;
};

export const setupScene = (): { scene: THREE.Scene; camera: THREE.PerspectiveCamera } => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, CAMERA_ASPECT, CAMERA_NEAR, CAMERA_FAR);
  camera.position.set(0, 0, CAMERA_Z);

  const ambientLight = new THREE.AmbientLight(LIGHT_COLOR, AMBIENT_LIGHT_INTENSITY);
  const directionalLight = new THREE.DirectionalLight(LIGHT_COLOR, DIRECTIONAL_LIGHT_INTENSITY);
  directionalLight.position.set(
    DIRECTIONAL_LIGHT_POS_X,
    DIRECTIONAL_LIGHT_POS_Y,
    DIRECTIONAL_LIGHT_POS_Z,
  );
  scene.add(ambientLight);
  scene.add(directionalLight);

  return { scene, camera };
};

export const updateModelRotation = (
  modelGroup: THREE.Group,
  props: Model3DAttitudeIndicatorProps,
): void => {
  modelGroup.rotation.set(
    (props.pitch * Math.PI) / DEGREES_HALF_CIRCLE,
    (calculateDeltaYaw(props.desiredYaw, props.yaw) * Math.PI) / DEGREES_HALF_CIRCLE,
    (props.roll * Math.PI) / DEGREES_HALF_CIRCLE,
  );
};

export const createRenderer = (canvasRef: HTMLCanvasElement, size: number): THREE.WebGLRenderer => {
  const renderer = new THREE.WebGLRenderer({
    canvas: canvasRef,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(size, size);
  return renderer;
};

type AnimationState = {
  renderer?: THREE.WebGLRenderer;
  animationId?: number;
  modelGroup?: THREE.Group;
};

const setupModelGroup = (scene: THREE.Scene, result: THREE.Group, state: AnimationState): void => {
  if (state.modelGroup) {
    scene.remove(state.modelGroup);
  }
  state.modelGroup = new THREE.Group();
  state.modelGroup.add(result);
  scene.add(state.modelGroup);
};

const startAnimation = (context: {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  props: Model3DAttitudeIndicatorProps;
  state: AnimationState;
}): void => {
  const animate = (): void => {
    context.state.animationId = requestAnimationFrame(animate);
    if (context.state.modelGroup) {
      updateModelRotation(context.state.modelGroup, context.props);
    }
    if (context.state.renderer) {
      context.state.renderer.render(context.scene, context.camera);
    }
  };
  animate();
};

export const useModel3DAttitudeIndicator = (
  props: Model3DAttitudeIndicatorProps,
  gltf: Resource<THREE.Group>,
  getCanvasRef: () => HTMLCanvasElement | undefined,
): void => {
  const state: AnimationState = {};

  const { scene, camera } = setupScene();

  createEffect(() => {
    if (gltf.state === 'errored') {
      logError('Error loading 3D model:', gltf.error);
    }
  });

  createEffect(() => {
    const result = gltf();
    const canvasRef = getCanvasRef();
    if (!result || !canvasRef) {
      return;
    }

    setupModelGroup(scene, result, state);

    if (!state.renderer) {
      state.renderer = createRenderer(canvasRef, props.size);
      startAnimation({ scene, camera, props, state });
    }
  });

  createEffect(() => {
    const { size } = props;
    if (state.renderer) {
      state.renderer.setSize(size, size);
      camera.aspect = 1;
      camera.updateProjectionMatrix();
    }
  });

  onCleanup(() => {
    if (typeof state.animationId === 'number') {
      cancelAnimationFrame(state.animationId);
    }
    if (state.renderer) {
      state.renderer.dispose();
    }
  });
};
