// app/ders/[course]/[lesson]/quiz/[quizId]/page.tsx
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ course: string; lesson: string; quizId: string }>;
}) {
  const { course, lesson, quizId } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      contentBlock: { include: { lesson: { include: { course: true } } } },
      questions: { include: { choices: true }, orderBy: { id: "asc" } },
    },
  });

  if (!quiz || quiz.contentBlock.lesson.slug !== lesson) {
    return <main className="p-6">Quiz bulunamadı.</main>;
  }

  // Server Action: submit
  async function submit(formData: FormData) {
    "use server";

    const qid = String(formData.get("quizId") || "");
    if (!qid) return;

    // Formdan gelen cevapları topla
    const entries = Array.from(formData.entries());
    const answers: Record<string, string> = {};
    for (const [k, v] of entries) if (k !== "quizId") answers[k] = String(v);

    // Quiz ve soruları DB'den çek
    const quizDb = await prisma.quiz.findUnique({
      where: { id: qid },
      include: { questions: true },
    });
    if (!quizDb) return;

    // Skoru hesapla
    let score = 0;
    for (const q of quizDb.questions) {
      if (q.answerId && answers[q.id] === q.answerId) score++;
    }

    // Attempt oluştur
    const attempt = await prisma.attempt.create({
      data: { quizId: quizDb.id, userId: null, score, details: (answers as unknown) as any },
    });

    // Sonuç sayfasına yönlendir
    redirect(`/ders/${course}/${lesson}/quiz/${quizDb.id}/sonuc/${attempt.id}`);
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <nav className="text-sm text-gray-600 dark:text-slate-400">
        <Link href="/" className="hover:underline">Anasayfa</Link> <span>/</span>{" "}
        <Link href={`/ders/${course}`} className="hover:underline">{quiz.contentBlock.lesson.course.title}</Link>{" "}
        <span>/</span>{" "}
        <Link href={`/ders/${course}/${lesson}`} className="hover:underline">{quiz.contentBlock.lesson.title}</Link>{" "}
        <span>/</span> {quiz.title}
      </nav>

      <h1 className="text-2xl font-bold">{quiz.title}</h1>

      <form action={submit} className="space-y-5">
        <input type="hidden" name="quizId" value={quiz.id} />

        <div className="space-y-5">
          {quiz.questions.map((q, idx) => (
            <div key={q.id} className="card p-5">
              <p className="font-semibold mb-3">
                Soru {idx + 1}: {q.text}
              </p>
              <div className="space-y-2">
                {q.choices.map((ch) => (
                  <label key={ch.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={q.id}
                      value={ch.id}
                      required
                      className="h-4 w-4"
                    />
                    <span>{ch.text}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          className="rounded-xl border border-black/10 px-4 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition"
        >
          Gönder
        </button>
      </form>
    </main>
  );
}
