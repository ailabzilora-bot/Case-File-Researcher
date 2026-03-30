import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Sparkles, Plus, Bot, Clock, FileText, Paperclip, Mic, Lock, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Message } from '@/types';
import { cn } from '@/lib/utils';
import { useLibrary } from '@/hooks/useLibrary';

export default function LibraryAssistant() {
  const { folders } = useLibrary();
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isChatLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    const messageToSend = chatInput;
    setChatInput('');
    setIsChatLoading(true);

    try {
      const namespace = folders.map(f => f.name).join(', ');

      const response = await fetch('https://n8n.srv843245.hstgr.cloud/webhook-test/97531b9b-f1bc-49a1-85e6-f3b339c00755', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: 'digital-library-global',
          chatInput: messageToSend,
          namespace: namespace,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const aiContent = data.output || data.text || data.message || (typeof data === 'string' ? data : JSON.stringify(data));

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiContent,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error('Chat webhook failed:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I couldn't connect to the AI service at the moment. Please check your connection or try again later.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#FDFCFE] overflow-y-auto p-8 relative">
      {/* Background gradient blob */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-purple-100/40 blur-[100px] pointer-events-none z-0" />
      
      <div className="max-w-5xl mx-auto w-full relative z-10 flex flex-col h-full">
        {/* Header Area */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">Firm Assistant</h1>
            <p className="text-slate-500 text-lg max-w-2xl leading-relaxed">
              Synthesize complex legal data and draft motions with AI-driven precision.
            </p>
          </div>
          <div className="flex gap-3 mt-2">
            <div className="flex items-center gap-2 bg-white border border-slate-100 px-4 py-2.5 rounded-full shadow-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
              <span className="text-sm font-bold text-slate-700">GPT-4 Legal Model Active</span>
            </div>
            <div className="flex items-center gap-2 bg-white border border-slate-100 px-4 py-2.5 rounded-full shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-bold text-slate-700">Recent Sessions</span>
            </div>
          </div>
        </div>

        {/* Chat Card */}
        <div className="flex-1 bg-white rounded-3xl shadow-xl shadow-purple-100/30 border border-purple-50 flex flex-col overflow-hidden min-h-[600px]">
          {/* Chat Messages Area */}
          <div className="flex-1 p-8 space-y-8 overflow-y-auto">
            
            {/* Mock Assistant Message 1 */}
            <div className="flex gap-4 max-w-3xl">
              <div className="w-10 h-10 rounded-xl bg-[#9300FF] flex items-center justify-center flex-shrink-0 shadow-md shadow-purple-200 mt-1">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col gap-4">
                <div className="bg-white border border-slate-100 p-6 rounded-2xl rounded-tl-sm shadow-sm text-slate-700 text-[15px] leading-relaxed">
                  Good morning, Counsel. I have indexed the latest filings for the <span className="font-bold text-[#9300FF] italic">Vanguard vs. Thorne</span> case. Would you like a summary of the contradictory statements in the deposition or shall we draft a motion to compel?
                </div>
                <div className="flex gap-3">
                  <button className="bg-purple-50 hover:bg-purple-100 text-[#9300FF] px-4 py-2 rounded-full text-sm font-bold transition-colors">
                    Summary of contradictions
                  </button>
                  <button className="bg-purple-50 hover:bg-purple-100 text-[#9300FF] px-4 py-2 rounded-full text-sm font-bold transition-colors">
                    Draft motion to compel
                  </button>
                </div>
              </div>
            </div>

            {/* Mock User Message */}
            <div className="flex gap-4 max-w-3xl ml-auto justify-end">
              <div className="bg-[#9300FF] text-white p-6 rounded-2xl rounded-tr-sm shadow-md shadow-purple-200 text-[15px] leading-relaxed">
                Please analyze the deposition of Sarah Thorne from Tuesday. Highlight any inconsistencies with the financial disclosure documents we attached earlier.
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-200 flex-shrink-0 overflow-hidden border border-slate-200 mt-1">
                <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="User" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Mock Assistant Message 2 */}
            <div className="flex gap-4 max-w-4xl">
              <div className="w-10 h-10 rounded-xl bg-[#9300FF] flex items-center justify-center flex-shrink-0 shadow-md shadow-purple-200 mt-1">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col gap-4 w-full">
                <div className="bg-white border border-slate-100 p-6 rounded-2xl rounded-tl-sm shadow-sm flex flex-col gap-6">
                  <div className="flex items-center gap-2 text-[#9300FF] font-bold text-lg">
                    <FileText className="w-5 h-5" />
                    Inconsistency Analysis: Thorne Deposition
                  </div>
                  
                  <div className="bg-amber-50/40 border-l-4 border-l-amber-500 rounded-r-xl p-5">
                    <h4 className="font-bold text-slate-900 mb-2">Financial Misalignment (Critical)</h4>
                    <p className="text-slate-700 text-[15px] leading-relaxed">
                      The deponent claimed "no prior knowledge of the offshore accounts" (Page 42, Line 12), however, the <span className="underline decoration-slate-300 underline-offset-4">Exhibit D-12</span> shows her digital signature on the authorization form dated October 2022.
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-5">
                    <h4 className="font-bold text-[#9300FF] mb-2">Contextual Insight</h4>
                    <p className="text-slate-600 text-[15px] italic leading-relaxed">
                      "This discrepancy provides a strong foundation for a Rule 37 sanction or a targeted cross-examination regarding credibility."
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Messages (if any) */}
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex gap-4 max-w-3xl", msg.role === 'user' ? "ml-auto justify-end" : "")}>
                {msg.role === 'assistant' && (
                  <div className="w-10 h-10 rounded-xl bg-[#9300FF] flex items-center justify-center flex-shrink-0 shadow-md shadow-purple-200 mt-1">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                )}
                <div className={cn(
                  "p-6 rounded-2xl shadow-sm text-[15px] leading-relaxed",
                  msg.role === 'user' 
                    ? "bg-[#9300FF] text-white rounded-tr-sm shadow-purple-200" 
                    : "bg-white border border-slate-100 text-slate-700 rounded-tl-sm"
                )}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-10 h-10 rounded-xl bg-slate-200 flex-shrink-0 overflow-hidden border border-slate-200 mt-1">
                    <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="User" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            ))}
            
            {isChatLoading && (
              <div className="flex gap-4 max-w-3xl">
                <div className="w-10 h-10 rounded-xl bg-[#9300FF] flex items-center justify-center flex-shrink-0 shadow-md shadow-purple-200 mt-1">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div className="bg-white border border-slate-100 p-6 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#9300FF]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-[#9300FF]/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-[#9300FF] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 bg-white">
            <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-white border border-slate-200 p-2 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-purple-100 focus-within:border-purple-300 transition-all">
              <button type="button" className="p-3 text-slate-400 hover:text-slate-600 transition-colors">
                <Paperclip className="w-5 h-5" />
              </button>
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask your firm assistant anything about your case files..." 
                className="flex-1 bg-transparent border-none focus:outline-none text-slate-700 text-[15px]"
              />
              <button type="button" className="p-3 text-slate-400 hover:text-slate-600 transition-colors">
                <Mic className="w-5 h-5" />
              </button>
              <button type="submit" disabled={!chatInput.trim() || isChatLoading} className="w-12 h-12 bg-[#9300FF] hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-xl flex items-center justify-center shadow-md shadow-purple-200 transition-transform active:scale-95 flex-shrink-0">
                <Send className="w-5 h-5" />
              </button>
            </form>
            
            {/* Footer Meta */}
            <div className="flex items-center justify-center gap-6 mt-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <Lock className="w-3 h-3" />
                Encrypted Session
              </div>
              <div className="flex items-center gap-2">
                <Scale className="w-3 h-3" />
                Case: Vanguard V. Thorne
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}