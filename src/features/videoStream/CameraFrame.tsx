import type { Component, JSXElement } from 'solid-js';

/** The stream and every overlay use this exact 4:3 content rectangle. */
const CameraFrame: Component<{ children: JSXElement; class?: string }> = (props) => (
  <div
    data-camera-frame
    class={`relative isolate aspect-[4/3] overflow-hidden bg-[#18232c] ${props.class ?? ''}`}
  >
    {props.children}
  </div>
);

export { CameraFrame };
