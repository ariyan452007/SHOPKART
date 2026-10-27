// Inline SVG so broken product images never depend on a third-party placeholder service
export const PLACEHOLDER_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><rect width="600" height="400" fill="#1f2937"/><g fill="none" stroke="#4b5563" stroke-width="12" stroke-linejoin="round"><rect x="225" y="140" width="150" height="120" rx="12"/><path d="M225 230l45-40 35 30 25-20 45 40"/></g><text x="300" y="310" fill="#6b7280" font-family="sans-serif" font-size="22" text-anchor="middle">No image</text></svg>`
)}`;

export const handleImageError = (e) => {
  if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
    e.currentTarget.src = PLACEHOLDER_IMAGE;
  }
};
