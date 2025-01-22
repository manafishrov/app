import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useState } from 'react';

function VideoStream() {
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);

  const checkConnection = useCallback(() => {
    void (async () => {
      try {
        const connected = await invoke<boolean>('check_connection');
        setIsConnected(connected);

        if (connected && !streamUrl) {
          const url = await invoke<string>('get_video_stream');
          setStreamUrl(url);
        } else if (!connected && streamUrl) {
          setStreamUrl('');
        }
      } catch (error) {
        console.error(error);
        setIsConnected(false);
        setStreamUrl('');
      }
    })();
  }, [streamUrl]);

  useEffect(() => {
    checkConnection();
    const intervalId = setInterval(checkConnection, 1000);
    return () => clearInterval(intervalId);
  }, [checkConnection]);

  return (
    <div className='aspect-video w-full'>
      {streamUrl ? (
        <img
          src={streamUrl}
          className='h-full w-full object-contain'
          alt='ROV stream'
        />
      ) : (
        <div className='flex h-full w-full items-center justify-center'>
          Waiting for ROV connection...
        </div>
      )}
      <div
        className={`absolute right-2 top-2 h-3 w-3 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
    </div>
  );
}

export { VideoStream };
