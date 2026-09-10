export const REQUEST_STATUS_LABEL = {
  PENDING: "Bekliyor",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
} as const;

export const REQUEST_STATUS_CLASS = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
} as const;

export const LESSON_STATUS_LABEL = {
  SCHEDULED: "Planlandı",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal edildi",
} as const;

export const LESSON_STATUS_CLASS = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-gray-200 text-gray-700",
  CANCELLED: "bg-red-100 text-red-800",
} as const;

export function formatRange(startTime: string, endTime: string) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return `${start.toLocaleString("tr-TR")} — ${end.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}
