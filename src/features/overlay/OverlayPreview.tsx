/** Show instruments while arranging the layout or browsing the gallery. */
import { createContext, useContext, type JSXElement } from 'solid-js';

import { connectionStatusStore } from '@/stores/connectionStatus';

const OverlayPreviewContext = createContext<'live' | 'layout' | 'palette'>('live');

export const OverlayPreviewProvider = (props: {
  children: JSXElement;
  palette?: boolean;
}): JSXElement => (
  <OverlayPreviewContext.Provider value={props.palette === true ? 'palette' : 'layout'}>
    {props.children}
  </OverlayPreviewContext.Provider>
);

export const useIsOverlayPreview = (): (() => boolean) => {
  const mode = useContext(OverlayPreviewContext);
  return () => mode !== 'live';
};

export const useOverlayContentVisible = (): (() => boolean) => {
  const mode = useContext(OverlayPreviewContext);
  return () => mode !== 'live' || connectionStatusStore.isConnected;
};
