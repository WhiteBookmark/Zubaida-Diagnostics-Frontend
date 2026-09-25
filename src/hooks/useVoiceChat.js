import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config/api';

/**
 * Normalizes and resolves the Socket.IO server URL based on the centralized API configuration.
 * Removes trailing slashes and handles empty or undefined configurations gracefully.
 *
 * @returns {string} Fully qualified or relative server origin
 */
const getSocketUrl = () => {
  if (typeof API_BASE_URL === 'string' && API_BASE_URL.trim() !== '') {
    return API_BASE_URL.trim().replace(/\/+$/, '');
  }
  return typeof window !== 'undefined' ? window.location.origin : '';
};

/**
 * Resolves the WebRTC ICE configuration.
 * When running on a local network (e.g. 192.168.0.118, 10.x.x.x, localhost) or when offline,
 * no external STUN servers are used because devices connect directly via LAN host candidates.
 * External STUN servers are only used when accessing via a public domain or remote tunnel.
 *
 * @returns {RTCConfiguration}
 */
const getIceConfiguration = () => {
  if (typeof window === 'undefined') {
    return { iceServers: [] };
  }

  const hostname = window.location.hostname || '';

  // Check if running on local private subnet or localhost
  const isPrivateIpOrLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);

  if (isPrivateIpOrLocal || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    // 100% Offline Local Network Mode (Zero external internet dependencies)
    return {
      iceServers: [],
      iceCandidatePoolSize: 0,
    };
  }

  // Public domain / remote internet mode: Use STUN servers for NAT traversal
  return {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };
};

/**
 * Custom hook to manage persistent real-time voice chat over Socket.IO and WebRTC.
 *
 * @param {string} currentUsername - The username of the authenticated logged-in user.
 * @returns {object} Voice chat state and control handlers
 */
export default function useVoiceChat(currentUsername) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [activeCall, setActiveCall] = useState(null); // username of current call peer or null
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [callError, setCallError] = useState(null);
  const [isConnectedToServer, setIsConnectedToServer] = useState(false);

  // References to preserve state across asynchronous WebRTC events without triggering re-renders
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const activePeerRef = useRef(null);
  const iceCandidateQueueRef = useRef([]);

  // Keep activePeerRef in sync with activeCall state
  useEffect(() => {
    activePeerRef.current = activeCall;
  }, [activeCall]);

  /**
   * Initializes or returns the hidden HTMLAudioElement used to play remote audio streams.
   */
  const getOrCreateAudioElement = useCallback(() => {
    if (!remoteAudioRef.current && typeof document !== 'undefined') {
      const audio = document.createElement('audio');
      audio.autoplay = true;
      audio.playsInline = true;
      audio.style.display = 'none';
      document.body.appendChild(audio);
      remoteAudioRef.current = audio;
    }
    return remoteAudioRef.current;
  }, []);

  /**
   * Cleans up any active WebRTC session while preserving the persistent Socket.IO connection.
   */
  const cleanupCall = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      try {
        peerConnectionRef.current.close();
      } catch (err) {
        console.warn('[VoiceChat] Error closing PeerConnection:', err);
      }
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.warn('[VoiceChat] Error stopping local tracks:', err);
      }
      localStreamRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    iceCandidateQueueRef.current = [];
    setActiveCall(null);
    activePeerRef.current = null;
    setIsConnecting(false);
    setIsMuted(false);
  }, []);

  /**
   * Obtains the user's local microphone stream with comprehensive error handling.
   *
   * @returns {Promise<MediaStream>}
   */
  const getLocalAudioStream = useCallback(async () => {
    if (localStreamRef.current && localStreamRef.current.active) {
      return localStreamRef.current;
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new Error('WebRTC audio is not supported in this browser or context (requires HTTPS or localhost).');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.error('[VoiceChat getUserMedia Error]:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('Microphone permission was denied. Please allow microphone access in your browser.', { cause: err });
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        throw new Error('No microphone detected on your system.', { cause: err });
      }
      throw new Error(`Microphone error: ${err.message || 'Unable to access audio device.'}`, { cause: err });
    }
  }, []);

  /**
   * Creates and configures an RTCPeerConnection instance for a given target peer.
   *
   * @param {string} targetUsername - Peer username
   * @param {MediaStream} stream - Local audio media stream
   * @returns {RTCPeerConnection}
   */
  const createPeerConnection = useCallback((targetUsername, stream) => {
    if (peerConnectionRef.current) {
      cleanupCall();
    }

    const pc = new RTCPeerConnection(getIceConfiguration());
    peerConnectionRef.current = pc;

    // Attach local audio tracks
    if (stream) {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }

    // Forward local ICE candidates to peer via signaling server
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current?.connected) {
        socketRef.current.emit('ice-candidate', {
          targetUsername,
          candidate: event.candidate,
        });
      }
    };

    // Receive and play remote audio track
    pc.ontrack = (event) => {
      console.log('[VoiceChat] Remote audio track received from:', targetUsername);
      const audioEl = getOrCreateAudioElement();
      if (audioEl && event.streams && event.streams[0]) {
        audioEl.srcObject = event.streams[0];
        audioEl.play().catch((playErr) => {
          console.warn('[VoiceChat] Autoplay audio error:', playErr);
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[VoiceChat] WebRTC state with ${targetUsername}:`, pc.connectionState);
      if (pc.connectionState === 'connected') {
        setIsConnecting(false);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        cleanupCall();
      }
    };

    return pc;
  }, [cleanupCall, getOrCreateAudioElement]);

  /**
   * Flushes any ICE candidates received prior to setting the remote description.
   *
   * @param {RTCPeerConnection} pc
   */
  const drainIceCandidates = useCallback(async (pc) => {
    if (!pc || !pc.remoteDescription) return;
    while (iceCandidateQueueRef.current.length > 0) {
      const candidate = iceCandidateQueueRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[VoiceChat] Error adding queued ICE candidate:', err);
      }
    }
  }, []);

  /**
   * Initiates a direct instant voice call to a target online user.
   *
   * @param {string} targetUsername - Target user to call
   */
  const callUser = useCallback(async (targetUsername) => {
    if (!targetUsername || typeof targetUsername !== 'string') return;
    const cleanTarget = targetUsername.trim();
    if (cleanTarget === currentUsername) return;

    setCallError(null);
    setIsConnecting(true);

    try {
      const localStream = await getLocalAudioStream();
      const pc = createPeerConnection(cleanTarget, localStream);

      setActiveCall(cleanTarget);
      activePeerRef.current = cleanTarget;

      // Notify signaling server that we are calling target
      socketRef.current?.emit('call-user', { targetUsername: cleanTarget });

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await pc.setLocalDescription(offer);

      socketRef.current?.emit('webrtc-offer', {
        targetUsername: cleanTarget,
        offer,
      });
    } catch (err) {
      console.error('[VoiceChat callUser Error]:', err);
      setCallError(err.message || 'Failed to start voice call.');
      cleanupCall();
    }
  }, [currentUsername, getLocalAudioStream, createPeerConnection, cleanupCall]);

  /**
   * Ends the current active call. Keeps the user online and Socket.IO connected.
   */
  const endCall = useCallback(() => {
    const peer = activePeerRef.current;
    if (peer && socketRef.current?.connected) {
      socketRef.current.emit('end-call', { targetUsername: peer });
    }
    cleanupCall();
  }, [cleanupCall]);

  /**
   * Toggles the user's microphone mute status.
   */
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getAudioTracks();
      if (tracks.length > 0) {
        const nextMuted = !isMuted;
        tracks[0].enabled = !nextMuted;
        setIsMuted(nextMuted);
      }
    } else {
      setIsMuted((prev) => !prev);
    }
  }, [isMuted]);

  /**
   * Toggles muting of incoming remote audio playback.
   */
  const toggleRemoteMute = useCallback(() => {
    if (remoteAudioRef.current) {
      const nextRemoteMuted = !isRemoteMuted;
      remoteAudioRef.current.muted = nextRemoteMuted;
      setIsRemoteMuted(nextRemoteMuted);
    }
  }, [isRemoteMuted]);

  // Main Socket.IO connection lifecycle
  useEffect(() => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token || !currentUsername) {
      return;
    }

    const socketUrl = getSocketUrl();
    const socket = io(socketUrl, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[VoiceChat] Connected to signaling server as:', currentUsername);
      setIsConnectedToServer(true);
      setCallError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('[VoiceChat] Disconnected from signaling server:', reason);
      setIsConnectedToServer(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[VoiceChat] Signaling connection error:', err.message);
      setIsConnectedToServer(false);
    });

    // Receive initial roster
    socket.on('user-roster', (data) => {
      if (data && Array.isArray(data.onlineUsers)) {
        setOnlineUsers(data.onlineUsers.map(String));
      }
      if (data && Array.isArray(data.registeredUsers)) {
        setRegisteredUsers(data.registeredUsers.map(String));
      }
      if (data && data.activeCall) {
        setActiveCall(String(data.activeCall));
      }
    });

    // User online notification
    socket.on('user-online', (data) => {
      if (data && Array.isArray(data.onlineUsers)) {
        setOnlineUsers(data.onlineUsers.map(String));
      } else if (data && data.username) {
        setOnlineUsers((prev) => [...prev, String(data.username)]);
      }
    });

    // User offline notification
    socket.on('user-offline', (data) => {
      if (data && Array.isArray(data.onlineUsers)) {
        setOnlineUsers(data.onlineUsers.map(String));
      } else if (data && data.username) {
        setOnlineUsers((prev) => {
          const idx = prev.indexOf(String(data.username));
          if (idx !== -1) {
            const next = [...prev];
            next.splice(idx, 1);
            return next;
          }
          return prev;
        });
      }
    });

    // Receive WebRTC offer from peer (Automatic acceptance — no prompt needed)
    socket.on('webrtc-offer', async (data) => {
      try {
        if (!data || !data.from || !data.offer) return;
        const caller = String(data.from).trim();
        const offer = data.offer;

        console.log(`[VoiceChat] Auto-accepting direct incoming call from "${caller}"`);
        setIsConnecting(true);
        setActiveCall(caller);
        activePeerRef.current = caller;

        const localStream = await getLocalAudioStream();
        const pc = createPeerConnection(caller, localStream);

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await drainIceCandidates(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc-answer', {
          targetUsername: caller,
          answer,
        });
      } catch (err) {
        console.error('[VoiceChat Error handling incoming offer]:', err);
        setCallError(`Error connecting with ${data?.from || 'peer'}: ${err.message}`);
        cleanupCall();
      }
    });

    // Receive WebRTC answer from callee
    socket.on('webrtc-answer', async (data) => {
      try {
        if (!data || !data.answer) return;
        const pc = peerConnectionRef.current;
        if (pc && pc.signalingState !== 'closed') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          await drainIceCandidates(pc);
        }
      } catch (err) {
        console.error('[VoiceChat Error setting remote answer]:', err);
        setCallError('WebRTC handshake failed.');
        cleanupCall();
      }
    });

    // Receive ICE candidate from peer
    socket.on('ice-candidate', async (data) => {
      try {
        if (!data || !data.candidate) return;
        const pc = peerConnectionRef.current;
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          iceCandidateQueueRef.current.push(data.candidate);
        }
      } catch (err) {
        console.warn('[VoiceChat Error adding ICE candidate]:', err);
      }
    });

    // Call ended by remote peer
    socket.on('call-ended', (data) => {
      console.log('[VoiceChat] Call ended event received:', data);
      cleanupCall();
    });

    // Signaling error received from server
    socket.on('call-error', (data) => {
      if (data && data.message) {
        setCallError(String(data.message));
      }
      setIsConnecting(false);
      cleanupCall();
    });

    // Cleanup on unmount or user change
    return () => {
      cleanupCall();
      socket.disconnect();
      socketRef.current = null;
      if (remoteAudioRef.current && remoteAudioRef.current.parentNode) {
        remoteAudioRef.current.parentNode.removeChild(remoteAudioRef.current);
        remoteAudioRef.current = null;
      }
    };
  }, [currentUsername, getLocalAudioStream, createPeerConnection, drainIceCandidates, cleanupCall]);

  return {
    onlineUsers,
    registeredUsers,
    activeCall,
    isConnecting,
    isMuted,
    isRemoteMuted,
    callError,
    isConnectedToServer,
    callUser,
    endCall,
    toggleMute,
    toggleRemoteMute,
    clearError: () => setCallError(null),
  };
}
