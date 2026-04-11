import type { Session } from "@supabase/supabase-js";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

export default function GreetingBanner({ session }: { session: Session }) {
  const email = session.user.email || "Farmer";
  const name = email.split("@")[0];
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <div className="mb-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-foreground">
        {getGreeting()}, <span className="text-primary capitalize">{name}</span> 👋
      </h2>
      <p className="text-sm text-muted-foreground mt-1">{today} — Let's keep your crops healthy!</p>
    </div>
  );
}
