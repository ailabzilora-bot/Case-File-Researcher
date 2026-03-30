import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCases } from '@/hooks/useCases';
import { useLibrary } from '@/hooks/useLibrary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Upload, FileText, Sparkles, Share2, Send, MessageSquare, Check, Users, Eye, Folder, RefreshCw, Trash2, Plus, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message, TEAM_MEMBERS, CaseFile } from '@/types';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

export default function CaseWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { cases, updateCase, addFileToCase, generateSummary, shareCase, removeFolderFromCase, removeFileFromCase, deleteCase } = useCases();
  const { setFolders } = useLibrary();
  
  const currentCase = cases.find((c) => c.id === id);

  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [viewingFile, setViewingFile] = useState<CaseFile | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Supabase Files State
  const [supabaseFiles, setSupabaseFiles] = useState<Record<string, any[]>>({});
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  const fetchSupabaseFiles = async () => {
    if (!currentCase?.folders || currentCase.folders.length === 0) return;
    setIsLoadingFiles(true);
    try {
      const newFiles: Record<string, any[]> = {};
      for (const folder of currentCase.folders) {
        const { data, error } = await supabase.storage.from('adasd').list(folder);
        if (error) {
          console.error('Error fetching folder', folder, error);
          newFiles[folder] = [];
        } else {
          newFiles[folder] = (data ?? []).filter(
            (f) => f.name && f.name !== '.emptyFolder' && f.name !== '.gitkeep'
          );
        }
      }
      setSupabaseFiles(newFiles);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (currentCase?.folders) {
      fetchSupabaseFiles();
    }
  }, [currentCase?.folders]);

  useEffect(() => {
    if (!currentCase) {
      navigate('/');
    }
  }, [currentCase, navigate]);

  // Sync selected members when dialog opens or case changes
  useEffect(() => {
    if (currentCase) {
      setSelectedMembers(currentCase.sharedWith || []);
    }
  }, [currentCase, isShareDialogOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isChatLoading]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentCase) {
      updateCase(currentCase.id, { name: e.target.value });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileToUpload(e.target.files[0]);
    }
  };

  const handleUploadConfirm = () => {
    if (fileToUpload && currentCase) {
      const folderName = currentCase.folders?.join(', ') || '';
      addFileToCase(currentCase.id, fileToUpload, folderName);
      setFileToUpload(null);
      setIsUploadDialogOpen(false);
    }
  };

  const handleDeleteFile = async (e: React.MouseEvent, file: CaseFile) => {
    e.stopPropagation();
    if (!currentCase) return;

    if (window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
      if (file.folderName) {
        // It's a Supabase file
        try {
          const { error } = await supabase.storage
            .from('case-files')
            .remove([`${file.folderName}/${file.name}`]);
          
          if (error) throw error;
          
          // Refresh Supabase files
          fetchSupabaseFiles();
          
          // Also remove from the Digital Library folder state
          setFolders(prev => prev.map(f => 
            f.name === file.folderName 
              ? { ...f, files: f.files.filter(lf => lf.name !== file.name) }
              : f
          ));
        } catch (err) {
          console.error('Error deleting file from Supabase:', err);
          alert('Failed to delete file from storage.');
        }
      }
      
      // Always remove from local case state
      removeFileFromCase(currentCase.id, file.id, file.name, file.folderName);
      
      if (viewingFile?.id === file.id) {
        setViewingFile(null);
      }
    }
  };

  const handleGenerateSummary = async () => {
    if (currentCase) {
      setIsGeneratingSummary(true);
      await generateSummary(currentCase.id);
      setIsGeneratingSummary(false);
    }
  };

  const handleShare = () => {
    if (currentCase) {
      shareCase(currentCase.id, selectedMembers);
      setIsShareDialogOpen(false);
    }
  };

  const toggleMember = (name: string) => {
    setSelectedMembers((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

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
      const namespace = currentCase.folders && currentCase.folders.length > 0 
        ? currentCase.folders.join(', ') 
        : '';

      const response = await fetch('https://n8n.srv843245.hstgr.cloud/webhook-test/95c1c130-f1b0-4d6c-8c2c-5ea746e845ab', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: currentCase.id,
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

  const allMergedFiles = useMemo(() => {
    if (!currentCase) return [];
    const map = new Map();
    
    // Local files
    currentCase.files.forEach(f => map.set(f.name, f));
    
    // Supabase files
    currentCase.folders?.forEach(folderName => {
      const supabaseFilesInFolder = supabaseFiles[folderName] || [];
      supabaseFilesInFolder.forEach(f => {
        if (!f.name) return;
        map.set(f.name, {
          id: f.id ?? f.name,
          name: f.name,
          extractedText: 'File fetched from Supabase Storage. Content preview not available.',
          uploadedAt: f.created_at || new Date().toISOString(),
          folderName,
        });
      });
    });
    
    return Array.from(map.values()).sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }, [currentCase, supabaseFiles]);

  if (!currentCase) return null;

  return (
    <div className="flex h-screen bg-[#FDFCFE] font-sans overflow-hidden">
      {/* Left Panel: Document Viewer */}
      <aside className="w-80 flex-shrink-0 border-r border-purple-100/50 bg-white flex flex-col z-10">
        <div className="p-5 border-b border-purple-100/50 flex items-center justify-between bg-white">
          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 -ml-2" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-[#9300FF]" onClick={() => setIsUploadDialogOpen(true)}>
              <Upload className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-[#9300FF]" onClick={fetchSupabaseFiles} disabled={isLoadingFiles}>
              <RefreshCw className={cn("h-4 w-4", isLoadingFiles && "animate-spin")} />
            </Button>
          </div>
        </div>
        <div className="px-5 py-4 border-b border-purple-100/50 bg-slate-50/50">
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Document Viewer</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {currentCase.folders && currentCase.folders.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Folders</h4>
              <div className="space-y-2">
                {currentCase.folders.map(folderName => (
                  <div key={folderName} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-3">
                      <Folder className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">{folderName}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Remove folder "${folderName}" from this case?`)) {
                          removeFolderFromCase(currentCase.id, folderName);
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Files</h4>
          {allMergedFiles.length === 0 && !isLoadingFiles && (
            <div className="text-center p-4 text-sm text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
              No documents found. Upload files to begin.
            </div>
          )}
          {allMergedFiles.map(file => (
            <div
              key={file.id}
              onClick={() => {
                setViewingFile(file);
              }}
              className={cn(
                "w-full text-left p-4 rounded-2xl border transition-all duration-300 flex flex-col gap-2 group cursor-pointer",
                viewingFile?.id === file.id 
                  ? "bg-purple-50 border-purple-200 shadow-sm" 
                  : "bg-white border-slate-100 hover:border-purple-100 hover:bg-slate-50"
              )}
            >
              <div className="flex items-start gap-3 w-full">
                <div className={cn(
                  "p-2 rounded-lg flex-shrink-0",
                  viewingFile?.id === file.id ? "bg-[#9300FF] text-white" : "bg-slate-100 text-slate-500 group-hover:bg-purple-100 group-hover:text-[#9300FF]"
                )}>
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <p className={cn(
                    "text-sm font-bold truncate",
                    viewingFile?.id === file.id ? "text-[#9300FF]" : "text-slate-900"
                  )}>
                    {file.name}
                  </p>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    {file.uploadedAt ? formatDistanceToNow(new Date(file.uploadedAt)) + ' ago' : 'Unknown time'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
                    viewingFile?.id === file.id ? "text-purple-400 hover:text-red-500 hover:bg-red-50" : "text-slate-400 hover:text-red-500 hover:bg-red-50"
                  )}
                  onClick={(e) => handleDeleteFile(e, file)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Panel: Case Assistant */}
      <main className="flex-1 flex flex-col h-full relative bg-[#FDFCFE]">
        <header className="h-16 border-b border-purple-100/50 bg-white/80 backdrop-blur-md px-8 flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#FF3366] to-[#9300FF] flex items-center justify-center text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="font-bold text-slate-900">
              {viewingFile ? `Analyzing ${viewingFile.name}` : 'Case Assistant'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Input
              value={currentCase.name}
              onChange={handleNameChange}
              className="text-sm font-bold border-transparent bg-transparent hover:bg-slate-50 focus:bg-white focus:border-slate-200 px-3 w-48 transition-colors text-right"
            />
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 rounded-xl font-semibold border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete the case "${currentCase.name}"?`)) {
                  deleteCase(currentCase.id);
                  navigate('/');
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete Case
            </Button>
            <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 rounded-xl font-semibold border-slate-200 text-slate-600">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share Case</DialogTitle>
                  <DialogDescription>
                    Invite team members to collaborate on this case.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex gap-2">
                    <Input placeholder="Email address" />
                    <Button>Invite</Button>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-slate-900">Members</h4>
                    {currentCase.sharedWith.length === 0 ? (
                      <p className="text-sm text-slate-500">Only you have access</p>
                    ) : (
                      currentCase.sharedWith.map((email, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg border border-slate-200 p-2">
                          <span className="text-sm text-slate-700">{email}</span>
                          <Button variant="ghost" size="sm" className="text-red-600">Remove</Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <div className="h-16 w-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-[#9300FF]" />
              </div>
              <p className="font-medium text-slate-600">Analyzing your case files. Ask anything about this case.</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm",
                msg.role === 'user' 
                  ? "bg-[#9300FF] text-white rounded-br-none" 
                  : "bg-white border border-slate-100 text-slate-800 rounded-bl-none"
              )}>
                {msg.content}
              </div>
            </div>
          ))}
          {isChatLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none px-5 py-4 flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 bg-[#9300FF]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-[#9300FF]/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-[#9300FF] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 bg-white border-t border-purple-100/50 z-10">
          <form onSubmit={handleSendMessage} className="flex gap-3 max-w-4xl mx-auto bg-slate-50 p-2 rounded-2xl border border-slate-100 focus-within:border-purple-300 focus-within:ring-4 focus-within:ring-purple-50 transition-all">
            <Button type="button" variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 rounded-xl flex-shrink-0">
              <Plus className="h-5 w-5" />
            </Button>
            <Input 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about these documents..."
              className="flex-1 bg-transparent border-none focus-visible:ring-0 shadow-none text-slate-700 font-medium text-base px-0"
            />
            <Button type="submit" disabled={!chatInput.trim() || isChatLoading} className="bg-[#9300FF] hover:bg-purple-700 text-white rounded-xl h-10 w-10 p-0 flex items-center justify-center shadow-md shadow-purple-200 flex-shrink-0 transition-transform active:scale-95">
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <div className="text-center mt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Verified AI Intelligence • The Luminous Counsel Proprietary System
            </p>
          </div>
        </div>
      </main>

      {/* Right Panel: AI Summary */}
      <aside className="w-80 flex-shrink-0 border-l border-purple-100/50 bg-white flex flex-col z-10">
        <div className="p-5 border-b border-purple-100/50 flex items-center justify-between bg-white">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#9300FF]" />
            AI Summary
          </h3>
          <Button
            variant="default"
            size="sm"
            className="bg-[#9300FF] hover:bg-purple-700 text-white h-8 rounded-lg text-xs font-bold shadow-sm"
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary || currentCase.files.length === 0}
          >
            {isGeneratingSummary ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : null}
            Generate
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {isGeneratingSummary || !currentCase.summary ? (
            <div className="space-y-8 animate-pulse">
              <div className="space-y-3">
                <div className="h-3 w-24 bg-slate-200 rounded-full"></div>
                <div className="h-2 w-full bg-slate-100 rounded-full"></div>
              </div>
              <div className="space-y-3">
                <div className="h-3 w-32 bg-slate-200 rounded-full"></div>
                <div className="h-24 w-full bg-slate-100 rounded-xl"></div>
              </div>
              <div className="space-y-3">
                <div className="h-3 w-28 bg-slate-200 rounded-full"></div>
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-slate-100 rounded-full"></div>
                  <div className="h-6 w-20 bg-slate-100 rounded-full"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Risk Level */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Risk Level</h4>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2 overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full w-[65%]"></div>
                </div>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">Moderate Risk</span>
              </div>
              
              {/* Strategic Insights */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Strategic Insights</h4>
                <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4">
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    {currentCase.summary}
                  </p>
                </div>
              </div>
              
              {/* Key Legal Entities */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Key Legal Entities</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none font-bold">Plaintiff</Badge>
                  <Badge variant="secondary" className="bg-rose-50 text-rose-700 hover:bg-rose-100 border-none font-bold">Defendant</Badge>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none font-bold">Contract</Badge>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-none font-bold">Exhibit A</Badge>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Documents</DialogTitle>
            <DialogDescription>
              Add files to this case workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-4 text-slate-500" />
                  <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-slate-500">PDF, DOCX, TXT (MAX. 10MB)</p>
                </div>
                <input type="file" className="hidden" multiple onChange={handleFileSelect} />
              </label>
            </div>
            {fileToUpload && (
              <div className="flex items-center gap-2 text-sm text-slate-700 bg-slate-100 p-2 rounded-md">
                <FileText className="h-4 w-4 text-slate-500" />
                <span className="truncate flex-1 font-medium">{fileToUpload.name}</span>
                <span className="text-xs text-slate-400">{(fileToUpload.size / 1024).toFixed(1)} KB</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUploadConfirm} disabled={!fileToUpload}>Upload File</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Viewer Dialog */}
      <Dialog open={!!viewingFile} onOpenChange={(open) => !open && setViewingFile(null)}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
            <div>
              <DialogTitle>{viewingFile?.name}</DialogTitle>
              <DialogDescription>
                Uploaded {viewingFile?.uploadedAt ? formatDistanceToNow(new Date(viewingFile.uploadedAt)) : ''} ago
              </DialogDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 rounded-md mt-4">
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">
              {viewingFile?.extractedText}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
