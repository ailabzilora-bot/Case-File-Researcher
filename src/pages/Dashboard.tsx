import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Folder, Sparkles, Share2, MoreVertical, Send, Trash2, FileText, ExternalLink } from 'lucide-react';
import { useCases } from '@/hooks/useCases';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const navigate = useNavigate();
  const { cases, createCase, deleteCase } = useCases();
  const [caseToDelete, setCaseToDelete] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  
  const [deletedMockCases, setDeletedMockCases] = useState<string[]>(() => {
    const stored = localStorage.getItem('deleted-mock-cases');
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem('deleted-mock-cases', JSON.stringify(deletedMockCases));
  }, [deletedMockCases]);
  
  // Mock cases to match the image if the user doesn't have them
  const mockCases = [
    { id: 'mock-1', name: 'Doe v. Smith', updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), documents: 48 },
    { id: 'mock-2', name: 'Tech Corp Acquisition', updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), documents: 156 },
    { id: 'mock-3', name: 'Estate of Harrison', updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), documents: 24 },
    { id: 'mock-4', name: 'Miller Patent Dispute', updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), documents: 89 },
  ];

  const mergedCases = [
    ...cases.map(c => ({
      id: c.id,
      name: c.name,
      updatedAt: c.updatedAt,
      documents: c.files.length,
    })),
    ...mockCases.filter(mc => !cases.find(c => c.name === mc.name) && !deletedMockCases.includes(mc.id))
  ];

  const [activeCaseId, setActiveCaseId] = useState<string | null>(mergedCases.length > 0 ? mergedCases[0].id : null);
  const activeCase = mergedCases.find(c => c.id === activeCaseId) || mergedCases[0];

  const [messages, setMessages] = useState<{id: string, role: string, content: string, timestamp: string}[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatLoading]);

  // Reset messages when active case changes
  useEffect(() => {
    setMessages([]);
  }, [activeCaseId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeCase) return;

    const userMsg = {
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
      // Find the actual case to get its folders
      const actualCase = cases.find(c => c.id === activeCase.id);
      const namespace = actualCase?.folders && actualCase.folders.length > 0 
        ? actualCase.folders.join(', ') 
        : '';

      const response = await fetch('https://n8n.srv843245.hstgr.cloud/webhook-test/95c1c130-f1b0-4d6c-8c2c-5ea746e845ab', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: activeCase.id,
          chatInput: messageToSend,
          namespace: namespace,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const aiContent = data.output || data.text || data.message || (typeof data === 'string' ? data : JSON.stringify(data));

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiContent,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error('Chat webhook failed:', error);
      const errorMsg = {
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

  const handleCreateCase = () => {
    const newCaseId = createCase();
    navigate(`/case/${newCaseId}`);
  };

  const handleDeleteCase = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setCaseToDelete(id);
  };

  const confirmDelete = () => {
    if (caseToDelete) {
      if (caseToDelete.startsWith('mock-')) {
        setDeletedMockCases(prev => [...prev, caseToDelete]);
      } else {
        deleteCase(caseToDelete);
      }
      setCaseToDelete(null);
    }
  };

  return (
    <div className="h-full p-8 max-w-[1600px] mx-auto flex gap-8">
      {/* Left Column: Active Cases */}
      <div className="w-[350px] flex-shrink-0 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Active Cases</h2>
          <Badge variant="secondary" className="bg-purple-100/50 text-[#9300FF] hover:bg-purple-100 border-none font-bold px-3 py-1">
            {mergedCases.length} Total
          </Badge>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto pb-20 pr-2">
          {mergedCases.map((c, index) => {
            const isActive = c.id === activeCaseId;
            return (
              <div
                key={c.id}
                onClick={() => setActiveCaseId(c.id)}
                className={cn(
                  "bg-white p-5 rounded-3xl shadow-sm border cursor-pointer hover:shadow-md transition-all group relative flex flex-col",
                  isActive ? "border-purple-200 ring-2 ring-purple-100" : "border-slate-100/50 hover:border-purple-200"
                )}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-colors", isActive ? "bg-purple-50 group-hover:bg-purple-100" : "bg-slate-50 group-hover:bg-slate-100")}>
                    <Folder className={cn("h-5 w-5", isActive ? "text-[#9300FF]" : "text-slate-400")} fill="currentColor" />
                  </div>
                  <div className="flex items-center gap-2">
                    {isActive && (
                      <Badge variant="secondary" className="bg-purple-100 text-[#9300FF] text-[10px] uppercase tracking-wider font-bold border-none px-2 py-1">
                        Active
                      </Badge>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2 text-slate-400 hover:text-red-500 hover:bg-red-50"
                      onClick={(e) => handleDeleteCase(e, c.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2 text-slate-400 hover:text-[#9300FF] hover:bg-purple-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/case/${c.id}`);
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-[#9300FF] transition-colors pr-8 truncate">
                  {c.name}
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-auto">
                  Updated {formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true })} • {c.documents} Documents
                </p>
              </div>
            );
          })}

          <button
            onClick={handleCreateCase}
            className="py-4 rounded-3xl border-2 border-dashed border-slate-200 text-slate-500 font-bold hover:bg-white hover:border-purple-300 hover:text-[#9300FF] hover:shadow-sm transition-all flex items-center justify-center gap-3 group mt-2"
          >
            <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-purple-100 group-hover:text-[#9300FF] transition-colors">
              <Plus className="h-4 w-4" />
            </div>
            Upload Documents
          </button>
        </div>
      </div>

      {/* Right Column: Intelligence Assistant */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100/50 flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white z-10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Intelligence Assistant</h2>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                Analyzing {activeCase?.documents || 0} documents in <span className="font-semibold text-[#9300FF]">{activeCase?.name || 'Case'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => navigate(`/case/${activeCase.id}`)}
              className="bg-purple-50 text-[#9300FF] hover:bg-purple-100 font-semibold rounded-full px-4 h-9 shadow-sm flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open Case Workspace
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
              <Share2 className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 bg-[#FDFCFE]">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-purple-50 flex items-center justify-center text-[#9300FF] mb-2">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">How can I help with {activeCase?.name}?</h3>
              <p className="text-slate-500 max-w-md">
                Ask questions about the documents, request summaries, or find specific legal precedents related to this case.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={cn("flex flex-col gap-2", msg.role === 'user' ? "items-end" : "items-start")}>
                {msg.role === 'user' ? (
                  <>
                    <div className="bg-[#9300FF] text-white px-6 py-4 rounded-2xl rounded-tr-sm max-w-[80%] shadow-sm">
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                      YOU • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </>
                ) : (
                  <div className="flex gap-4 max-w-[85%]">
                    <div className="h-8 w-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-[#9300FF] shadow-sm flex-shrink-0 mt-1">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="bg-white border border-slate-100 px-6 py-5 rounded-2xl rounded-tl-sm shadow-sm space-y-4">
                        <p className="text-[15px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                        COUNSEL AI • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          {isChatLoading && (
            <div className="flex gap-4 max-w-[85%]">
              <div className="h-8 w-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-[#9300FF] shadow-sm flex-shrink-0 mt-1">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="bg-white border border-slate-100 px-6 py-5 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white border-t border-slate-100 z-10">
          <form onSubmit={handleSendMessage} className="bg-white border border-slate-200 rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-purple-100 focus-within:border-purple-300 transition-all">
            <div className="flex items-center gap-2 mb-2 px-2 pt-1">
              <Badge variant="secondary" className="bg-purple-50 text-[#9300FF] hover:bg-purple-100 border-none text-xs py-1 px-3 flex items-center gap-1.5">
                <FileText className="h-3 w-3" />
                {activeCase?.documents || 0} documents available
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 rounded-xl h-12 w-12 flex-shrink-0">
                <Plus className="h-6 w-6" />
              </Button>
              <Input 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about these documents..." 
                className="border-none shadow-none focus-visible:ring-0 text-[15px] h-12 px-0"
                disabled={isChatLoading}
              />
              <Button type="submit" disabled={isChatLoading || !chatInput.trim()} className="bg-[#9300FF] hover:bg-purple-700 text-white rounded-xl h-12 w-12 flex-shrink-0 shadow-md shadow-purple-200">
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </form>
          <div className="text-center mt-4">
            <p className="text-[10px] text-slate-400 font-medium">Verified AI Intelligence • The Luminous Counsel Proprietary System</p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!caseToDelete} onOpenChange={(open) => !open && setCaseToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Case</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this case? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCaseToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
