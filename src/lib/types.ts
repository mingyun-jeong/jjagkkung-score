export type Judge = {
  id: string;
  name: string;
  teamId: number | null;
  role: string | null;
  createdAt: number;
};

export type Score = {
  judgeId: string;
  teamId: number;
  tech: number; // 0-30
  bm: number; // 0-30
  completeness: number; // 0-20
  collab: number; // 0-20
  updatedAt: number;
};

export type TeamAverage = {
  teamId: number;
  tech: number;
  bm: number;
  completeness: number;
  collab: number;
  total: number;
  judgeCount: number;
};

export type DashboardState = {
  averages: TeamAverage[];
  totalJudges: number;
  scoringJudges: number;
  /** names of judges who have submitted at least one score */
  scoringJudgeNames: string[];
  revealLocked: boolean;
  /** flips true once the host has completed the 1위 reveal */
  revealed: boolean;
  /** team ids the host has individually exposed, sorted asc */
  revealedTeamIds: number[];
};

export const SCORE_MAX = {
  tech: 30,
  bm: 30,
  completeness: 20,
  collab: 20,
} as const;

export const SCORE_TOTAL_MAX =
  SCORE_MAX.tech + SCORE_MAX.bm + SCORE_MAX.completeness + SCORE_MAX.collab; // 100

export type ScoreField = keyof typeof SCORE_MAX;

export const SCORE_CRITERIA: {
  field: ScoreField;
  label: string;
  max: number;
  description: string;
}[] = [
  {
    field: "tech",
    label: "기술 활용도",
    max: SCORE_MAX.tech,
    description:
      "필수 API(더빙)와 LLM이 억지로 들어가지 않고 서비스의 핵심으로 잘 작동하는가?",
  },
  {
    field: "bm",
    label: "사업성/BM",
    max: SCORE_MAX.bm,
    description: "타겟 고객이 명확하고 수익 창출 논리가 타당한가?",
  },
  {
    field: "completeness",
    label: "완성도",
    max: SCORE_MAX.completeness,
    description: "버그 없이 시연(Demo)이 매끄럽게 진행되었는가?",
  },
  {
    field: "collab",
    label: "협업/발표",
    max: SCORE_MAX.collab,
    description:
      "두 사람의 역할 분담이 잘 이루어졌고, 발표 내용이 설득력 있는가?",
  },
];
