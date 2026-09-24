function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

/**
 * Downloads the current board as a PNG image.
 * multiplier = 2 gives a crisp 2x resolution export.
 */
export function exportAsPNG(canvas, { filename, multiplier = 2 } = {}) {
  if (!canvas) return;

  // Drop the selection (and exit text editing) so handles don't end up in the image
  canvas.discardActiveObject();
  canvas.renderAll();

  const dataUrl = canvas.toDataURL({
    format: "png",
    quality: 1,
    multiplier,
  });

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename ?? `syncboard-${timestamp()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}