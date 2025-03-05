import { KeyboardIcon, RotateCcwIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';

import { cx } from '@/lib/utils';

const keycodeMappings: Record<string, string> = {
  KeyA: 'A',
  KeyB: 'B',
  KeyC: 'C',
  KeyD: 'D',
  KeyE: 'E',
  KeyF: 'F',
  KeyG: 'G',
  KeyH: 'H',
  KeyI: 'I',
  KeyJ: 'J',
  KeyK: 'K',
  KeyL: 'L',
  KeyM: 'M',
  KeyN: 'N',
  KeyO: 'O',
  KeyP: 'P',
  KeyQ: 'Q',
  KeyR: 'R',
  KeyS: 'S',
  KeyT: 'T',
  KeyU: 'U',
  KeyV: 'V',
  KeyW: 'W',
  KeyX: 'X',
  KeyY: 'Y',
  KeyZ: 'Z',
  Digit0: 'Key0',
  Digit1: 'Key1',
  Digit2: 'Key2',
  Digit3: 'Key3',
  Digit4: 'Key4',
  Digit5: 'Key5',
  Digit6: 'Key6',
  Digit7: 'Key7',
  Digit8: 'Key8',
  Digit9: 'Key9',
  Numpad0: 'Numpad0',
  Numpad1: 'Numpad1',
  Numpad2: 'Numpad2',
  Numpad3: 'Numpad3',
  Numpad4: 'Numpad4',
  Numpad5: 'Numpad5',
  Numpad6: 'Numpad6',
  Numpad7: 'Numpad7',
  Numpad8: 'Numpad8',
  Numpad9: 'Numpad9',
  NumpadAdd: 'NumpadAdd',
  NumpadSubtract: 'NumpadSubtract',
  NumpadMultiply: 'NumpadMultiply',
  NumpadDivide: 'NumpadDivide',
  NumpadEnter: 'NumpadEnter',
  NumpadDecimal: 'NumpadDecimal',
  NumpadEqual: 'NumpadEquals',
  Space: 'Space',
  Enter: 'Enter',
  Backspace: 'Backspace',
  Tab: 'Tab',
  Escape: 'Escape',
  CapsLock: 'CapsLock',
  ScrollLock: 'ScrollLock',
  PrintScreen: 'PrintScreen',
  Pause: 'Pause',
  Insert: 'Insert',
  Delete: 'Delete',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  ShiftLeft: 'Shift',
  ShiftRight: 'Shift',
  ControlLeft: 'Control',
  ControlRight: 'Control',
  AltLeft: 'Alt',
  AltRight: 'Alt',
  MetaLeft: 'Meta',
  MetaRight: 'Meta',
  F1: 'F1',
  F2: 'F2',
  F3: 'F3',
  F4: 'F4',
  F5: 'F5',
  F6: 'F6',
  F7: 'F7',
  F8: 'F8',
  F9: 'F9',
  F10: 'F10',
  F11: 'F11',
  F12: 'F12',
  F13: 'F13',
  F14: 'F14',
  F15: 'F15',
  F16: 'F16',
  F17: 'F17',
  F18: 'F18',
  F19: 'F19',
  F20: 'F20',
  Comma: 'Comma',
  Period: 'Dot',
  Slash: 'Slash',
  Backslash: 'BackSlash',
  BracketLeft: 'LeftBracket',
  BracketRight: 'RightBracket',
  Equal: 'Equal',
  Minus: 'Minus',
  Backquote: 'Grave',
  Semicolon: 'Semicolon',
  Quote: 'Apostrophe',
  IntlBackslash: 'BackSlash',
};

const displayMappings: Record<string, string> = {
  Up: '↑',
  Down: '↓',
  Left: '←',
  Right: '→',
  Enter: 'Enter',
  Backspace: 'Backspace',
  CapsLock: 'Caps Lock',
  Tab: 'Tab',
  Escape: 'Esc',
  Space: 'Space',
  Insert: 'Insert',
  Delete: 'Del',
  Home: 'Home',
  End: 'End',
  PageUp: 'Page Up',
  PageDown: 'Page Down',
  Shift: 'Shift',
  Control: 'Ctrl',
  Alt: 'Alt',
  Meta: 'Meta',
  Key0: '0',
  Key1: '1',
  Key2: '2',
  Key3: '3',
  Key4: '4',
  Key5: '5',
  Key6: '6',
  Key7: '7',
  Key8: '8',
  Key9: '9',
  Numpad0: 'Num 0',
  Numpad1: 'Num 1',
  Numpad2: 'Num 2',
  Numpad3: 'Num 3',
  Numpad4: 'Num 4',
  Numpad5: 'Num 5',
  Numpad6: 'Num 6',
  Numpad7: 'Num 7',
  Numpad8: 'Num 8',
  Numpad9: 'Num 9',
  NumpadAdd: 'Num +',
  NumpadSubtract: 'Num -',
  NumpadMultiply: 'Num *',
  NumpadDivide: 'Num /',
  NumpadDecimal: 'Num .',
  NumpadEnter: 'Num Enter',
  NumpadEquals: 'Num =',
  LeftBracket: '[',
  RightBracket: ']',
  Semicolon: ';',
  Apostrophe: "'",
  Grave: '`',
  Minus: '-',
  Equal: '=',
  Comma: ',',
  Dot: '.',
  Slash: '/',
  BackSlash: '\\',
  F1: 'F1',
  F2: 'F2',
  F3: 'F3',
  F4: 'F4',
  F5: 'F5',
  F6: 'F6',
  F7: 'F7',
  F8: 'F8',
  F9: 'F9',
  F10: 'F10',
  F11: 'F11',
  F12: 'F12',
  F13: 'F13',
  F14: 'F14',
  F15: 'F15',
  F16: 'F16',
  F17: 'F17',
  F18: 'F18',
  F19: 'F19',
  F20: 'F20',
};

type KeyboardBindInputProps = {
  label: string;
  bind: string;
  defaultBind: string;
  onBindChange: (newBind: string) => void;
};

function KeyboardBindInput({
  label,
  bind,
  defaultBind,
  onBindChange,
}: KeyboardBindInputProps) {
  const [currentBind, setCurrentBind] = useState(bind);
  const [isRecording, setIsRecording] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isRecording) return;

    function handleKeyDown(e: KeyboardEvent) {
      e.preventDefault();

      if (e.key === 'Escape') {
        setIsRecording(false);
        return;
      }

      let rustKeyName: string;

      if (e.code in keycodeMappings) {
        rustKeyName = keycodeMappings[e.code]!;
      } else {
        console.warn('Unmapped key code:', e.code);
        rustKeyName = e.code;
      }

      setCurrentBind(rustKeyName);
      setIsRecording(false);
      onBindChange(rustKeyName);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRecording, onBindChange]);

  useEffect(() => {
    if (!isRecording) return;

    function handleClickOutside(e: MouseEvent) {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setIsRecording(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isRecording]);

  function startRecording() {
    setIsRecording(true);
  }

  function resetToDefault() {
    setCurrentBind(defaultBind);
    onBindChange(defaultBind);
  }

  const displayBind = displayMappings[currentBind] ?? currentBind;

  return (
    <div className='space-y-2'>
      <div>{label}</div>
      <div className='flex items-center gap-2'>
        <Button
          ref={buttonRef}
          variant={isRecording ? 'destructive' : 'outline'}
          className={cx(
            'flex w-40 items-center justify-between gap-2',
            isRecording && 'animate-pulse',
          )}
          onClick={startRecording}
        >
          <KeyboardIcon className='h-4 w-4' />
          <span className='truncate'>
            {isRecording ? 'Press a key...' : displayBind}
          </span>
        </Button>
        <Button
          variant='ghost'
          size='icon'
          onClick={resetToDefault}
          title='Reset to default'
        >
          <RotateCcwIcon className='h-4 w-4' />
        </Button>
      </div>
    </div>
  );
}

export { KeyboardBindInput };
