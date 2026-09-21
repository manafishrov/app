/**
 * Marks a subtree as an overlay *preview* rather than the live overlay.
 *
 * Most widgets hide themselves when the ROV is disconnected, which is right on
 * the camera feed but wrong in the settings editor — you would have nothing to
 * drag. Inside a preview, widgets render their content unconditionally so the
 * editor is WYSIWYG whether or not a drone is connected.
 */

import { createContext, useContext, type JSXElement } from 'solid-js';

import { connectionStatusStore } from '@/stores/connectionStatus';

const OverlayPreviewContext = createContext(false);

export const OverlayPreviewProvider = (props: { children: JSXElement }): JSXElement => (
  <OverlayPreviewContext.Provider value={true}>{props.children}</OverlayPreviewContext.Provider>
);

export const useIsOverlayPreview = (): (() => boolean) => {
  const isPreview = useContext(OverlayPreviewContext);
  return () => isPreview;
};

/**
 * Whether a connection-gated widget should show its content. Always true in a
 * preview, otherwise tied to the live connection.
 */
export const useOverlayContentVisible = (): (() => boolean) => {
  const isPreview = useContext(OverlayPreviewContext);
  return () => isPreview || connectionStatusStore.isConnected;
};
