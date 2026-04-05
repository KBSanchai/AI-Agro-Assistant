import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, Droplets, Thermometer, Wind } from "lucide-react";

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  description: string;
}

const weatherDescriptions: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Depositing rime fog",
  51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
  61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
  71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
  80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
  95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with heavy hail",
};

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState<string>("Loading...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const resp = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`
        );
        const data = await resp.json();
        const current = data.current;
        setWeather({
          temperature: current.temperature_2m,
          humidity: current.relative_humidity_2m,
          windSpeed: current.wind_speed_10m,
          weatherCode: current.weather_code,
          description: weatherDescriptions[current.weather_code] || "Unknown",
        });

        // Reverse geocode
        try {
          const geoResp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
          );
          const geoData = await geoResp.json();
          const city = geoData.address?.city || geoData.address?.town || geoData.address?.village || geoData.address?.county || geoData.address?.state;
          const country = geoData.address?.country || "";
          
          if (city && country) {
            setLocation(`${city}, ${country}`);
          } else if (country) {
            setLocation(country);
          } else {
            setLocation(`${lat.toFixed(1)}°N, ${lon.toFixed(1)}°E`);
          }
        } catch (err) {
          setLocation(`${lat.toFixed(1)}°N, ${lon.toFixed(1)}°E`);
        }
      } catch (err) {
        console.error("Weather fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(20.5937, 78.9629) // Default: India
      );
    } else {
      fetchWeather(20.5937, 78.9629);
    }
  }, []);

  if (loading) return null;
  if (!weather) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Cloud className="h-4 w-4 text-primary" />
          Weather — {location}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">{weather.description}</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-1.5">
            <Thermometer className="h-3.5 w-3.5 text-destructive" />
            <span className="text-sm font-medium">{weather.temperature}°C</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Droplets className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm font-medium">{weather.humidity}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wind className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">{weather.windSpeed} km/h</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
