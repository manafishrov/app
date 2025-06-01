import { listen } from '@tauri-apps/api/event';

import { toast } from '@/components/ui/Toaster';

async function initializeUpdateListener() {
  try {
    await listen('update-available', () => {
      toast.info('Update available', {
        description: 'Downloading update...',
      });
    });

    await listen<{ downloaded: number; total: number }>(
      'update-progress',
      ({ payload }) => {
        const progress = Math.round((payload.downloaded / payload.total) * 100);
        toast.loading(`Downloading: ${progress}%`, {
          id: 'update-progress',
        });
      },
    );

    await listen('update-downloaded', () => {
      toast.success('Update downloaded', {
        description: 'Installing...',
      });
    });

    await listen('update-installing', () => {
      toast.loading('Installing update...', {
        description: 'The app will restart automatically.',
      });
    });
  } catch (error) {
    console.error('Failed to initialize update listener:', error);
  }
}

void initializeUpdateListener();
