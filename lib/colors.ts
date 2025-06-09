export function hexToRgba(hex: string, alpha: number): string {
  if (!hex || !/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    return `rgba(128, 128, 128, ${alpha})`; // fallback to gray for invalid hex
  }

  let c = hex.substring(1).split('');
  if (c.length === 3) {
    c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  }
  const color = '0x' + c.join('');

  const r = (parseInt(color) >> 16) & 255;
  const g = (parseInt(color) >> 8) & 255;
  const b = parseInt(color) & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
} 