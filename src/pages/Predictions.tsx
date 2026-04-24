import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Bug, Leaf, Trash2, ArrowLeft, Search, Filter, ScanLine, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import ResultCard from "@/components/ResultCard";

interface Prediction {
  id: string;
  image_url: string;
  model_type: string;
  prediction: string;
  cure: string;
  created_at: string;
  latitude?: number;
  longitude?: number;
}

export default function Predictions() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    let query = supabase.from("predictions").select("*").order("created_at", { ascending: false });
    
    if (filter !== "all") {
      query = query.eq("model_type", filter);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("Failed to load predictions");
    } else {
      setPredictions(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [filter]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from("predictions").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
      return;
    }
    setPredictions((prev) => prev.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(null);
    toast.success("Prediction deleted");
  };

  const selected = predictions.find((p) => p.id === selectedId);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-hero text-primary-foreground shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="h-9 w-9 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
              <ScanLine className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Recent Predictions</h1>
              <p className="text-xs opacity-80">Full history of your crop analyses</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Analytics</span>
            </Button>
            <ThemeToggle className="text-primary-foreground hover:bg-primary-foreground/10" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {selected ? (
          <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedId(null)}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to History
            </Button>
            <ResultCard
              imageUrl={selected.image_url}
              prediction={selected.prediction}
              cure={selected.cure}
              modelType={selected.model_type as "fertilizer" | "insect"}
              location={selected.latitude ? { lat: selected.latitude, lng: selected.longitude! } : undefined}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
                className="rounded-full"
              >
                All Scans
              </Button>
              <Button
                variant={filter === "fertilizer" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("fertilizer")}
                className="rounded-full"
              >
                Disease
              </Button>
              <Button
                variant={filter === "insect" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("insect")}
                className="rounded-full"
              >
                Pests
              </Button>
            </div>

            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="h-48 animate-pulse bg-muted/50" />
                ))}
              </div>
            ) : predictions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-semibold">No predictions found</h3>
                <p className="text-muted-foreground max-w-xs mx-auto">
                  Start scanning your crops to build your history!
                </p>
                <Button onClick={() => navigate("/")} className="mt-6">
                  Analyze Now
                </Button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                {predictions.map((p) => (
                  <Card
                    key={p.id}
                    className="overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/30"
                    onClick={() => setSelectedId(p.id)}
                  >
                    <div className="relative h-40 overflow-hidden">
                      <img src={p.image_url} alt="prediction" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <Badge className={p.model_type === "fertilizer" ? "bg-primary" : "bg-warning"}>
                          {p.model_type === "fertilizer" ? <Leaf className="h-3 w-3 mr-1" /> : <Bug className="h-3 w-3 mr-1" />}
                          {p.model_type}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 font-semibold">
                          <Clock className="h-3 w-3" />
                          {new Date(p.created_at).toLocaleDateString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDelete(p.id, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <h3 className="font-bold text-sm line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                        {p.prediction}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {p.cure}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
