import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

export default function SkillRadar({
  data,
  height = 340,
}: {
  data: { skill: string; score: number }[];
  height?: number;
}) {
  const chartData = data.map((d) => ({
    skill: d.skill.replace(' & ', ' &\n'),
    score: d.score,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={chartData} outerRadius="72%">
        <PolarGrid stroke="#22283f" />
        <PolarAngleAxis
          dataKey="skill"
          tick={{ fill: '#96a0c2', fontSize: 11 }}
        />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 100]}
          tick={{ fill: '#626b8c', fontSize: 10 }}
          axisLine={false}
        />
        <Radar
          name="Skill score"
          dataKey="score"
          stroke="#5eead4"
          fill="#5eead4"
          fillOpacity={0.25}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{
            background: '#0d1220',
            border: '1px solid #22283f',
            borderRadius: 12,
            fontSize: 12,
          }}
          labelStyle={{ color: '#eef1fb' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
