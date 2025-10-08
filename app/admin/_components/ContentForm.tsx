"use client";

import { useEffect, useMemo, useState } from "react";

type Lesson = { id: string; title: string; slug: string; courseId: string };

type Props = {
  upsertContent: (fd: FormData) => void; // server action
  courseId: string;                      // bu kurs için içerik eklenecek
  lessons: Lesson[];                     // sadece bu kursun dersleri
};

export default function ContentForm({ upsertContent, courseId, lessons }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"markdown" | "quiz">("markdown");
  const [lessonId, setLessonId] = useState<string>("");

  const lessonOptions = useMemo(() => lessons, [lessons]);

  // ilk açılışta ya da lessons değişince default ders ata
  useEffect(() => {
    if (!lessonId && lessonOptions.length > 0) {
      setLessonId(lessonOptions[0].id);
    }
  }, [lessonOptions, lessonId]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5">
      {/* Başlık / Toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <span className="font-medium">İçerik Ekle</span>
        <span className="text-sm opacity-70">{open ? "Kapat" : "Aç"}</span>
      </button>

      {/* İçerik (collapse) */}
      <div className={`px-4 pb-4 ${open ? "block" : "hidden"}`}>
        <form action={upsertContent} className="space-y-4">
          {/* Gizli: courseId (formda dursun) */}
          <input type="hidden" name="courseId" value={courseId} />

          {/* Ders + Tip */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="col-span-2">
              <label className="block text-sm mb-1">Ders</label>
              <select
                name="lessonId"
                value={lessonId}
                onChange={(e) => setLessonId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none text-sm"
                required
              >
                {lessonOptions.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-sm mb-1">İçerik Tipi</label>
              <select
                name="type"
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none text-sm"
              >
                <option value="markdown">Metin (Markdown/Word/PDF)</option>
                <option value="quiz">Quiz</option>
              </select>
            </div>
          </div>

          {/* Ortak alanlar */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="col-span-2">
              <label className="block text-sm mb-1">
                Başlık <span className="opacity-60">(opsiyonel)</span>
              </label>
              <input
                name={type === "markdown" ? "blockTitle" : "quizTitle"}
                type="text"
                placeholder={type === "markdown" ? "İçerik başlığı" : "Quiz başlığı"}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none"
                required={type === "quiz"}
              />
            </div>
            <div className="col-span-1">
              <label className="block text-sm mb-1">Sıra</label>
              <input
                name="order"
                type="number"
                defaultValue={1}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none"
              />
            </div>
          </div>

          {/* TİP = MARKDOWN */}
          {type === "markdown" && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">
                  Metin (Markdown / HTML) <span className="opacity-60">(opsiyonel)</span>
                </label>
                <textarea
                  name="markdown"
                  placeholder="Buraya metin girebilir veya alttan dosya yükleyebilirsin."
                  className="w-full min-h-64 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 outline-none placeholder-white/50"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">
                  Dosya Yükle <span className="opacity-60">(docx/pdf/md/txt)</span>
                </label>
                <input
                  type="file"
                  name="file"
                  accept=".doc,.docx,.pdf,.md,.txt"
                  className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:hover:bg-white/20"
                />
              </div>
            </div>
          )}

          {/* TİP = QUIZ */}
          {type === "quiz" && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">
                  Quiz JSON{" "}
                  <span className="opacity-60">(format: [{`{ text, choices[], correct }`}])</span>
                </label>
                <textarea
                  name="quizJson"
                  placeholder='[{"text":"Soru?","choices":["A","B","C","D"],"correct":1}]'
                  className="w-full min-h-64 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 outline-none font-mono text-sm placeholder-white/50"
                  required
                />
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 hover:bg-white/20 transition"
            >
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
