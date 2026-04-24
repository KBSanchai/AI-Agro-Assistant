import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Leaf, LogOut, Loader2, BarChart3, Upload, Sparkles, CheckCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AuthPage from "@/components/AuthPage";
import ImageUpload from "@/components/ImageUpload";
import ResultCard from "@/components/ResultCard";
import PredictionHistory from "@/components/PredictionHistory";
import ChatbotWidget from "@/components/ChatbotWidget";
import WeatherWidget from "@/components/WeatherWidget";
import MarketPrices from "@/components/MarketPrices";
import ThemeToggle from "@/components/ThemeToggle";
import GreetingBanner from "@/components/GreetingBanner";
import QuickStats from "@/components/QuickStats";

const STEPS = [
  { icon: Upload, label: "Upload Image" },
  { icon: Sparkles, label: "AI Analysis" },
  { icon: CheckCircle, label: "Results Ready" },
];

export default function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [modelType, setModelType] = useState<"fertilizer" | "insect">("fertilizer");
  const [predicting, setPredicting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState<{ prediction: string; cure: string; imageUrl: string; userEmail?: string; location?: { lat: number; lng: number } } | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [currentWeather, setCurrentWeather] = useState<{ temp: number; humidity: number } | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleImageSelect = (file: File) => {
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setCurrentStep(1);
  };

  const clearImage = () => {
    setImageFile(null);
    setPreview(null);
    setResult(null);
    setCurrentStep(0);
  };

  const handlePredict = async () => {
    if (!imageFile || !session) return;
    setPredicting(true);
    setCurrentStep(2);
    
    let lat: number | undefined;
    let lng: number | undefined;

    try {
      if (navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      }
    } catch (e) {
      console.warn("Location capture failed:", e);
    }

    try {
      const fileExt = imageFile.name.split(".").pop();
      const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("crop-images")
        .upload(filePath, imageFile);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("crop-images")
        .getPublicUrl(filePath);
      const imageUrl = urlData.publicUrl;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const userId = session.user.id;

      const response = await fetch(`${supabaseUrl}/functions/v1/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${anonKey}`,
          "apikey": anonKey
        },
        body: JSON.stringify({ 
          image_url: imageUrl, 
          model_type: modelType,
          user_id: userId,
          temperature: currentWeather?.temp,
          humidity: currentWeather?.humidity,
          latitude: lat,
          longitude: lng
        })
      });

      const responseText = await response.text();
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText.substring(0, 200)}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Invalid response: ${responseText.substring(0, 100)}`);
      }


      if (data && data.success === false) {
        throw new Error(`Error: ${data.error} \nLogs: ${data.logs?.join(' -> ')}`);
      }

      const geminiError = data.logs?.find((l: string) => l.includes("Gemini API error"));
      const finalCure = (data.cure === "Treatment advice currently unavailable.") 
        ? `${data.cure}\n\nTechnical Details: ${geminiError || data.logs?.slice(-3).join(' | ')}`
        : data.cure;

      setResult({ 
        prediction: data.prediction, 
        cure: finalCure, 
        imageUrl, 
        userEmail: data.user_email,
        location: lat && lng ? { lat, lng } : undefined
      });
      setCurrentStep(3);
      setHistoryKey((k) => k + 1);
      toast.success("Analysis complete!");
    } catch (err: any) {
      console.error("Prediction error details:", err);
      let errorMsg = err.message || "Unknown error";
      
      // Try to parse more info if available
      if (err.context && err.context.statusText) {
        errorMsg = `${err.context.status} ${err.context.statusText}`;
      }
      
      toast.error("Prediction failed: " + errorMsg);
      setCurrentStep(1);
    } finally {
      setPredicting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return <AuthPage />;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-hero text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Leaf className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Agro AI Assistant</h1>
              <p className="text-xs opacity-80">Smart Rice Disease & Pest Detection</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="text-primary-foreground hover:bg-primary-foreground/10" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/predictions")}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Clock className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">History</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Analytics</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => supabase.auth.signOut()}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Greeting */}
        <GreetingBanner session={session} />

        {/* Quick Stats */}
        <QuickStats />

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isActive = currentStep >= i + 1;
            const isCurrent = currentStep === i + 1;
            return (
              <div key={i} className="flex items-center gap-2">
                {i > 0 && (
                  <div className={`h-0.5 w-8 sm:w-16 transition-colors duration-500 ${isActive ? "bg-primary" : "bg-border"}`} />
                )}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-500 ${
                  isCurrent ? "bg-primary text-primary-foreground scale-105 shadow-md" :
                  isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Upload & Predict */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="transition-shadow hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Analyze Your Rice Crop
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ImageUpload onImageSelect={handleImageSelect} preview={preview} onClear={clearImage} />

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Select value={modelType} onValueChange={(v: "fertilizer" | "insect") => setModelType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fertilizer">🌿 Fertilizer / Disease Model</SelectItem>
                        <SelectItem value="insect">🐛 Insect / Pesticide Model</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handlePredict}
                    disabled={!imageFile || predicting}
                    className="min-w-[160px] transition-all hover:scale-[1.02]"
                    size="lg"
                  >
                    {predicting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Analyze Now
                      </>
                    )}
                  </Button>
                </div>

                {predicting && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 animate-fade-in">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <div>
                        <p className="text-sm font-medium">AI is analyzing your crop image...</p>
                        <p className="text-xs text-muted-foreground">This may take a few seconds</p>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%", transition: "width 2s" }} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {result && (
              <ResultCard
                imageUrl={result.imageUrl}
                prediction={result.prediction}
                cure={result.cure}
                modelType={modelType}
                location={result.location}
              />
            )}
          </div>

          {/* Right: Weather + History */}
          <div className="space-y-6">
            <WeatherWidget onWeatherUpdate={(temp, humidity) => setCurrentWeather({ temp, humidity })} />
            <MarketPrices />
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Recent Predictions</h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-primary hover:text-primary/80"
                  onClick={() => navigate("/predictions")}
                >
                  View All
                </Button>
              </div>
              <PredictionHistory key={historyKey} onDelete={() => setHistoryKey((k) => k + 1)} />
            </div>
          </div>
        </div>
      </main>

      <ChatbotWidget />
    </div>
  );
}
