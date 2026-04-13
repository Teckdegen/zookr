// All STUN + TURN servers hardcoded — no env vars
// Multiple servers = automatic failover, zero downtime

export function getIceServers(): RTCIceServer[] {
  return [
    // ── STUN — Google (5 endpoints) ──────────────────────────────────────
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },

    // ── STUN — Cloudflare ────────────────────────────────────────────────
    { urls: 'stun:stun.cloudflare.com:3478' },

    // ── STUN — Twilio ────────────────────────────────────────────────────
    { urls: 'stun:global.stun.twilio.com:3478' },

    // ── STUN — Metered ───────────────────────────────────────────────────
    { urls: 'stun:openrelay.metered.ca:80' },
    { urls: 'stun:openrelay.metered.ca:443' },

    // ── STUN — Misc public ───────────────────────────────────────────────
    { urls: 'stun:stunserver.stunprotocol.org:3478' },
    { urls: 'stun:stun.voip.blackberry.com:3478' },
    { urls: 'stun:stun.antisip.com:3478' },
    { urls: 'stun:stun.bluesip.net:3478' },
    { urls: 'stun:stun.dus.net:3478' },
    { urls: 'stun:stun.schlund.de:3478' },
    { urls: 'stun:stun.usfamilynet.com:3478' },
    { urls: 'stun:stun.sip.us:3478' },

    // ── TURN — Metered open relay (UDP) ──────────────────────────────────
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    // ── TURN — Metered open relay (TCP port 443) ─────────────────────────
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    // ── TURN — Metered open relay (TCP transport explicit) ───────────────
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    // ── TURNS — Metered open relay TLS (bypasses strict firewalls) ───────
    {
      urls: 'turns:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },

    // ── TURN — Numb.viagenie.ca (backup) ─────────────────────────────────
    {
      urls: 'turn:numb.viagenie.ca',
      username: 'webrtc@live.com',
      credential: 'muazkh',
    },

    // ── TURN — Relay.backups.cz ──────────────────────────────────────────
    {
      urls: [
        'turn:relay.backups.cz',
        'turn:relay.backups.cz?transport=tcp',
      ],
      username: 'webrtc',
      credential: 'webrtc',
    },
  ]
}
