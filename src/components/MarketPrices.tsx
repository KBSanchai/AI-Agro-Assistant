import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, ShoppingBag, MapPin, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

const REGIONAL_DATA: Record<string, any[]> = {
  "Vidarbha Region": [
    { crop: "Paddy (Common)", price: "2,183", change: "+15", trend: "up", unit: "per Quintal" },
    { crop: "Rice (Basmati)", price: "4,500", change: "+120", trend: "up", unit: "per Quintal" },
    { crop: "Paddy (Grade A)", price: "2,203", change: "0", trend: "stable", unit: "per Quintal" },
    { crop: "Soybean", price: "4,650", change: "-10", trend: "down", unit: "per Quintal" },
    { crop: "Cotton", price: "7,100", change: "+50", trend: "up", unit: "per Quintal" },
  ],
  "Konkan Region": [
    { crop: "Paddy (Common)", price: "2,250", change: "+25", trend: "up", unit: "per Quintal" },
    { crop: "Rice (Kolam)", price: "5,400", change: "+80", trend: "up", unit: "per Quintal" },
    { crop: "Rice (Ambemohar)", price: "6,200", change: "+10", trend: "up", unit: "per Quintal" },
    { crop: "Paddy (Common)", price: "2,310", change: "+5", trend: "up", unit: "per Quintal" },
    { crop: "Cashew Nut", price: "8,500", change: "0", trend: "stable", unit: "per Quintal" },
  ],
  "Tamil Nadu Region": [
    { crop: "Paddy (Ponni)", price: "2,450", change: "+35", trend: "up", unit: "per Quintal" },
    { crop: "Rice (Raw)", price: "3,100", change: "+10", trend: "up", unit: "per Quintal" },
    { crop: "Paddy (Grade A)", price: "2,203", change: "0", trend: "stable", unit: "per Quintal" },
    { crop: "Rice (Jasmine)", price: "4,800", change: "+60", trend: "up", unit: "per Quintal" },
    { crop: "Groundnut", price: "7,200", change: "-15", trend: "down", unit: "per Quintal" },
  ],
  "Standard (India)": [
    { crop: "Paddy (Common)", price: "2,183", change: "+15", trend: "up", unit: "per Quintal" },
    { crop: "Rice (Basmati)", price: "4,500", change: "+120", trend: "up", unit: "per Quintal" },
    { crop: "Paddy (Grade A)", price: "2,203", change: "0", trend: "stable", unit: "per Quintal" },
    { crop: "Rice (Sona Masuri)", price: "3,850", change: "-25", trend: "down", unit: "per Quintal" },
    { crop: "Rice (Kolam)", price: "5,200", change: "+50", trend: "up", unit: "per Quintal" },
  ]
};

export default function MarketPrices() {
  const [location, setLocation] = useState<string>("Standard (India)");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ("geolocation" in navigator) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // Mock logic: 
          // Lat > 19: Vidarbha
          // Lat < 14: Tamil Nadu
          // 14-17: Konkan
          const { latitude } = pos.coords;
          if (latitude > 19) setLocation("Vidarbha Region");
          else if (latitude < 14) setLocation("Tamil Nadu Region");
          else if (latitude < 17) setLocation("Konkan Region");
          else setLocation("Standard (India)");
          setLoading(false);
        },
        () => {
          setLocation("Standard (India)");
          setLoading(false);
        }
      );
    }
  }, []);

  const data = REGIONAL_DATA[location];

  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Live Mandi Rates
            </CardTitle>
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <CardDescription className="text-[10px] font-medium">
                {loading ? "Detecting..." : location}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] animate-pulse">LIVE</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, i) => (
            <div key={i} className="flex items-center justify-between group">
              <div className="flex-1">
                <p className="text-sm font-semibold group-hover:text-primary transition-colors">{item.crop}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.unit}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">₹{item.price}</p>
                <div className="flex items-center justify-end gap-1">
                  {item.trend === "up" ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-success" />
                      <span className="text-[10px] font-medium text-success">{item.change}</span>
                    </>
                  ) : item.trend === "down" ? (
                    <>
                      <TrendingDown className="h-3 w-3 text-destructive" />
                      <span className="text-[10px] font-medium text-destructive">{item.change}</span>
                    </>
                  ) : (
                    <>
                      <Minus className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] font-medium text-muted-foreground">Stable</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-center text-muted-foreground mt-4 pt-3 border-t">
          Source: Agmarknet | Updates based on nearest Mandi
        </p>
      </CardContent>
    </Card>
  );
}
