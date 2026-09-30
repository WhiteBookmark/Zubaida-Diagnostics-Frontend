import { useState, useMemo } from 'react';
import {
  HeadsetMic,
  Mic,
  MicOff,
  Call,
  CallEnd,
  VolumeUp,
  VolumeOff,
  Close,
  PhoneInTalk,
  QrCodeScanner,
} from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import { Html5Qrcode } from 'html5-qrcode';
import { useRef, useEffect } from 'react';
import useVoiceChat from '../../hooks/useVoiceChat';
import '../../styles/VoiceChat.css';

/**
 * VoiceChatPanel Component
 * Provides a persistent sticky bottom-left floating action button (FAB)
 * and an expandable glassmorphism card for 1-tap instant voice communication in the clinic.
 *
 * @param {object} props
 * @param {string} props.username - The authenticated logged-in username
 * @param {Function} [props.onQrScanResult] - Callback when an MR number is scanned via QR
 */
export default function VoiceChatPanel({ username, onQrScanResult }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const qrScannerRef = useRef(null);

  const startQrScanner = () => {
    setIsQrScannerOpen(true);
    setIsOpen(false);
    setTimeout(async () => {
      try {
        if (qrScannerRef.current) {
          try {
            await qrScannerRef.current.stop();
          } catch {
            // ignore
          }
          qrScannerRef.current = null;
        }

        const html5QrCode = new Html5Qrcode('qr-reader-container');
        qrScannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
          },
          (decodedText) => {
            let extractedMr = null;
            try {
              const parsed = JSON.parse(decodedText);
              extractedMr = parsed['MR Number'] || parsed['mrNumber'] || parsed['MR'] || parsed['mr'];
            } catch {
              const trimmed = String(decodedText || '').trim();
              if (/^\d+$/.test(trimmed)) {
                extractedMr = trimmed;
              }
            }

            if (extractedMr) {
              stopQrScanner();
              if (onQrScanResult) {
                onQrScanResult(String(extractedMr).trim());
              }
            }
          },
          () => {
            // Silent ignore for frames without QR codes
          }
        );
      } catch (err) {
        console.error('Camera QR scanner failed to start:', err);
      }
    }, 150);
  };

  const stopQrScanner = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current
        .stop()
        .then(() => {
          try {
            qrScannerRef.current?.clear?.();
          } catch {
            // ignore
          }
          qrScannerRef.current = null;
        })
        .catch(() => {
          qrScannerRef.current = null;
        });
    }
    setIsQrScannerOpen(false);
  };

  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const {
    onlineUsers,
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
    clearError,
  } = useVoiceChat(username);

  // Display all online user sessions (self first, then other online users)
  const displayedOnlineUsers = useMemo(() => {
    const users = [...(onlineUsers || [])].filter(Boolean);

    // Ensure self is present at least once if connected
    if (username && !users.includes(username)) {
      users.unshift(username);
    }

    // Current user sessions first, then online peers sorted alphabetically
    return users.sort((a, b) => {
      if (a === username && b !== username) return -1;
      if (b === username && a !== username) return 1;
      return a.localeCompare(b);
    });
  }, [username, onlineUsers]);

  // Online count excluding self's primary session
  const onlineOtherCount = useMemo(() => {
    const list = onlineUsers || [];
    const selfFirstIndex = list.indexOf(username);
    if (selfFirstIndex === -1) {
      return list.length;
    }
    return list.filter((_, idx) => idx !== selfFirstIndex).length;
  }, [onlineUsers, username]);

  return (
    <aside className="vc-floating-container" aria-label="Clinic Voice Chat">
      {/* Expanded Glassmorphism Card */}
      {isOpen && (
        <section className="vc-card-panel" role="dialog" aria-label="Voice Chat Directory">
          {/* Header */}
          <div className="vc-header">
            <h2 className="vc-header-title">
              <HeadsetMic style={{ fontSize: 20 }} />
              Voice Chat
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                className="vc-close-button"
                onClick={() => setIsOpen(false)}
                title="Close Voice Chat Panel"
                aria-label="Close Voice Chat Panel"
              >
                <Close style={{ fontSize: 20 }} />
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {callError && (
            <div className="vc-alert-banner" role="alert">
              <span>{callError}</span>
              <button
                type="button"
                className="vc-close-button"
                style={{ color: 'hsl(0, 0%, 100%)', padding: 2 }}
                onClick={clearError}
                aria-label="Dismiss Alert"
              >
                <Close style={{ fontSize: 16 }} />
              </button>
            </div>
          )}

          {/* Active Call Status Bar */}
          {activeCall && (
            <div className="vc-active-call-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PhoneInTalk style={{ fontSize: 18, color: 'var(--vc-green-7)' }} />
                <span className="vc-active-call-text">
                  In Call With: <strong>{activeCall}</strong>
                </span>
              </div>
              <button
                type="button"
                className="vc-action-btn-circle vc-action-btn-circle--end"
                onClick={endCall}
                title={`End Call With ${activeCall}`}
                aria-label={`End Call With ${activeCall}`}
              >
                <CallEnd style={{ fontSize: 18 }} />
              </button>
            </div>
          )}

          {/* Scrollable User Directory */}
          {/* Scrollable Online User Directory */}
          <div className="vc-user-list">
            {displayedOnlineUsers.map((user, index) => {
              const isSelf = user === username && index === 0;
              const isOtherSelf = user === username && index > 0;
              const isOnline = isSelf ? isConnectedToServer : onlineUsers.includes(user);
              const isInCallWithUser = activeCall === user;

              return (
                <div
                  key={`${user}-${index}`}
                  className={`vc-user-row ${
                    isInCallWithUser ? 'vc-user-row--active-call' : ''
                  } ${isSelf ? 'vc-user-row--self' : ''}`}
                >
                  <div className="vc-user-info">
                    <span
                      className={`vc-online-indicator ${
                        isOnline ? 'vc-online-indicator--online' : ''
                      }`}
                      title={isOnline ? 'Online' : 'Offline'}
                    />
                    <span className="vc-username-label">
                      {user}
                      {isOtherSelf && <span className="vc-self-tag" style={{ background: 'hsla(217, 91%, 60%, 0.15)', color: 'hsl(217, 91%, 45%)' }}>Other PC</span>}
                    </span>
                  </div>

                    <div className="vc-action-buttons">
                      {isSelf ? (
                        /* Self Microphone Mute/Unmute Control */
                        <button
                          type="button"
                          className={`vc-action-btn-circle ${
                            isMuted
                              ? 'vc-action-btn-circle--unmute'
                              : 'vc-action-btn-circle--mute'
                          }`}
                          onClick={toggleMute}
                          title={isMuted ? 'Unmute My Microphone' : 'Mute My Microphone'}
                          aria-label={isMuted ? 'Unmute My Microphone' : 'Mute My Microphone'}
                        >
                          {isMuted ? (
                            <MicOff style={{ fontSize: 16 }} />
                          ) : (
                            <Mic style={{ fontSize: 16 }} />
                          )}
                        </button>
                      ) : isInCallWithUser ? (
                        /* Active Call Peer Controls */
                        <>
                          <button
                            type="button"
                            className={`vc-action-btn-circle ${
                              isRemoteMuted
                                ? 'vc-action-btn-circle--unmute'
                                : 'vc-action-btn-circle--mute'
                            }`}
                            onClick={toggleRemoteMute}
                            title={isRemoteMuted ? `Unmute Audio From ${user}` : `Mute Audio From ${user}`}
                            aria-label={isRemoteMuted ? `Unmute Audio From ${user}` : `Mute Audio From ${user}`}
                          >
                            {isRemoteMuted ? (
                              <VolumeOff style={{ fontSize: 16 }} />
                            ) : (
                              <VolumeUp style={{ fontSize: 16 }} />
                            )}
                          </button>
                          <button
                            type="button"
                            className="vc-action-btn-circle vc-action-btn-circle--end"
                            onClick={endCall}
                            title={`End Call With ${user}`}
                            aria-label={`End Call With ${user}`}
                          >
                            <CallEnd style={{ fontSize: 16 }} />
                          </button>
                        </>
                      ) : (
                        /* Direct Call Button (1-Tap instant voice) */
                        <button
                          type="button"
                          className="vc-action-btn-circle vc-action-btn-circle--call"
                          disabled={!isOnline || !!activeCall || isConnecting}
                          onClick={() => callUser(user)}
                          title={
                            !isOnline
                              ? `${user} Is Offline`
                              : activeCall
                              ? 'Another Call Is In Progress'
                              : `Tap To Talk With ${user} (Instant)`
                          }
                          aria-label={`Call ${user}`}
                        >
                          {isConnecting && activeCall === user ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <Call style={{ fontSize: 16 }} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            {onlineOtherCount === 0 && (
              <p className="vc-empty-message">No other staff members online right now</p>
            )}
          </div>

          {/* Footer Controls */}
          <div className="vc-controls-footer">
            <div className="vc-control-item">
              <span className="vc-control-label">My Mic:</span>
              <button
                type="button"
                className={`vc-toggle-btn ${isMuted ? 'vc-toggle-btn--muted' : ''}`}
                onClick={toggleMute}
                title={isMuted ? 'Click To Unmute Mic' : 'Click To Mute Mic'}
              >
                {isMuted ? (
                  <>
                    <MicOff style={{ fontSize: 16 }} />
                    Muted
                  </>
                ) : (
                  <>
                    <Mic style={{ fontSize: 16 }} />
                    Active
                  </>
                )}
              </button>
            </div>

            {activeCall && (
              <button
                type="button"
                className="vc-toggle-btn vc-toggle-btn--muted"
                onClick={endCall}
                title="End Active Voice Call"
              >
                <CallEnd style={{ fontSize: 16 }} />
                End Call
              </button>
            )}
          </div>
        </section>
      )}

      {/* QR Scanner Floating Card */}
      {isQrScannerOpen && (
        <div className="vc-qr-scanner-panel">
          <div className="vc-header">
            <h2 className="vc-header-title">
              <QrCodeScanner style={{ fontSize: 20, color: 'var(--vc-grey-10)' }} />
              Scan Patient QR Code
            </h2>
            <button
              type="button"
              className="vc-close-button"
              onClick={stopQrScanner}
              aria-label="Close QR Scanner"
            >
              <Close style={{ fontSize: 20 }} />
            </button>
          </div>
          <div id="qr-reader-container" style={{ width: '100%', minHeight: '260px', padding: '8px', boxSizing: 'border-box' }} />
          <div style={{ padding: '8px 14px', fontSize: '12px', color: 'var(--vc-grey-7)', textAlign: 'center', background: 'hsl(210, 40%, 96%)' }}>
            Point camera at patient receipt QR code
          </div>
        </div>
      )}

      {/* Floating Action Buttons Row (Sticky Bottom-Left) */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'center' }}>
        {/* QR Code Scanner FAB */}
        <button
          type="button"
          className="vc-fab-button"
          onClick={isQrScannerOpen ? stopQrScanner : startQrScanner}
          title={isQrScannerOpen ? 'Close QR Scanner' : 'Scan Patient QR Code'}
          aria-label={isQrScannerOpen ? 'Close QR Scanner' : 'Scan Patient QR Code'}
        >
          <span className="vc-icon-circle" style={{ background: isQrScannerOpen ? 'hsl(0, 84%, 48%)' : 'hsl(280, 65%, 42%)' }}>
            {isQrScannerOpen ? (
              <Close style={{ fontSize: 22 }} />
            ) : (
              <QrCodeScanner style={{ fontSize: 22 }} />
            )}
          </span>
        </button>

        {/* Clinic Voice Chat FAB */}
        <button
          type="button"
          className={`vc-fab-button ${
            activeCall ? 'vc-fab-button--in-call' : ''
          } ${isConnecting ? 'vc-fab-button--connecting' : ''}`}
          onClick={() => {
            if (isQrScannerOpen) stopQrScanner();
            setIsOpen((prev) => !prev);
          }}
          title="Toggle Clinic Voice Chat"
          aria-label="Toggle Clinic Voice Chat"
        >
          <span className="vc-icon-circle">
            {activeCall ? (
              <PhoneInTalk style={{ fontSize: 24 }} />
            ) : (
              <HeadsetMic style={{ fontSize: 24 }} />
            )}
          </span>

          {/* Counter Badge for Online Users */}
          <span
            className={`vc-counter-badge ${
              onlineOtherCount > 0 ? 'vc-counter-badge--active' : ''
            }`}
            title={`${onlineOtherCount} Online Staff Member${
              onlineOtherCount === 1 ? '' : 's'
            }`}
          >
            {onlineOtherCount}
          </span>
        </button>
      </div>
    </aside>
  );
}
