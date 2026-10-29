import { safeGet } from "@/lib/safe-lookup";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, ChevronDown, Sparkles, Bot } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { searchFaq, askAi } from "@/services/faq";
import i18next from "i18next";
import { useTranslation } from "react-i18next";

// ponytail: backdrop sederhana, upgrade ke <Dialog /> kalo butuh aksesibilitas lebih

const FAQ_TOPICS = [
  "reset password",
  "cetak ulang nota",
  "refund",
  "laporan penjualan",
  "tambah produk",
  "diskon",
  "stok opname",
  "split bill"
];

const MODE = { FAQ: "faq", AI: "ai" };

// ponytail: flat list, upgrade ke grouped/carousel kalo > 15 topik
const GREETINGS = {
  [MODE.FAQ]: {
    role: "bot",
    get text() {
      return i18next.t("component.faqChat.ui.hiHowCanWeHelp");
    },
    quickReplies: FAQ_TOPICS
  },
  [MODE.AI]: {
    role: "bot",
    get text() {
      return i18next.t("component.faqChat.ui.aiModeIsOnAsk");
    }
  }
};

export const FAQ_CHAT_OPEN = "faq-chat:open";

function FaqChat() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(MODE.FAQ);
  const [messages, setMessages] = useState([GREETINGS[MODE.FAQ]]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  // Other screens (e.g. the Support page's "Start chat") open the chat with
  // window.dispatchEvent(new Event(FAQ_CHAT_OPEN)).
  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener(FAQ_CHAT_OPEN, openChat);
    return () => window.removeEventListener(FAQ_CHAT_OPEN, openChat);
  }, []);

  // auto-scroll ke bawah pas message baru
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages]);

  const addMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const switchMode = useCallback((newMode) => {
    setMode(newMode);
    setMessages([safeGet(GREETINGS, newMode)]);
    setInput("");
  }, []);

  const handleSearch = useCallback(
    async (query) => {
      const q = query.trim();
      if (!q) return;

      addMessage({ role: "user", text: q });
      setInput("");
      setLoading(true);

      try {
        if (mode === MODE.AI) {
          const answer = await askAi(q);
          addMessage({ role: "bot", text: answer || "Maaf, AI belum bisa jawab. Coba lagi." });
        } else {
          const results = await searchFaq({ page: 1, limit: 10, search: q });
          if (results.length === 0) {
            addMessage({
              role: "bot",
              get text() {
                return i18next.t("component.faqChat.ui.notFoundInTheFaq");
              }
            });
          } else {
            results.forEach((item) => {
              addMessage({ role: "bot", text: `**${item.q}**\n\n${item.a}` });
            });
          }
        }
      } catch {
        addMessage({
          role: "bot",
          get text() {
            return i18next.t("component.faqChat.ui.sorrySomethingWentWrongPlease");
          }
        });
      } finally {
        setLoading(false);
      }
    },
    [addMessage, mode]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch(input);
  };

  // close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const handleReset = () => {
    setMessages([safeGet(GREETINGS, mode)]);
    setInput("");
  };

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <>
      {/* FAB — hide saat panel terbuka biar gak tumpuk */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
          title={t("component.faqChat.ui.askTheFaq")}>
          <MessageCircle size={24} />
        </button>
      )}

      {/* Backdrop — tutup panel kalo klik luar, cegah scroll tembus */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={handleClose}
          onWheel={(e) => e.preventDefault()}
          onTouchMove={(e) => e.preventDefault()}
        />
      )}

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] sm:w-[420px] h-[550px]">
          <Card className="shadow-2xl border border-primary/20 bg-background flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-primary/5 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  {mode === MODE.AI ? <Bot size={16} /> : <Sparkles size={16} />}
                </div>
                <div>
                  <h2 className="font-semibold text-sm text-foreground">
                    {mode === MODE.AI ? "AI Analisa" : "FAQ Chat"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {mode === MODE.AI
                      ? "Tanya AI soal bisnis toko"
                      : "Tanya seputar penggunaan POS"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 text-xs px-2 ${mode === MODE.AI ? "text-primary" : "text-muted-foreground"}`}
                  onClick={() => switchMode(mode === MODE.AI ? MODE.FAQ : MODE.AI)}>
                  {mode === MODE.AI ? "FAQ" : "AI"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleReset}
                  title={t("component.faqChat.ui.resetConversation")}>
                  <ChevronDown size={14} />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClose}>
                  <X size={14} />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
              <div className="px-4 py-3 space-y-3">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}>
                      {/* bold support buat **title** dari API */}
                      {msg.text.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                        part.startsWith("**") && part.endsWith("**") ? (
                          <strong key={j} className="font-semibold">
                            {part.slice(2, -2)}
                          </strong>
                        ) : (
                          part
                        )
                      )}
                    </div>
                  </div>
                ))}

                {/* Loading */}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted text-muted-foreground rounded-2xl rounded-bl-md px-4 py-2.5 text-sm">
                      <span className="animate-pulse">{t("component.faqChat.ui.typing")}</span>
                    </div>
                  </div>
                )}

                {/* Quick replies — tampil cuma di pesan terakhir kalo bot yg ngirim */}
                {!loading &&
                  messages[messages.length - 1]?.quickReplies &&
                  messages[messages.length - 1]?.role === "bot" && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {messages[messages.length - 1].quickReplies.map((topic) => (
                        <button
                          type="button"
                          key={topic}
                          onClick={() => handleSearch(topic)}
                          className="text-xs px-2.5 py-1.5 rounded-full border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors">
                          {topic}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t p-3 flex items-center gap-2 shrink-0">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("component.faqChat.ui.typeAQuestion")}
                className="h-9 text-sm flex-1"
                disabled={loading}
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => handleSearch(input)}
                disabled={loading || !input.trim()}>
                <Send size={18} />
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

export default FaqChat;
