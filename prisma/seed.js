// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const course = await prisma.course.upsert({
        where: { slug: "analiz" },
        update: {},
        create: { slug: "analiz", title: "Analiz Dersi", desc: "Limit, Türev, İntegral" },
    });

    const lesson = await prisma.lesson.create({
        data: { courseId: course.id, slug: "limit", title: "Limit", order: 1 },
    });

    // Markdown blokları
    await prisma.contentBlock.create({
        data: {
            lessonId: lesson.id,
            type: "markdown",
            title: "Konu Anlatımı",
            markdown: `# Limit Nedir?\nBir fonksiyonun x→a iken aldığı değere limit denir...`,
            order: 1,
        },
    });

    await prisma.contentBlock.create({
        data: {
            lessonId: lesson.id,
            type: "markdown",
            title: "Örnek Sorular",
            markdown: `1) lim x→0 sin x / x = ?\n2) lim x→0 (1-cos x)/x^2 = ?`,
            order: 2,
        },
    });

    // Quiz bloğu
    const quizBlock = await prisma.contentBlock.create({
        data: { lessonId: lesson.id, type: "quiz", title: "Limit Quiz 1", order: 3 },
    });

    const quiz = await prisma.quiz.create({
        data: { contentBlockId: quizBlock.id, title: "Limit Quiz 1" },
    });

    const q1 = await prisma.question.create({
        data: { quizId: quiz.id, text: "lim x→0 (sin x)/x = ?" },
    });
    const c1 = await prisma.choice.create({ data: { questionId: q1.id, text: "0" } });
    const c2 = await prisma.choice.create({ data: { questionId: q1.id, text: "1" } });
    const c3 = await prisma.choice.create({ data: { questionId: q1.id, text: "∞" } });
    await prisma.question.update({ where: { id: q1.id }, data: { answerId: c2.id } });

    console.log("Seed tamam ✅");
}

main().finally(() => prisma.$disconnect());
