import { useConfigStore } from '@/stores/configStore';
import { useEffect, useRef, useState } from 'react';

const RETRY_DELAY = 5000;

function VideoStream() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const config = useConfigStore((state) => state.config);

  const setupWebRTCConnection = async () => {
    try {
      if (!config) return;

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }

      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      if (videoRef.current) {
        pc.ontrack = (event) => {
          const stream = event.streams[0];
          if (stream && videoRef.current) {
            setIsLoading(true);
            videoRef.current.srcObject = stream;

            videoRef.current.onplaying = () => {
              setIsLoading(false);
              setHasError(false);
            };
          }
        };
      }

      pc.oniceconnectionstatechange = () => {
        if (
          pc.iceConnectionState === 'failed' ||
          pc.iceConnectionState === 'disconnected' ||
          pc.iceConnectionState === 'closed'
        ) {
          setHasError(true);
          setIsLoading(false);
          scheduleRetry();
        }
      };

      pc.addTransceiver('video', { direction: 'recvonly' });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const response = await fetch(
        `http://${config.ip}:${config.streamPort}/cam/whep`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        },
      );

      if (!response.ok) throw new Error('Failed to connect to stream');

      const answer = await response.text();
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answer,
      });
    } catch (error) {
      console.error('WebRTC setup failed:', error);
      setHasError(true);
      setIsLoading(false);
      scheduleRetry();
    }
  };

  const scheduleRetry = () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    retryTimeoutRef.current = setTimeout(() => {
      void setupWebRTCConnection();
    }, RETRY_DELAY);
  };

  useEffect(() => {
    void setupWebRTCConnection();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [config?.ip, config?.streamPort]);

  return (
    <div className='relative aspect-video w-full'>
      <video
        ref={videoRef}
        className='h-full w-full'
        autoPlay
        playsInline
        muted
      />
      {(isLoading || hasError) && (
        <div className='absolute inset-0 flex items-center justify-center bg-black'>
          <div className='text-center text-white'>
            {isLoading ? (
              <p>Connecting to CyberFish drone camera...</p>
            ) : (
              <p>Unable to connect to drone camera. Retrying...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { VideoStream };
