import { useState, useRef, useCallback, useEffect } from 'react';

export type RecorderState = 'idle' | 'recording' | 'preview';

export interface UseVideoRecorderReturn {
  state: RecorderState;
  stream: MediaStream | null;
  videoBlob: Blob | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
}

export const useVideoRecorder = (): UseVideoRecorderReturn => {
  const [state, setState] = useState<RecorderState>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Check if browser supports required APIs
  const checkBrowserSupport = useCallback((): boolean => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Your browser does not support video recording. Please use a modern browser like Chrome, Firefox, or Edge.');
      return false;
    }
    if (!window.MediaRecorder) {
      setError('MediaRecorder API is not supported in your browser.');
      return false;
    }
    return true;
  }, []);

  // Get supported mime type
  const getSupportedMimeType = useCallback((): string => {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return ''; // Will use browser default
  }, []);

  // Start recording
  const startRecording = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      if (!checkBrowserSupport()) {
        return;
      }

      // Request camera and microphone permissions
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      setStream(mediaStream);

      // Get supported mime type
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(mediaStream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Handle data available
      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || 'video/webm'
        });
        setVideoBlob(blob);
        setState('preview');

        // Stop all tracks
        mediaStream.getTracks().forEach(track => track.stop());
        setStream(null);
      };

      // Handle errors
      mediaRecorder.onerror = (event: Event) => {
        console.error('MediaRecorder error:', event);
        setError('An error occurred during recording. Please try again.');
        setState('idle');
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setState('recording');

    } catch (err) {
      console.error('Error starting recording:', err);

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Camera and microphone access denied. Please allow access to record your presentation.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No camera or microphone found. Please connect a camera and microphone to record.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setError('Camera or microphone is already in use by another application.');
        } else {
          setError(`Unable to access camera: ${err.message}`);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }

      setState('idle');
    }
  }, [checkBrowserSupport, getSupportedMimeType]);

  // Stop recording
  const stopRecording = useCallback((): void => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Reset recording
  const resetRecording = useCallback((): void => {
    // Stop any active recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop any active stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    // Reset state
    setState('idle');
    setStream(null);
    setVideoBlob(null);
    setError(null);
    chunksRef.current = [];
  }, [stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop recording if active
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      // Stop all tracks
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return {
    state,
    stream,
    videoBlob,
    error,
    startRecording,
    stopRecording,
    resetRecording
  };
};
