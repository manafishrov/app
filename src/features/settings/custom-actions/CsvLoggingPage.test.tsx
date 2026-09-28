// @vitest-environment happy-dom
import { render } from 'solid-js/web';
import { afterEach, expect, it, vi } from 'vitest';

import { CsvLoggingPage } from './CsvLoggingPage';

const api = vi.hoisted(() => ({ list: vi.fn(), request: vi.fn(), save: vi.fn() }));
vi.mock('./api', () => ({ listCsvFiles: api.list }));
vi.mock('@/stores/capabilities', () => ({ capabilityStore: { connected: true } }));
vi.mock('@/tauri/capabilities', () => ({ requestCapability: api.request, saveCsv: api.save }));
vi.mock('@/lib/log', () => ({ logError: vi.fn() }));

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup();
  }
  document.body.replaceChildren();
  vi.resetAllMocks();
});
const clickButton = (name: string): void => {
  const button = [...document.querySelectorAll('button')].find(
    (element) => element.getAttribute('aria-label') === name || element.textContent === name,
  );
  expect(button, name).toBeDefined();
  if (button) {
    button.click();
  }
};

it('never deletes a CSV before confirmation, including when the dialog is cancelled', () => {
  api.list.mockResolvedValue([{ name: 'sensor.csv', rows: 1, columns: 1, size: 1 }]);
  api.request.mockResolvedValue(null);
  const root = document.createElement('div');
  document.body.append(root);
  cleanups.push(render(() => <CsvLoggingPage />, root));
  return vi
    .waitFor(() => {
      expect(root.textContent).toContain('sensor.csv');
    })
    .then(() => {
      clickButton('Delete sensor.csv');
      expect(api.request).not.toHaveBeenCalled();
      clickButton('Cancel');
      expect(api.request).not.toHaveBeenCalled();
      clickButton('Delete sensor.csv');
      clickButton('Delete');
      return vi.waitFor(() => {
        expect(api.request).toHaveBeenCalledWith('csv.delete', { name: 'sensor.csv' });
      });
    });
});
