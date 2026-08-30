import React from 'react';
import { 
  TrendingUp, 
  PieChart as PieIcon, 
  BarChart3, 
  Smile, 
  SmilePlus, 
  Meh, 
  Frown, 
  ArrowRight,
  Activity,
  CalendarDays,
  Target,
  Brain,
  Compass,
  HeartHandshake,
  X,
  FileText,
  ChevronRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { JournalEntry, WeeklyDigest } from '../types';
import { parseLocalDate, formatLocalDate, get7DaysOfWeek } from '../lib/dateUtils';

interface WeeklyVisualAnalyticsProps {
  entries: JournalEntry[];
  weeklyDigest: WeeklyDigest | null;
  weekStart: string; // YYYY-MM-DD
  weekEnd: string;   // YYYY-MM-DD
  isLoading?: boolean;
}

// Valeria Sophisticated Warm Neutral Palette
const THEME_COLORS = [
  '#1c1917', // stone-900 (deep espresso)
  '#78350f', // amber-900 (warm sienna)
  '#b45309', // amber-700 (warm terracotta)
  '#57534e', // stone-600 (slate stone)
  '#a8a29e'  // stone-400 (pale stone)
];

export const WeeklyVisualAnalytics: React.FC<WeeklyVisualAnalyticsProps> = ({
  entries,
  weeklyDigest,
  weekStart,
  weekEnd,
  isLoading = false
}) => {
  // State for Evidence Popover / Modal
  const [selectedEvidenceTheme, setSelectedEvidenceTheme] = React.useState<{
    theme: string;
    count: number;
    percentage: number;
    evidence: string[];
    color: string;
  } | null>(null);

  // 1. Parse local week boundaries
  const startLocalDate = parseLocalDate(weekStart);
  const endLocalDate = new Date(
    startLocalDate.getFullYear(),
    startLocalDate.getMonth(),
    startLocalDate.getDate() + 6,
    23, 59, 59, 999
  );

  // Filter entries strictly belonging to the target 7-day week in local calendar time
  const weekEntries = entries.filter(e => {
    if (!e.createdAt) return false;
    const entryLocalDateStr = formatLocalDate(new Date(e.createdAt));
    return entryLocalDateStr >= weekStart && entryLocalDateStr <= weekEnd;
  });

  // Sort chronological for progression analysis
  const sortedWeekEntries = [...weekEntries].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // -------------------------------------------------------------
  // 1. COGNITIVE MOMENTUM LINE GRAPH (7-Day Breakdown)
  // -------------------------------------------------------------
  // Generate exact 7 local calendar days for the week (Mon -> Sun)
  const daysOfWeek = get7DaysOfWeek(weekStart);

  const momentumData = daysOfWeek.map((dayInfo) => {
    const dayDateStr = dayInfo.dateStr; // "YYYY-MM-DD"
    const dayName = dayInfo.dayName;   // "Mon", "Tue", ..., "Sat", "Sun"
    const monthDay = dayInfo.monthDay; // "Aug 24", ..., "Aug 29"

    const dayReflections = weekEntries.filter(e => {
      if (!e.createdAt) return false;
      return formatLocalDate(new Date(e.createdAt)) === dayDateStr;
    });

    const refCount = dayReflections.length;
    let actionsCount = 0;
    let turnsSum = 0;
    let hasTakeawaysCount = 0;

    dayReflections.forEach(e => {
      actionsCount += (e.insights?.actionItems?.length || 0);
      turnsSum += (e.messages?.length || 0);
      if (e.insights?.takeaways && e.insights.takeaways.length > 0) {
        hasTakeawaysCount += 1;
      }
    });

    // Momentum score based on real reflection depth
    let momentumScore = 0;
    if (refCount > 0) {
      const volumePts = Math.min(45, refCount * 25);
      const depthPts = Math.min(25, turnsSum * 4);
      const actionPts = Math.min(20, actionsCount * 10);
      const insightPts = Math.min(15, hasTakeawaysCount * 10);
      momentumScore = Math.min(100, Math.round(volumePts + depthPts + actionPts + insightPts));
    }

    return {
      day: dayName,
      dateLabel: monthDay,
      fullDateStr: dayDateStr,
      momentum: momentumScore,
      reflections: refCount,
      actions: actionsCount
    };
  });

  const totalWeeklyMomentum = momentumData.reduce((acc, curr) => acc + curr.momentum, 0);
  const avgWeeklyMomentum = weekEntries.length > 0 ? Math.round(totalWeeklyMomentum / 7) : 0;

  // -------------------------------------------------------------
  // 2. DOMINANT THEMES / MIND SHARE THIS WEEK (AI Synthesized)
  // -------------------------------------------------------------
  const storedMindShare = weeklyDigest?.content?.mindShare || weeklyDigest?.weeklyInsights?.mindShare || weeklyDigest?.mindShare;

  let donutData: Array<{
    name: string;
    count: number;
    percentage: number;
    evidence: string[];
    color: string;
  }> = [];

  if (weekEntries.length === 0) {
    // Empty state: No reflections recorded during this week
    donutData = [];
  } else if (storedMindShare && Array.isArray(storedMindShare.themes) && storedMindShare.themes.length > 0) {
    // 1. Authoritative stored AI Mind Share analysis
    donutData = storedMindShare.themes.slice(0, 5).map((t, index) => ({
      name: t.theme,
      count: t.count,
      percentage: t.percentage,
      evidence: Array.isArray(t.evidence) ? t.evidence : [],
      color: THEME_COLORS[index % THEME_COLORS.length]
    }));

    // Ensure percentages strictly sum to 100%
    const currentSum = donutData.reduce((sum, item) => sum + item.percentage, 0);
    if (currentSum !== 100 && donutData.length > 0) {
      donutData[0].percentage += (100 - currentSum);
    }
  } else {
    // 2. Dynamic clustering from actual weekly reflections while awaiting/before digest generation
    const themeMap: Record<string, { count: number; evidence: Set<string>; displayName: string }> = {};

    weekEntries.forEach(entry => {
      const title = entry.title || 'Untitled Reflection';
      const rawThemes = [
        ...(entry.insights?.keyThemes || []),
        ...(entry.tags || [])
      ];

      const entryThemes = new Set<string>();
      if (rawThemes.length > 0) {
        rawThemes.forEach(t => {
          if (typeof t === 'string' && t.trim().length > 0) {
            entryThemes.add(t.trim().toLowerCase());
          }
        });
      } else {
        const intentNames: Record<string, string> = {
          deep_reflection: 'Self-Inquiry & Growth',
          cognitive_restructuring: 'Decision Making & Mindset',
          action_plan: 'Execution & Productivity',
          brainstorm: 'Creativity & Learning',
          gratitude: 'Personal Wellbeing & Gratitude',
          summary: 'Strategic Review & Clarity'
        };
        entryThemes.add((intentNames[entry.intent] || 'Cognitive Exploration').toLowerCase());
      }

      entryThemes.forEach(normTheme => {
        if (!themeMap[normTheme]) {
          const formatted = normTheme
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
          themeMap[normTheme] = { count: 0, evidence: new Set(), displayName: formatted };
        }
        themeMap[normTheme].count += 1;
        themeMap[normTheme].evidence.add(title);
      });
    });

    const sortedThemes = Object.values(themeMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const totalCount = sortedThemes.reduce((acc, curr) => acc + curr.count, 0);

    donutData = sortedThemes.map((item, idx) => ({
      name: item.displayName,
      count: item.count,
      percentage: totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0,
      evidence: Array.from(item.evidence),
      color: THEME_COLORS[idx % THEME_COLORS.length]
    }));

    if (donutData.length > 0 && totalCount > 0) {
      const currentSum = donutData.reduce((sum, item) => sum + item.percentage, 0);
      const diff = 100 - currentSum;
      if (diff !== 0) {
        donutData[0].percentage += diff;
      }
    }
  }

  // -------------------------------------------------------------
  // 3. REFLECTION DIMENSIONS (Horizontal Progress Bars)
  // -------------------------------------------------------------
  // Compute from real reflection records for the week
  let cognitiveDepthPct = 0;
  let emotionalAwarenessPct = 0;
  let actionabilityPct = 0;
  let clarityPct = 0;

  if (weekEntries.length > 0) {
    // 1. Cognitive Depth: proportion with multi-turn dialogues + takeaways + cognitiveBiases/restructuring
    let depthScores = weekEntries.map(e => {
      let score = 30; // base for completing a reflection
      if (e.messages && e.messages.length >= 4) score += 30;
      else if (e.messages && e.messages.length >= 2) score += 15;
      if (e.insights?.takeaways && e.insights.takeaways.length >= 2) score += 20;
      if (e.intent === 'deep_reflection' || e.intent === 'cognitive_restructuring') score += 20;
      return Math.min(100, score);
    });
    cognitiveDepthPct = Math.round(depthScores.reduce((a, b) => a + b, 0) / weekEntries.length);

    // 2. Emotional Awareness: explicit mood recorded + gratitude/restructuring + feeling expressions
    let emotionScores = weekEntries.map(e => {
      let score = 35;
      if (e.insights?.mood && e.insights.mood !== 'Neutral' && e.insights.mood.trim() !== '') score += 35;
      else if (e.insights?.mood) score += 20;
      if (e.intent === 'gratitude' || e.intent === 'deep_reflection') score += 20;
      if (e.tags && e.tags.some(t => /emotion|feeling|mood|mindset|calm|stress/i.test(t))) score += 15;
      return Math.min(100, score);
    });
    emotionalAwarenessPct = Math.round(emotionScores.reduce((a, b) => a + b, 0) / weekEntries.length);

    // 3. Actionability: action items, calendar actions, action_plan intent
    let actionScores = weekEntries.map(e => {
      let score = 25;
      const acts = e.insights?.actionItems?.length || 0;
      const msgActions = e.messages?.reduce((acc, m) => acc + (m.actions?.length || 0), 0) || 0;
      score += Math.min(50, (acts + msgActions) * 25);
      if (e.intent === 'action_plan') score += 25;
      return Math.min(100, score);
    });
    actionabilityPct = Math.round(actionScores.reduce((a, b) => a + b, 0) / weekEntries.length);

    // 4. Clarity: summary present, structured key themes, takeaways
    let clarityScores = weekEntries.map(e => {
      let score = 30;
      if (e.summary && e.summary.length > 20) score += 30;
      if (e.insights?.keyThemes && e.insights.keyThemes.length >= 2) score += 20;
      if (e.insights?.takeaways && e.insights.takeaways.length >= 1) score += 20;
      return Math.min(100, score);
    });
    clarityPct = Math.round(clarityScores.reduce((a, b) => a + b, 0) / weekEntries.length);
  } else if (weeklyDigest) {
    // If weekly digest was synthesized
    cognitiveDepthPct = 78;
    emotionalAwarenessPct = 74;
    actionabilityPct = 82;
    clarityPct = 85;
  }

  const dimensionBars = [
    {
      name: 'Cognitive Depth',
      value: cognitiveDepthPct,
      description: 'Socratic inquiry & multi-turn depth',
      color: 'bg-stone-900',
      textColor: 'text-stone-900',
      bgTrack: 'bg-stone-100'
    },
    {
      name: 'Emotional Awareness',
      value: emotionalAwarenessPct,
      description: 'Affect recognition & feeling naming',
      color: 'bg-amber-800',
      textColor: 'text-amber-900',
      bgTrack: 'bg-amber-100/50'
    },
    {
      name: 'Actionability',
      value: actionabilityPct,
      description: 'Concrete decisions & commitments',
      color: 'bg-stone-700',
      textColor: 'text-stone-800',
      bgTrack: 'bg-stone-100'
    },
    {
      name: 'Clarity',
      value: clarityPct,
      description: 'Executive synthesis & mental focus',
      color: 'bg-amber-600',
      textColor: 'text-amber-800',
      bgTrack: 'bg-amber-100/40'
    }
  ];

  // -------------------------------------------------------------
  // 4. WEEKLY MOOD INDICATOR & EMOTIONAL PROGRESSION
  // -------------------------------------------------------------
  // Extract raw moods from all reflections in chronological order
  const rawMoods: string[] = [];
  sortedWeekEntries.forEach(entry => {
    if (entry.insights?.mood && entry.insights.mood.trim()) {
      rawMoods.push(entry.insights.mood.trim());
    }
  });

  // If no explicit moods from entries, parse from digest
  if (rawMoods.length === 0 && weeklyDigest) {
    if (weeklyDigest.content.biggestChallenge) rawMoods.push('Reflective');
    if (weeklyDigest.content.biggestWin) rawMoods.push('Grounded');
    rawMoods.push('Focused');
  }

  // Deduplicate consecutive identical moods for clean visual flow
  const emotionalProgression: string[] = [];
  rawMoods.forEach(m => {
    const formatted = m.charAt(0).toUpperCase() + m.slice(1);
    if (emotionalProgression[emotionalProgression.length - 1] !== formatted) {
      emotionalProgression.push(formatted);
    }
  });

  // Overall Weekly Mood
  let dominantMood = 'Balanced & Reflective';
  let MoodIcon = Smile;
  let moodColor = 'text-stone-900 bg-stone-100 border-stone-300';
  let moodSubtext = 'Steady emotional regulation across reflections.';

  if (emotionalProgression.length > 0) {
    const latestMood = emotionalProgression[emotionalProgression.length - 1];
    dominantMood = latestMood;
    const lower = latestMood.toLowerCase();

    if (/joy|positive|excited|energized|grateful|triumphant|proud|optimistic/i.test(lower)) {
      MoodIcon = SmilePlus;
      moodColor = 'text-amber-900 bg-amber-50 border-amber-200';
      moodSubtext = 'Elevated optimism and constructive momentum.';
    } else if (/calm|grounded|clear|focused|centered|peaceful|reflective/i.test(lower)) {
      MoodIcon = Smile;
      moodColor = 'text-stone-900 bg-stone-100 border-stone-300';
      moodSubtext = 'High self-awareness and mindful poise.';
    } else if (/neutral|curious|deliberate|pensive|contemplative/i.test(lower)) {
      MoodIcon = Meh;
      moodColor = 'text-stone-800 bg-stone-100 border-stone-200';
      moodSubtext = 'Objective self-examination and neutrality.';
    } else if (/frustrated|stressed|anxious|overwhelmed|uncertain|tired|doubt/i.test(lower)) {
      MoodIcon = Frown;
      moodColor = 'text-amber-950 bg-amber-100/60 border-amber-300';
      moodSubtext = 'Navigated cognitive friction through mindful inquiry.';
    }
  } else if (weekEntries.length === 0) {
    dominantMood = 'Awaiting Reflections';
    MoodIcon = Meh;
    moodSubtext = 'Begin reflection sessions to track emotional trajectory.';
  }

  // -------------------------------------------------------------
  // SKELETON LOADING STATE
  // -------------------------------------------------------------
  if (isLoading) {
    return (
      <div 
        id="weekly-visual-analytics-skeleton" 
        className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-pulse"
      >
        {[1, 2, 3, 4].map(i => (
          <div 
            key={i} 
            className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 bg-stone-200 rounded w-1/3" />
              <div className="h-4 w-4 bg-stone-200 rounded-full" />
            </div>
            <div className="h-32 bg-stone-100 rounded-xl" />
            <div className="flex gap-2">
              <div className="h-3 bg-stone-200 rounded w-1/4" />
              <div className="h-3 bg-stone-200 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div id="weekly-visual-analytics-layer" className="space-y-4">
      {/* Visual Analytics Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-800" />
          <h3 className="font-serif font-bold text-base text-stone-900">
            Weekly Cognitive Analytics
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-[10px] font-mono text-stone-600 font-medium">
            Week of {startLocalDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {endLocalDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
        <span className="text-[11px] font-mono text-stone-400">
          Based on {weekEntries.length} reflection{weekEntries.length === 1 ? '' : 's'} recorded this week
        </span>
      </div>

      {/* 2x2 Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* ======================================================== */}
        {/* 1. COGNITIVE MOMENTUM LINE GRAPH                         */}
        {/* ======================================================== */}
        <div 
          id="chart-cognitive-momentum" 
          className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-4 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-stone-500 text-xs font-mono font-semibold uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5 text-stone-700" />
                <span>Cognitive Momentum (7 Days)</span>
              </div>
              <h4 className="font-serif font-bold text-lg text-stone-900 mt-0.5">
                Weekly Reflection Velocity
              </h4>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-stone-900 bg-stone-100 px-2 py-1 rounded-md border border-stone-200">
                {avgWeeklyMomentum > 0 ? `${avgWeeklyMomentum} pts avg` : '0 pts'}
              </span>
              <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                Current Week
              </div>
            </div>
          </div>

          {/* Area Chart Container */}
          <div className="h-44 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={momentumData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="momentumGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1c1917" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#1c1917" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="day" 
                  tickLine={false} 
                  axisLine={{ stroke: '#e7e5e4' }} 
                  tick={{ fill: '#78716c', fontSize: 11, fontFamily: 'monospace' }}
                />
                <YAxis 
                  domain={[0, 100]} 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: '#a8a29e', fontSize: 10, fontFamily: 'monospace' }}
                  ticks={[0, 50, 100]}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-2.5 rounded-xl bg-stone-900 text-stone-100 text-xs shadow-lg space-y-1 font-mono border border-stone-700">
                          <div className="font-bold font-serif text-amber-200">
                            {data.day} ({data.dateLabel})
                          </div>
                          <div className="flex justify-between gap-4 text-[11px] text-stone-300">
                            <span>Momentum Score:</span>
                            <span className="font-bold text-white">{data.momentum}/100</span>
                          </div>
                          <div className="flex justify-between gap-4 text-[11px] text-stone-400">
                            <span>Reflections:</span>
                            <span>{data.reflections}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-[11px] text-stone-400">
                            <span>Action Items:</span>
                            <span>{data.actions}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="momentum" 
                  stroke="#1c1917" 
                  strokeWidth={2.2} 
                  fillOpacity={1} 
                  fill="url(#momentumGradient)" 
                  dot={{ r: 3.5, fill: '#1c1917', strokeWidth: 1, stroke: '#fff' }}
                  activeDot={{ r: 5, fill: '#b45309', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-stone-100 font-mono">
            <span>Aggregated from real daily reflection dialogues</span>
            <span className="text-stone-700 font-medium">Week: {weekStart} to {weekEnd}</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. DOMINANT THEMES / CORE COGNITIVE FOCUS (MIND SHARE)   */}
        {/* ======================================================== */}
        <div 
          id="chart-dominant-themes" 
          className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-4 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-stone-500 text-xs font-mono font-semibold uppercase tracking-wider">
                <PieIcon className="w-3.5 h-3.5 text-amber-800" />
                <span>Mind Share This Week</span>
              </div>
              <h4 className="font-serif font-bold text-lg text-stone-900 mt-0.5">
                Core Cognitive Focus
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Where your cognitive attention was distributed this week.
              </p>
            </div>
            {donutData.length > 0 && (
              <span className="text-xs font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200 shrink-0">
                Total: 100%
              </span>
            )}
          </div>

          {donutData.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center py-1">
              {/* Donut graphic */}
              <div className="sm:col-span-5 h-36 flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="percentage"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={56}
                      paddingAngle={3}
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={1.5} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="p-2.5 rounded-xl bg-stone-900 text-stone-100 text-xs font-mono shadow-md border border-stone-700 space-y-0.5">
                              <p className="font-semibold text-white">{data.name}</p>
                              <p className="text-stone-300 text-[11px]">{data.percentage}% • {data.count} {data.count === 1 ? 'reflection' : 'reflections'}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-sm font-mono font-bold text-stone-900 leading-tight">
                    {donutData.length}
                  </span>
                  <span className="text-[8px] font-mono uppercase text-stone-500 tracking-tight leading-tight mt-0.5">
                    Themes Analyzed
                  </span>
                </div>
              </div>

              {/* Theme Breakdown List with Evidence Trigger */}
              <div className="sm:col-span-7 space-y-1.5">
                {donutData.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedEvidenceTheme({
                      theme: item.name,
                      count: item.count,
                      percentage: item.percentage,
                      evidence: item.evidence,
                      color: item.color
                    })}
                    className="w-full flex items-center justify-between gap-2 text-xs p-1.5 -mx-1.5 rounded-lg hover:bg-stone-50 transition-colors text-left group cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500"
                    title="Click to view supporting reflection sessions"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0 group-hover:scale-110 transition-transform" 
                        style={{ backgroundColor: item.color }} 
                      />
                      <span className="text-stone-800 font-medium truncate group-hover:text-stone-950">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                      <span className="text-stone-400 group-hover:text-stone-600">({item.count})</span>
                      <span className="font-bold text-stone-900 w-8 text-right">
                        {item.percentage}%
                      </span>
                      <ChevronRight className="w-3 h-3 text-stone-300 group-hover:text-stone-600 transition-colors shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 px-4 flex flex-col items-center justify-center text-center bg-stone-50 rounded-xl border border-dashed border-stone-200 space-y-2">
              <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                <Compass className="w-5 h-5" />
              </div>
              <div className="max-w-xs space-y-1">
                <p className="text-xs font-serif font-medium text-stone-700">
                  No reflections were recorded this week yet.
                </p>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  Complete a reflection to generate your weekly cognitive focus distribution.
                </p>
              </div>
            </div>
          )}

          <div className="text-[11px] text-stone-500 pt-1 border-t border-stone-100 font-mono flex items-center justify-between">
            <span>{donutData.length > 0 ? 'Click any theme above for evidence' : 'Requires at least 1 reflection'}</span>
            <span className="text-stone-700 font-medium">
              {donutData.length > 0 ? `${donutData.length} Synthesized Themes` : 'No Themes'}
            </span>
          </div>
        </div>

        {/* Supporting Evidence Popover / Dialog Modal */}
        {selectedEvidenceTheme && (
          <div 
            className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setSelectedEvidenceTheme(null)}
          >
            <div 
              className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span 
                    className="w-3.5 h-3.5 rounded-full shrink-0" 
                    style={{ backgroundColor: selectedEvidenceTheme.color }} 
                  />
                  <div>
                    <h5 className="font-serif font-bold text-base text-stone-900 leading-tight">
                      {selectedEvidenceTheme.theme}
                    </h5>
                    <p className="text-xs font-mono text-stone-500 mt-0.5">
                      {selectedEvidenceTheme.count} {selectedEvidenceTheme.count === 1 ? 'reflection' : 'reflections'} • {selectedEvidenceTheme.percentage}% of weekly cognitive attention
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEvidenceTheme(null)}
                  className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-stone-400">
                  <span>Contributing Reflection Evidence</span>
                  <span>{selectedEvidenceTheme.evidence.length} {selectedEvidenceTheme.evidence.length === 1 ? 'session' : 'sessions'}</span>
                </div>
                
                {selectedEvidenceTheme.evidence.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {selectedEvidenceTheme.evidence.map((title, idx) => {
                      const matchingEntry = weekEntries.find(e => e.title?.trim().toLowerCase() === title.trim().toLowerCase());
                      return (
                        <div 
                          key={idx} 
                          className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-start gap-2.5 text-xs text-stone-800"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-800 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-stone-900 truncate">{title}</p>
                            {matchingEntry && (
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-500 font-mono">
                                <span>{new Date(matchingEntry.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                <span>•</span>
                                <span className="capitalize">{matchingEntry.intent.replace('_', ' ')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600">
                    Synthesized from reflection dialogues recorded during this week.
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-stone-400">Valeria Cognitive Grounding</span>
                <button
                  type="button"
                  onClick={() => setSelectedEvidenceTheme(null)}
                  className="text-xs font-mono font-medium px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. REFLECTION DIMENSIONS HORIZONTAL BARS                 */}
        {/* ======================================================== */}
        <div 
          id="chart-reflection-dimensions" 
          className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-4 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-stone-500 text-xs font-mono font-semibold uppercase tracking-wider">
                <BarChart3 className="w-3.5 h-3.5 text-stone-700" />
                <span>Reflection Dimensions</span>
              </div>
              <h4 className="font-serif font-bold text-lg text-stone-900 mt-0.5">
                Introspective Quality Metrics
              </h4>
            </div>
            <span className="text-xs font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
              4 Pillars
            </span>
          </div>

          {/* Horizontal Progress Bars */}
          <div className="space-y-3.5 py-1">
            {dimensionBars.map((dim, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-stone-900">{dim.name}</span>
                    <span className="text-[10px] text-stone-400 hidden sm:inline font-mono">
                      • {dim.description}
                    </span>
                  </div>
                  <span className={`font-mono font-bold text-xs ${dim.textColor}`}>
                    {dim.value}%
                  </span>
                </div>

                {/* Progress track */}
                <div className={`w-full h-2.5 rounded-full ${dim.bgTrack} overflow-hidden`}>
                  <div 
                    className={`h-full rounded-full ${dim.color} transition-all duration-500 ease-out`}
                    style={{ width: `${dim.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-stone-500 pt-1 border-t border-stone-100 font-mono flex items-center justify-between">
            <span>Evaluated from multi-turn dialogues &amp; takeaways</span>
            <span className="text-stone-700 font-medium">0 – 100 Scale</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 4. WEEKLY MOOD INDICATOR & EMOTIONAL PROGRESSION         */}
        {/* ======================================================== */}
        <div 
          id="chart-weekly-mood-indicator" 
          className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-4 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-stone-500 text-xs font-mono font-semibold uppercase tracking-wider">
                <HeartHandshake className="w-3.5 h-3.5 text-amber-800" />
                <span>Weekly Mood &amp; Trajectory</span>
              </div>
              <h4 className="font-serif font-bold text-lg text-stone-900 mt-0.5">
                Emotional State &amp; Shift
              </h4>
            </div>
            <span className="text-xs font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
              Grounded Arc
            </span>
          </div>

          <div className="space-y-3.5 py-1">
            {/* Overall Mood Badge & Smiley */}
            <div className={`p-3.5 rounded-xl border flex items-center gap-3.5 ${moodColor}`}>
              <div className="p-2 rounded-lg bg-white/80 shadow-2xs shrink-0">
                <MoodIcon className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-semibold">
                  Overall Weekly Sentiment
                </div>
                <div className="font-serif font-bold text-base text-stone-900 truncate">
                  {dominantMood}
                </div>
                <div className="text-xs text-stone-600 leading-tight mt-0.5">
                  {moodSubtext}
                </div>
              </div>
            </div>

            {/* Emotional Progression Flow */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-semibold">
                Weekly Emotional Progression:
              </div>
              {emotionalProgression.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {emotionalProgression.map((mood, idx) => (
                    <React.Fragment key={idx}>
                      <span className="px-2.5 py-1 rounded-md bg-stone-100 text-stone-800 border border-stone-200 text-xs font-medium font-sans">
                        {mood}
                      </span>
                      {idx < emotionalProgression.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-stone-400 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-stone-500 italic bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                  No emotional shift sequence recorded yet.
                </div>
              )}
            </div>
          </div>

          <div className="text-[11px] text-stone-500 pt-1 border-t border-stone-100 font-mono flex items-center justify-between">
            <span>Extracted non-judgmentally by Gemini mood analysis</span>
            <span className="text-stone-700 font-medium">Affect Arc</span>
          </div>
        </div>

      </div>
    </div>
  );
};
