import { createSignal } from 'solid-js';

const [isInputSuppressed, setIsInputSuppressed] = createSignal(false);

export { isInputSuppressed, setIsInputSuppressed };
