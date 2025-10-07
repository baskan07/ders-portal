// app/ders/[course]/[lesson]/quiz/[quizId]/sonuc/[attemptId]/page.tsx
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function QuizResultPage({
  params,
}: {
  params: Promise<{ course: string; lesson: string; quizId: string; attemptId: string }>;
}) {
  const { course, lesson, quizId, attemptId } = await params;

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: { include: { questions: { include: { choices: true } } } },
    },
  });

  if (!attempt || attempt.quizId !== quizId) {
    return <main className="p-6">Sonuç bulunamadı.</main>;
  }

  const answers = (attempt.details ?? {}) as Record<string, string>;
  const total = attempt.quiz.questions.length;
  const correct = attempt.score;
  const wrong = total - correct;

  return (
    <main className="space-y-6 p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">Sonuç</h1>
      <p className="text-lg">
        ✅ <b>{correct}</b> doğru &nbsp; | &nbsp; ❌ <b>{wrong}</b> yanlış &nbsp; | &nbsp; 📊 toplam <b>{total}</b>
      </p>

      <section className="space-y-4">
        {attempt.quiz.questions.map((q, i) => {
          const userChoice = answers[q.id];
          const isCorrect = userChoice && userChoice === q.answerId;
          const choiceText = (id?: string) =>
            q.choices.find((c) => c.id === id)?.text ?? "-";

          return (
            <div
              key={q.id}
              className={`card p-4 border-l-4 ${
                isCorrect ? "border-green-500" : "border-red-500"
              }`}
            >
              <p className="font-semibold mb-2">
                Soru {i + 1}: {q.text}
              </p>
              <p>
                Senin cevabın:{" "}
                <b className={isCorrect ? "text-green-600" : "text-red-600"}>
                  {choiceText(userChoice)}
                </b>
              </p>
              {!isCorrect && (
                <p>
                  Doğru cevap:{" "}
                  <b className="text-green-600">{choiceText(q.answerId)}</b>
                </p>
              )}
            </div>
          );
        })}
      </section>

      <div className="flex gap-4 pt-4">
        <Link
          href={`/ders/${course}/${lesson}`}
          className="underline text-blue-600 dark:text-blue-400"
        >
          Derse dön
        </Link>
        <Link
          href={`/ders/${course}/${lesson}/quiz/${quizId}`}
          className="underline text-blue-600 dark:text-blue-400"
        >
          Quizi tekrar çöz
        </Link>
      </div>
    </main>
  );
}
