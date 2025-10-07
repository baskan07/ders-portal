import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Course } from "@prisma/client";

export default async function Home() {
  const courses: Course[] = await prisma.course.findMany({ orderBy: { title: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Dersler</h1>
        <p className="text-gray-600 dark:text-slate-400">Konu anlatımları ve quizler</p>
      </div>

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => (
          <li key={c.id} className="card p-5 hover:shadow-lg transition">
            <Link href={`/ders/${c.slug}`} className="block">
              <h2 className="text-lg font-semibold">{c.title}</h2>
              {c.desc && <p className="mt-1 text-sm text-gray-600 dark:text-slate-400 line-clamp-2">{c.desc}</p>}
              <div className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Detayları gör →
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

