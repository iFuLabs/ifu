# Font Setup - COMPLETED ✅

All required fonts have been converted and organized.

## Installed Fonts

### Aeonik Family (`aeonik/`)
- ✅ Aeonik-Regular.woff2 & .woff
- ✅ Aeonik-Medium.woff2 & .woff
- ✅ Aeonik-Bold.woff2 & .woff

### Aeonik Fono - Monospace (`aeonik-fono/`)
- ✅ AeonikFono-Regular.woff2 & .woff

### PP Fragment - Serif (`pp-fragment/`)
- ✅ PPFragment-SerifRegular.woff2 & .woff
- ✅ PPFragment-SerifExtraBold.woff2 & .woff

## Usage in CSS

These fonts are loaded via `@font-face` declarations in your global CSS/Tailwind config.

Example:
```css
@font-face {
  font-family: 'Aeonik';
  src: url('/fonts/aeonik/Aeonik-Regular.woff2') format('woff2'),
       url('/fonts/aeonik/Aeonik-Regular.woff') format('woff');
  font-weight: 400;
  font-style: normal;
}
```

## Re-organizing Fonts

If you need to reorganize fonts from the source OTF files:
```bash
./scripts/organize-fonts.sh
```
