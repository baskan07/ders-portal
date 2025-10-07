// app/api/quiz/submit/route.ts
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { quizId, answers } = await req.json() as { quizId: string; answers: Record<string, string> };

  const questions = await prisma.question.findMany({ where: { quizId } });
  let score = 0;
  for (const q of questions) if (q.answerId && answers[q.id] === q.answerId) score++;

  const attempt = await prisma.attempt.create({ data: { quizId, userId: null, score, details: answers as any } });

  return NextResponse.json({ attemptId: attempt.id, score, total: questions.length });
}
