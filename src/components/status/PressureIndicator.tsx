import { statusStore } from '@/stores/statusStore';
import { useStore } from '@tanstack/react-store';
import { Waves } from 'lucide-react';

function PressureIndicator() {
  const { pressure } = useStore(statusStore);

  return (
    <div className="flex items-center gap-1">
      <Waves className="w-4 h-4" />
      <span className="text-xs">{pressure.toFixed(1)} PSI</span>
    </div>
  );
}

export { PressureIndicator };

