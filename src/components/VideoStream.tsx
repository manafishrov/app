import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useEffect, useRef, useState } from 'react';

function VideoStream() {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>(
    'connecting',
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let unlisten: () => void;

    async function setupVideoStream() {
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Set these to match your video dimensions
        const WIDTH = 1280;
        const HEIGHT = 720;

        canvas.width = WIDTH;
        canvas.height = HEIGHT;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('Failed to get canvas context');
          return;
        }

        unlisten = await listen('video-frame', (event) => {
          try {
            const base64Data = event.payload as string;
            const binaryString = window.atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);

            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            // Create ImageData from the RGBA bytes
            const imageData = new ImageData(
              new Uint8ClampedArray(bytes.buffer),
              WIDTH,
              HEIGHT,
            );

            // Put the image data directly to canvas
            ctx.putImageData(imageData, 0, 0);
          } catch (err) {
            console.error('Error processing frame:', err);
          }
        });

        await invoke('start_video_stream');
        setStatus('connected');
      } catch (err) {
        console.error('Failed to start video stream:', err);
        setStatus('error');
      }
    }

    void setupVideoStream();

    return () => {
      unlisten?.();
      invoke('stop_video_stream').catch(console.error);
    };
  }, []);

  return (
    <div className='relative aspect-video w-full bg-black' id='video-stream'>
      <canvas
        ref={canvasRef}
        className='h-full w-full'
        style={{
          display: status === 'connected' ? 'block' : 'none',
          backgroundColor: 'black',
        }}
      />
      {status !== 'connected' && (
        <div className='absolute inset-0 flex items-center justify-center text-white'>
          {status === 'connecting'
            ? 'Connecting to video stream...'
            : 'Failed to connect to video stream'}
        </div>
      )}
    </div>
  );
}

export { VideoStream };
