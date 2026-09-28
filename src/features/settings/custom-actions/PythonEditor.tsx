import type { Component } from 'solid-js';

import { mountPythonEditor, type PythonEditorProps } from './pythonEditorController';
import './pythonEditor.css';

export const PythonEditor: Component<PythonEditorProps> = (props) => {
  let host: HTMLDivElement | null = null;
  onMount(() => {
    if (host) {
      onCleanup(mountPythonEditor(host, props));
    }
  });
  return (
    <div
      ref={(element) => {
        host = element;
      }}
      class='python-editor min-w-0 overflow-hidden rounded-md border border-input'
    />
  );
};
