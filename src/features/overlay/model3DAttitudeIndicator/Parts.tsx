import type { Accessor, JSX, Resource } from 'solid-js';

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
} from './constants';

export type Model3DAttitudeIndicatorProps = {
  size: number;
  pitch: number;
  roll: number;
  yaw: number;
  desiredYaw: number;
  autoStabilization: boolean;
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
  const yawRotation = props.autoStabilization
    ? (calculateDeltaYaw(props.desiredYaw, props.yaw) * Math.PI) / DEGREES_HALF_CIRCLE
    : 0;
  modelGroup.rotation.set(
    (props.pitch * Math.PI) / DEGREES_HALF_CIRCLE,
    yawRotation,
    // Three.js has upward-positive Y; positive vehicle roll lowers the right edge on screen.
    (-props.roll * Math.PI) / DEGREES_HALF_CIRCLE,
  );
};

export const createRenderer = (canvasRef: HTMLCanvasElement, size: number): THREE.WebGLRenderer => {
  const renderer = new THREE.WebGLRenderer({
    canvas: canvasRef,
    alpha: true,
    antialias: true,
    // Retain the last pose when scrolling recomposites this idle canvas.
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(size, size);
  return renderer;
};

type RenderState = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  modelGroup: THREE.Group;
  size: number;
};

const createRenderState = (
  canvas: HTMLCanvasElement,
  model: THREE.Group,
  size: number,
): RenderState => {
  const { scene, camera } = setupScene();
  const modelGroup = new THREE.Group();
  modelGroup.add(model);
  scene.add(modelGroup);
  return { scene, camera, modelGroup, renderer: createRenderer(canvas, size), size };
};

const useCanvasVisible = (getCanvasRef: () => HTMLCanvasElement | undefined): Accessor<boolean> => {
  const [visible, setVisible] = createSignal(false);
  onMount(() => {
    const canvas = getCanvasRef();
    if (!canvas) {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      setVisible(entries.some((entry) => entry.isIntersecting));
    });
    observer.observe(canvas);
    onCleanup(() => {
      observer.disconnect();
    });
  });
  return visible;
};

const renderModel = (state: RenderState, props: Model3DAttitudeIndicatorProps): void => {
  if (state.size !== props.size) {
    state.renderer.setSize(props.size, props.size);
    state.size = props.size;
  }
  updateModelRotation(state.modelGroup, props);
  state.renderer.render(state.scene, state.camera);
};

/** Paint changed telemetry when visible; an idle or off-screen instrument needs no frames. */
export const useModel3DAttitudeIndicator = (
  props: Model3DAttitudeIndicatorProps,
  gltf: Resource<THREE.Group>,
  getCanvasRef: () => HTMLCanvasElement | undefined,
): void => {
  const [state, setState] = createSignal<RenderState>();
  const visible = useCanvasVisible(getCanvasRef);

  createEffect(() => {
    if (gltf.state === 'errored') {
      logError('Error loading 3D model:', gltf.error);
      return;
    }
    const model = gltf();
    const canvas = getCanvasRef();
    if (!model || !canvas) {
      return;
    }
    const current = createRenderState(
      canvas,
      model,
      untrack(() => props.size),
    );
    setState(current);
    onCleanup(() => {
      current.renderer.dispose();
    });
  });

  createEffect(() => {
    const current = state();
    if (current && visible()) {
      renderModel(current, props);
    }
  });
};
