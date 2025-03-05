import { KeyboardIcon, RotateCcwIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';

import { cx } from '@/lib/utils';

const keyMappings: Record<string, string> = {
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  ' ': 'Space',
  Enter: 'Return',
  Backspace: 'Back',
  CapsLock: 'Capital',
  ScrollLock: 'Scroll',
  PrintScreen: 'Snapshot',
  ',': 'Comma',
  '.': 'Period',
  '/': 'Slash',
  '\\': 'Backslash',
  '[': 'LBracket',
  ']': 'RBracket',
  '=': 'Equals',
  '-': 'Minus',
  '`': 'Grave',
  ';': 'Semicolon',
  "'": 'Apostrophe',
};

const displayMappings: Record<string, string> = {
  Up: '↑',
  Down: '↓',
  Left: '←',
  Right: '→',
  Return: 'Enter',
  Back: 'Backspace',
  Capital: 'Caps Lock',
  Numlock: 'Num Lock',
  Scroll: 'Scroll Lock',
  Snapshot: 'Print Screen',
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

      if (
        e.key === 'Control' ||
        e.key === 'Shift' ||
        e.key === 'Alt' ||
        e.key === 'Meta'
      ) {
        const prefix = e.location === 1 ? 'L' : e.location === 2 ? 'R' : '';
        rustKeyName = prefix + e.key;
      } else if (e.key in keyMappings) {
        rustKeyName = keyMappings[e.key]!;
      } else if (e.key.length === 1) {
        rustKeyName = e.key.toUpperCase();
      } else {
        rustKeyName = e.key;
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
