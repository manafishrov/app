import { KeyboardIcon, RotateCcwIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';

import { cx } from '@/lib/utils';

const mappings: Record<string, string> = {
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
  Digit1: '1',
  Digit2: '2',
  Digit3: '3',
  Digit4: '4',
  Digit5: '5',
  Digit6: '6',
  Digit7: '7',
  Digit8: '8',
  Digit9: '9',
  Digit0: '0',
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
  Enter: 'return',
  Escape: 'esc',
  Backspace: 'delete',
  Tab: 'tap',
  Space: 'space',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Backquote: '`',
  Comma: ',',
  Period: '.',
  Slash: '/',
  CapsLock: 'caps lock',
  ArrowRight: '→',
  ArrowLeft: '←',
  ArrowDown: '↓',
  ArrowUp: '↑',
  ControlLeft: 'left control',
  ShiftLeft: 'left shift',
  AltLeft: 'left alt',
  MetaLeft: 'left meta',
  ControlRight: 'right control',
  ShiftRight: 'right shift',
  AltRight: 'right alt',
  MetaRight: 'right meta',
  PrintScreen: 'prtsc',
  ScrollLock: 'scrlk',
  Pause: 'pause',
  Insert: 'ins',
  Home: 'home',
  PageUp: 'pgup',
  Delete: 'del',
  End: 'end',
  PageDown: 'pgdn',
  NumLock: 'numlk',
  NumpadDivide: 'num /',
  NumpadMultiply: 'num *',
  NumpadSubtract: 'num -',
  NumpadAdd: 'num +',
  NumpadEnter: 'num return',
  Numpad1: 'num 1',
  Numpad2: 'num 2',
  Numpad3: 'num 3',
  Numpad4: 'num 4',
  Numpad5: 'num 5',
  Numpad6: 'num 6',
  Numpad7: 'num 7',
  Numpad8: 'num 8',
  Numpad9: 'num 9',
  Numpad0: 'num 0',
  NumpadDecimal: 'num .',
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

      setCurrentBind(e.code);
      setIsRecording(false);
      onBindChange(e.code);
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
            {isRecording
              ? 'Press a key...'
              : (mappings[currentBind] ?? currentBind)}
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
