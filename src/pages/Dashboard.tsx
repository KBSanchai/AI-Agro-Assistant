import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Area, AreaChart } from "recharts";
import { ArrowLeft, Activity, Bug, Leaf, TrendingUp, Calendar, ScanLine, Clock, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";

interface Prediction {
  id: string;
  model_type: string;
  prediction: string;
  created_at: string;
}

const COLORS = ["hsl(142, 55%, 35%)", "hsl(80, 60%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(200, 70%, 50%)"];

export default function Dashboard() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("predictions")
        .select("id, model_type, prediction, created_at")
        .order("created_at", { ascending: false });
      setPredictions(data || []);
      setLoading(false);
    };
    load();
  }, []);

  // Model type distribution
  const modelDist = predictions.reduce((acc, p) => {
    acc[p.model_type] = (acc[p.model_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const pieData = Object.entries(modelDist).map(([name, value]) => ({
    name: name === "fertilizer" ? "Disease/Fertilizer" : "Insect/Pest",
    value,
  }));

  // Predictions by day (last 14 days)
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split("T")[0];
  });
  const byDay = last14.map((date) => ({
    date: new Date(date).toLocaleDateString("en", { month: "short", day: "numeric" }),
    count: predictions.filter((p) => p.created_at.startsWith(date)).length,
  }));

  // Top predictions
  const predCounts = predictions.reduce((acc, p) => {
    const key = p.prediction.substring(0, 50);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topPredictions = Object.entries(predCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // Recent activity
  const recentPredictions = predictions.slice(0, 5);

  // This week vs last week
  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - 7);
  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(now.getDate() - 14);
  const thisWeekCount = predictions.filter((p) => new Date(p.created_at) >= thisWeekStart).length;
  const lastWeekCount = predictions.filter((p) => {
    const d = new Date(p.created_at);
    return d >= lastWeekStart && d < thisWeekStart;
  }).length;
  const weekChange = lastWeekCount > 0 ? Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100) : thisWeekCount > 0 ? 100 : 0;

  const statCards = [
    {
      label: "Total Analyses",
      value: predictions.length,
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
      desc: "All time scans",
    },
    {
      label: "Disease Scans",
      value: modelDist["fertilizer"] || 0,
      icon: Leaf,
      color: "text-success",
      bg: "bg-success/10",
      desc: "Fertilizer model",
    },
    {
      label: "Pest Scans",
      value: modelDist["insect"] || 0,
      icon: Bug,
      color: "text-warning",
      bg: "bg-warning/10",
      desc: "Insect model",
    },
    {
      label: "This Week",
      value: thisWeekCount,
      icon: Calendar,
      color: "text-accent",
      bg: "bg-accent/10",
      desc: weekChange >= 0 ? `↑ ${weekChange}% vs last week` : `↓ ${Math.abs(weekChange)}% vs last week`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-hero text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="h-9 w-9 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Analytics Dashboard</h1>
              <p className="text-xs opacity-80">Track your crop analysis insights</p>
            </div>
          </div>
          <ThemeToggle className="text-primary-foreground hover:bg-primary-foreground/10" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-muted-foreground">Loading analytics...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                          <Icon className={`h-5 w-5 ${stat.color}`} />
                        </div>
                      </div>
                      <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                      <p className="text-sm font-medium text-foreground mt-1">{stat.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{stat.desc}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Activity Trend - wider */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Activity Trend</CardTitle>
                      <CardDescription>Scans over the last 14 days</CardDescription>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      Last 2 weeks
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={byDay}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(142, 55%, 35%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(142, 55%, 35%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(140, 15%, 90%)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid hsl(140, 20%, 88%)",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          fontSize: "12px",
                        }}
                      />
                      <Area type="monotone" dataKey="count" stroke="hsl(142, 55%, 35%)" strokeWidth={2} fill="url(#colorCount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Model Distribution */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Model Usage</CardTitle>
                  <CardDescription>Distribution by scan type</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center">
                  {pieData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            dataKey="value"
                            paddingAngle={4}
                            strokeWidth={0}
                          >
                            {pieData.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              borderRadius: "8px",
                              border: "1px solid hsl(140, 20%, 88%)",
                              fontSize: "12px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap justify-center gap-4 mt-2">
                        {pieData.map((entry, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-xs text-muted-foreground">{entry.name}</span>
                            <span className="text-xs font-semibold">{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-sm py-10">No data yet</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Bottom Row */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Top Issues */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Common Issues Detected</CardTitle>
                      <CardDescription>Most frequently identified problems</CardDescription>
                    </div>
                    <ScanLine className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  {topPredictions.length > 0 ? (
                    <div className="space-y-3">
                      {topPredictions.map(([name, count], i) => {
                        const maxCount = topPredictions[0][1] as number;
                        const percent = Math.round((count / maxCount) * 100);
                        return (
                          <div key={i} className="group">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm truncate max-w-[75%] group-hover:text-primary transition-colors">
                                {i + 1}. {name}
                              </span>
                              <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                {count}
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${percent}%`,
                                  backgroundColor: COLORS[i % COLORS.length],
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm py-6 text-center">No predictions yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
                      <CardDescription>Latest scan results</CardDescription>
                    </div>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  {recentPredictions.length > 0 ? (
                    <div className="space-y-3">
                      {recentPredictions.map((p) => {
                        const isInsect = p.model_type === "insect";
                        const timeAgo = getTimeAgo(p.created_at);
                        return (
                          <div
                            key={p.id}
                            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-default"
                          >
                            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${isInsect ? "bg-warning/10" : "bg-success/10"}`}>
                              {isInsect ? (
                                <Bug className="h-4 w-4 text-warning" />
                              ) : (
                                <Leaf className="h-4 w-4 text-success" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{p.prediction}</p>
                              <p className="text-xs text-muted-foreground">{isInsect ? "Pest Detection" : "Disease Detection"}</p>
                            </div>
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">{timeAgo}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm py-6 text-center">No recent activity</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
