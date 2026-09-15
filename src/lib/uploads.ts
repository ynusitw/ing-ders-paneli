// Odev eki yukleme sinirlari. Hem yukleme jetonunu ureten API ucu hem de
// istemcideki form ayni degerleri kullansin diye burada tutuluyor.
export const MAX_UPLOAD_MB = 20;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export const ALLOWED_UPLOAD_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/webm",
  "audio/ogg",
  "audio/wav",
  "application/pdf",
];
