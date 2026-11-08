// @vitest-environment happy-dom
import { render } from 'solid-js/web';
import { expect, it, vi } from 'vitest';

import type { ExecutionProvider } from '@/tauri/detection';

import { setDetectionStore } from '@/stores/detection';

import { DetectionStatus } from './DetectionStatus';

vi.mock('@/lib/log', () => ({ logError: vi.fn() }));

it('reports the actual CPU, NNAPI or Core ML backend from native events', () => {
  const host = document.createElement('div');
  const dispose = render(() => <DetectionStatus />, host);
  const providers: [ExecutionProvider, string][] = [
    ['cpu', 'CPU'],
    ['nnapi', 'NNAPI (GPU/NPU)'],
    ['coreMl', 'Core ML'],
  ];
  for (const [executionProvider, label] of providers) {
    setDetectionStore({ executionProvider });
    expect(host.textContent).toContain(label);
  }
  dispose();
});
