// @vitest-environment happy-dom
import { render } from 'solid-js/web';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { defaultConfig, setConfigStore } from '@/stores/config';
import { setConfig } from '@/tauri/config';
import { listDetectionExecutionProviders } from '@/tauri/detection';

import { DetectionOptions } from './DetectionOptions';

vi.mock('@/lib/log', () => ({ logError: vi.fn() }));
vi.mock('@/tauri/config', () => ({ setConfig: vi.fn<() => Promise<void>>().mockResolvedValue() }));
vi.mock('@/tauri/detection', () => ({ listDetectionExecutionProviders: vi.fn() }));

const host = document.createElement('div');
let dispose = (): void => {
  host.replaceChildren();
};

beforeEach(() => {
  vi.clearAllMocks();
  setConfigStore(structuredClone(defaultConfig));
  document.body.append(host);
});

afterEach(() => {
  dispose();
  host.replaceChildren();
  host.remove();
});

const openHardwareOptions = (): Promise<void> =>
  vi.waitFor(() => {
    const trigger = host
      .querySelectorAll<HTMLButtonElement>('[data-scope="select"][data-part="trigger"]')
      .item(1);
    expect(trigger).not.toBeNull();
    trigger.click();
    expect(document.querySelector('[role="option"]')).not.toBeNull();
  });

const values = (): (string | undefined)[] =>
  [...document.querySelectorAll<HTMLElement>('[role="option"]')].map(
    (option) => option.dataset['value'],
  );

it('offers only Auto and CPU when the native build has no GPU backend', () => {
  vi.mocked(listDetectionExecutionProviders).mockResolvedValue(['auto', 'cpu']);
  dispose = render(() => <DetectionOptions />, host);
  return openHardwareOptions().then(() => {
    expect(values()).toEqual(['auto', 'cpu']);
    expect(setConfig).not.toHaveBeenCalled();
  });
});

it('keeps the explicit GPU choice on supported Windows and macOS builds', () => {
  vi.mocked(listDetectionExecutionProviders).mockResolvedValue(['auto', 'gpu', 'cpu']);
  dispose = render(() => <DetectionOptions />, host);
  return openHardwareOptions().then(() => {
    expect(values()).toEqual(['auto', 'gpu', 'cpu']);
  });
});

it('does not offer GPU when native backend discovery fails', () => {
  vi.mocked(listDetectionExecutionProviders).mockRejectedValue(new Error('IPC unavailable'));
  dispose = render(() => <DetectionOptions />, host);
  return openHardwareOptions().then(() => {
    expect(values()).toEqual(['auto', 'cpu']);
  });
});

it('offers the Linux vendor backends returned by the native build', () => {
  vi.mocked(listDetectionExecutionProviders).mockResolvedValue([
    'auto',
    'gpu',
    'cuda',
    'migraphx',
    'openVino',
    'cpu',
  ]);
  dispose = render(() => <DetectionOptions />, host);
  return openHardwareOptions().then(() => {
    expect(values()).toEqual(['auto', 'gpu', 'cuda', 'migraphx', 'openVino', 'cpu']);
    expect(document.body.textContent).toContain('NVIDIA CUDA');
    expect(document.body.textContent).toContain('AMD MIGraphX (ROCm)');
    expect(document.body.textContent).toContain('Intel GPU (OpenVINO)');
  });
});
