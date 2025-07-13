import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';

import { toast } from '@/components/ui/Toaster';

import { logError } from '@/lib/log';

import { type Regulator } from '@/stores/rovConfig';

type RegulatorSuggestions = Omit<Regulator, 'turnSpeed'>;

function useRegulatorSuggestionsListener() {
  const [suggestions, setSuggestions] = useState<RegulatorSuggestions | null>(
    null,
  );

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void (async () => {
      try {
        unlisten = await listen<RegulatorSuggestions>(
          'regulator_suggestions_received',
          ({payload}) => {
            setSuggestions(payload);
          },
        );
      } catch (error) {
        logError('Failed to listen for ROV regulator suggestions:', error);
        toast.error('Failed to listen for ROV regulator suggestions');
      }
    })();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  return suggestions;
}

export { useRegulatorSuggestionsListener };
