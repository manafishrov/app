import { useStore } from '@tanstack/react-store';
import { useEffect, useRef, useState } from 'react';

import { StatusOverlay } from '@/components/status/StatusOverlay';

import { configStore } from '@/stores/configStore';

const RETRY_DELAY = 3000;

function VideoStream() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const config = useStore(configStore, (state) => state);

  async function setupWebRTCConnection() {
    try {
      if (!config) return;

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }

      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      if (videoRef.current) {
        pc.ontrack = (event) => {
          setIsLoading(true);
          const stream = event.streams[0];
          if (stream && videoRef.current) {
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
        `http://${config.ipAddress}:${config.webrtcSignalingApiPort}${config.webrtcSignalingApiPath}`,
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
  }

  function scheduleRetry() {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    retryTimeoutRef.current = setTimeout(() => {
      void setupWebRTCConnection();
    }, RETRY_DELAY);
  }

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
  }, [
    config?.ipAddress,
    config?.webrtcSignalingApiPort,
    config?.webrtcSignalingApiPath,
  ]);

  return (
    <>
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
      <StatusOverlay />
    </>
  );
}

export { VideoStream };
