interface GlintHaloSvgOptions {
  className?: string;
  dotColor?: string;
  glowColor?: string;
  outerStrokeColor?: string;
  size?: number;
  strokeColor?: string;
  strokeWidth?: number;
}

export function buildGlintHaloSvg({
  className,
  dotColor = '#F7FBFF',
  glowColor = 'rgba(155,191,255,0.30)',
  outerStrokeColor = 'rgba(255,255,255,0.10)',
  size = 24,
  strokeColor = 'rgba(196,216,255,0.92)',
  strokeWidth = 1.7,
}: GlintHaloSvgOptions = {}): string {
  const viewBox = 24;
  const cls = className ? ` class="${className}"` : '';
  const ratio = size / viewBox;
  const ringWidth = (strokeWidth / ratio).toFixed(2);
  const softWidth = ((strokeWidth - 0.35) / ratio).toFixed(2);

  return (
    `<svg${cls} width="${size}" height="${size}" viewBox="0 0 ${viewBox} ${viewBox}" fill="none" ` +
    `xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
    `<circle cx="12" cy="12" r="8.2" stroke="${outerStrokeColor}" stroke-width="${softWidth}"/>` +
    `<circle cx="12" cy="12" r="5.6" stroke="${strokeColor}" stroke-width="${ringWidth}"/>` +
    `<circle cx="12" cy="12" r="2.15" fill="${dotColor}"/>` +
    `<circle cx="12" cy="12" r="2.9" fill="${glowColor}"/>` +
    `</svg>`
  );
}
