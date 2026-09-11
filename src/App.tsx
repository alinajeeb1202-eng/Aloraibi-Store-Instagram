import React, { useState, useEffect, useRef } from "react";
import { Settings, Image as ImageIcon, Send, Loader2, MessageSquare, Bot, User, BookOpen, RefreshCw, Clock, CheckCircle, Calendar, ShieldCheck, Zap, BellRing, Search, Copy, Check, BookMarked, Sparkles, X } from "lucide-react";

interface SchedulerStatus {
  status: string;
  timezone: string;
  currentTime: string;
  schedules: {
    name: string;
    time: string;
    frequency: string;
    lastRunDate: string;
  }[];
  logs: {
    timestamp: string;
    type: "poster" | "dua";
    status: "success" | "failed";
    details: string;
  }[];
}

interface ShiaDuaItem {
  id: number;
  title: string;
  text: string;
  source: string;
  imam: string;
  category: string;
}

export default function App() {
  const [config, setConfig] = useState({ idInstance: "", apiTokenInstance: "", chatId: "" });
  const [loading, setLoading] = useState(false);
  const [duaLoading, setDuaLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [duaPreview, setDuaPreview] = useState<string>("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: string, text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scheduler state
  const [schedulerInfo, setSchedulerInfo] = useState<SchedulerStatus | null>(null);
  const [liveBahrainTime, setLiveBahrainTime] = useState<string>("");

  // Shia Encyclopedia state
  const [shiaDuas, setShiaDuas] = useState<ShiaDuaItem[]>([]);
  const [showEncyclopedia, setShowEncyclopedia] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("الكل");
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [sendingDuaId, setSendingDuaId] = useState<number | null>(null);
  const [copiedDuaId, setCopiedDuaId] = useState<number | null>(null);

  // Background persistent keep-alive state
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [pingsCount, setPingsCount] = useState(0);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch(console.error);

    loadDuaPreview();
    fetchSchedulerStatus();

    fetch("/api/shia-duas")
      .then(res => res.json())
      .then(data => {
        if (data.duas) setShiaDuas(data.duas);
      })
      .catch(console.error);

    // 1. Regular browser interval
    const interval = setInterval(() => {
      fetchSchedulerStatus();
    }, 25000);

    // 2. Background Web Worker to prevent mobile/background tabs from being suspended
    let worker: Worker | null = null;
    try {
      const workerCode = `
        setInterval(() => {
          postMessage('ping');
        }, 20000);
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      worker = new Worker(workerUrl);
      worker.onmessage = () => {
        fetch("/api/scheduler-status")
          .then(res => res.json())
          .then(data => {
            setSchedulerInfo(data);
            setPingsCount(c => c + 1);
          })
          .catch(() => {});
      };
    } catch (err) {
      console.log("Worker init note:", err);
    }

    // Live clock ticker
    const clockInterval = setInterval(() => {
      const now = new Date();
      setLiveBahrainTime(now.toLocaleTimeString("ar-BH", { timeZone: "Asia/Bahrain", hour12: true }));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(clockInterval);
      if (worker) worker.terminate();
    };
  }, []);

  const fetchSchedulerStatus = () => {
    fetch("/api/scheduler-status")
      .then(res => res.json())
      .then(data => setSchedulerInfo(data))
      .catch(console.error);
  };

  const loadDuaPreview = () => {
    setLoadingPreview(true);
    fetch("/api/preview-dua")
      .then((res) => res.json())
      .then((data) => {
        if (data.duaText) {
          setDuaPreview(data.duaText);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingPreview(false));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setMessage("تم الحفظ بنجاح!");
      } else {
        setMessage("حدث خطأ أثناء الحفظ.");
      }
    } catch (error) {
      setMessage("حدث خطأ أثناء الحفظ.");
    }
    setSaving(false);
  };

  const handleTrigger = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/trigger", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message || "تم إرسال صورة المواقيت بنجاح!");
      } else {
        setMessage("حدث خطأ أثناء الإرسال: " + (data.error || ""));
      }
    } catch (error) {
      setMessage("حدث خطأ أثناء الإرسال.");
    }
    setLoading(false);
  };

  const handleTriggerDua = async () => {
    setDuaLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/trigger-dua", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message || "تم إرسال دعاء اليوم كتابة بنجاح!");
        if (data.duaText) {
          setDuaPreview(data.duaText);
        }
      } else {
        setMessage("حدث خطأ أثناء إرسال الدعاء: " + (data.error || ""));
      }
    } catch (error) {
      setMessage("حدث خطأ أثناء إرسال الدعاء.");
    }
    setDuaLoading(false);
  };

  const handleSendSpecificDua = async (dua: ShiaDuaItem) => {
    setSendingDuaId(dua.id);
    setMessage("");
    try {
      const res = await fetch("/api/send-selected-dua", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${dua.title} (${dua.imam})`,
          text: dua.text,
          source: dua.source
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`تم إرسال "${dua.title}" إلى الواتساب بنجاح!`);
      } else {
        setMessage(`حدث خطأ: ${data.error || ""}`);
      }
    } catch (err) {
      setMessage("تعذر إرسال الدعاء المختار.");
    }
    setSendingDuaId(null);
  };

  const handleCopyDua = (dua: ShiaDuaItem) => {
    const full = `${dua.title} (${dua.imam})\n« ${dua.text} »\nالمصدر: ${dua.source}`;
    navigator.clipboard.writeText(full);
    setCopiedDuaId(dua.id);
    setTimeout(() => setCopiedDuaId(null), 2000);
  };

  const handleSendChat = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const newMsgs = [...chatMessages, { role: "user", text: chatInput }];
    setChatMessages(newMsgs);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMsgs }),
      });
      const data = await res.json();
      if (data.text) {
        setChatMessages([...newMsgs, { role: "model", text: data.text }]);
      } else {
        setChatMessages([...newMsgs, { role: "model", text: "عذراً، حدث خطأ في الاتصال." }]);
      }
    } catch (err) {
      setChatMessages([...newMsgs, { role: "model", text: "عذراً، حدث خطأ." }]);
    }
    setIsChatLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-12" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-slate-800">نظام إرسال مواقيت الصلاة والأدعية</h1>
          <p className="text-slate-500 text-lg">
            يقوم النظام بإنشاء صورة يومية لمواقيت الصلاة، وإرسال دعاء اليوم المعتبر تلقائياً إلى مجموعة الواتساب.
          </p>
        </header>

        {/* 2026 - 2027 Automated Scheduler Dashboard */}
        <div className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-teal-700/40 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-teal-800/60 pb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>المؤقت التلقائي اليومي (2026 - 2027)</span>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs px-2.5 py-0.5 rounded-full font-normal">
                    نشط ومستمر
                  </span>
                </h2>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                تمت برمجة وجدولة النظام ليعمل ذاتياً كل يوم حتى عام 2027 وما بعدها. يرسل المواعيد والأدعية دون الحاجة لأي تدخل منك.
              </p>
            </div>

            {liveBahrainTime && (
              <div className="bg-slate-800/80 border border-teal-600/40 px-4 py-2.5 rounded-2xl flex items-center gap-3 text-right">
                <Clock className="w-5 h-5 text-teal-400" />
                <div>
                  <div className="text-[11px] text-slate-400">توقيت البحرين الحالي</div>
                  <div className="text-base font-bold font-mono text-teal-200" dir="ltr">{liveBahrainTime}</div>
                </div>
              </div>
            )}
          </div>

          {/* Schedule Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Dua */}
            <div className="bg-slate-800/70 border border-emerald-500/30 rounded-2xl p-5 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-emerald-300 font-bold">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                  1. دعاء اليوم كتابة
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-1 rounded-lg font-mono">
                  15:00 (3:00 م)
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                يختار يومياً دعاءً شيعياً موثقاً من كنز أكثر من 500 دعاء معتبر (الصحيفة السجادية، مفاتيح الجنان، الكافي، نهج البلاغة) ويرسله نصاً إلى القروب.
              </p>
              <div className="pt-2 border-t border-slate-700/50 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  مجدول يومياً للأعوام 2026 و 2027
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowEncyclopedia(true)}
                    className="text-xs bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <BookMarked className="w-3.5 h-3.5 text-emerald-400" />
                    <span>موسوعة الأدعية (500+)</span>
                  </button>
                  <button
                    onClick={handleTriggerDua}
                    disabled={duaLoading}
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    {duaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>تجربة فورية</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: Poster */}
            <div className="bg-slate-800/70 border border-blue-500/30 rounded-2xl p-5 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-blue-300 font-bold">
                  <ImageIcon className="w-5 h-5 text-blue-400" />
                  2. صورة مواقيت الصلاة
                </span>
                <span className="bg-blue-500/20 text-blue-300 text-xs px-2.5 py-1 rounded-lg font-mono">
                  18:00 (6:00 م)
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                يولد صورة يومية بتصميم راقٍ تحتوي مواقيت الصلوات وتاريخ اليوم وحديث شريف معتمد ويرسلها للقروب.
              </p>
              <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1 text-blue-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  مجدول يومياً للأعوام 2026 و 2027
                </span>
                <button
                  onClick={handleTrigger}
                  disabled={loading}
                  className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>تجربة فورية</span>
                </button>
              </div>
            </div>
          </div>

          {/* Auto-Guard Note */}
          <div className="bg-teal-950/60 border border-teal-800/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-teal-200">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                <strong>نصيحة لضمان العمل 100%:</strong> إذا أبقيت هذا التبويب مفتوحاً في متصفح هاتفك أو كمبيوترك، فإنه يبقي السيرفر مستيقظاً ويرسل الرسائل في وقتها بالضبط حتى لو لم تلمس أي زر!
              </span>
            </div>
            <button
              onClick={fetchSchedulerStatus}
              className="shrink-0 bg-teal-900/80 hover:bg-teal-800 text-teal-100 px-3 py-1.5 rounded-xl border border-teal-700/50 transition-colors flex items-center gap-1.5 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحديث الحالة</span>
            </button>
          </div>

          {/* Recent Execution Logs */}
          {schedulerInfo?.logs && schedulerInfo.logs.length > 0 && (
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                <span>سجل عمليات الإرسال الأخيرة:</span>
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {schedulerInfo.logs.slice(0, 4).map((log, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-800/50 px-3 py-1.5 rounded-lg text-xs">
                    <span className="text-slate-300">
                      {log.type === 'poster' ? '🖼️ صورة المواقيت' : '📖 دعاء اليوم'}: {log.details}
                    </span>
                    <span className="font-mono text-slate-500 text-[11px]" dir="ltr">{log.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Settings Panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex items-center space-x-3 space-x-reverse text-blue-600">
              <Settings className="w-6 h-6" />
              <h2 className="text-2xl font-semibold">إعدادات Green API</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ID Instance</label>
                <input
                  type="text"
                  value={config.idInstance}
                  onChange={(e) => setConfig({ ...config, idInstance: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="أدخل ID Instance"
                  dir="ltr"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">API Token Instance</label>
                <input
                  type="password"
                  value={config.apiTokenInstance}
                  onChange={(e) => setConfig({ ...config, apiTokenInstance: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="أدخل API Token"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp Group IDs (Chat IDs)</label>
                <input
                  type="text"
                  value={config.chatId}
                  onChange={(e) => setConfig({ ...config, chatId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="مثال: 123@g.us, 456@g.us"
                  dir="ltr"
                />
                <p className="text-xs text-slate-500 mt-2">
                  يمكنك إضافة أكثر من مجموعة بفصلها بفاصلة ( , ).<br/>
                  <span className="text-red-500 font-medium">ملاحظة:</span> لا يمكن استخدام روابط الدعوة (مثل chat.whatsapp.com/...)، يجب استخدام معرّف المجموعة الفعلي الذي ينتهي بـ <code className="text-blue-600 bg-blue-50 px-1 rounded">@g.us</code>.
                </p>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 space-x-reverse"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>حفظ الإعدادات</span>}
            </button>
            
            {message && (
              <div className={`p-4 rounded-lg text-sm ${message.includes('نجاح') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {message}
              </div>
            )}
          </div>

          {/* Actions & Preview Cards */}
          <div className="space-y-6">
            {/* Card 1: Prayer Times Poster */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between text-blue-600">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <ImageIcon className="w-5 h-5" />
                  <h2 className="text-xl font-bold text-slate-800">صورة مواقيت الصلاة (6:00 م)</h2>
                </div>
                <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">صورة + حديث</span>
              </div>
              
              <div className="bg-slate-100 rounded-xl overflow-hidden border border-slate-200 aspect-[4/3] flex items-center justify-center relative">
                <img src="/api/preview" alt="Prayer Times Poster Preview" className="w-full h-full object-contain" />
              </div>

              <button
                onClick={handleTrigger}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 space-x-reverse shadow-sm"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>إرسال صورة المواقيت الآن</span>
                  </>
                )}
              </button>
            </div>

            {/* Card 2: Written Shia Dua */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between text-emerald-600">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <BookOpen className="w-5 h-5" />
                  <h2 className="text-xl font-bold text-slate-800">دعاء اليوم كتابة (الساعة 3:00)</h2>
                </div>
                <button 
                  onClick={loadDuaPreview}
                  disabled={loadingPreview}
                  className="text-xs flex items-center gap-1 text-slate-500 hover:text-emerald-600 transition-colors"
                  title="تحديث المعاينة"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingPreview ? 'animate-spin' : ''}`} />
                  <span>تغيير الدعاء</span>
                </button>
              </div>

              {/* Shia Guarantee Badge */}
              <div className="flex items-center gap-2 text-xs text-emerald-900 bg-emerald-100/80 px-3 py-2 rounded-xl border border-emerald-300 font-medium">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>أكثر من 500 دعاء شيعي موثوق من أمهات كتب الشيعة ومروي عن الأئمة المعصومين (ع)</span>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4 text-slate-800 font-sans text-sm leading-relaxed whitespace-pre-line max-h-56 overflow-y-auto">
                {loadingPreview ? (
                  <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                    <span>جاري جلب دعاء معتبر...</span>
                  </div>
                ) : (
                  duaPreview || "جاري تجهيز الدعاء..."
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleTriggerDua}
                  disabled={duaLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 space-x-reverse shadow-sm text-sm"
                >
                  {duaLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>إرسال دعاء اليوم الآن</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowEncyclopedia(true)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 space-x-reverse shadow-sm text-sm"
                >
                  <BookMarked className="w-4 h-4 text-emerald-400" />
                  <span>تصفح موسوعة الأدعية (500+)</span>
                </button>
              </div>
            </div>
            
            {/* Internal Auto-Scheduler Card (No External Tools Needed) */}
            <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white border border-emerald-500/40 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
                  <h3 className="font-bold text-base text-emerald-300 flex items-center gap-1.5">
                    <Zap className="w-5 h-5 text-emerald-400" />
                    <span>نظام الإرسال التلقائي المباشر (داخلي بدون مواقع خارجية)</span>
                  </h3>
                </div>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-full font-mono">
                  {pingsCount > 0 ? `نشط (${pingsCount} نبضة)` : "متصل وجاهز"}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>لا تحتاج لأي موقع خارجي أو اشتراكات!</strong> المؤقت مبرمج ذاتياً ومجدول بالثواني للأعوام 2026 و 2027 وما بعدها. لضمان استمرار الإرسال تلقائياً في موعده:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                <div className="bg-white/10 p-3 rounded-xl border border-white/10 space-y-1">
                  <div className="font-bold text-emerald-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>1. دعاء اليوم الشيعي</span>
                  </div>
                  <p className="text-slate-300">يُرسل كتابة كل يوم الساعة <strong>3:00 عصراً</strong></p>
                </div>

                <div className="bg-white/10 p-3 rounded-xl border border-white/10 space-y-1">
                  <div className="font-bold text-teal-300 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>2. صورة مواقيت الصلاة</span>
                  </div>
                  <p className="text-slate-300">تُصمم وتُرسل كل يوم الساعة <strong>6:00 مساءً</strong></p>
                </div>
              </div>

              <div className="bg-black/30 p-3.5 rounded-xl border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>طريقة التشغيل الدائم:</strong> اترك هذا التبويب مفتوحاً في متصفح هاتفك أو حاسوبك، وسيرسل تلقائياً دون أي تدخل منك.
                  </span>
                </div>
                {'wakeLock' in navigator && (
                  <button
                    onClick={async () => {
                      try {
                        if (!wakeLockActive) {
                          await (navigator as any).wakeLock.request('screen');
                          setWakeLockActive(true);
                        } else {
                          setWakeLockActive(false);
                        }
                      } catch (e) {
                        console.log(e);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all text-xs whitespace-nowrap shrink-0 ${
                      wakeLockActive 
                        ? "bg-emerald-500 text-slate-950 font-bold" 
                        : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                    }`}
                  >
                    {wakeLockActive ? "✓ الشاشة مستيقظة 24/7" : "تثبيت اليقظة بالخلفية"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Gemini Chatbot Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col mt-8" style={{ height: "500px" }}>
          <div className="bg-slate-800 p-4 text-white flex items-center space-x-3 space-x-reverse">
            <Bot className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-semibold">المساعد الذكي Gemini</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {chatMessages.length === 0 ? (
              <div className="text-center text-slate-400 mt-10">
                <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>مرحباً! يمكنني جلب أوقات الصلاة، اختيار أحاديث، وتصميم الصور وإرسالها لك.</p>
                <p className="text-sm mt-2">جرب كتابة: "صمم صورة لأوقات صلاة اليوم بخلفية زرقاء مع حديث عن الصبر وأرسلها"</p>
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[80%] items-end space-x-2 space-x-reverse ${msg.role === 'user' ? 'flex-row' : 'flex-row-reverse'}`}>
                    <div className={`p-3 rounded-2xl whitespace-pre-wrap leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-bl-none' 
                        : 'bg-white border border-slate-200 text-slate-800 rounded-br-none shadow-sm'
                    }`}>
                      {msg.text}
                    </div>
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                      {msg.role === 'user' ? <User className="w-5 h-5 text-slate-500" /> : <Bot className="w-5 h-5 text-emerald-600" />}
                    </div>
                  </div>
                </div>
              ))
            )}
            {isChatLoading && (
              <div className="flex justify-start">
                 <div className="flex items-center space-x-2 space-x-reverse bg-white border border-slate-200 p-3 rounded-2xl rounded-br-none shadow-sm">
                   <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                   <span className="text-slate-500 text-sm">Gemini يفكر...</span>
                 </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-slate-200">
            <form onSubmit={handleSendChat} className="flex space-x-2 space-x-reverse">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="اطلب من المساعد جلب الأوقات أو إرسال صورة أو دعاء شيعي..."
                className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                disabled={isChatLoading}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isChatLoading}
                className="px-6 bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>

        {/* Shia Duas Encyclopedia Modal */}
        {showEncyclopedia && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white p-6 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <BookMarked className="w-7 h-7 text-emerald-400" />
                    <h3 className="text-2xl font-bold">موسوعة أدعية ومناجاة أهل البيت (ع)</h3>
                  </div>
                  <p className="text-emerald-200 text-xs mt-1.5 leading-relaxed">
                    كنز يحتوي على مئات الأدعية والمناجاة الموثوقة والمأثورة عن الأئمة الأطهار (ع) من أمهات كتب الشيعة المعتمدة
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] text-emerald-300">
                    <span className="bg-emerald-950/90 px-2.5 py-1 rounded-md border border-emerald-500/30">📖 الصحيفة السجادية الكاملة</span>
                    <span className="bg-emerald-950/90 px-2.5 py-1 rounded-md border border-emerald-500/30">🕌 مفاتيح الجنان</span>
                    <span className="bg-emerald-950/90 px-2.5 py-1 rounded-md border border-emerald-500/30">📜 الكافي للكليني</span>
                    <span className="bg-emerald-950/90 px-2.5 py-1 rounded-md border border-emerald-500/30">✨ نهج البلاغة</span>
                    <span className="bg-emerald-950/90 px-2.5 py-1 rounded-md border border-emerald-500/30">🌿 مهج الدعوات ومصباح المتهجد</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowEncyclopedia(false)}
                  className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search & Categories Bar */}
              <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="ابحث في نص الدعاء أو العنوان أو اسم الإمام أو المصدر..."
                    className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {["الكل", "مناجاة", "طلب الرزق", "تفريج الكروب", "مكارم الأخلاق", "الاستغفار", "الفرج", "تعقيبات"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
                        selectedCategory === cat
                          ? "bg-emerald-600 text-white"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duas List */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-100">
                {shiaDuas
                  .filter((item) => {
                    const matchesCat = selectedCategory === "الكل" || item.category === selectedCategory;
                    const matchesKw = !searchKeyword.trim() || 
                      item.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                      item.text.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                      item.source.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                      item.imam.toLowerCase().includes(searchKeyword.toLowerCase());
                    return matchesCat && matchesKw;
                  })
                  .map((dua) => (
                    <div key={dua.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3 hover:border-emerald-300 transition-all">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-700 font-bold text-base flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-emerald-500" />
                            {dua.title}
                          </span>
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2 py-0.5 rounded-md font-medium">
                            {dua.imam}
                          </span>
                        </div>
                        <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-0.5 rounded-full">
                          {dua.category}
                        </span>
                      </div>

                      <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-4 text-slate-800 text-sm md:text-base leading-loose font-serif">
                        « {dua.text} »
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-500">
                        <div className="flex items-center gap-1 text-slate-600">
                          <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                          <span>المصدر: <strong className="text-slate-800">{dua.source}</strong></span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyDua(dua)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 font-medium"
                          >
                            {copiedDuaId === dua.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedDuaId === dua.id ? "تم النسخ" : "نسخ الدعاء"}</span>
                          </button>

                          <button
                            onClick={() => handleSendSpecificDua(dua)}
                            disabled={sendingDuaId === dua.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 font-medium"
                          >
                            {sendingDuaId === dua.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            <span>إرسال للقروب الآن</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>
                  مجموع الأدعية المعروضة: <strong>{shiaDuas.length}</strong> دعاء معتمد (ويتم توليد واستخراج المزيد ذاتياً كل يوم)
                </span>
                <button
                  onClick={() => setShowEncyclopedia(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl transition-colors font-medium"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
