import type { LucideIcon } from "lucide-react";
import {
  GraduationCapIcon,
  BookOpenIcon,
  MicroscopeIcon,
  SchoolIcon,
  GlobeIcon,
} from "lucide-react";

export type SyllabusTemplate = {
  key: string;
  title: string;
  description: string;
  examType: string;
  Icon: LucideIcon;
};

/** Presets for dashboard cards → exam_type sent to FastAPI (`get_exam_config`). */
export const SYLLABUS_TEMPLATES: SyllabusTemplate[] = [
  {
    key: "gate",
    title: "GATE",
    description: "Graduate aptitude — engineering & science streams.",
    examType: "GATE",
    Icon: GraduationCapIcon,
  },
  {
    key: "jee",
    title: "JEE",
    description: "Joint Entrance — Physics, Chemistry, Mathematics focus.",
    examType: "STANDARD",
    Icon: BookOpenIcon,
  },
  {
    key: "neet",
    title: "NEET",
    description: "Medical entrance — Biology-heavy assessment style.",
    examType: "STANDARD",
    Icon: MicroscopeIcon,
  },
  {
    key: "university",
    title: "University exams",
    description: "Balanced Bloom mix for semester and term assessments.",
    examType: "STANDARD",
    Icon: SchoolIcon,
  },
  {
    key: "general",
    title: "General adaptive",
    description: "Default profile — moderate pacing and mixed cognitive levels.",
    examType: "STANDARD",
    Icon: GlobeIcon,
  },
];

/** `total_questions` = whole-test count; backend splits across extracted syllabus units. */
export const DEFAULT_MARKING_SCHEME = {
  total_questions: 10,
  default_questions: 10,
  marks_per_question: 4,
  negative_fraction: 0,
};

/** Backend `get_exam_config` supports GATE + STANDARD (others fall back to STANDARD). */
export const EXAM_TYPE_OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: "GATE", label: "GATE", hint: "Analytical mix, time pressure" },
  {
    value: "STANDARD",
    label: "JEE / NEET / University",
    hint: "Balanced Bloom distribution",
  },
];

export const STUDY_QUOTES: string[] = [
  "Learning is not attained by chance; it must be sought for with ardor.",
  "Mastery arrives in layers — one honest attempt at a time.",
  "Adaptivity turns your mistakes into the next best question.",
  "Focus beats talent when talent doesn’t focus.",
];

export function quoteForToday(): string {
  const i = Math.floor(Date.now() / 86400000) % STUDY_QUOTES.length;
  return STUDY_QUOTES[i] ?? STUDY_QUOTES[0]!;
}
