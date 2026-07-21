---
name: premium-frontend-ui
description: 'A comprehensive guide for GitHub Copilot to craft immersive, high-performance web experiences with advanced motion, typography, and architectural craftsmanship.'
---

# Immersive Frontend UI Craftsmanship

As an AI engineering assistant, your role when building premium frontend experiences goes beyond outputting functional HTML and CSS. You must architect **immersive digital environments**. This skill provides the blueprint for generating highly intentional, award-level web applications that prioritize aesthetic quality, deep interactivity, and flawless performance.

When a user requests a high-end landing page, an interactive portfolio, or a specialized component that requires top-tier visual polish, apply the following rigorous standards to every line of code you generate.

---

## 0. Applo House Style — the "Sharp" Design System (MANDATORY for apps/web)

Applo's entire web app was migrated to a sharp, editorial-technical design system (branch `feat/sharp-redesign`, 2026-07). **All new frontend work must follow these conventions — they override the generic guidance below wherever they conflict.**

### Identity
- Navy `#1B2A49` primary, constant brand blue `#5581C7` (`--brand`), flat surfaces, hairline borders, square geometry. No decorative gradients, no pill badges, no soft shadows on static content.

### Typography
- Headings: `font-heading` (Archivo) — page h1: `font-heading text-[26px] font-extrabold tracking-[-.025em] md:text-[30px]`; section h2: `text-[22px] font-extrabold tracking-[-.02em]`.
- Micro-labels/eyebrows/table headers: `SectionLabel` (`@/components/ui/section-label`) or `font-mono text-[10.5px] font-medium uppercase tracking-[.12em] text-muted-foreground`.
- KPI numerals & counters: `font-mono tabular-nums`.
- Body: Inter (`font-sans`). **Poppins was removed entirely — never reintroduce `font-poppins`.**

### Radii
- Containers/cards/boxes: `rounded-[4px]` · icon tiles/chips/small controls: `rounded-[3px]` · bars/marks/checkboxes: `rounded-[2px]` or `rounded-[1px]`.
- KEEP ROUND: avatars, spinners, circular gauges (StrengthRing), tiny status dots, color swatches, mascot rings.

### Color tokens (registered in globals.css `@theme`)
- `text-brand`, `bg-brand`, `border-primary-soft`, `bg-primary-soft`, `text-success`/`bg-success`(+`-soft`), `text-warning`/`bg-warning`(+`-soft`), `bg-brand-wash`, `bg-brand-glow`.
- **Never use raw palette classes** (`gray-*`, `blue-*`, `red-*`, `green-*`, `amber-*`…) in light-mode styling — only inside `dark:` tint variants below.

### Canonical tinted boxes (light hex + dark variant, always paired)
- Success: `border-[#BFE9CC] bg-[#ECFAF0] dark:border-green-400/30 dark:bg-green-400/10` (text `text-success`, long body text `text-[#3D7A55] dark:text-green-200/80`)
- Warning: `border-[#F3E3B3] bg-[#FDF6E7] dark:border-amber-400/30 dark:bg-amber-400/10` (icon/label `text-[#A16207] dark:text-amber-400`, body `text-[#854D0E] dark:text-amber-300/90`)
- Destructive: `border-[#F3C9C9] bg-[#FDEEEE] dark:border-red-400/30 dark:bg-red-400/10` (text `text-destructive`)
- Info/brand: `border-primary-soft bg-primary-soft/40 dark:border-slate-600 dark:bg-slate-800/60`
- Icon tiles: `rounded-[3px] border border-primary-soft bg-primary-soft/60 text-brand dark:border-slate-600 dark:bg-slate-800`

### Components
- Status chips: use `StatusChip` / `TRACKING_STATUS_CHIP` (`@/components/ui/status-chip`) — square, mono uppercase, tone dot. Never hand-roll status colors.
- Segmented controls: `inline-flex gap-px overflow-hidden rounded-[4px] border border-border bg-border` with buttons `bg-background` (inactive) / `bg-primary text-primary-foreground` (active).
- Hairline grids: `HairlineGrid` or `gap-px` on `bg-border`.
- Shadows: `shadow-none` for static cards (Card primitive default). Floating-only exceptions: popovers `shadow-md`, fixed bars `shadow-lg`, overlay pills `shadow-sm`.

### Allowed exceptions
- `bg-gradient-to-br from-slate-100 from-50% to-slate-800 to-50%` in `theme-cards.tsx` (hard-stop 50/50 "System" preview split — functional, not decorative). Slate hexes in theme previews are intentional (fixed light/dark rendering).
- `bg-brand-wash`/`bg-brand-glow` utilities (canonical radial washes).
- 2FA QR container keeps `bg-white` (scanner contrast).

### Verification gate (run before any PR touching apps/web styling)
```bash
cd apps/web && pnpm exec tsc --noEmit && pnpm exec eslint <files> --max-warnings 0
grep -rnE 'rounded-(2xl|3xl)|bg-gradient|font-poppins' src --include='*.tsx'   # only theme-cards may hit
grep -rnE '(bg|text|border)-(gray|red|green|blue|yellow|purple)-[0-9]+' src/app src/components --include='*.tsx' | grep -v 'dark:'   # expect no NEW hits
```
Also spot-check dark mode (`document.documentElement.classList.add('dark')`) and a 375px viewport.

---

## 1. Establishing the Creative Foundation

Before generating layout code, ensure you understand the core emotional resonance the UI should deliver. Do not default to generic, unopinionated code. 

Commit to a strong visual identity in your CSS and component structure:
- **Editorial Brutalism**: High-contrast monochromatic palettes, oversized typography, sharp rectangular edges, and raw grid structures.
- **Organic Fluidity**: Soft gradients, deeply rounded corners, glassmorphism overlays, and bouncy spring-based physics.
- **Cyber / Technical**: Dark mode dominance, glowing neon accents, monospaced typography, and rapid, staggered reveal animations.
- **Cinematic Pacing**: Full-viewport imagery, slow cross-fades, profound use of negative space, and scroll-dependent storytelling.

---

## 2. Structural Requirements for Immersive UI

When scaffolding a page or generating core components, include the following architectural layers to transform a standard page into an experience.

### 2.1 The Entry Sequence (Preloading & Initialization)
A blank screen is unacceptable. The user's first interaction must set expectations.
- **Implementation**: Generate a lightweight preloader component that handles asset resolution (fonts, initial images, 3D models).
- **Animation**: Output code that transitions the preloader away fluidly—such as a split-door reveal, a scale-up zoom, or a staggered text sweep.

### 2.2 The Hero Architecture
The top fold must command attention immediately.
- **Visuals**: Output code that implements full-bleed containers (`100vh`/`100dvh`).
- **Typography Engine**: Ensure headlines are broken down syntactically (e.g., span wrapping by word or character) to allow for cascading entrance animations.
- **Depth**: Utilize subtle floating elements or background clipping paths to create a sense of scale and depth behind the primary copy.

### 2.3 Fluid & Contextual Navigation
- **Implementation**: Do not generate standard static navbars. Output sticky headers that react toscroll direction (hide on scroll down, reveal on scroll up).
- **Interactivity**: Include hover states that reveal rich content (e.g., mega-menus that display image previews of the hovered link).

---

## 3. The Motion Design System

Animation is not an afterthought; it is the connective tissue of a premium site. Always implement the following motion principles:

### 3.1 Scroll-Driven Narratives
Generate code utilizing modern scroll libraries (like GSAP's ScrollTrigger) to tie animations to user progress.
- **Pinned Containers**: Create sections that lock into the viewport while secondary content flows past or reveals itself.
- **Horizontal Journeys**: Translate vertical scroll data into horizontal movement for specific galleries or showcases.
- **Parallax Mapping**: Assign subtle, varying scroll-speeds to background elements, midground text, and foreground imagery.

### 3.2 High-Fidelity Micro-Interactions
The cursor is the user's avatar. Build interactions around it.
- **Magnetic Components**: Write logic that calculates the distance between the mouse pointer and a button, pulling the button towards the cursor dynamically.
- **Custom Tracking Elements**: Generate custom cursor components that follow the mouse with calculated interpolation (lerp) for a smooth drag effect.
- **Dimensional Hover States**: Use CSS Transforms (`scale`, `rotateX`, `translate3d`) to give interactive elements weight and tactile feedback.

---

## 4. Typography & Visual Texture

The aesthetics of your generated code must reflect premium craftsmanship.

- **Type Hierarchy**: Enforce massive contrast in scale. Headlines should utilize extreme sizing (`clamp()` functions spanning up to `12vw`), while body copy remains incredibly crisp (`16px-18px` minimum). 
- **Font Selection**: Always recommend or implement highly specified variable fonts or premium typefaces over system defaults.
- **Atmospheric Filters**: Implement CSS/SVG noise overlays (`mix-blend-mode: overlay`, opacity `0.02 - 0.05`) to remove digital sterility and add photographic grain.
- **Lighting & Glass**: Utilize `backdrop-filter: blur(x)` combined with ultra-thin, semi-transparent borders to create modern, frosted-glass depth.

---

## 5. The Performance Imperative

A beautiful site that stutters is a failure. Enforce strict performance guardrails in all generated code:

- **Hardware Acceleration**: Only animate properties that do not trigger layout recalculations: `transform` and `opacity`. Code that animates `width`, `height`, `top`, or `margin` should be fiercely avoided.
- **Render Optimization**: Apply `will-change: transform` intelligently on complex moving elements, but remove it post-animation to conserve memory.
- **Responsive Degradation**: Wrap custom cursor logic and heavy hover animations in `@media (hover: hover) and (pointer: fine)` to ensure pristine performance on touch devices.
- **Accessibility**: Wrap heavy continuous animations in `@media (prefers-reduced-motion: no-preference)`. Never sacrifice user accessibility for aesthetic flair.

---

## 6. Implementation Ecosystem

When the user asks you to implement these patterns, leverage industry-standard libraries tailored to their framework:

### For React / Next.js Targets
- Structure the application to support **Framer Motion** for layout transitions and spring physics.
- Recommend **Lenis** (`@studio-freight/lenis`) for smooth scrolling context.
- Implement **React Three Fiber** (`@react-three/fiber`) if webGL or 3D interactions are requested.

### For Vanilla / HTML / Astro Targets
- Rely heavily on **GSAP** (GreenSock Animation Platform) for timeline sequencing.
- Utilize vanilla **Lenis** via CDN for scroll hijacking and smoothing.
- Use **SplitType** for safe, accessible typography chunking.

---

## Summary of Action

Whenever you receive a prompt to "Build a premium landing page," "Create an Awwwards-style component," or "Design an immersive UI," you must automatically:
1. Wrap the output in a robust, scroll-smoothed architecture.
2. Provide CSS that guarantees perfect performance using composited layers.
3. Integrate sweeping, staggered component entrances.
4. Elevate the typography using fluid scales.
5. Create an intentional, memorable aesthetic footprint.
