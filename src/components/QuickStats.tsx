import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { ScanLine, Bug, Leaf, Activity } from "lucide-react";

interface Stats {
  total: number;
  fertilizer: number;
  insect: number;
}

export default function QuickStats() {
  const [stats, setStats] = useState<Stats>({ total: 0, fertilizer: 0, insect: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase
        .from("predictions")
        .select("model_type");
      if (!data) return;
      setStats({
        total: data.length,
        fertilizer: data.filter((d) => d.model_type === "fertilizer").length,
        insect: data.filter((d) => d.model_type === "insect").length,
      });
    };
    fetchStats();
  }, []);

  const items = [
    { label: "Total Scans", value: stats.total, icon: ScanLine, color: "text-primary" },
    { label: "Disease Scans", value: stats.fertilizer, icon: Leaf, color: "text-success" },
    { label: "Pest Scans", value: stats.insect, icon: Bug, color: "text-warning" },
    { label: "This Month", value: stats.total, icon: Activity, color: "text-accent" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center ${item.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
