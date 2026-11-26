# Window — Design System Specification & Frontend Blueprint

> **Design Archetype:** Nordic Slate Precision (Swiss Minimalist Structural Grid + High-Craft Developer Utility)  
> **Brand Identity:** Real-time, zero-upload peer-to-peer file transfer over WebRTC DataChannels  
> **Target Audience:** Privacy-conscious professionals, developers, creatives, and everyday users requiring zero-footprint transfers.

---

## 1. Vision & Core Philosophy

Window replaces the traditional "upload to a third-party cloud, wait, copy link, recipient downloads from cloud" lifecycle with a direct, browser-to-browser connection.

### Core Value Pillars
1. **Zero Storage Footprint:** File payloads never touch the signaling server or durable cloud buckets. Byte transmission happens exclusively over DTLS-encrypted WebRTC DataChannels.
2. **Ephemeral Scoping:** User session exists strictly within the active browser tab. No mandatory user accounts, no passwords, no long-lived tracking cookies.
3. **Dual-Mode Ergonomics:**
   - **Immediate Send (Push):** Rapid zero-approval broadcast directly to all currently connected peers in the room.
   - **Available Files (Pull Offers):** Browser-retained offers with timed self-destruct expirations (5m, 10m, 15m, 60m) and optional peer-specific access control.
4. **Transparent Boundaries:** Honest engineering limits (up to 6 room participants; 50 MB single file / 6 MB per file in a multi-file batch for immediate send; 50 MB / 200 MB aggregate for pull offers) presented with clarity and pride.

---

## 2. Color System & Semantic Tokens

> **Current palette:** The UI now uses warm cream `#EFE8DD`, charcoal `#303841`, teal `#76ABAE`, and orange `#FF5722`. Light mode favors a pale teal background, cream surfaces, and charcoal text; dark mode favors charcoal surfaces and cream text. Teal supports secondary states and orange highlights primary room creation actions and small accents. The token values in `window-ui/src/styles.css` are authoritative; the historical palette below is superseded.

Window adheres strictly to the **60-30-10 distribution rule**, rejecting generic AI clichés (such as indigo/purple neon gradients and glowing backdrop-blur orbs) in favor of crisp, high-contrast slate surfaces, tactile borders, and signature blush/mint accents.

### Color Tokens & Palette

| Token | Light Mode (`:root`) | Dark Mode (`.dark`) | Intent / Usage |
| :--- | :--- | :--- | :--- |
| `--background` | `#F6F8F8` (Arctic Porcelain) | `#131B2B` (Abyssal Navy) | 60% Dominant canvas |
| `--foreground` | `#131B2B` (Deep Ink Slate) | `#F1F6F5` (Frost White) | High-contrast readable typography |
| `--card` | `#FFFFFF` (Pure Card White) | `#1C293B` (Slate Charcoal) | Elevated surface container |
| `--card-foreground` | `#131B2B` | `#F1F6F5` | Card text content |
| `--primary` | `#2F4A63` (Nautical Slate) | `#CFEAE0` (Luminous Mint) | Primary interactive actions, emphasis |
| `--primary-foreground`| `#FFFFFF` | `#131B2B` | Inverted text on primary buttons |
| `--secondary` | `#E7EEF1` (Mist Blue) | `#2F4A63` (Slate Navy) | Secondary button fill, subtle badges |
| `--secondary-foreground`| `#131B2B` | `#F1F6F5` | Secondary text |
| `--muted` | `#EDF3F4` (Cloud Grey) | `#25394B` (Muted Steel) | Section alternate background, pills |
| `--muted-foreground` | `#2F4A63` (65% opacity tint) | `#C5D5D9` (Soft Slate) | Secondary labels, descriptions |
| `--accent` | `#CFEAE0` (Seafoam Mint) | `#2F4A63` | Subtle badge backgrounds, active chips |
| `--accent-foreground` | `#131B2B` | `#CFEAE0` | Accent text |
| `--pink-accent` | `#E8A9B9` (Blush Rose) | `#E8A9B9` (Blush Rose) | Signature brand underline & dot accents |
| `--pink-accent-foreground`| `#131B2B` | `#131B2B` | Text on blush elements |
| `--success` | `#23634F` (Pine Emerald) | `#72D8B1` (Bright Mint) | Connected status, checkmarks, completed |
| `--warning` | `#75500B` (Burnished Amber) | `#F2CF7A` (Golden Sand) | Approaching limits, countdown warnings |
| `--destructive` | `#A83333` (Crimson Iron) | `#FF938C` (Coral Rose) | Errors, revoking offers, leaving rooms |
| `--border` | `#D1DEE2` (Mist Stroke) | `#33475A` (Deep Slate Stroke) | 1px crisp card and container dividers |
| `--input` | `#5B91A3` (Steel Cyan) | `#5B91A3` (Steel Cyan) | Input border & subtle interactive controls |
| `--ring` | `#5B91A3` | `#CFEAE0` | Keyboard focus ring (`focus-visible`) |

### Signature Brand Accent
- **Logo Wordmark:** `win` in foreground + `dow` in primary + a 4px high blush rose underline pill (`#E8A9B9`) resting underneath.
- **Infinite SVG Window Grid:** Subtle 20px grid strokes (`--window-grid-line`) with randomized, staggered opacity pulses across palette colors (Ink, Blue, Teal, Mint, Pink).

---

## 3. Typography Hierarchy & Rhythm

The typography utilizes **Figtree Variable** (`@fontsource-variable/figtree`), selected for its geometric legibility, warm curved counters, and technical authority.

### Typographic Scale

| Role | Tailwind Classes | Tracking | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Display** | `text-4xl sm:text-5xl lg:text-6xl` | `tracking-[-0.045em]` | `font-bold` | `leading-[1.05]` | Hero headline |
| **Section Title** | `text-2xl sm:text-3xl lg:text-4xl` | `tracking-[-0.035em]` | `font-semibold` | `leading-[1.15]` | Section headings |
| **Card / Subhead**| `text-lg sm:text-xl` | `tracking-[-0.02em]` | `font-semibold` | `leading-snug` | Feature cards, modal titles |
| **Eyebrow / Overline** | `text-xs uppercase font-mono` | `tracking-widest` | `font-bold` | `leading-normal` | Section category badges |
| **Body Large** | `text-base sm:text-lg` | `tracking-normal` | `font-normal` | `leading-relaxed` | Hero lede, intro statements |
| **Body Regular** | `text-sm sm:text-base` | `tracking-normal` | `font-normal` | `leading-normal` | Card copy, descriptions |
| **Caption / Meta** | `text-xs` | `tracking-normal` | `font-medium` | `leading-tight` | File sizes, timestamps, limits |
| **Data / Code** | `font-mono text-xs sm:text-sm` | `tracking-tight` | `font-medium` | `leading-none` | UUIDs, SDP status, checksums |

---

## 4. Layout Architecture & Structural Guidelines

### Page Geometry
- **Max Width Container:** `max-w-6xl` (1152px) for structured editorial density; `max-w-7xl` for expansive dashboards.
- **Horizontal Gutters:** `px-4 sm:px-6 lg:px-8`.
- **Vertical Spacing Scale:**
  - Hero: `py-12 sm:py-16 lg:py-20`
  - Section dividers: `py-16 sm:py-24`
  - Component gaps: `gap-6 sm:gap-8 lg:gap-12`
- **Border Radius:**
  - Outer Cards: `rounded-2xl` (16px)
  - Interactive Buttons / Inputs: `rounded-lg` (8px)
  - Status Pills / Badges: `rounded-full` (9999px)
  - Micro-icons: `rounded-md` (6px)

### Anti-Slop Strict Directives
1. **NO AI Purples/Indigos:** Prohibited: `bg-gradient-to-r from-purple-600 to-indigo-600`. Permitted: Solid nautical slate `#2F4A63`, seafoam mint `#CFEAE0`, blush rose `#E8A9B9`.
2. **NO Blurry Glow Orbs:** Prohibited: `<div className="blur-3xl bg-pink-500/20" />`. Permitted: Crisp geometric 1px SVG grid lines, subtle radial dot pattern, and tactile border outlines.
3. **NO Repetitive 3-Column Equal Dumps:** Layouts must embrace asymmetric visual weight:
   - Hero: 60/40 Split (left editorial value + right action card / interactive sandbox).
   - Modes Section: Side-by-side comparison with distinct interactive state badges and protocol sequence flow.
   - Architecture: Dense modular technical cards with live packet animation cues.
4. **NO Generic Stock Copy:** Every line of copy must reflect concrete WebRTC mechanics: DataChannels, STUN/TURN, DTLS encryption, SHA-256 chunk validation, 64 KB framing, ephemeral memory blobs.

---

## 5. Landing Page Composition & Component Blueprint

The landing page must be an end-to-end showcase of engineering craft and visual restraint. It consists of seven tightly orchestrated sections:

### 1. Persistent Header Navigation
- **Left:** Window Brand Mark (interactive link to `/` with SVG signal icon and blush accent dot).
- **Center:** Protocol Status Badge (`WebRTC DataChannel • Zero Server Storage` with animated emerald pulse dot).
- **Right:** Anchor navigation (`How it Works`, `Push vs Pull`, `Architecture`, `Limits`, `FAQ`), GitHub repo link, and ThemeToggle (`next-themes`).

### 2. High-Impact Hero & Interactive Room Launcher
- **Left Column (Vision & Value Proposition):**
  - Category Eyebrow: `DIRECT BROWSER-TO-BROWSER P2P FILE SHARING`
  - Headline: `Send files directly, without the upload step.`
  - Editorial description highlighting zero server storage and privacy by design.
  - Value bullet tags with micro-icons (Direct Transfer, Private by Design, Strict Clear Limits).
  - Trust indicator: `No account needed • Ephemeral session • DTLS encrypted`.
- **Right Column (Tactile Action Console):**
  - Dual action card:
    - **One-click "Create Room"**: Generates instant UUID, initiates tab session, routes to `/room/{uuid}`.
    - **"Join Room" Form**: Input field with UUID validation, paste shortcut, and error toasts.
  - Interactive Quick Switcher / Peer Preview showing simulated room connection state.

### 3. Live Interactive Transfer Sandbox (Educational Interactive Demo)
- An interactive component on the landing page where visitors can test-drive Window’s mechanics without needing a second device:
  - Mock file dropper (pre-populated with sample files: `design-specs.fig (24 MB)`, `screencast.mp4 (42 MB)`, `dataset.json (3.8 MB)`).
  - Mode toggle: **Immediate Send (Push)** vs **Available Files (Pull Offer)**.
  - Live animated transfer visualizer displaying WebRTC chunk transfer, 64 KB packet counter, simulated SHA-256 validation, and transfer speed.

### 4. Push vs Pull Architecture Deep-Dive
- Asymmetrical comparison breakdown:
  - **Immediate Send (Push):**
    - Tag: `PARALLEL BROADCAST`
    - Mechanics: Files stream over up to 5 concurrent WebRTC data channels directly to all connected peers in the room. Zero waiting, zero approval prompt.
    - Limits: Max 5 files; 50 MB single file or 6 MB per file in batch.
  - **Available Files (Pull Offers):**
    - Tag: `SELECTIVE DEMAND-PULL`
    - Mechanics: Sender browser stores files in memory and registers offer metadata. Recipients pull on demand while sender remains online.
    - Limits: 5, 10, 15, or 60 minute auto-expiry, 50 MB per file, max 200 MB aggregate.

### 5. Technical Protocol & Privacy Architecture
- Grid of 4 technical foundation cards:
  1. **DTLS 1.2/1.3 End-to-End Encryption:** Direct peer channels are cryptographically secure by WebRTC protocol definition.
  2. **64 KB Chunking & SHA-256 Integrity:** Framing protocol with sequence headers and cryptographic checksums verified before blob assembly.
  3. **Ephemeral Tab Identity:** Cryptographic session proof stored strictly in browser `sessionStorage`; vanishing on tab close.
  4. **STUN Traversal & TURN Relay Fallback:** Seamless NAT traversal with zero data-retaining relays.

### 6. Technical Specifications & Comparative Matrix
- Clear mathematical comparison table:
  - Attributes: Transfer Pathway, Server Storage, Max Batch Size, Expiration Control, Account Required, Encryption Standard.
  - Window vs Cloud Storage (Google Drive / Dropbox) vs Ephemeral Upload Services (WeTransfer) vs Local Sharing (AirDrop).

### 7. Interactive Technical FAQ Accordion
- Answers real user questions:
  - Where are my files stored while transferring?
  - What happens if I close my browser tab or disconnect?
  - Why is there a 50 MB file limit?
  - Does this work across different Wi-Fi networks and mobile devices?
  - What data does the signaling server see?

### 8. Final CTA & Technical Footer
- High-craft closing card with instant room generation.
- Footer with repository credits, tech stack pills (React 19, TanStack Router, WebRTC, Tailwind v4, Vite), and system status link.

---

## 6. Accessibility & Performance Benchmarks

1. **Reduced Motion:** Every animation (Framer Motion transitions, SVG grid movements, packet counters) must respect `prefers-reduced-motion` using `useReducedMotion()`.
2. **Keyboard Navigation:** All interactive elements (`Button`, `Input`, `Accordion`, `Tab`) must have visible outline rings (`focus-visible:ring-2 focus-visible:ring-ring`).
3. **Contrast Compliance:** All text layers must meet WCAG AAA / AA contrast ratios (minimum 4.5:1 for body, 3:1 for large display titles).
4. **Light & Dark Theme Parity:** Seamless rendering in both light (`#f6f8f8`) and dark (`#131b2b`) modes without contrast degradation or flash of unstyled theme.
