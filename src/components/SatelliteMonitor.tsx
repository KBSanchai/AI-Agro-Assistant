import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CloudLightning, Info, MousePointer2, Wind, Droplets, Eye } from "lucide-react";
import { useState, useEffect } from "react";

export default function SatelliteMonitor() {
  const [coords, setCoords] = useState({ lat: 20.45, lng: 78.92 });
  const [region, setRegion] = useState("Main Field");
  const [loading, setLoading] = useState(false);

  const [weather, setWeather] = useState({ temp: 28, wind: 14, rain: 0 });
  const [insight, setInsight] = useState("Clear skies detected. No immediate storm fronts approaching the target area.");

  useEffect(() => {
    if ("geolocation" in navigator) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        
        if (lat > 19) setRegion("Vidarbha North Block");
        else if (lat < 14) setRegion("Cauvery Delta Block");
        else if (lat < 17) setRegion("Konkan Coastal Block");
        else setRegion("Deccan Central Block");
        
        setLoading(false);
      }, () => setLoading(false));
    }

    // Simulate weather data updates every 10 seconds
    const interval = setInterval(() => {
      setWeather(prev => {
        const newTemp = Math.round(prev.temp + (Math.random() > 0.5 ? 0.5 : -0.5));
        const newWind = Math.round(Math.max(5, prev.wind + (Math.random() > 0.5 ? 2 : -2)));
        const newRain = Math.max(0, prev.rain + (Math.random() > 0.8 ? 0.5 : -0.5));
        
        if (newWind > 25) setInsight("High winds detected in upper atmosphere. Secure loose equipment.");
        else if (newRain > 2) setInsight("Heavy precipitation front approaching from the west. Estimated arrival in 45 mins.");
        else setInsight("Microclimate stable. Optimal conditions for scheduled pesticide application.");
        
        return { temp: newTemp, wind: newWind, rain: newRain };
      });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="hover:shadow-xl transition-all duration-500 overflow-hidden group">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <CloudLightning className="h-5 w-5 text-sky-500" />
              Live Storm Radar
            </CardTitle>
            <CardDescription>Real-time meteorological tracking via ECMWF</CardDescription>
          </div>
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
             <Badge variant="secondary" className="bg-sky-500/10 text-sky-500 hover:bg-sky-500/20">
               Live
             </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-video rounded-xl overflow-hidden border border-border group-hover:border-sky-500/30 transition-colors">
          <iframe
            title="Real-time Storm Radar"
            src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=km/h&zoom=10&overlay=rain&product=ecmwf&level=surface&lat=${coords.lat}&lon=${coords.lng}`}
            className="w-full h-full border-0 transition-all duration-700"
            loading="lazy"
            allowFullScreen
          />

          {/* HUD Overlay */}
          <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none">
            <div className="flex justify-between items-start">
              <Badge className="bg-black/60 backdrop-blur-md border-white/20 text-[10px] text-white">
                Coord: {coords.lat.toFixed(2)}°N, {coords.lng.toFixed(2)}°E
              </Badge>
            </div>
            
            <div className="flex justify-between items-end">
              <div className="flex gap-2 ml-auto">
                <div className="h-8 w-8 rounded-full bg-sky-500/20 backdrop-blur-md flex items-center justify-center border border-sky-500/40">
                  <MousePointer2 className="h-4 w-4 text-sky-400 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="p-2 rounded-lg bg-sky-500/5 border border-sky-500/10 text-center transition-colors duration-500">
            <p className="text-[10px] text-muted-foreground uppercase">Local Temp</p>
            <p className="text-sm font-bold text-sky-600">{weather.temp}°C</p>
          </div>
          <div className="p-2 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-center transition-colors duration-500">
            <p className="text-[10px] text-muted-foreground uppercase">Wind Gusts</p>
            <p className="text-sm font-bold text-indigo-600">{weather.wind} km/h</p>
          </div>
          <div className={`p-2 rounded-lg border text-center transition-colors duration-500 ${weather.rain > 0 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-slate-500/5 border-slate-500/10'}`}>
            <p className="text-[10px] text-muted-foreground uppercase">Precipitation</p>
            <p className={`text-sm font-bold ${weather.rain > 0 ? 'text-blue-600' : 'text-slate-600'}`}>{weather.rain.toFixed(1)} mm</p>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border flex gap-3 items-start transition-all duration-500">
           <Info className="h-4 w-4 text-sky-500 mt-0.5 shrink-0" />
           <p className="text-[11px] text-muted-foreground leading-relaxed">
             <span className="font-bold text-foreground">Meteorology Insight: </span> 
             <span className="animate-in fade-in duration-500" key={insight}>{insight}</span>
           </p>
        </div>
      </CardContent>
    </Card>
  );
}
