"use client";

// Dosyalar ozel Blob store'da durdugu icin dogrudan blob URL'i kullanilmaz;
// icerik yetki kontrolu yapan kendi ucumuz uzerinden gelir.
function fileHref(assignmentId: string) {
  return `/api/assignments/${assignmentId}/file`;
}

export function AssignmentAttachment({
  assignmentId,
  fileName,
  fileType,
}: {
  assignmentId: string;
  fileName: string | null;
  fileType: string | null;
}) {
  if (!fileName) return null;

  const href = fileHref(assignmentId);
  const isImage = fileType?.startsWith("image/");
  const isAudio = fileType?.startsWith("audio/");

  return (
    <div className="mt-3">
      <p className="text-faint mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em]">Ek</p>

      {isImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={href}
          alt={fileName}
          className="mb-2 max-h-72 rounded-xl border border-[var(--border)] object-contain"
        />
      )}

      {isAudio && <audio controls src={href} className="mb-2 w-full" />}

      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="btn btn-ghost btn-sm inline-flex"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 opacity-80"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        {fileName}
      </a>
    </div>
  );
}
