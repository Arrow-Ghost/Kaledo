import type {
  AcademicOpportunity,
  CompanyProfile,
  DB,
  LearningProgram,
  Opportunity,
  User,
} from './types';

const DAY = 86400000;
const now = () => Date.now();

function seedCompanies(): { users: User[]; profiles: CompanyProfile[] } {
  const companies = [
    { name: 'Nimbus Cloud Systems', industry: 'Cloud Infrastructure', color: '#6ee7ff' },
    { name: 'Verdant Analytics', industry: 'Data & AI', color: '#a78bfa' },
    { name: 'Pixelforge Studios', industry: 'Design & Product', color: '#fb7185' },
    { name: 'SentinelGrid Security', industry: 'Cybersecurity', color: '#34d399' },
    { name: 'Orbit Marketing Collective', industry: 'Growth & Marketing', color: '#fbbf24' },
  ];
  const users: User[] = [];
  const profiles: CompanyProfile[] = [];
  companies.forEach((c, i) => {
    const id = `seed-company-${i}`;
    users.push({
      id,
      name: `${c.name} Recruiting`,
      email: `hr@${c.name.toLowerCase().replace(/\s+/g, '')}.com`,
      role: 'industry',
      createdAt: now() - (30 - i) * DAY,
    });
    profiles.push({
      userId: id,
      companyName: c.name,
      industry: c.industry,
      about: `${c.name} partners with academia to build the next generation of industry-ready talent through internships, live projects, and mentorship.`,
      logoColor: c.color,
    });
  });
  return { users, profiles };
}

export function buildSeedData(): DB {
  const { users: companyUsers, profiles: companyProfiles } = seedCompanies();
  const [nimbus, verdant, pixelforge, sentinel, orbit] = companyUsers.map((u) => u.id);

  const opportunities: Opportunity[] = [
    {
      id: 'opp-1',
      companyId: nimbus,
      title: 'Cloud Infrastructure Intern',
      type: 'internship',
      location: 'Bengaluru, IN',
      remote: true,
      stipendOrSalary: '₹35,000/mo',
      duration: '3 months',
      description:
        'Work with the platform team to build CI/CD pipelines, manage containerized workloads, and automate infrastructure on AWS.',
      requiredSkills: [
        { skill: 'Cloud & DevOps', score: 70 },
        { skill: 'Programming & Software Dev', score: 55 },
        { skill: 'Problem Solving', score: 50 },
      ],
      postedAt: now() - 4 * DAY,
      openings: 3,
    },
    {
      id: 'opp-2',
      companyId: verdant,
      title: 'Data Analyst Apprentice',
      type: 'apprenticeship',
      location: 'Remote',
      remote: true,
      stipendOrSalary: '₹28,000/mo',
      duration: '6 months',
      description:
        'Support the analytics team building dashboards, running statistical analysis, and preparing data pipelines for ML models.',
      requiredSkills: [
        { skill: 'Data Analysis & Statistics', score: 75 },
        { skill: 'AI / Machine Learning', score: 40 },
        { skill: 'Communication', score: 40 },
      ],
      postedAt: now() - 2 * DAY,
      openings: 4,
    },
    {
      id: 'opp-3',
      companyId: pixelforge,
      title: 'Product Design Intern',
      type: 'internship',
      location: 'Pune, IN',
      remote: false,
      stipendOrSalary: '₹25,000/mo',
      duration: '4 months',
      description:
        'Design and prototype user flows for a consumer mobile app; run usability tests with real users each sprint.',
      requiredSkills: [
        { skill: 'UI / UX Design', score: 75 },
        { skill: 'Communication', score: 55 },
        { skill: 'Adaptability', score: 45 },
      ],
      postedAt: now() - 6 * DAY,
      openings: 2,
    },
    {
      id: 'opp-4',
      companyId: sentinel,
      title: 'Junior Security Analyst',
      type: 'job',
      location: 'Hyderabad, IN',
      remote: false,
      stipendOrSalary: '₹6.5 LPA',
      duration: 'Full-time',
      description:
        'Monitor security alerts, perform vulnerability assessments, and assist in incident response for enterprise clients.',
      requiredSkills: [
        { skill: 'Cybersecurity', score: 80 },
        { skill: 'Problem Solving', score: 60 },
        { skill: 'Time Management', score: 45 },
      ],
      postedAt: now() - 1 * DAY,
      openings: 2,
    },
    {
      id: 'opp-5',
      companyId: orbit,
      title: 'Growth Marketing Intern',
      type: 'internship',
      location: 'Remote',
      remote: true,
      stipendOrSalary: '₹18,000/mo',
      duration: '3 months',
      description:
        'Run A/B tests on campaigns, analyze funnel data, and produce content for organic growth channels.',
      requiredSkills: [
        { skill: 'Digital Marketing', score: 70 },
        { skill: 'Data Analysis & Statistics', score: 35 },
        { skill: 'Communication', score: 55 },
      ],
      postedAt: now() - 8 * DAY,
      openings: 5,
    },
    {
      id: 'opp-6',
      companyId: verdant,
      title: 'Machine Learning Research Intern',
      type: 'internship',
      location: 'Remote',
      remote: true,
      stipendOrSalary: '₹40,000/mo',
      duration: '6 months',
      description:
        'Prototype and evaluate ML models for recommendation systems; collaborate with senior researchers on publications.',
      requiredSkills: [
        { skill: 'AI / Machine Learning', score: 75 },
        { skill: 'Programming & Software Dev', score: 60 },
        { skill: 'Problem Solving', score: 55 },
      ],
      postedAt: now() - 3 * DAY,
      openings: 2,
    },
    {
      id: 'opp-7',
      companyId: nimbus,
      title: 'Frontend Engineer',
      type: 'job',
      location: 'Bengaluru, IN',
      remote: true,
      stipendOrSalary: '₹9 LPA',
      duration: 'Full-time',
      description:
        'Build the customer-facing console used to manage cloud resources across our global infrastructure.',
      requiredSkills: [
        { skill: 'Programming & Software Dev', score: 80 },
        { skill: 'UI / UX Design', score: 50 },
        { skill: 'Problem Solving', score: 55 },
      ],
      postedAt: now() - 5 * DAY,
      openings: 3,
    },
    {
      id: 'opp-8',
      companyId: pixelforge,
      title: 'Product Management Trainee',
      type: 'apprenticeship',
      location: 'Pune, IN',
      remote: false,
      stipendOrSalary: '₹30,000/mo',
      duration: '6 months',
      description:
        'Shadow senior PMs to write specs, run stakeholder syncs, and ship a feature end-to-end during the program.',
      requiredSkills: [
        { skill: 'Product & Project Management', score: 65 },
        { skill: 'Communication', score: 65 },
        { skill: 'Leadership', score: 45 },
      ],
      postedAt: now() - 7 * DAY,
      openings: 2,
    },
  ];

  const learningPrograms: LearningProgram[] = [
    {
      id: 'lp-1',
      companyId: nimbus,
      title: 'AWS Cloud Practitioner Bootcamp',
      type: 'certification',
      description: 'A 4-week guided certification track covering core AWS services and DevOps practices.',
      skillsCovered: ['Cloud & DevOps', 'Problem Solving'],
      durationHours: 24,
      postedAt: now() - 10 * DAY,
    },
    {
      id: 'lp-2',
      companyId: verdant,
      title: 'Applied Data Science Workshop',
      type: 'workshop',
      description: 'Hands-on workshop covering statistics, Python, and real-world case studies with mentor feedback.',
      skillsCovered: ['Data Analysis & Statistics', 'AI / Machine Learning'],
      durationHours: 16,
      postedAt: now() - 9 * DAY,
    },
    {
      id: 'lp-3',
      companyId: pixelforge,
      title: 'Design Systems Mentorship',
      type: 'mentorship',
      description: '6-week 1:1 mentorship pairing students with senior designers to build a portfolio-ready case study.',
      skillsCovered: ['UI / UX Design', 'Communication'],
      durationHours: 12,
      postedAt: now() - 12 * DAY,
    },
    {
      id: 'lp-4',
      companyId: sentinel,
      title: 'Ethical Hacking Fundamentals',
      type: 'certification',
      description: 'Learn penetration testing basics and defensive security in a guided lab environment.',
      skillsCovered: ['Cybersecurity', 'Problem Solving'],
      durationHours: 20,
      postedAt: now() - 5 * DAY,
    },
    {
      id: 'lp-5',
      companyId: orbit,
      title: 'Growth Marketing Sprint',
      type: 'training',
      description: 'A practical sprint on funnel analytics, SEO, and campaign experimentation.',
      skillsCovered: ['Digital Marketing', 'Data Analysis & Statistics'],
      durationHours: 10,
      postedAt: now() - 14 * DAY,
    },
  ];

  const academicOpportunities: AcademicOpportunity[] = [
    {
      id: 'ao-1',
      companyId: nimbus,
      title: 'Faculty Cloud Immersion Program',
      type: 'fdp',
      description: 'A one-week residential FDP embedding faculty in Nimbus engineering teams to modernize cloud curricula.',
      domain: 'Cloud Computing',
      postedAt: now() - 6 * DAY,
    },
    {
      id: 'ao-2',
      companyId: verdant,
      title: 'Applied AI Research Collaboration',
      type: 'research',
      description: 'Joint research grant for faculty exploring applied ML in recommendation systems, with co-authored publications.',
      domain: 'Artificial Intelligence',
      postedAt: now() - 11 * DAY,
    },
    {
      id: 'ao-3',
      companyId: sentinel,
      title: 'Cybersecurity Curriculum Consultancy',
      type: 'consultancy',
      description: 'Paid consultancy engagement to co-design a cybersecurity elective with SentinelGrid security architects.',
      domain: 'Cybersecurity',
      postedAt: now() - 3 * DAY,
    },
    {
      id: 'ao-4',
      companyId: pixelforge,
      title: 'Industrial Training: Design Thinking Studio',
      type: 'industrial-training',
      description: 'Two-week industrial training placing faculty inside live product design sprints.',
      domain: 'Product Design',
      postedAt: now() - 8 * DAY,
    },
    {
      id: 'ao-5',
      companyId: orbit,
      title: 'Guest Lecture Series: Growth Analytics',
      type: 'guest-lecture',
      description: 'Recurring guest lecture slots for faculty to co-teach growth analytics with Orbit practitioners.',
      domain: 'Marketing Analytics',
      postedAt: now() - 15 * DAY,
    },
  ];

  const users: Record<string, User> = {};
  companyUsers.forEach((u) => (users[u.id] = u));
  const companyProfilesMap: Record<string, CompanyProfile> = {};
  companyProfiles.forEach((p) => (companyProfilesMap[p.userId] = p));

  return {
    users,
    studentProfiles: {},
    companyProfiles: companyProfilesMap,
    academicianProfiles: {},
    institutionProfiles: {},
    opportunities: Object.fromEntries(opportunities.map((o) => [o.id, o])),
    applications: {},
    learningPrograms: Object.fromEntries(learningPrograms.map((p) => [p.id, p])),
    academicOpportunities: Object.fromEntries(academicOpportunities.map((a) => [a.id, a])),
    academicRegistrations: {},
    resumes: {},
    resumeSnapshots: {},
    courseProgress: {},
    certificates: {},
  };
}
