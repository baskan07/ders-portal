// app/admin/page.tsx
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export default async function AdminPage() {
  const courses = await prisma.course.findMany({
    orderBy: { title: "asc" },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        include: { contents: { include: { quiz: true }, orderBy: { order: "asc" } } },
      },
    },
  });

  // ========= SERVER ACTIONS =========

  async function createCourse(formData: FormData) {
    "use server";
    const slug = String(formData.get("slug") || "").trim();
    const title = String(formData.get("title") || "").trim();
    const desc = String(formData.get("desc") || "").trim();
    if (!slug || !title) return;
    await prisma.course.create({ data: { slug, title, desc } });
    revalidatePath("/admin");
    revalidatePath("/");
  }

  async function deleteCourse(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    if (!id) return;

    // İlişkileri manuel temizle (cascade alternatifimiz yoksa)
    await prisma.attempt.deleteMany({ where: { quiz: { contentBlock: { lesson: { courseId: id } } } } });
    await prisma.choice.deleteMany({ where: { question: { quiz: { contentBlock: { lesson: { courseId: id } } } } } });
    await prisma.question.deleteMany({ where: { quiz: { contentBlock: { lesson: { courseId: id } } } } });
    await prisma.quiz.deleteMany({ where: { contentBlock: { lesson: { courseId: id } } } });
    await prisma.contentBlock.deleteMany({ where: { lesson: { courseId: id } } });
    await prisma.lesson.deleteMany({ where: { courseId: id } });
    await prisma.course.delete({ where: { id } });

    revalidatePath("/admin");
    revalidatePath("/");
  }

  async function createLesson(formData: FormData) {
    "use server";
    const courseId = String(formData.get("courseId") || "");
    const slug = String(formData.get("slug") || "").trim();
    const title = String(formData.get("title") || "").trim();
    const order = Number(formData.get("order") || 0);
    if (!courseId || !slug || !title) return;
    await prisma.lesson.create({ data: { courseId, slug, title, order } });
    revalidatePath("/admin");
  }

  async function deleteLesson(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    if (!id) return;

    await prisma.attempt.deleteMany({ where: { quiz: { contentBlock: { lessonId: id } } } });
    await prisma.choice.deleteMany({ where: { question: { quiz: { contentBlock: { lessonId: id } } } } });
    await prisma.question.deleteMany({ where: { quiz: { contentBlock: { lessonId: id } } } });
    await prisma.quiz.deleteMany({ where: { contentBlock: { lessonId: id } } });
    await prisma.contentBlock.deleteMany({ where: { lessonId: id } });
    await prisma.lesson.delete({ where: { id } });

    revalidatePath("/admin");
  }

  // type: "markdown" | "quiz"
  async function upsertContent(formData: FormData) {
    "use server";

    const lessonId = String(formData.get("lessonId") || "");
    const type = String(formData.get("type") || "markdown") as "markdown" | "quiz";
    const order = Number(formData.get("order") || 0);
    if (!lessonId) return;

    // ---- QUIZ oluşturma ----
    if (type === "quiz") {
      const quizTitle = String(formData.get("quizTitle") || "Quiz");
      const raw = String(formData.get("quizJson") || "[]");
      let items: { text: string; choices: string[]; correct: number }[] = [];
      try {
        items = JSON.parse(raw);
      } catch {
        items = [];
      }

      const block = await prisma.contentBlock.create({
        data: { lessonId, type: "quiz", order, title: quizTitle },
      });

      const quiz = await prisma.quiz.create({
        data: { contentBlockId: block.id, title: quizTitle },
      });

      for (const q of items) {
        const question = await prisma.question.create({ data: { quizId: quiz.id, text: q.text } });
        const ids: string[] = [];
        for (const ch of q.choices) {
          const choice = await prisma.choice.create({ data: { questionId: question.id, text: ch } });
          ids.push(choice.id);
        }
        await prisma.question.update({ where: { id: question.id }, data: { answerId: ids[q.correct] } });
      }

      revalidatePath("/admin");
      return;
    }

    // ---- MARKDOWN bloğu (başlık + içerik; dosyadan dönüştürme destekli) ----
    const blockTitle = String(formData.get("blockTitle") || "İçerik");
    let markdown = String(formData.get("markdown") || "");

    const file = formData.get("file") as File | null;
    if (file && file.size > 0) {
      const buf = Buffer.from(await file.arrayBuffer());
      const lower = file.name.toLowerCase();

      if (lower.endsWith(".docx")) {
  const mammoth = (await import("mammoth")).default;
  const fs = await import("fs/promises");
  const path = await import("path");

  // 1) uploads klasörü garanti olsun
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  // 2) Word -> HTML; görselleri /public/uploads altına yaz
  const out = await mammoth.convertToHtml(
    { buffer: buf },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const ext = image.contentType?.split("/")[1] || "png";
        const filename =
          `docx-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const filePath = path.join(uploadsDir, filename);
        const bytes = await image.read(); // Buffer
        await fs.writeFile(filePath, bytes);
        return { src: `/uploads/${filename}` }; // HTML’de <img src="/uploads/..">
      }),
    }
  );

  // 3) Artık "markdown" değişkenine HTML yazıyoruz (ReactMarkdown bunu işleyecek)
  markdown = out.value;
}else if (lower.endsWith(".pdf")) {
        // pdf-parse'ı CJS olarak yükle (Next ESM ortamında worker hatasını önlemek için)
        const { createRequire } = await import("node:module");
        const require = createRequire(process.cwd());
        const pdfParse = require("pdf-parse") as (b: Buffer) => Promise<{ text: string }>;
        const data = await pdfParse(buf);
        markdown = data.text
          .split(/\n{2,}|\r\n{2,}/g)
          .map((s: string) => s.trim())
          .filter(Boolean)
          .join("\n\n");
      } else if (lower.endsWith(".md") || lower.endsWith(".txt")) {
        markdown = buf.toString("utf8");
      }
    }

    if (!markdown.trim()) markdown = "_(içerik eklenmedi)_";

    await prisma.contentBlock.create({
      data: { lessonId, type: "markdown", order, title: blockTitle, markdown },
    });

    revalidatePath("/admin");
  }

  async function deleteContent(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    if (!id) return;

    await prisma.attempt.deleteMany({ where: { quiz: { contentBlockId: id } } });
    await prisma.choice.deleteMany({ where: { question: { quiz: { contentBlockId: id } } } });
    await prisma.question.deleteMany({ where: { quiz: { contentBlockId: id } } });
    await prisma.quiz.deleteMany({ where: { contentBlockId: id } });
    await prisma.contentBlock.delete({ where: { id } });

    revalidatePath("/admin");
  }

  // ========= UI =========

  return (
    <main style={{ padding: 20, display: "grid", gap: 24, maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>Admin Panel</h1>

      {/* Kurs oluştur */}
      <section style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
        <h2 style={{ fontWeight: 700 }}>Yeni Kurs</h2>
        <form action={createCourse} style={{ display: "grid", gap: 8, marginTop: 8 }}>
          <input name="slug" placeholder="slug (ör. analiz)" />
          <input name="title" placeholder="başlık (ör. Analiz Dersi)" />
          <input name="desc" placeholder="açıklama (opsiyonel)" />
          <button type="submit">Oluştur</button>
        </form>
      </section>

      {/* Var olan kurslar */}
      {courses.map((c) => (
        <section key={c.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontWeight: 700 }}>
              {c.title} <small style={{ opacity: 0.6 }}>(/{c.slug})</small>
            </h2>
            <form action={deleteCourse}>
              <input type="hidden" name="id" value={c.id} />
              <button type="submit" style={{ color: "crimson" }}>Kursu Sil</button>
            </form>
          </div>

          {/* Ders ekle */}
          <details style={{ marginTop: 10 }}>
            <summary>Ders Ekle</summary>
            <form action={createLesson} style={{ display: "grid", gap: 8, marginTop: 8 }}>
              <input type="hidden" name="courseId" value={c.id} />
              <input name="slug" placeholder="slug (ör. limit)" />
              <input name="title" placeholder="başlık (ör. Limit)" />
              <input name="order" placeholder="sıra (sayı)" type="number" defaultValue={0} />
              <button type="submit">Ders Oluştur</button>
            </form>
          </details>

          {/* Dersler ve içerikleri */}
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            {c.lessons.map((l) => (
              <div key={l.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>
                    {l.title} <small style={{ opacity: 0.6 }}>(sıra: {l.order})</small>
                  </strong>
                  <form action={deleteLesson}>
                    <input type="hidden" name="id" value={l.id} />
                    <button type="submit" style={{ color: "crimson" }}>Dersi Sil</button>
                  </form>
                </div>

                {/* İçerik ekle */}
                <details style={{ marginTop: 6 }}>
                  <summary>İçerik Ekle (Markdown / Quiz)</summary>
                  <form action={upsertContent} style={{ display: "grid", gap: 6, marginTop: 8 }}>
                    <input type="hidden" name="lessonId" value={l.id} />

                    <label>
                      Tip:
                      <select name="type" defaultValue="markdown">
                        <option value="markdown">Metin (Markdown)</option>
                        <option value="quiz">Quiz</option>
                      </select>
                    </label>

                    <label>
                      Başlık (markdown için):
                      <input name="blockTitle" placeholder="ör. Kısa Özet / Teorem 1" />
                    </label>

                    <label>
                      Sıra: <input type="number" name="order" defaultValue={0} />
                    </label>

                    {/* Dosyadan içeri aktarım */}
                    <label>
                      Dosya Yükle (docx/pdf/md/txt):
                      <input type="file" name="file" accept=".docx,.pdf,.md,.txt" />
                    </label>

                    {/* Alternatif: Elle markdown */}
                    <label>
                      Markdown:
                      <textarea name="markdown" rows={5} placeholder="# Başlık..."></textarea>
                    </label>

                    {/* Quiz alanları */}
                    <label>
                      Quiz Başlığı:
                      <input name="quizTitle" placeholder="Quiz adı" />
                    </label>
                    <label>
                      Quiz JSON:
                      <textarea
                        name="quizJson"
                        rows={6}
                        placeholder='[{"text":"Soru?","choices":["A","B","C","D"],"correct":1}]'
                      />
                    </label>

                    <button type="submit">Kaydet</button>
                  </form>
                </details>

                {/* Mevcut içerikler */}
                <ul style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  {l.contents.map((b) => (
                    <li key={b.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span>
                        {b.type === "markdown"
                          ? (b.title || "İçerik")
                          : `Quiz → ${b.quiz?.title || b.title || "Adsız Quiz"}`}
                      </span>
                      <form action={deleteContent}>
                        <input type="hidden" name="id" value={b.id} />
                        <button type="submit" style={{ color: "crimson" }}>Sil</button>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
