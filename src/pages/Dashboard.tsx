import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ArrowLeft, Activity, Bug, Leaf, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Prediction {
  id: string;
  model_type: string;
  prediction: string;
  created_at: string;
}

const COLORS = ["hsl(142, 55%, 35%)", "hsl(80, 60%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)"];

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
  const pieData = Object.entries(modelDist).map(([name, value]) => ({ name, value }));

  // Predictions by day (last 7 days)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });
  const byDay = last7.map((date) => ({
    date: new Date(date).toLocaleDateString("en", { weekday: "short" }),
    count: predictions.filter((p) => p.created_at.startsWith(date)).length,
  }));

  // Top predictions
  const predCounts = predictions.reduce((acc, p) => {
    const key = p.prediction.substring(0, 40);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topPredictions = Object.entries(predCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-primary-foreground hover:bg-primary-foreground/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Activity className="h-5 w-5" />
          <h1 className="text-xl font-bold">Analytics Dashboard</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <p className="text-muted-foreground">Loading analytics...</p>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{predictions.length}</p>
                      <p className="text-xs text-muted-foreground">Total Analyses</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{modelDist["fertilizer"] || 0}</p>
                      <p className="text-xs text-muted-foreground">Fertilizer Scans</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Bug className="h-5 w-5 text-warning" />
                    <div>
                      <p className="text-2xl font-bold">{modelDist["insect"] || 0}</p>
                      <p className="text-xs text-muted-foreground">Insect Scans</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-2xl font-bold">{Object.keys(predCounts).length}</p>
                      <p className="text-xs text-muted-foreground">Unique Issues</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* Daily Activity Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Predictions (Last 7 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={byDay}>
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(142, 55%, 35%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Model Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Model Usage Distribution</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-sm">No data yet</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Issues */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Most Common Issues Detected</CardTitle>
              </CardHeader>
              <CardContent>
                {topPredictions.length > 0 ? (
                  <div className="space-y-3">
                    {topPredictions.map(([name, count], i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm truncate max-w-[70%]">{name}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-2 rounded-full bg-primary" style={{ width: `${(count / topPredictions[0][1]) * 100}px` }} />
                          <span className="text-sm font-medium text-muted-foreground">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No predictions yet</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
