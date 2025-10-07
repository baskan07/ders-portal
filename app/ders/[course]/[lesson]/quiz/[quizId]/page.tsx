// app/ders/[course]/[lesson]/quiz/[quizId]/page.tsx
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

type Params = { params: { course: string; lesson: string; quizId: string } };

export default async function QuizPage({ params }: Params) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: params.quizId },
    include: { 
      contentBlock: { include: { lesson: { include: { course: true } } } },
      questions: { include: { choices: true }, orderBy: { id: "asc" } }
    }
  });
  if (!quiz || quiz.contentBlock.lesson.slug !== params.lesson) {
    return <main style={{padding:20}}>Quiz bulunamadı.</main>;
  }

  async function submit(formData: FormData) {
    "use server";
    const entries = Array.from(formData.entries());
    const answers: Record<string, string> = {};
    for (const [k, v] of entries) if (k !== "quizId") answers[k] = String(v);

    const questions = await prisma.question.findMany({ where: { quizId: quiz.id } });
    let score = 0;
    for (const q of questions) if (q.answerId && answers[q.id] === q.answerId) score++;

    const attempt = await prisma.attempt.create({
      data: { quizId: quiz.id, userId: null, score, details: answers as any }
    });

    // sonuç sayfasına yönlendir
    redirect(`/ders/${params.course}/${params.lesson}/quiz/${quiz.id}/sonuc/${attempt.id}`);
  }

  return (
    <main style={{ padding: 20, display: "grid", gap: 16 }}>
      <h1 style={{ fontWeight: 700, fontSize: 22 }}>{quiz.title}</h1>
      <form action={submit}>
        <input type="hidden" name="quizId" value={quiz.id} />
        <div style={{ display: "grid", gap: 16 }}>
          {quiz.questions.map((q) => (
            <div key={q.id}>
              <p style={{ fontWeight: 600, marginBottom: 6 }}>{q.text}</p>
              {q.choices.map((ch) => (
                <label key={ch.id} style={{ display: "block", marginBottom: 4 }}>
                  <input type="radio" name={q.id} value={ch.id} required /> {ch.text}
                </label>
              ))}
            </div>
          ))}
        </div>

        <button type="submit" style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 10, padding: "8px 14px" }}>
          Gönder
        </button>
      </form>
    </main>
  );
}
