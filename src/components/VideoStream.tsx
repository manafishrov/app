import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from 'react';

function VideoStream() {
  const [streamUrl, setStreamUrl] = useState<string>('');

  useEffect(() => {
    invoke<string>('get_video_stream').then(setStreamUrl).catch(console.error);
  }, []);

  return (
    <div className='aspect-video w-full'>
      <div className='flex h-full w-full items-center justify-center text-muted-foreground'>
        {streamUrl ? (
          <video
            autoPlay
            playsInline
            className='h-full w-full object-contain'
            src={streamUrl}
          />
        ) : (
          'Loading video stream...'
        )}
      </div>
    </div>
  );
}

export { VideoStream };
