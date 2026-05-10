# Design Brief: CharlieSierra

## Direction
CharlieSierra (Professional/Government Edition) — Decentralized E2EE messaging on ICP with WCAG AAA accessibility.

## Tone
Utilitarian, auditable. Zero decorative elements; information density optimized for clarity.

## Differentiation
Encryption status in every header, multi-device sync badges, group discovery approval workflows, searchable chat index, high-contrast mode.

## Color Palette
| Token | Light | Dark | Role |
|---|---|---|---|
| background | 0.99 0 0 | 0.09 0 0 | Page surface |
| foreground | 0.08 0 0 | 0.95 0 0 | Text (WCAG AAA) |
| card | 0.96 0 0 | 0.14 0 0 | Card/panel |
| primary | 0.58 0.2 262 | 0.75 0.2 262 | E2EE, buttons, trust |
| destructive | 0.50 0.26 24 | 0.65 0.24 24 | Delete, leave, revoke |
| muted | 0.89 0.01 255 | 0.60 0.01 255 | Secondary, timestamps |

## Typography
- Display: General Sans (600, 24-32px) — Headers, chat titles, conversation names
- Body: General Sans (400, 14-16px) — Messages, labels, chat list, UI copy
- Mono: Geist Mono (400, 12-13px) — Fingerprints, device IDs, code, audit trails

## Structural Zones
| Zone | Background | Border | Notes |
|---|---|---|---|
| Header | bg-card | border-b 1px | Title, E2EE badge, device sync, call buttons |
| Sidebar | bg-background | border-r 1px | Chat list, online status, search, discovery |
| Chat view | bg-background | — | Message bubbles, timestamps, read receipts |
| Input | bg-card | border-t 1px | Sticky composer, attachments, send button |
| Modals | bg-popover | 1px border | Approval workflows, settings, verification |

## Elevation & Depth
Minimal shadow hierarchy: shadow-message (2px/8px) for chat bubbles, shadow-elevated (4px/16px) for modals and headers. Depth via layering and 1px borders rather than shadows.

## Spacing & Rhythm
Chat bubbles 8px padding, 4px radius. Message groups 12px vertical gap. Sidebar items 8px padding. Input 12px padding. Radii: 4px (inputs, bubbles), 6px (cards), 0 (minimal).

## Component Patterns
- Message bubble: Minimal radius (4px), shadow-message, bg-primary sent / bg-card received, timestamp below
- Encryption badge: Lock icon + "E2EE Verified" or "Key Pending" in header, always visible
- Multi-device sync: Badge (mobile/desktop icons) right of username in header
- Group discovery: Modal list with approval requests, admin buttons (approve/reject)
- Chat search: Sticky search bar above chat list, filters by text/date/sender
- Approval workflows: Expandable list items, collapsible details, action buttons aligned right

## Motion & Animation
- Transitions: cubic-bezier(0.4, 0, 0.2, 1), 0.3s smooth on all interactive state changes
- Message fade-in: opacity 0→1, 0.2s on new messages
- Typing indicator: three-dot pulse 1s loop, muted-foreground
- Notifications: slide-in from top 0.4s, auto-dismiss 4s
- Expandables: smooth height 0.3s, prefer CSS transitions over animations

## Constraints
- No full-page gradients or ambient effects; no blur/glassmorphism
- Shadows only for depth (shadow-message, shadow-elevated), never glow/neon
- WCAG AAA text contrast: min 7:1 on critical UI (0.8+ L diff in dark mode)
- Minimal color palette: 3–5 semantic tokens in use simultaneously
- All interactive targets ≥44px (touch-friendly)
- High-contrast mode via `[data-high-contrast="true"]` attribute on root
- Semantic HTML (nav, main, article); visible focus indicators; aria labels
- Support prefers-reduced-motion media query for animations

## Signature Detail
E2EE lock icon in header changes state (locked/verified/pending) based on key verification. Message bubbles show subtle padlock on hover. Multi-device sync badge (mobile+desktop) appears in header. Disappearing messages fade with countdown timer.
