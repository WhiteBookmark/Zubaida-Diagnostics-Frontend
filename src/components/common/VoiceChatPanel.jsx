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
} from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import useVoiceChat from '../../hooks/useVoiceChat';
import '../../styles/VoiceChat.css';

/**
 * VoiceChatPanel Component
 * Provides a persistent sticky bottom-left floating action button (FAB)
 * and an expandable glassmorphism card for 1-tap instant voice communication in the clinic.
 *
 * @param {object} props
 * @param {string} props.username - The authenticated logged-in username
 */
export default function VoiceChatPanel({ username }) {
  const [isOpen, setIsOpen] = useState(false);

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

  // Display ONLY users who are actually online (self first, then other online users)
  const displayedOnlineUsers = useMemo(() => {
    const rawSet = new Set(onlineUsers || []);
    if (username) {
      rawSet.add(username);
    }

    const users = Array.from(rawSet).filter(Boolean);

    // Current user first, then online peers sorted alphabetically
    return users.sort((a, b) => {
      if (a === username) return -1;
      if (b === username) return 1;
      return a.localeCompare(b);
    });
  }, [username, onlineUsers]);

  // Online count excluding self
  const onlineOtherCount = useMemo(() => {
    return onlineUsers.filter((u) => u !== username).length;
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
              <span
                className={`vc-status-pill ${
                  isConnectedToServer ? '' : 'vc-status-pill--offline'
                }`}
                title={isConnectedToServer ? 'Connected to signaling server' : 'Disconnected from server'}
              >
                {isConnectedToServer ? 'Live' : 'Offline'}
              </span>
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
            {displayedOnlineUsers.map((user) => {
              const isSelf = user === username;
              const isOnline = isSelf ? isConnectedToServer : onlineUsers.includes(user);
              const isInCallWithUser = activeCall === user;

              return (
                <div
                  key={user}
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
                      {isSelf && <span className="vc-self-tag">You</span>}
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

      {/* Floating Action Button (Sticky Bottom-Left) */}
      <button
        type="button"
        className={`vc-fab-button ${
          activeCall ? 'vc-fab-button--in-call' : ''
        } ${isConnecting ? 'vc-fab-button--connecting' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
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
    </aside>
  );
}
