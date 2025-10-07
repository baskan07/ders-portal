import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function CoursePage({ params }: { params: { course: string } }) {
  const course = await prisma.course.findUnique({
    where: { slug: params.course },
    include: { lessons: { orderBy: { order: "asc" } } },
  });
  if (!course) return <div>Bulunamadı.</div>;

  return (
    <div className="space-y-6">
      <nav className="text-sm text-gray-600 dark:text-slate-400">
        <Link href="/" className="hover:underline">Anasayfa</Link> <span>/</span> {course.title}
      </nav>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold">{course.title}</h1>
        {course.desc && <p className="text-gray-600 dark:text-slate-400">{course.desc}</p>}
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {course.lessons.map((l) => (
          <li key={l.id} className="card p-4 hover:shadow-lg transition">
            <Link href={`/ders/${course.slug}/${l.slug}`} className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{l.title}</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">Sıra: {l.order}</p>
              </div>
              <span className="text-blue-600 dark:text-blue-400">Aç</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

