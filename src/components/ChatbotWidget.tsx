import { useState } from "react";
import { MessageCircle, X } from "lucide-react";

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-[380px] h-[520px] rounded-xl overflow-hidden shadow-2xl border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 gradient-primary text-primary-foreground">
            <span className="font-semibold text-sm">Agro AI Chatbot</span>
            <button onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <iframe
            src="https://udify.app/chat/f2QD5JLiAv9iRRNG"
            className="w-full h-[calc(100%-48px)] border-0"
            allow="microphone"
          />
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full gradient-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </>
  );
}
