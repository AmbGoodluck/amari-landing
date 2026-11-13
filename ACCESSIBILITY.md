# Accessibility (target: WCAG 2.2 AA)

## Automated results (2026-11-12)
- **axe-core** with the WCAG 2.0/2.1/2.2 A and AA rule sets, on `/`, `/terms`, `/privacy` and `/contact`, in **light and dark** mode: **0 serious or critical violations**.
- **Lighthouse accessibility:** 100 on `/` (mobile and desktop) and `/privacy`.
- Keyboard and behavior checks are automated in Playwright (see TEST_REPORT.md).

## What's implemented
- **Semantics:** landmarks (`header`, `nav` ×3 with labels, `main`, `footer`), one `h1` per page, ordered headings, lists for lists, a `dl` for recipe facts and stats.
- **Keyboard:**
  - A skip link comes first.
  - Every control is reachable and has a visible `:focus-visible` ring with 3:1 contrast.
  - The mobile menu closes on Esc and returns focus to its toggle.
  - The carousel works with arrow keys, Home/End and buttons. Its buttons use `aria-disabled` at the ends, so focus is never lost.
  - FAQ uses native `<details>`/`<summary>`, which work with Enter and Space and need no ARIA.
- **Screen readers:**
  - The carousel announces its position in a polite live region.
  - The phone mockup is a single `role="img"` with a full description.
  - Decorative images have `alt=""`.
  - Recipe photos have descriptive alt text.
  - Icon-only buttons have labels, and the heart toggles use `aria-pressed`.
- **Color:** text meets 4.5:1 (body) and 3:1 (large) in both themes. Status is never conveyed by color alone (pills carry text).
- **Motion and visual preferences:**
  - `prefers-reduced-motion`: springs, tilt and slide-ins are replaced by instant changes or short fades.
  - `prefers-reduced-transparency`: blur surfaces become solid.
  - `prefers-contrast: more`: stronger borders and text, in light and dark.
  - `forced-colors` is supported.
- **Targets and layout:** interactive targets are at least 44×44 px, and layouts reflow to 320 px with no horizontal scrolling (tested at 9 widths). Text sizes use `rem`, so browser zoom and text-size settings scale cleanly.
- **Legal tables:** each is a scrollable, focusable region with an accessible name.

## Manual checks still recommended
Automated tools catch roughly a third of issues. Before launch:
1. VoiceOver (iOS/macOS) and NVDA (Windows) pass through the homepage and FAQ.
2. 200% browser zoom and the iOS "Larger Text" setting.
3. Windows High Contrast mode.

## Known limitations
- The carousel's drag gesture has keyboard and button equivalents, but no swipe alternative for switch devices beyond those buttons. That's acceptable for WCAG 2.5.7, since buttons are provided.
