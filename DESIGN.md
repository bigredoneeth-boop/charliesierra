# Design Brief: CharlieSierra Admin Console

## Direction
CharlieSierra Admin Console (Government Edition) — Professional multi-org RBAC admin interface for secure messaging oversight on ICP with WCAG 2.1 AA accessibility.

## Tone
Brutalist utilitarian — zero decoration, maximum information density, unambiguous action hierarchy, severe legibility for compliance and audit workflows.

## Differentiation
Admin-specific token set (status badges, table alternation, sidebar emphasis) instantly distinguishes admin sections from messaging UI. High-contrast borders, grid alignment, monospace timestamps in audit logs.

## Color Palette
| Token | Light | Dark | Role |
|---|---|---|---|
| background | 0.99 0 0 | 0.09 0 0 | Page surface |
| foreground | 0.08 0 0 | 0.95 0 0 | Text (WCAG AAA) |
| card | 0.96 0 0 | 0.14 0 0 | Panels, sections |
| primary | 0.52 0.2 262 | 0.75 0.2 262 | CTAs, active states, trust |
| success | 0.6 0.18 150 | 0.72 0.16 150 | Active users, approved |
| warning | 0.75 0.15 85 | 0.82 0.14 85 | Pending, review needed |
| destructive | 0.5 0.26 24 | 0.65 0.24 24 | Suspended, revoked, delete |
| sidebar | 0.93 0 0 | 0.14 0 0 | Sidebar bg (darker in light) |

## Typography
- Display: General Sans 600 18-24px — Page titles, section headers
- Body: General Sans 400 14-16px — Labels, table data, UI copy
- Mono: Geist Mono 400 12-13px — Principal IDs, timestamps, audit trails

## Elevation & Depth
Depth via 1px borders and background alternation, not shadows. Shadow-admin (1px 2px 6px) only for modals and floating menus. Sidebar has recessed background, active menu item uses primary highlight.

## Structural Zones
| Zone | Background | Border | Notes |
|---|---|---|---|
| Header | bg-card | border-b 1px | Title, org selector, user menu |
| Sidebar | bg-sidebar | border-r 1px | Nav items, active=bg-primary-200, icon+text |
| Content | bg-background | — | Panels bg-card with border, alternating rows |
| Footer | — | — | Not used in admin |
| Tables | alternating bg-background/bg-secondary | border-border | Striped rows, headers bold, data monospace |

## Spacing & Rhythm
Dense tables (8px horizontal padding per cell, 10px row height). Sidebar items 8px padding. Page sections 24px gap. Header 16px padding. Card padding 16px. All borders 1px solid. No rounded corners on table rows; 4px on cards/badges/inputs.

## Component Patterns
- Status badges: .badge-active (green), .badge-pending (amber), .badge-suspended (red), compact inline 12px padding
- Table rows: alternating bg via .table-row-alt class, hover:bg-secondary/50
- Header bar: bg-card, border-b, flex space-between for title/controls
- Sidebar item: active=bg-sidebar-primary text-sidebar-primary-foreground, inactive=text-sidebar-foreground hover:bg-sidebar-accent/30
- Audit log cell: principal IDs in monospace, timestamp right-aligned

## Motion
- Focus: 2px primary ring, 0.1s visible on tab
- Hover: background shift 0.15s on interactive elements
- Table row: highlight on hover (subtle bg-primary/5)
- Reduce motion respected: all 0.01ms via prefers-reduced-motion

## Constraints
- No gradients, no blur, no glassmorphism
- No decorative shadows; depth via borders only
- WCAG 2.1 AA minimum (7:1 contrast on buttons, 4.5:1 on body text)
- All touchable targets ≥44px height
- High-contrast mode override via [data-high-contrast="true"]
- Semantic HTML (table, nav, main, section); visible focus; aria labels
- Sidebar fixed width 240px on desktop, collapsible on mobile

## Signature Detail
Admin-exclusive badge colors (green/amber/red status states) instantly mark admin sections. Monospace principal IDs in audit logs reinforce security/compliance tone. Sidebar active highlight via purple background (not just text weight) creates unambiguous active state.
