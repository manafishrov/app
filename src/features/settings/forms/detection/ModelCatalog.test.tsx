// @vitest-environment happy-dom
import { render } from 'solid-js/web';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { startModelDownload } from '@/features/detection/modelDownloads';
import { setDetectionStore } from '@/stores/detection';
import { type DetectionCatalogModel, listDetectionCatalog } from '@/tauri/detection';

import catalog from '../../../../../src-tauri/src/detection/catalog.json';
import { ModelCatalog } from './ModelCatalog';

vi.mock('@/lib/log', () => ({ logError: vi.fn() }));
vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl: vi.fn() }));
vi.mock('@/tauri/detection', () => ({ listDetectionCatalog: vi.fn() }));
vi.mock('@/features/detection/modelDownloads', () => ({
  modelDownloads: {},
  startModelDownload: vi.fn<() => Promise<void>>().mockResolvedValue(),
  cancelModelDownload: vi.fn<() => Promise<void>>().mockResolvedValue(),
}));

const SEVEN_MODELS = 7;
const host = document.createElement('div');
let dispose = (): void => {
  host.replaceChildren();
};

beforeEach(() => {
  vi.clearAllMocks();
  document.body.append(host);
  setDetectionStore('models', []);
  vi.mocked(listDetectionCatalog).mockResolvedValue(catalog satisfies DetectionCatalogModel[]);
});

afterEach(() => {
  dispose();
  host.replaceChildren();
  host.remove();
});

const mount = (): void => {
  dispose = render(() => <ModelCatalog />, host);
};

const downloadButtons = (): HTMLButtonElement[] => [
  ...host.querySelectorAll<HTMLButtonElement>('button[aria-label^="Download "]'),
];

it('shows all seven models as available downloads without starting any automatically', () => {
  mount();
  return vi
    .waitFor(() => {
      expect(downloadButtons()).toHaveLength(SEVEN_MODELS);
    })
    .then(() => {
      expect(downloadButtons().filter((button) => !button.disabled)).toHaveLength(SEVEN_MODELS);
      expect(downloadButtons().filter((button) => button.disabled)).toHaveLength(0);
      expect(host.textContent).toContain('Marine Detect FishInv');
      expect(host.textContent).toContain('Marine Detect MegaFauna');
      expect(startModelDownload).not.toHaveBeenCalled();
    });
});

it('starts only the requested model when its download button is clicked', () => {
  mount();
  return vi
    .waitFor(() => {
      expect(downloadButtons()).toHaveLength(SEVEN_MODELS);
    })
    .then(() => {
      const button = downloadButtons().find(
        (candidate) => candidate.getAttribute('aria-label') === 'Download YOLO26n (Nano)',
      );
      if (!button) {
        throw new Error('Nano download button not found');
      }
      button.click();
      expect(startModelDownload).toHaveBeenCalledExactlyOnceWith(catalog[0]);
    });
});

it('can retry after listing the catalog fails', () => {
  vi.mocked(listDetectionCatalog).mockRejectedValueOnce(new Error('IPC unavailable'));
  mount();
  return vi
    .waitFor(() => {
      expect(host.textContent).toContain('Could not load available models.');
    })
    .then(() => {
      const retry = [...host.querySelectorAll('button')].find(
        (button) => button.textContent === 'Retry',
      );
      if (!retry) {
        throw new Error('Retry button not found');
      }
      retry.click();
      return vi.waitFor(() => {
        expect(downloadButtons()).toHaveLength(SEVEN_MODELS);
      });
    });
});
