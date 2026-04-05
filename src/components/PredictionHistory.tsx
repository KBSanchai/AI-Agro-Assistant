import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Bug, Leaf, Trash2, X, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import ResultCard from "@/components/ResultCard";

interface Prediction {
  id: string;
  image_url: string;
  model_type: string;
  prediction: string;
  cure: string;
  created_at: string;
}

interface PredictionHistoryProps {
  onDelete?: () => void;
}

export default function PredictionHistory({ onDelete }: PredictionHistoryProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("predictions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    setPredictions(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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
    onDelete?.();
  };

  const selected = predictions.find((p) => p.id === selectedId);

  if (loading) return <p className="text-muted-foreground text-sm">Loading history...</p>;
  if (!predictions.length) return <p className="text-muted-foreground text-sm">No predictions yet.</p>;

  // Show full detail view for selected prediction
  if (selected) {
    return (
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedId(null)}
          className="text-muted-foreground hover:text-foreground mb-1"
        >
          <X className="h-4 w-4 mr-1" />
          Back to list
        </Button>
        <ResultCard
          imageUrl={selected.image_url}
          prediction={selected.prediction}
          cure={selected.cure}
          modelType={selected.model_type as "fertilizer" | "insect"}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {predictions.map((p) => (
        <Card
          key={p.id}
          className="overflow-hidden group cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
          onClick={() => setSelectedId(p.id)}
        >
          <CardContent className="p-4 flex gap-4">
            <img src={p.image_url} alt="crop" className="w-20 h-20 object-cover rounded-md flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                {p.model_type === "fertilizer" ? (
                  <Leaf className="h-4 w-4 text-primary" />
                ) : (
                  <Bug className="h-4 w-4 text-warning" />
                )}
                <Badge variant="outline" className="text-xs">
                  {p.model_type}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                  <Clock className="h-3 w-3" />
                  {new Date(p.created_at).toLocaleDateString()}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                  onClick={(e) => handleDelete(p.id, e)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="font-medium text-sm truncate">{p.prediction}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground line-clamp-1 flex-1">{p.cure}</p>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
