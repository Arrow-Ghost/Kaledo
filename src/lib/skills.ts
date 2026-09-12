import type { JobRole } from './types';

export const TECHNICAL_SKILLS = [
  'Programming & Software Dev',
  'Data Analysis & Statistics',
  'Cloud & DevOps',
  'AI / Machine Learning',
  'UI / UX Design',
  'Cybersecurity',
  'Digital Marketing',
  'Product & Project Management',
] as const;

export const SOFT_SKILLS = [
  'Communication',
  'Teamwork & Collaboration',
  'Problem Solving',
  'Leadership',
  'Adaptability',
  'Time Management',
] as const;

export const ALL_SKILLS = [...TECHNICAL_SKILLS, ...SOFT_SKILLS];

export type SkillName = (typeof ALL_SKILLS)[number];

export const SKILL_LEVEL_LABELS: Record<number, string> = {
  0: 'No experience',
  1: 'Aware of basics',
  2: 'Applied in coursework',
  3: 'Applied in real projects',
  4: 'Confident / mentoring others',
  5: 'Expert / industry-ready',
};

export interface AssessmentQuestion {
  skill: SkillName;
  prompt: string;
  helper: string;
}

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  {
    skill: 'Programming & Software Dev',
    prompt: 'How comfortable are you writing and debugging production-quality code?',
    helper: 'Think languages, frameworks, version control, and code review experience.',
  },
  {
    skill: 'Data Analysis & Statistics',
    prompt: 'How confident are you analyzing datasets and drawing statistical conclusions?',
    helper: 'Spreadsheets, SQL, Python/R, visualization, hypothesis testing.',
  },
  {
    skill: 'Cloud & DevOps',
    prompt: 'How familiar are you with cloud platforms and deployment pipelines?',
    helper: 'AWS/Azure/GCP, CI/CD, containers, infrastructure as code.',
  },
  {
    skill: 'AI / Machine Learning',
    prompt: 'How capable are you at building or applying ML/AI models?',
    helper: 'Model training, prompt engineering, applied AI tooling.',
  },
  {
    skill: 'UI / UX Design',
    prompt: 'How strong is your ability to design usable, attractive interfaces?',
    helper: 'Wireframing, prototyping, design systems, usability testing.',
  },
  {
    skill: 'Cybersecurity',
    prompt: 'How well do you understand security principles and threat mitigation?',
    helper: 'Secure coding, network security, risk assessment.',
  },
  {
    skill: 'Digital Marketing',
    prompt: 'How skilled are you at digital marketing and growth strategy?',
    helper: 'SEO, campaigns, analytics, content strategy.',
  },
  {
    skill: 'Product & Project Management',
    prompt: 'How confident are you planning and shipping a product or project end-to-end?',
    helper: 'Roadmapping, stakeholder management, agile delivery.',
  },
  {
    skill: 'Communication',
    prompt: 'How effectively can you explain ideas to technical and non-technical audiences?',
    helper: 'Writing, presenting, active listening.',
  },
  {
    skill: 'Teamwork & Collaboration',
    prompt: 'How well do you work within a team toward a shared goal?',
    helper: 'Cross-functional work, conflict resolution, reliability.',
  },
  {
    skill: 'Problem Solving',
    prompt: 'How strong are your analytical and critical thinking skills?',
    helper: 'Breaking down ambiguous problems, structured reasoning.',
  },
  {
    skill: 'Leadership',
    prompt: 'How comfortable are you taking initiative and guiding others?',
    helper: 'Delegation, decision-making, motivating a team.',
  },
  {
    skill: 'Adaptability',
    prompt: 'How well do you adjust to new tools, domains, or shifting priorities?',
    helper: 'Learning agility, handling ambiguity and change.',
  },
  {
    skill: 'Time Management',
    prompt: 'How reliably do you plan, prioritize, and meet deadlines?',
    helper: 'Prioritization, focus, juggling multiple commitments.',
  },
];

export const JOB_ROLES: JobRole[] = [
  {
    id: 'role-frontend',
    title: 'Frontend Developer',
    category: 'Engineering',
    description: 'Builds performant, accessible user interfaces for web products.',
    idealSkills: [
      { skill: 'Programming & Software Dev', score: 85 },
      { skill: 'UI / UX Design', score: 65 },
      { skill: 'Problem Solving', score: 70 },
      { skill: 'Adaptability', score: 55 },
    ],
  },
  {
    id: 'role-data-scientist',
    title: 'Data Scientist',
    category: 'Data',
    description: 'Extracts insight from data and builds predictive models.',
    idealSkills: [
      { skill: 'Data Analysis & Statistics', score: 90 },
      { skill: 'AI / Machine Learning', score: 75 },
      { skill: 'Programming & Software Dev', score: 60 },
      { skill: 'Problem Solving', score: 70 },
    ],
  },
  {
    id: 'role-cloud-engineer',
    title: 'Cloud / DevOps Engineer',
    category: 'Engineering',
    description: 'Designs and operates scalable, reliable cloud infrastructure.',
    idealSkills: [
      { skill: 'Cloud & DevOps', score: 90 },
      { skill: 'Programming & Software Dev', score: 60 },
      { skill: 'Problem Solving', score: 65 },
      { skill: 'Time Management', score: 50 },
    ],
  },
  {
    id: 'role-ux-designer',
    title: 'UX Designer',
    category: 'Design',
    description: 'Researches user needs and designs intuitive product experiences.',
    idealSkills: [
      { skill: 'UI / UX Design', score: 90 },
      { skill: 'Communication', score: 70 },
      { skill: 'Problem Solving', score: 60 },
      { skill: 'Adaptability', score: 55 },
    ],
  },
  {
    id: 'role-security-analyst',
    title: 'Cybersecurity Analyst',
    category: 'Security',
    description: 'Protects systems and data from threats and vulnerabilities.',
    idealSkills: [
      { skill: 'Cybersecurity', score: 90 },
      { skill: 'Problem Solving', score: 70 },
      { skill: 'Programming & Software Dev', score: 50 },
      { skill: 'Time Management', score: 50 },
    ],
  },
  {
    id: 'role-product-manager',
    title: 'Product Manager',
    category: 'Product',
    description: 'Owns product strategy and coordinates cross-functional delivery.',
    idealSkills: [
      { skill: 'Product & Project Management', score: 90 },
      { skill: 'Communication', score: 80 },
      { skill: 'Leadership', score: 65 },
      { skill: 'Problem Solving', score: 60 },
    ],
  },
  {
    id: 'role-digital-marketer',
    title: 'Digital Marketing Specialist',
    category: 'Marketing',
    description: 'Drives growth through data-informed marketing campaigns.',
    idealSkills: [
      { skill: 'Digital Marketing', score: 90 },
      { skill: 'Data Analysis & Statistics', score: 55 },
      { skill: 'Communication', score: 70 },
      { skill: 'Adaptability', score: 55 },
    ],
  },
  {
    id: 'role-ml-engineer',
    title: 'AI / ML Engineer',
    category: 'Data',
    description: 'Builds and deploys production machine learning systems.',
    idealSkills: [
      { skill: 'AI / Machine Learning', score: 90 },
      { skill: 'Programming & Software Dev', score: 75 },
      { skill: 'Cloud & DevOps', score: 55 },
      { skill: 'Problem Solving', score: 65 },
    ],
  },
];

/**
 * Weighted match between a student's skill vector and a required/ideal
 * skill vector. Each required skill contributes proportionally to its
 * importance; skills the student exceeds the bar on cap at 100% credit.
 */
export function computeMatchScore(
  studentSkills: { skill: string; score: number }[],
  requiredSkills: { skill: string; score: number }[]
): number {
  if (requiredSkills.length === 0) return 0;
  const studentMap = new Map(studentSkills.map((s) => [s.skill, s.score]));
  let weightedSum = 0;
  let totalWeight = 0;
  for (const req of requiredSkills) {
    const have = studentMap.get(req.skill) ?? 0;
    const credit = Math.min(have / Math.max(req.score, 1), 1);
    weightedSum += credit * req.score;
    totalWeight += req.score;
  }
  if (totalWeight === 0) return 0;
  return Math.round((weightedSum / totalWeight) * 100);
}

export function computeSkillGaps(
  studentSkills: { skill: string; score: number }[],
  requiredSkills: { skill: string; score: number }[]
): { skill: string; gap: number }[] {
  const studentMap = new Map(studentSkills.map((s) => [s.skill, s.score]));
  return requiredSkills
    .map((req) => ({
      skill: req.skill,
      gap: Math.max(req.score - (studentMap.get(req.skill) ?? 0), 0),
    }))
    .filter((g) => g.gap > 0)
    .sort((a, b) => b.gap - a.gap);
}

export function recommendRoles(studentSkills: { skill: string; score: number }[], limit = 4) {
  return JOB_ROLES.map((role) => ({
    role,
    matchScore: computeMatchScore(studentSkills, role.idealSkills),
    gaps: computeSkillGaps(studentSkills, role.idealSkills),
  }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}
