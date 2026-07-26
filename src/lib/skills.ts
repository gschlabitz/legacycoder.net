// Skill registry loader — reads src/data/skills.yaml, provides lookup and
// locale resolution for the /skills pages and timeline event chips.
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { resolve } from "node:path";

export interface Skill {
  id: string;
  title: Record<string, string>;
  years: number[];
  note: Record<string, string>;
}

const yamlPath = resolve(process.cwd(), "src/data/skills.yaml");

let cached: Skill[] | null = null;

function loadSkills(): Skill[] {
  if (cached) return cached;
  const raw = readFileSync(yamlPath, "utf-8");
  cached = parse(raw) as Skill[];
  return cached;
}

/** All skills, sorted alphabetically by English title. */
export function getSkills(): Skill[] {
  return loadSkills().sort((a, b) =>
    (a.title.en ?? "").localeCompare(b.title.en ?? "")
  );
}

/** Lookup a single skill by its id. */
export function getSkill(id: string): Skill | undefined {
  return loadSkills().find((s) => s.id === id);
}

/** Skills active in a given year. */
export function getSkillsByYear(year: number): Skill[] {
  return loadSkills().filter((s) => s.years.includes(year));
}

/** Return the right locale's text, falling back to en. */
export function resolveLocale(
  skill: Skill,
  locale: string
): { title: string; note: string } {
  return {
    title: skill.title[locale] ?? skill.title.en,
    note: skill.note[locale] ?? skill.note.en,
  };
}
