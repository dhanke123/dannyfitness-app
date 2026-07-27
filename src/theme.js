/* Solar Warm design tokens — the single source of truth for colour and type. */

export const T = { paper:"#FBF7F0", ink:"#241C16", accent:"#FF5A3C", amber:"#FFA53D",
  moss:"#12B39C", line:"#EEE7DB", muted:"#93897C", card:"#FFFFFF", navy:"#1E50A0", blue:"#1E50A0",
  orange:"#F0812F", plum:"#C24E6B",
  /* `muted` is 2.8:1 on `line` and 3.2:1 on `paper` — fine for a hairline or an
     icon, below WCAG 1.4.3's 4.5:1 for anything a person has to read. `deep` is the
     same hue at 4.6:1 on paper, for disabled labels and small print. */
  deep:"#6B675C" };

export const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap');`;

export const disp = { fontFamily:"'Bricolage Grotesque', sans-serif", letterSpacing:"-0.01em" };

export const body = { fontFamily:"'Hanken Grotesk', sans-serif" };
