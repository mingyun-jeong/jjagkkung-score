export type Team = {
  id: number;
  name: string;
  members: readonly [string, string];
};

export const TEAMS: readonly Team[] = [
  { id: 1, name: "1조", members: ["이혜람", "이지선"] },
  { id: 2, name: "2조", members: ["신혜선", "이동원"] },
  { id: 3, name: "3조", members: ["정지영", "정수민"] },
  { id: 4, name: "4조", members: ["김민아", "박정현"] },
  { id: 5, name: "5조", members: ["최용석", "김규원"] },
  { id: 6, name: "6조", members: ["권우석", "조유미"] },
  { id: 7, name: "7조", members: ["배운태", "김희선"] },
  { id: 8, name: "8조", members: ["원수림", "정윤희"] },
] as const;

export const TEAM_BY_ID = new Map<number, Team>(TEAMS.map((t) => [t.id, t]));

export type Staff = {
  name: string;
  role: string;
};

export const STAFF: readonly Staff[] = [
  { name: "권택순", role: "후원" },
  { name: "정민균", role: "CS" },
] as const;

export const STAFF_NAMES = new Set(STAFF.map((s) => s.name));

/** Only this account can lock/announce the final ranking. */
export const HOST_NAME = "정민균";

/** All valid login identities (16 participants + 2 staff = 18) */
export const ALL_PEOPLE: ReadonlyArray<{
  name: string;
  teamId: number | null;
  role: string | null;
}> = [
  ...TEAMS.flatMap((t) =>
    t.members.map((name) => ({ name, teamId: t.id, role: null })),
  ),
  ...STAFF.map((s) => ({ name: s.name, teamId: null, role: s.role })),
];
