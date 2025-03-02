import { KeyboardIcon, RotateCcwIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';

import { cx } from '@/lib/utils';

type KeyboardBindInputProps = {
  label: string;
  bind: string;
  defaultBind: string;
  onBindChange: (newBind: string) => void;
  className?: string;
};

function KeyboardBindInput({
  label,
  bind,
  defaultBind,
  onBindChange,
  className,
}: KeyboardBindInputProps) {
  const [currentBind, setCurrentBind] = useState(bind);
  const [isRecording, setIsRecording] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isRecording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();

      let keyName = e.key;

      if (e.key === ' ') keyName = 'Space';
      else if (e.key === 'ArrowUp') keyName = '↑';
      else if (e.key === 'ArrowDown') keyName = '↓';
      else if (e.key === 'ArrowLeft') keyName = '←';
      else if (e.key === 'ArrowRight') keyName = '→';
      else if (e.key === 'Control') keyName = 'Ctrl';
      else if (e.key === 'Escape') {
        setIsRecording(false);
        return;
      }

      if (keyName.length === 1) {
        keyName = keyName.toUpperCase();
      }

      setCurrentBind(keyName);
      setIsRecording(false);
      onBindChange(keyName);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRecording, onBindChange]);

  useEffect(() => {
    if (!isRecording) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setIsRecording(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isRecording]);

  const startRecording = () => {
    setIsRecording(true);
  };

  const resetToDefault = () => {
    setCurrentBind(defaultBind);
    onBindChange(defaultBind);
  };

  return (
    <div className={cx('flex items-center justify-between', className)}>
      <div className='font-medium'>{label}</div>
      <div className='flex items-center gap-2'>
        <Button
          ref={buttonRef}
          variant={isRecording ? 'destructive' : 'outline'}
          className={cx(
            'flex min-w-[100px] items-center gap-2',
            isRecording && 'animate-pulse',
          )}
          onClick={startRecording}
        >
          <KeyboardIcon className='h-4 w-4' />
          {isRecording ? 'Press a key...' : currentBind}
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
