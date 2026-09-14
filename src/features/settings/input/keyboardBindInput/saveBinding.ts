import { toast } from '@manafishrov/ui/toaster';

import type { KeyboardInput } from '@/stores/config';

import * as m from '@/paraglide/messages';

import { hasUsableBindingRange } from '../bindingRange';

export const saveKeyboardBinding = (
  binding: KeyboardInput,
  onChange: (next: KeyboardInput | null) => void,
): void => {
  if (!hasUsableBindingRange(binding.minValue, binding.maxValue)) {
    toast.create({ title: m.toasts_keyboard_binding_range_invalid(), type: 'warning' });
    return;
  }
  onChange(binding);
};
