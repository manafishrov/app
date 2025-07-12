import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';

import { toast } from '@/components/ui/Toaster';

import { logError } from '@/lib/log';

import { type Regulator } from '@/stores/rovConfig';

function useRegulatorSuggestionsListener() {
  const [suggestions, setSuggestions] = useState<Regulator | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void (async () => {
      try {
        unlisten = await listen<Regulator>(
          'regulator_suggestions_received',
          (event) => {
            setSuggestions(event.payload);
          },
        );
      } catch (error) {
        logError('Failed to listen for ROV Regulator Suggestions:', error);
        toast.error('Failed to listen for ROV Regulator Suggestions');
      }
    })();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  return suggestions;
}

export { useRegulatorSuggestionsListener };
