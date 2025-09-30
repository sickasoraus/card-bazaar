# Metablazt Design Tokens (Phase 0)

Derived from Card Bazaar visual language with Metablazt palette substitutions.

## Typography

- **Display / Hero**: `"Bangers", "Impact", "Arial Black", sans-serif`
  - Use for headline treatments, hero titles, and CTA labels needing the Card Bazaar energy.
  - Suggested sizes: 64px / 56px / 48px with letter-spacing `0.5px` and line-height `1.05`.
- **UI / Body**: `"Open Sans", "Inter", "Helvetica Neue", sans-serif`
  - Primary for navigation, buttons, card metadata, and body copy.
  - Size ramp: 18px (page body), 16px (card meta, button text), 14px (fine print). Line-height `1.4`.
- **Accent Mono**: `"Fira Mono", "Menlo", monospace`
  - Optional for mana costs or code snippets in documentation.

## Color Palette

- `bg.primary`: `#071830` - page background gradient anchor.
- `bg.card`: `#102A4A` - card outline panels and nav bar background.
- `text.hero`: `#F7E2D5` - primary headline text.
- `text.body`: `#FFC18A` - supporting copy and button text.
- `accent.gradient.start`: `#FF6F61`
- `accent.gradient.end`: `#FF9E4C`
- `accent.highlight`: `#FFB27D` - hover states, badges.
- `neutral.100`: `#0B1F3A`
- `neutral.300`: `#1C3458`
- `neutral.700`: `#F1D9CB`

Gradients: apply linear 135deg blend between `accent.gradient.start` -> `accent.gradient.end` for pills and CTAs.

## Spacing & Layout Grid

- Base spacing unit: `4px`.
- Scale: `4, 8, 12, 16, 24, 32, 48, 64` (spacing token names `s1`-`s8`).
- Card gutter: `24px` horizontal gap between cards (matches Card Bazaar screenshot density).
- Page max-width: `1240px` centered content column, aligning search and cart controls.
- Section padding: `32px` desktop, `24px` tablet, `16px` mobile.

## Radius & Corners

- Card wrapper radius: `16px`.
- Pill buttons: `999px` full pill.
- Secondary buttons and inputs: `12px`.

## Shadows

- Card elevation: `0 18px 32px -12px rgba(7,24,48,0.45)`.
- Floating CTA (hero pill): `0 12px 24px rgba(16,42,74,0.35)` plus inner glow `inset 0 1px 0 rgba(255,226,213,0.4)`.
- Navigation dock: `0 8px 16px rgba(7,24,48,0.25)`.

## Motion

- Standard ease: `cubic-bezier(0.4, 0, 0.2, 1)`.
- Interaction duration: `150ms` for hover, `250ms` for modals.

## Iconography & Imagery

- Card art 3:2 ratio containers with `16px` radius and `shadow.card`.
- Avatar and thumbnail radius `12px` to align with button curvature.

## Usage Notes

- Metablazt hero sections should mirror Card Bazaar stacked-card motif: left-aligned hero card, right-aligned CTA block using gradient pill.
- Maintain 24px baseline grid between modules to keep rhythm consistent with Card Bazaar feed layout.
- When mixing text colors over gradients, ensure contrast ratio >= 4.5:1 by defaulting to `text.hero`.
