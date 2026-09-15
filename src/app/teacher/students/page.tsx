"use client";

import { useEffect, useState } from "react";
import { formatRange } from "@/lib/timezone";
import { useTimezone } from "@/components/timezone-provider";

type Lesson = {
  id: string;
  studentName: string;
  startTime: string;
  endTime: string;
};

type Material = {
  id: string;
  title: string;
  content: string | null;
  fileUrl: string | null;
  createdAt: string;
};

function MaterialForm({ lessonId, onAdded }: { lessonId: string; onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          title: title.trim(),
          content: content.trim() || undefined,
          fileUrl: fileUrl.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setTitle("");
      setContent("");
      setFileUrl("");
      onAdded();
    } catch {
      setError("Materyal eklenemedi. Dosya linki geçerli bir URL olmalı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card mt-3 flex flex-col gap-2 p-4">
      <input
        type="text"
        placeholder="Başlık"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="field"
        required
      />
      <textarea
        placeholder="Not (opsiyonel)"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="field"
        rows={2}
      />
      <input
        type="url"
        placeholder="Dosya linki (opsiyonel)"
        value={fileUrl}
        onChange={(e) => setFileUrl(e.target.value)}
        className="field"
      />
      {error && <p className="text-xs text-[var(--bad)]">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="self-start btn btn-primary btn-sm"
      >
        {loading ? "Ekleniyor..." : "Materyal Ekle"}
      </button>
    </form>
  );
}

function LessonCard({ lesson }: { lesson: Lesson }) {
  const tz = useTimezone();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [open, setOpen] = useState(false);

  async function loadMaterials() {
    const res = await fetch(`/api/materials?lessonId=${lesson.id}`);
    if (res.ok) setMaterials(await res.json());
  }

  useEffect(() => {
    if (open) loadMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <li className="glass-card p-4">
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left">
        <span className="font-medium">{lesson.studentName}</span>
        <p className="text-dim text-sm">{formatRange(lesson.startTime, lesson.endTime, tz)}</p>
      </button>

      {open && (
        <div className="mt-3 border-t pt-3">
          {materials.length === 0 && (
            <p className="text-dim text-sm">Bu ders için henüz materyal paylaşılmadı.</p>
          )}
          <ul className="flex flex-col gap-2">
            {materials.map((m) => (
              <li key={m.id} className="glass-card p-3 text-sm">
                <p className="font-medium">{m.title}</p>
                {m.content && <p className="text-dim">{m.content}</p>}
                {m.fileUrl && (
                  <a href={m.fileUrl} target="_blank" rel="noreferrer" className="text-[var(--accent-1)] hover:underline">
                    Dosyayı aç
                  </a>
                )}
              </li>
            ))}
          </ul>
          <MaterialForm lessonId={lesson.id} onAdded={loadMaterials} />
        </div>
      )}
    </li>
  );
}

export default function TeacherStudentsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    fetch("/api/lessons")
      .then((res) => res.json())
      .then(setLessons);
  }, []);

  return (
    <main className="fade-up mx-auto max-w-3xl p-5 sm:p-8">
      <h1 className="page-title mb-2">Öğrenci / Ders Takibi</h1>
      <p className="mb-4 text-dim text-sm">
        Bir dersi açarak öğrenciyle paylaştığın notları ve materyalleri görebilir, yenilerini ekleyebilirsin.
      </p>

      {lessons.length === 0 && <p className="text-dim text-sm">Henüz onaylanan ders yok.</p>}

      <ul className="flex flex-col gap-2">
        {lessons.map((lesson) => (
          <LessonCard key={lesson.id} lesson={lesson} />
        ))}
      </ul>
    </main>
  );
}
