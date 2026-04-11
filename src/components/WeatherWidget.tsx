import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, Droplets, Sun, Sunrise, Sunset, Thermometer, Wind, Eye, RefreshCw } from "lucide-react";

interface WeatherData {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  description: string;
  precipitation: number;
  uvIndex: number;
  pressure: number;
  sunrise: string;
  sunset: string;
}

const weatherDescriptions: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Rime fog",
  51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
  61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
  71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
  80: "Rain showers", 81: "Moderate showers", 82: "Heavy showers",
  95: "Thunderstorm", 96: "Thunderstorm + hail", 99: "Heavy thunderstorm",
};

function getWeatherIcon(code: number) {
  if (code === 0 || code === 1) return Sun;
  if (code === 2 || code === 3) return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 51 && code <= 55) return CloudDrizzle;
  if (code >= 61 && code <= 65) return CloudRain;
  if (code >= 71 && code <= 75) return CloudSnow;
  if (code >= 80 && code <= 82) return CloudRain;
  if (code >= 95) return CloudLightning;
  return Cloud;
}

function getWeatherGradient(code: number): string {
  if (code === 0 || code === 1) return "from-amber-400/20 to-sky-400/10";
  if (code === 2 || code === 3) return "from-slate-300/20 to-slate-400/10";
  if (code >= 51 && code <= 82) return "from-blue-400/20 to-slate-500/10";
  if (code >= 95) return "from-purple-400/20 to-slate-600/10";
  return "from-primary/10 to-accent/5";
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--:--";
  }
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState("Detecting...");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    try {
      const resp = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature,precipitation,surface_pressure,uv_index&daily=sunrise,sunset&timezone=auto`
      );
      const data = await resp.json();
      const c = data.current;
      setWeather({
        temperature: Math.round(c.temperature_2m),
        apparentTemperature: Math.round(c.apparent_temperature),
        humidity: c.relative_humidity_2m,
        windSpeed: Math.round(c.wind_speed_10m),
        weatherCode: c.weather_code,
        description: weatherDescriptions[c.weather_code] || "Unknown",
        precipitation: c.precipitation,
        uvIndex: Math.round(c.uv_index),
        pressure: Math.round(c.surface_pressure),
        sunrise: data.daily?.sunrise?.[0] || "",
        sunset: data.daily?.sunset?.[0] || "",
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Weather fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLocation = useCallback(async (lat: number, lon: number) => {
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`
      );
      const data = await resp.json();
      const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || "";
      const state = data.address?.state || "";
      setLocation(city ? `${city}${state ? ", " + state : ""}` : `${lat.toFixed(1)}°N, ${lon.toFixed(1)}°E`);
    } catch {
      setLocation(`${lat.toFixed(1)}°N, ${lon.toFixed(1)}°E`);
    }
  }, []);

  useEffect(() => {
    const initLocation = (lat: number, lon: number) => {
      setCoords({ lat, lon });
      fetchWeather(lat, lon);
      fetchLocation(lat, lon);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => initLocation(pos.coords.latitude, pos.coords.longitude),
        () => initLocation(20.5937, 78.9629)
      );
    } else {
      initLocation(20.5937, 78.9629);
    }
  }, [fetchWeather, fetchLocation]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!coords) return;
    const interval = setInterval(() => {
      fetchWeather(coords.lat, coords.lon);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [coords, fetchWeather]);

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading weather...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weather) return null;

  const WeatherIcon = getWeatherIcon(weather.weatherCode);
  const gradient = getWeatherGradient(weather.weatherCode);

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      {/* Main weather display */}
      <div className={`bg-gradient-to-br ${gradient} p-5`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Weather</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{location}</p>
          </div>
          <WeatherIcon className="h-10 w-10 text-primary opacity-80" />
        </div>

        <div className="flex items-end gap-2 mb-1">
          <span className="text-5xl font-bold text-foreground tracking-tight">{weather.temperature}°</span>
          <span className="text-lg text-muted-foreground mb-1.5">C</span>
        </div>
        <p className="text-sm text-muted-foreground">{weather.description}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Feels like {weather.apparentTemperature}°C
        </p>
      </div>

      {/* Detail grid */}
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Droplets className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Humidity</p>
              <p className="text-sm font-semibold">{weather.humidity}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Wind className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Wind</p>
              <p className="text-sm font-semibold">{weather.windSpeed} km/h</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Eye className="h-4 w-4 text-accent" />
            <div>
              <p className="text-xs text-muted-foreground">UV Index</p>
              <p className="text-sm font-semibold">{weather.uvIndex}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Thermometer className="h-4 w-4 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">Pressure</p>
              <p className="text-sm font-semibold">{weather.pressure} hPa</p>
            </div>
          </div>
        </div>

        {/* Sunrise / Sunset */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <Sunrise className="h-4 w-4 text-warning" />
            <span className="text-xs text-muted-foreground">{formatTime(weather.sunrise)}</span>
          </div>
          <div className="flex-1 mx-3 h-0.5 rounded-full bg-gradient-to-r from-warning/40 via-accent/30 to-primary/40" />
          <div className="flex items-center gap-1.5">
            <Sunset className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">{formatTime(weather.sunset)}</span>
          </div>
        </div>

        {lastUpdated && (
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
