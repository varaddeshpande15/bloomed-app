import {
  pgTable,
  text,
  integer,
  timestamp,
  pgEnum,
  index,
  boolean,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Visibility enum
export const visibilityEnum = pgEnum("Visibility", ["PRIVATE", "PUBLIC"]);

// Re-export as a TypeScript type for use in application code
export const Visibility = {
  PRIVATE: "PRIVATE",
  PUBLIC: "PUBLIC",
} as const;
export type Visibility = (typeof Visibility)[keyof typeof Visibility];

// Users table
export const users = pgTable("User", {
  id: text("id").primaryKey().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  imageUrl: text("imageUrl"),
  credits: integer("credits").default(5).notNull(),
});

// Roadmaps table
export const roadmaps = pgTable(
  "roadmap",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull().unique(),
    content: text("content").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    views: integer("views").default(0).notNull(),
    searchCount: integer("searchCount").default(0).notNull(),
    visibility: visibilityEnum("visibility").default("PUBLIC").notNull(),
  },
  (table) => [index("Roadmap_title_idx").on(table.title)],
);

// SavedRoadmaps table
export const savedRoadmaps = pgTable("SavedRoadmap", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  roadmapId: text("roadmapId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

// DrawerDetails table
export const drawerDetails = pgTable("DrawerDetail", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  details: text("details").notNull(),
  youtubeVideoIds: text("youtubeVideoIds").array().notNull(),
  books: text("books").notNull(),
  nodeName: text("nodeName").notNull().unique(),
  roadmapId: text("roadmapId")
    .notNull()
    .references(() => roadmaps.id, { onDelete: "cascade" }),
});

/** Psychological profiling session + persisted report (FastAPI `/api/profile/*`). */
export const psychProfiles = pgTable(
  "PsychProfile",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fastapiSessionId: text("fastapiSessionId").notNull().unique(),
    historyJson: text("historyJson").notNull().default("[]"),
    reportJson: text("reportJson"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [index("PsychProfile_userId_idx").on(table.userId)],
);

/** Adaptive test session (syllabus → plan → FastAPI session → report). */
export const bloomTestSessions = pgTable(
  "BloomTestSession",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    templateKey: text("templateKey"),
    examType: text("examType").notNull().default("STANDARD"),
    markingSchemeJson: text("markingSchemeJson").notNull(),
    testPlanJson: text("testPlanJson"),
    syllabusTopicsJson: text("syllabusTopicsJson"),
    traitProfileJson: text("traitProfileJson"),
    targetQuestionCount: integer("targetQuestionCount").notNull().default(5),
    status: text("status").notNull().default("draft"),
    reportJson: text("reportJson"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [
    index("BloomTestSession_userId_idx").on(table.userId),
    index("BloomTestSession_status_idx").on(table.status),
  ],
);

export const bloomTestAttempts = pgTable(
  "BloomTestAttempt",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionId: text("sessionId")
      .notNull()
      .references(() => bloomTestSessions.id, { onDelete: "cascade" }),
    questionId: text("questionId").notNull(),
    topic: text("topic"),
    userAnswer: text("userAnswer").notNull(),
    correctAnswer: text("correctAnswer"),
    isCorrect: boolean("isCorrect").notNull(),
    timeTakenSeconds: doublePrecision("timeTakenSeconds").notNull(),
    explanation: text("explanation"),
    orderIndex: integer("orderIndex").notNull(),
    insightJson: text("insightJson"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("BloomTestAttempt_sessionId_idx").on(table.sessionId)],
);

/** Multiplayer quiz party (game mode). */
export const quizParties = pgTable(
  "QuizParty",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    code: text("code").notNull().unique(),
    hostUserId: text("hostUserId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("lobby"),
    examType: text("examType").notNull().default("STANDARD"),
    /** standard = shared adaptive chain; fixed = same but host picked difficulty via exam profile */
    engineMode: text("engineMode").notNull().default("standard"),
    markingSchemeJson: text("markingSchemeJson"),
    syllabusTopicsJson: text("syllabusTopicsJson"),
    testPlanJson: text("testPlanJson"),
    questionsJson: text("questionsJson"),
    currentQuestionIndex: integer("currentQuestionIndex").notNull().default(0),
    totalQuestions: integer("totalQuestions").notNull().default(5),
    secondsPerQuestion: integer("secondsPerQuestion").notNull().default(45),
    countdownEndsAt: timestamp("countdownEndsAt"),
    questionEndsAt: timestamp("questionEndsAt"),
    /** Interstitial between questions (top-3 moment); when set, clients hide active question. */
    betweenQuestionEndsAt: timestamp("betweenQuestionEndsAt"),
    startedAt: timestamp("startedAt"),
    finishedAt: timestamp("finishedAt"),
    title: text("title").notNull().default("Multiplayer game"),
    reportJson: text("reportJson"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [
    index("QuizParty_hostUserId_idx").on(table.hostUserId),
    index("QuizParty_status_idx").on(table.status),
  ],
);

export const quizPartyMembers = pgTable(
  "QuizPartyMember",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    partyId: text("partyId")
      .notNull()
      .references(() => quizParties.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: text("displayName").notNull(),
    imageUrl: text("imageUrl"),
    isReady: boolean("isReady").notNull().default(false),
    isHost: boolean("isHost").notNull().default(false),
    joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  },
  (table) => [
    index("QuizPartyMember_partyId_idx").on(table.partyId),
    index("QuizPartyMember_userId_idx").on(table.userId),
  ],
);

export const quizPartyAnswers = pgTable(
  "QuizPartyAnswer",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    partyId: text("partyId")
      .notNull()
      .references(() => quizParties.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionIndex: integer("questionIndex").notNull(),
    userAnswer: text("userAnswer").notNull(),
    isCorrect: boolean("isCorrect").notNull(),
    timeTakenSeconds: doublePrecision("timeTakenSeconds").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("QuizPartyAnswer_partyId_idx").on(table.partyId),
    index("QuizPartyAnswer_party_user_q_idx").on(
      table.partyId,
      table.userId,
      table.questionIndex,
    ),
  ],
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  roadmaps: many(roadmaps),
  savedRoadmaps: many(savedRoadmaps),
  psychProfiles: many(psychProfiles),
  bloomTestSessions: many(bloomTestSessions),
  quizPartyMemberships: many(quizPartyMembers),
}));

export const quizPartiesRelations = relations(quizParties, ({ one, many }) => ({
  host: one(users, {
    fields: [quizParties.hostUserId],
    references: [users.id],
  }),
  members: many(quizPartyMembers),
  answers: many(quizPartyAnswers),
}));

export const quizPartyMembersRelations = relations(quizPartyMembers, ({ one }) => ({
  party: one(quizParties, {
    fields: [quizPartyMembers.partyId],
    references: [quizParties.id],
  }),
  user: one(users, {
    fields: [quizPartyMembers.userId],
    references: [users.id],
  }),
}));

export const quizPartyAnswersRelations = relations(quizPartyAnswers, ({ one }) => ({
  party: one(quizParties, {
    fields: [quizPartyAnswers.partyId],
    references: [quizParties.id],
  }),
  user: one(users, {
    fields: [quizPartyAnswers.userId],
    references: [users.id],
  }),
}));

export const bloomTestSessionsRelations = relations(
  bloomTestSessions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [bloomTestSessions.userId],
      references: [users.id],
    }),
    attempts: many(bloomTestAttempts),
  }),
);

export const bloomTestAttemptsRelations = relations(bloomTestAttempts, ({ one }) => ({
  session: one(bloomTestSessions, {
    fields: [bloomTestAttempts.sessionId],
    references: [bloomTestSessions.id],
  }),
}));

export const psychProfilesRelations = relations(psychProfiles, ({ one }) => ({
  user: one(users, {
    fields: [psychProfiles.userId],
    references: [users.id],
  }),
}));

export const roadmapsRelations = relations(roadmaps, ({ one, many }) => ({
  author: one(users, {
    fields: [roadmaps.userId],
    references: [users.id],
  }),
  drawerDetails: many(drawerDetails),
}));

export const savedRoadmapsRelations = relations(savedRoadmaps, ({ one }) => ({
  author: one(users, {
    fields: [savedRoadmaps.userId],
    references: [users.id],
  }),
}));

export const drawerDetailsRelations = relations(drawerDetails, ({ one }) => ({
  roadmap: one(roadmaps, {
    fields: [drawerDetails.roadmapId],
    references: [roadmaps.id],
  }),
}));
