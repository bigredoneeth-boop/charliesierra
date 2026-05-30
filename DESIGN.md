# Design Brief: CharlieSierra Admin Console

## Direction
Government/military RBAC admin interface — brutalist utilitarian, zero decoration, maximum information density, unambiguous action hierarchy, serious legibility for compliance and audit workflows. High-contrast dark sidebar, white content zones, monospace principals, status badges.

## Tone
Brutalist utilitarian — severe, trustworthy, undecorated. No gradients, no blur, no decorative elements. Every pixel serves compliance and legibility.

## Differentiation
Admin-exclusive token set (status badges green/amber/red, sidebar dark-bg/light-text, table striping, monospace principals in audit logs) instantly distinguishes admin sections. Maximum information density with strict visual hierarchy.

## Color Palette
| Token | Light | Dark | Role |
|---|---|---|---|
| background | 0.99 0 0 | 0.08 0 0 | Page surface |
| foreground | 0.06 0 0 | 0.96 0 0 | Text (WCAG AAA high-contrast) |
| card | 0.97 0 0 | 0.12 0 0 | Panels, sections |
| primary | 0.50 0.22 262 | 0.72 0.20 262 | CTAs, active states, trust |
| success | 0.58 0.20 150 | 0.70 0.18 150 | Active, approved (green) |
| warning | 0.73 0.16 85 | 0.80 0.15 85 | Pending, review needed (amber) |
| destructive | 0.48 0.27 24 | 0.63 0.25 24 | Suspended, revoked, delete (red) |
| sidebar | 0.09 0 0 | 0.12 0 0 | Sidebar bg (near-black) |
| security-banner | 0.86 0.15 85 | 0.82 0.16 85 | Warning/audit banner (amber) |

## Typography
- Display: General Sans 600 18-24px — Page titles, section headers
- Body: General Sans 400 14-16px — Labels, table data, UI copy
- Mono: Geist Mono 400 12-13px — Principal IDs, timestamps, audit trails

## Elevation & Depth
Depth via 1px borders and subtle background alternation, not decorative shadows. Shadow-admin (0 1px 3px) for card depth, shadow-modal-admin (0 10px 40px) for overlays. Sidebar has dark recessed background, active item uses primary highlight.

## Structural Zones
| Zone | Background | Border | Notes |
|---|---|---|---|
| Header | bg-card | border-b 1px | Title, controls, no decoration |
| Sidebar | sidebar-dark | border-r 1px | Nav, active=bg-primary, text=white |
| Content | bg-background | — | Main area, max information density |
| Cards | bg-card | border 1px | Panels with subtle depth |
| Tables | alternating bg-background/muted | border-border 1px | Striped rows, header dark, data monospace |

## Spacing & Rhythm
Dense tables (8px horizontal padding per cell, 10px row height). Sidebar items 8px padding. Page sections 24px gap. Header 16px padding. Card padding 16px. All borders 1px solid. Border radius 0.375rem on cards/badges, 0 on table rows.

## Component Patterns
- Status badges: .badge-active (green), .badge-pending (amber), .badge-suspended (red), 12px padding, text-xs
- Table rows: .table-row-alt with alternating bg, hover=bg-primary/8
- Security banner: black text on amber bg, left border, 4px left border accent
- Sidebar item: active=bg-primary text-white, inactive=text-sidebar-foreground hover:bg-sidebar-accent/30
- Principal ID: .admin-principal-mono (monospace, xs, muted-foreground)

## Motion
Focus: 2px primary ring, 0.1s visible on tab. Hover: background shift 0.15s. Table row: subtle highlight on hover (bg-primary/8). Reduce motion respected via prefers-reduced-motion media query.

## Constraints
- No gradients, no blur, no glassmorphism
- No decorative shadows; depth via borders + subtle bg alternation only
- WCAG 2.1 AAA contrast minimum (7:1 on buttons, >5:1 on body)
- All touchable targets ≥44px height
- High-contrast mode via [data-high-contrast="true"] override
- Semantic HTML, visible focus, aria-labels
- Sidebar fixed 240px desktop, collapsible mobile

## Signature Detail
Green/amber/red status badges instantly mark admin sections. Dark sidebar with white text creates immediate authority. Monospace principal IDs in audit logs reinforce security/compliance tone. Black text on amber security banner ensures maximum legibility for critical warnings.
