/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const users = [
  { slug: "me", name: "나(운영자)", role: "OWNER" },
  { slug: "bello-a", name: "벨로컴퍼니 민지", role: "MEMBER" },
  { slug: "bello-b", name: "벨로컴퍼니 태현", role: "MEMBER" },
  { slug: "part-a", name: "알바팀 수연", role: "MEMBER" },
  { slug: "friend-a", name: "친구 지훈", role: "MEMBER" },
];

const sharedCalendars = [
  {
    key: "bello",
    name: "벨로컴퍼니 업무 일정",
    color: "bg-sky-500/20 text-sky-300",
    members: ["me", "bello-a", "bello-b"],
  },
  {
    key: "part",
    name: "알바 근무 일정",
    color: "bg-violet-500/20 text-violet-300",
    members: ["me", "part-a"],
  },
];

function toDate(input) {
  return new Date(input);
}

async function main() {
  await prisma.eventComment.deleteMany();
  await prisma.eventActivity.deleteMany();
  await prisma.event.deleteMany();
  await prisma.calendarMember.deleteMany();
  await prisma.calendar.deleteMany();
  await prisma.user.deleteMany();

  for (const user of users) {
    await prisma.user.create({ data: user });
  }

  const bySlug = {};
  const allUsers = await prisma.user.findMany();
  for (const user of allUsers) bySlug[user.slug] = user;

  for (const calendar of sharedCalendars) {
    const created = await prisma.calendar.create({
      data: {
        key: calendar.key,
        name: calendar.name,
        color: calendar.color,
      },
    });
    for (const memberSlug of calendar.members) {
      await prisma.calendarMember.create({
        data: {
          calendarId: created.id,
          userId: bySlug[memberSlug].id,
          role: memberSlug === "me" ? "OWNER" : "EDITOR",
        },
      });
    }
  }

  for (const user of allUsers) {
    const created = await prisma.calendar.create({
      data: {
        key: `personal-${user.slug}`,
        name: `${user.name} 개인 일정`,
        color: "bg-emerald-500/20 text-emerald-300",
      },
    });
    await prisma.calendarMember.create({
      data: { calendarId: created.id, userId: user.id, role: "OWNER" },
    });
  }

  const calendars = await prisma.calendar.findMany();
  const calByKey = {};
  for (const calendar of calendars) calByKey[calendar.key] = calendar;

  const event1 = await prisma.event.create({
    data: {
      calendarId: calByKey.bello.id,
      createdById: bySlug.me.id,
      title: "벨로 주간 캠페인 회의",
      startAt: toDate("2026-04-22T10:30:00+09:00"),
    },
  });
  await prisma.eventComment.create({
    data: {
      eventId: event1.id,
      authorId: bySlug["bello-a"].id,
      content: "성과표 공유 후 회의 들어갈게요.",
    },
  });
  await prisma.eventActivity.createMany({
    data: [
      { eventId: event1.id, actorId: bySlug.me.id, action: "일정 생성" },
      { eventId: event1.id, actorId: bySlug["bello-a"].id, action: "댓글 작성" },
    ],
  });

  const event2 = await prisma.event.create({
    data: {
      calendarId: calByKey.part.id,
      createdById: bySlug.me.id,
      title: "토요일 오픈조 근무",
      startAt: toDate("2026-04-23T13:00:00+09:00"),
    },
  });
  await prisma.eventActivity.create({
    data: { eventId: event2.id, actorId: bySlug.me.id, action: "일정 생성" },
  });

  const event3 = await prisma.event.create({
    data: {
      calendarId: calByKey["personal-me"].id,
      createdById: bySlug.me.id,
      title: "개인 루틴(운동/독서)",
      startAt: toDate("2026-04-24T20:00:00+09:00"),
    },
  });
  await prisma.eventActivity.create({
    data: { eventId: event3.id, actorId: bySlug.me.id, action: "일정 생성" },
  });

  console.log("Seed complete");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

