import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createToast: vi.fn() }));
vi.mock('@manafishrov/ui/toaster', () => ({ toast: { create: mocks.createToast } }));
vi.mock('@/paraglide/messages', () => ({
  toasts_keyboard_binding_range_invalid: (): string => 'Keep the key in its changed state',
}));

import { saveKeyboardBinding } from './saveBinding';

beforeEach(() => {
  vi.clearAllMocks();
});

it.each([0, 1])(
  'rejects equal keyboard endpoints %s without replacing the existing binding',
  (value) => {
    const onChange = vi.fn();
    saveKeyboardBinding({ key: 'KeyW', minValue: value, maxValue: value }, onChange);
    expect(onChange).not.toHaveBeenCalled();
    expect(mocks.createToast).toHaveBeenCalledExactlyOnceWith({
      title: 'Keep the key in its changed state',
      type: 'warning',
    });
  },
);

it.each([
  [0, 1],
  [1, 0],
])('saves usable keyboard endpoints %s → %s without a warning', (minValue, maxValue) => {
  const onChange = vi.fn();
  const binding = { key: 'KeyW' as const, minValue, maxValue };
  saveKeyboardBinding(binding, onChange);
  expect(onChange).toHaveBeenCalledExactlyOnceWith(binding);
  expect(mocks.createToast).not.toHaveBeenCalled();
});
