import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Area, AreaChart } from "recharts";
import { ArrowLeft, Activity, Bug, Leaf, TrendingUp, Calendar, ScanLine, Clock, ChevronRight, CloudRain, Thermometer, Droplets, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import MarketPrices from "@/components/MarketPrices";
import SatelliteMonitor from "@/components/SatelliteMonitor";

interface Prediction {
  id: string;
  model_type: string;
  prediction: string;
  created_at: string;
  temperature?: number;
  humidity?: number;
}

const COLORS = ["hsl(142, 55%, 35%)", "hsl(80, 60%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(200, 70%, 50%)"];

const AIInsightCard = ({ predictions, stats }: { predictions: any[], stats: any }) => {
  const [insights, setInsights] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const generateInsights = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-farming-data", {
        body: { 
          predictions: predictions.slice(0, 10),
          stats 
        },
      });
      if (error) throw error;
      setInsights(data.insights);
    } catch (err) {
      console.error("Error generating insights:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5 overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Activity className="h-24 w-24 text-primary" />
      </div>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-primary">AI Agricultural Insight</CardTitle>
              <CardDescription>Intelligent analysis of your paddy field's health</CardDescription>
            </div>
          </div>
          <Button 
            onClick={generateInsights} 
            disabled={analyzing || predictions.length === 0}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            {analyzing ? (
              <>
                <Activity className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Activity className="mr-2 h-4 w-4" />
                Generate Insight
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        {insights ? (
          <div className="prose prose-sm dark:prose-invert max-w-none animate-fade-in">
            <div className="p-4 rounded-xl bg-background/50 border border-primary/10 shadow-inner">
              {insights.split('\n').map((line, i) => (
                <p key={i} className="mb-2 last:mb-0 text-foreground/90 leading-relaxed" dangerouslySetInnerHTML={{ __html: line }} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Activity className="h-6 w-6 text-primary/40" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              Click the button above to generate a smart summary of your scan history.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function Dashboard() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [liveWeather, setLiveWeather] = useState<{ temp: number; humidity: number } | null>(null);
  const navigate = useNavigate();

  const fetchLiveWeather = async (lat: number, lon: number) => {
    try {
      const resp = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m&timezone=auto`
      );
      const data = await resp.json();
      setLiveWeather({
        temp: Math.round(data.current.temperature_2m),
        humidity: data.current.relative_humidity_2m
      });
    } catch (err) {
      console.error("Dashboard live weather fetch error:", err);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchLiveWeather(pos.coords.latitude, pos.coords.longitude),
        async () => {
          try {
            const resp = await fetch("https://ipapi.co/json/");
            const data = await resp.json();
            if (data.latitude && data.longitude) fetchLiveWeather(data.latitude, data.longitude);
          } catch {}
        }
      );
    }
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (!session) {
        setLoading(false);
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;

    const load = async () => {
      try {
        console.log("Fetching predictions for user:", session.user.id);
        const { data, error } = await supabase
          .from("predictions")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (error) {
          console.error("Supabase Error:", error);
          throw error;
        }
        
        setPredictions(data || []);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    load();

    // Enable Realtime Subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'predictions',
        },
        (payload) => {
          setPredictions((current) => [payload.new as Prediction, ...current]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const modelDist = predictions.reduce((acc, p) => {
    const type = (p.model_type || "unknown").toLowerCase();
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(modelDist).map(([name, value]) => ({
    name: name === "fertilizer" ? "Disease/Fertilizer" : name === "insect" ? "Insect/Pest" : "Other",
    value,
  }));

  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split("T")[0];
  });
  const byDay = last14.map((date) => ({
    date: new Date(date).toLocaleDateString("en", { month: "short", day: "numeric" }),
    count: predictions.filter((p) => p.created_at.startsWith(date)).length,
  }));

  const predCounts = predictions.reduce((acc, p) => {
    const key = p.prediction.substring(0, 50);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topPredictions = Object.entries(predCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const recentPredictions = predictions.slice(0, 5);

  const getProactiveTip = () => {
    if (predictions.length === 0) return {
      text: "Start scanning your crops to get personalized AI tips for your field.",
      icon: ScanLine,
      color: "text-primary"
    };
    
    const insects = modelDist["insect"] || 0;
    const disease = modelDist["fertilizer"] || 0;
    const latestHumid = predictions[0]?.humidity;
    const latestTemp = predictions[0]?.temperature;

    if (insects > disease && insects > 0) {
      return {
        text: "Increased pest activity detected. We recommend checking the leaf undersides and applying organic neem spray.",
        icon: Bug,
        color: "text-warning"
      };
    }
    
    if (latestHumid && latestHumid > 75) {
      return {
        text: `High humidity (${latestHumid}%) detected. This increases the risk of fungal blast. Ensure proper water management.`,
        icon: Activity,
        color: "text-accent"
      };
    }

    if (disease > 0) {
      return {
        text: "Fungal patterns identified. Avoid nitrogen over-fertilization and ensure your tools are sterilized.",
        icon: Leaf,
        color: "text-success"
      };
    }

    return {
      text: "Your crop health metrics are within the optimal range. Keep up the consistent monitoring!",
      icon: TrendingUp,
      color: "text-primary"
    };
  };

  const proactiveTip = getProactiveTip();
  const TipIcon = proactiveTip.icon;

  const latestScan = predictions[0];
  const weatherStatus = {
    temp: latestScan?.temperature || liveWeather?.temp || 28,
    humidity: latestScan?.humidity || liveWeather?.humidity || 65,
    isHumid: (latestScan?.humidity || liveWeather?.humidity || 65) > 75,
    isHot: (latestScan?.temperature || liveWeather?.temp || 28) > 32
  };

  const getWeatherReport = () => {
    const { temp, humidity } = weatherStatus;
    
    if (temp > 35) {
      return `Extreme Heat (${temp}°C): Critical risk of spikelet sterility. Increase water levels to 5-10cm to cool the microclimate.`;
    }
    if (humidity > 85) {
      return `Extreme Humidity (${humidity}%): High risk of Rice Blast and Brown Spot. Avoid evening irrigation and monitor leaf health closely.`;
    }
    if (temp > 32 && humidity > 70) {
      return `Tropical Stress: Combination of heat and moisture is ideal for Leaf Folders and Stem Borers. Scout your fields twice daily.`;
    }
    if (temp < 20) {
      return `Cool Conditions (${temp}°C): Growth may slow down. Monitor for nutrient uptake efficiency and avoid standing water if possible.`;
    }
    
    return "Optimal Growth Window: Current temperature and moisture levels are ideal for photosynthesis and tillering in paddy crops.";
  };

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

  if (!session && !loading) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-background">
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
              <h1 className="text-xl font-bold tracking-tight">Agro AI Analytics</h1>
              <p className="text-xs opacity-80">Track your paddy health trends</p>
            </div>
          </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.reload()}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Activity className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/predictions")}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
              <Clock className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">History</span>
            </Button>
            <ThemeToggle className="text-primary-foreground hover:bg-primary-foreground/10" />
          </div>
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
            <AIInsightCard 
              predictions={predictions} 
              stats={{
                total: predictions.length,
                diseases: modelDist["fertilizer"] || 0,
                pests: modelDist["insect"] || 0,
                trend: weekChange >= 0 ? `+${weekChange}%` : `${weekChange}%`
              }} 
            />
            {/* Satellite Monitoring & Market */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <SatelliteMonitor />
              </div>
              {/* Model Distribution (Circle Chart) */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Model Distribution</CardTitle>
                  <CardDescription>Disease vs Pest scan frequency</CardDescription>
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
                      <div className="mt-8 w-full">
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 relative overflow-hidden group hover:bg-primary/10 transition-colors duration-300">
                          <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity">
                            <TipIcon className="h-20 w-20" />
                          </div>
                          <div className="flex gap-3 relative z-10">
                            <div className={`h-8 w-8 rounded-lg ${proactiveTip.color.replace('text-', 'bg-')}/10 flex items-center justify-center shrink-0`}>
                              <TipIcon className={`h-4 w-4 ${proactiveTip.color}`} />
                            </div>
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">AI Proactive Tip</p>
                              <p className="text-sm text-foreground/90 leading-relaxed font-medium">
                                {proactiveTip.text}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AI Weather Reporter */}
                      <div className="mt-6 w-full border-t border-primary/5 pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">AI Weather Reporter</h4>
                          <div className="flex gap-3">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                              <Thermometer className="h-3 w-3 text-orange-500" />
                              {weatherStatus.temp}°C
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                              <Droplets className="h-3 w-3 text-blue-500" />
                              {weatherStatus.humidity}%
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-4 items-start p-3 rounded-lg bg-background/40 border border-primary/5">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${weatherStatus.isHumid ? "bg-blue-500/10" : "bg-orange-500/10"}`}>
                            {weatherStatus.isHumid ? (
                              <CloudRain className={`h-5 w-5 ${weatherStatus.isHumid ? "text-blue-500" : "text-orange-500"}`} />
                            ) : (
                              <Sun className="h-5 w-5 text-orange-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-foreground/80 italic leading-relaxed">
                              "{getWeatherReport()}"
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                              <Activity className="h-2.5 w-2.5" />
                              {latestScan?.temperature ? "Conditions from latest scan" : "Current live field conditions"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </>

                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center px-4">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Activity className="h-6 w-6 opacity-20" />
                      </div>
                      <h4 className="text-sm font-bold text-foreground">No Analysis Data Yet</h4>
                      <p className="text-xs mt-1 mb-6 max-w-[200px]">Perform your first field scan to see AI insights and distribution charts.</p>
                      <Button 
                        size="sm" 
                        onClick={() => navigate("/")} 
                        className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                      >
                        Start First Scan
                      </Button>
                    </div>
                  )}
                </CardContent>

              </Card>
            </div>

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

            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-3">
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

            </div>

            <div className="grid lg:grid-cols-2 gap-6">
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

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
                      <CardDescription>Latest scan results</CardDescription>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs text-primary hover:text-primary/80 font-semibold"
                      onClick={() => navigate("/predictions")}
                    >
                      View All
                      <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
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
