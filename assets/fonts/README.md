# Web faces

Two self-hosted families. The site addresses them as **CG Pro** and **CG Mono**;
this file records what they actually are, so the alias is a distribution name
and never a claim about authorship.

| Shipped file | Face | Weight / style |
|---|---|---|
| `cg-pro-text-400.woff2` | SF Pro Text | 400 |
| `cg-pro-text-500.woff2` | SF Pro Text | 500 |
| `cg-pro-text-400-italic.woff2` | SF Pro Text | 400 italic |
| `cg-pro-text-500-italic.woff2` | SF Pro Text | 500 italic |
| `cg-pro-display-500.woff2` | SF Pro Display | 500, page titles only (>=20px) |
| `cg-mono-400.woff2` | JetBrains Mono | 400 |
| `cg-mono-500.woff2` | JetBrains Mono | 500 |

## Licensing

- **CG Pro** is **SF Pro**, drawn by Apple. Cogitave serves it under the licence
  Cogitave holds; the licence position is the operator's, not this repository's.
  The `name` tables inside the binaries are untouched - they still identify the
  face as Apple's. The alias exists so the site has one stable family token, not
  to misstate provenance.
- **CG Mono** is **JetBrains Mono**, under the SIL Open Font License 1.1
  (`LICENSE-JetBrainsMono.txt`, which ships to `_site/` alongside the files).
  These are *subsets*, which the OFL treats as a modified version, and the OFL
  requires a modified version to be distributed under a different name - so
  `CG Mono` is not a preference here, it is the compliant choice.

## Reproducing the subsets

Both families are cut to a latin web charset (printable ASCII, Latin-1, and the
punctuation the corpus uses). The learn build itself stays dependency-free per
ADR-0003; subsetting is a one-off step run outside it:

```bash
npm i subset-font          # harfbuzz/wasm, no native toolchain needed
node subset.mjs            # see docs/design-language.md for the charset
```

Source material is the licensed desktop install (`SF-Pro-Text-*.otf`,
`SF-Pro-Display-Medium.otf`) and the JetBrains Mono release TTFs. Re-cut the
files whenever the charset changes; do not commit an unsubsetted face.
