// Shared font override utility for all templates
// Reads from data._fonts[fieldKey] and returns CSS style overrides

export interface FontOverride {
  weight?: number;
  size?: number;
  color?: string;
  highlight?: string;
}

export function getFontOverride(data: Record<string, any>, fieldKey: string): FontOverride {
  return data?._fonts?.[fieldKey] || {};
}

export function applyFontOverride(
  baseStyle: React.CSSProperties,
  data: Record<string, any>,
  fieldKey: string
): React.CSSProperties {
  const fo = getFontOverride(data, fieldKey);
  const style = { ...baseStyle };

  if (fo.weight) style.fontWeight = fo.weight;
  if (fo.size) style.fontSize = `${fo.size}px`;
  if (fo.color) style.color = fo.color;
  if (fo.highlight) {
    style.backgroundColor = fo.highlight;
    style.padding = '0 8px';
    style.borderRadius = '4px';
    style.display = 'inline';
    style.boxDecorationBreak = 'clone' as any;
    (style as any).WebkitBoxDecorationBreak = 'clone';
  }

  return style;
}
