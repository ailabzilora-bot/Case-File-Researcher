import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, FileText, Upload, Plus, ChevronRight, Image as ImageIcon, FileSpreadsheet, File as FileIcon, ArrowRightLeft, ArrowLeft, Search, Filter, ChevronDown, MoreHorizontal, Share2, Bot, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { v4 as uuidv4 } from 'uuid';
import { useCases } from '@/hooks/useCases';
import { useLibrary, LibraryFile, LibraryFolder } from '@/hooks/useLibrary';
import { supabase } from '@/lib/supabase';

export default function DigitalLibrary() {
  const navigate = useNavigate();
  const { cases, createCase, addFolderToCase } = useCases();
  const { folders, setFolders } = useLibrary();
  const [activeFolderId, setActiveFolderId] = useState<string | null>('1');
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Move Dialog State
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [isConfirmMoveDialogOpen, setIsConfirmMoveDialogOpen] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeFolder = folders.find(f => f.id === activeFolderId);

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder: LibraryFolder = {
      id: uuidv4(),
      name: newFolderName,
      files: [],
    };
    setFolders([...folders, newFolder]);
    setNewFolderName('');
    setIsNewFolderDialogOpen(false);
    setActiveFolderId(newFolder.id);
  };

  const handleMoveClick = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    setActiveFolderId(folderId);
    setIsMoveDialogOpen(true);
    setSelectedCaseId(null);
  };

  const handleCaseSelect = (caseId: string) => {
    setSelectedCaseId(caseId);
    setIsMoveDialogOpen(false);
    setIsConfirmMoveDialogOpen(true);
  };

  const handleCreateCaseAndMove = () => {
    const newCaseId = createCase();
    setSelectedCaseId(newCaseId);
    setIsMoveDialogOpen(false);
    setIsConfirmMoveDialogOpen(true);
  };

  const confirmMove = async () => {
    if (!activeFolder || !selectedCaseId) return;
    
    // Get all files that have File objects
    const filesToMove = activeFolder.files.filter(f => f.fileObj).map(f => f.fileObj!);
    const allFileNames = activeFolder.files.map(f => f.name);

    setIsMoving(true);
    try {
      await addFolderToCase(selectedCaseId, activeFolder.name, filesToMove, allFileNames);
      
      // Remove fileObj references so they aren't uploaded again
      setFolders(prev => prev.map(folder => 
        folder.id === activeFolderId 
          ? { ...folder, files: folder.files.map(f => ({ ...f, fileObj: undefined })) }
          : folder
      ));
      
      setIsConfirmMoveDialogOpen(false);
      navigate(`/case/${selectedCaseId}`);
    } catch (error) {
      console.error('Move failed:', error);
    } finally {
      setIsMoving(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && activeFolderId) {
      const newFiles: LibraryFile[] = Array.from(e.target.files).map(file => ({
        id: uuidv4(),
        name: file.name,
        size: file.size,
        type: file.type,
        fileObj: file,
      }));

      setFolders(prev => prev.map(folder => 
        folder.id === activeFolderId 
          ? { ...folder, files: [...folder.files, ...newFiles] }
          : folder
      ));
    }
    // Reset input so the same files can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadFiles = async () => {
    if (!activeFolder || activeFolder.files.length === 0) return;
    
    // Get only the files that have actual File objects (newly added)
    const filesToUpload = activeFolder.files.filter(f => f.fileObj).map(f => f.fileObj!);
    
    if (filesToUpload.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      // Append the folder name
      formData.append('folderName', activeFolder.name);
      
      // Append all files under the key 'data' as requested
      filesToUpload.forEach(file => {
        formData.append('data', file);
      });

      await fetch('https://n8n.srv843245.hstgr.cloud/webhook-test/5c041d26-96e3-4ede-8b68-e17702d10ff9', {
        method: 'POST',
        mode: 'no-cors',
        body: formData,
      });
      
      console.log('Files uploaded successfully (opaque response)');
      
      // Remove fileObj references so they aren't uploaded again
      setFolders(prev => prev.map(folder => 
        folder.id === activeFolderId 
          ? { ...folder, files: folder.files.map(f => ({ ...f, fileObj: undefined })) }
          : folder
      ));
      
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (type: string, name: string) => {
    if (type.includes('image') || name.match(/\.(jpg|jpeg|png|gif)$/i)) return <ImageIcon className="h-8 w-8 text-orange-400" />;
    if (type.includes('pdf') || name.match(/\.pdf$/i)) return <FileText className="h-8 w-8 text-purple-400" />;
    if (type.includes('word') || name.match(/\.(doc|docx)$/i)) return <FileText className="h-8 w-8 text-blue-400" />;
    if (type.includes('excel') || type.includes('csv') || name.match(/\.(xls|xlsx|csv)$/i)) return <FileSpreadsheet className="h-8 w-8 text-green-400" />;
    return <FileIcon className="h-8 w-8 text-slate-400" />;
  };

  return (
    <div className="h-full p-8 max-w-[1600px] mx-auto flex flex-col gap-10">
      {/* Top Section */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[32px] font-bold text-slate-900 mb-2">Digital Library</h2>
          <p className="text-[15px] text-slate-500">Manage the firm's collective knowledge, case files, and legal assets.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
          <span className="text-sm font-semibold text-slate-700">Firm Storage: 78% Full</span>
        </div>
      </div>

      {/* Search/Filter/Upload */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input 
            placeholder="Search across all legal documents, contracts, and case files..." 
            className="pl-12 bg-white border-slate-200 focus-visible:ring-purple-500 rounded-2xl h-14 font-medium text-base shadow-sm"
          />
        </div>
        <Button variant="outline" className="bg-white rounded-2xl h-14 px-6 text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm font-semibold">
          <Filter className="h-5 w-5 mr-2" />
          Filter By Date
          <ChevronDown className="h-4 w-4 ml-4 text-slate-400" />
        </Button>
        <Button 
          className="bg-white hover:bg-purple-50 text-[#9300FF] rounded-2xl px-8 h-14 font-bold shadow-sm border border-slate-200"
          onClick={handleUploadFiles}
          disabled={isUploading || !activeFolder || activeFolder.files.filter(f => f.fileObj).length === 0}
        >
          <Upload className="h-5 w-5 mr-2" />
          {isUploading ? 'Uploading...' : 'Upload'}
        </Button>
      </div>

      <div className="flex flex-col gap-10 pb-20 overflow-y-auto">
        {/* Folders Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-900">Knowledge Base Folders</h3>
            <button className="text-[#9300FF] font-semibold text-sm hover:underline">View All</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {folders.map((folder, index) => {
              const colors = [
                { bg: 'bg-purple-100', icon: 'text-purple-600' }, // Purple
                { bg: 'bg-pink-100', icon: 'text-pink-600' }, // Pink
                { bg: 'bg-amber-100', icon: 'text-amber-600' }, // Orange/Yellow
                { bg: 'bg-slate-100', icon: 'text-slate-600' }, // Gray
              ];
              const color = colors[index % colors.length];
              const fakeCounts = ['1,240 Files • Updated 2h ago', '856 Files • Updated 5h ago', '321 Files • Updated 1d ago', '12,400 Files • Updated 1w ago'];
              const subtitle = folder.files.length > 0 ? `${folder.files.length} Files • Updated recently` : fakeCounts[index % fakeCounts.length];

              return (
                <div
                  key={folder.id}
                  onClick={() => setActiveFolderId(folder.id)}
                  className={`p-6 rounded-3xl border cursor-pointer transition-all group relative flex flex-col gap-6 bg-white shadow-sm hover:shadow-md hover:border-purple-200 ${
                    activeFolderId === folder.id ? 'border-purple-300 ring-2 ring-purple-100' : 'border-slate-100'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-colors ${color.bg} ${color.icon}`}>
                      <Folder className="h-6 w-6" fill="currentColor" />
                    </div>
                    <button className="text-slate-400 hover:text-slate-600">
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold text-slate-900 mb-1 truncate">
                      {folder.name}
                    </h3>
                    <p className="text-[13px] font-medium text-slate-500">
                      {subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Documents & Insights */}
        <div>
          <h3 className="text-xl font-bold text-slate-900 mb-6">Recent Documents & Insights</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Large Card */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    AI Analyzed
                  </span>
                  <span className="text-[#9300FF] text-sm font-bold">
                    Priority Case
                  </span>
                </div>
                <h4 className="text-2xl font-bold text-slate-900 mb-4">
                  Draft_Master_Service_Agreement_V4.docx
                </h4>
                <p className="text-slate-600 text-[15px] leading-relaxed max-w-2xl mb-8">
                  This document has been cross-referenced with recent SEC regulations. AI detected 3 potential compliance risks in Section 4.2 regarding liability caps.
                </p>
                <div className="flex items-center gap-4">
                  <Button className="bg-[#9300FF] hover:bg-purple-700 text-white rounded-full px-6 h-12 font-bold shadow-md shadow-purple-200">
                    Review Changes
                  </Button>
                  <Button variant="ghost" className="text-[#9300FF] hover:bg-purple-50 rounded-full px-6 h-12 font-bold">
                    Download PDF
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-12 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Elena Rodriguez" className="w-10 h-10 rounded-full" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">Elena Rodriguez</p>
                    <p className="text-xs text-slate-500">Senior Associate • 15m ago</p>
                  </div>
                </div>
                <button className="text-slate-400 hover:text-slate-600">
                  <Share2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Right List of Cards */}
            <div className="space-y-4">
              {[
                { icon: FileText, color: 'text-red-500', bg: 'bg-red-100', name: 'Deposition_Smith_v_Corp.pdf', meta: 'Case #22941 • 2.4 MB' },
                { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100', name: 'Patent_Filing_Zeta_Tech.docx', meta: 'Case #IP-400 • 1.1 MB' },
                { icon: FileSpreadsheet, color: 'text-emerald-500', bg: 'bg-emerald-100', name: 'Settlement_Calculator_Q3.xl...', meta: 'Internal Firm • 850 KB' },
                { icon: FileText, color: 'text-[#9300FF]', bg: 'bg-purple-100', name: 'Witness_Statement_09.r...', meta: 'Case #22941 • 120 KB' },
              ].map((file, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all cursor-pointer">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${file.bg}`}>
                    <file.icon className={`h-6 w-6 ${file.color}`} fill="currentColor" />
                  </div>
                  <div>
                    <h5 className="text-[15px] font-bold text-slate-900 mb-1">{file.name}</h5>
                    <p className="text-[13px] text-slate-500">{file.meta}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Files Section (Preserved Functionality) */}
        {activeFolder && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">
                Files in {activeFolder.name}
              </h3>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 rounded-full h-8 px-4"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete the folder "${activeFolder.name}"?`)) {
                      setFolders(prev => prev.filter(f => f.id !== activeFolder.id));
                      setActiveFolderId(null);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Folder
                </Button>
                {activeFolder.files.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="gap-2 text-slate-600 border-slate-200 hover:bg-slate-50 rounded-full h-8 px-4"
                    onClick={(e) => handleMoveClick(e, activeFolder.id)}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    Move to Case
                  </Button>
                )}
                <Button 
                  variant="default" 
                  size="sm"
                  className="gap-2 bg-purple-50 text-[#9300FF] hover:bg-purple-100 border-none rounded-full h-8 px-4 font-semibold"
                  onClick={async () => {
                    const newCaseId = createCase();
                    const filesToMove = activeFolder.files.filter(f => f.fileObj).map(f => f.fileObj!);
                    const allFileNames = activeFolder.files.map(f => f.name);
                    await addFolderToCase(newCaseId, activeFolder.name, filesToMove, allFileNames);
                    navigate(`/case/${newCaseId}`);
                  }}
                >
                  <Bot className="h-4 w-4" />
                  Chat with Assistant
                </Button>
              </div>
            </div>

            {activeFolder.files.length === 0 ? (
              <div className="bg-white border border-slate-100/50 rounded-3xl p-12 flex flex-col items-center justify-center text-center min-h-[300px]">
                <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">No files in this folder</h3>
                <p className="text-sm text-slate-500 max-w-sm mb-6">
                  Upload documents, images, or spreadsheets to get started.
                </p>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-[#9300FF] hover:bg-purple-700 text-white rounded-full px-6 h-10 font-semibold shadow-md shadow-purple-200 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add File
                </Button>
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {activeFolder.files.map(file => (
                  <div key={file.id} className="bg-white border border-slate-100/50 rounded-2xl p-4 flex flex-col items-start gap-4 hover:shadow-md hover:border-purple-200 transition-all group relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 hover:bg-red-50"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
                          try {
                            // Delete from Supabase if it was uploaded
                            await supabase.storage
                              .from('case-files')
                              .remove([`${activeFolder.name}/${file.name}`]);
                            
                            // Remove from local state
                            setFolders(prev => prev.map(f => 
                              f.id === activeFolder.id 
                                ? { ...f, files: f.files.filter(f => f.id !== file.id) }
                                : f
                            ));
                          } catch (err) {
                            console.error('Error deleting file:', err);
                            alert('Failed to delete file.');
                          }
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-purple-50 transition-colors">
                      {getFileIcon(file.type, file.name)}
                    </div>
                    <div className="w-full pr-4">
                      <h4 className="text-sm font-bold text-slate-900 truncate w-full mb-1" title={file.name}>
                        {file.name}
                      </h4>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-medium text-slate-500">
                          {file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}
                        </span>
                        {file.fileObj && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                            Ready
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[140px] rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 font-bold hover:bg-white hover:border-purple-300 hover:text-[#9300FF] hover:shadow-sm transition-all flex flex-col items-center justify-center gap-2 group"
                >
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-purple-100 group-hover:text-[#9300FF] transition-colors">
                    <Plus className="h-5 w-5" />
                  </div>
                  <span className="text-sm">Add file</span>
                </button>
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Folder Dialog */}
      <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="Folder name" 
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewFolderDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move to Case Dialog */}
      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Move Folder to Case Workspace</DialogTitle>
            <DialogDescription>
              Select a case workspace to move the folder "{activeFolder?.name}" into, or create a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">My Files</h3>
              <div className="grid grid-cols-2 gap-3">
                {cases.filter(c => !c.isTeamCase).map(c => (
                  <Button 
                    key={c.id} 
                    variant="outline" 
                    className="justify-start h-auto py-3 px-4 text-left flex-col items-start gap-1"
                    onClick={() => handleCaseSelect(c.id)}
                  >
                    <span className="font-medium truncate w-full">{c.name}</span>
                    <span className="text-xs text-slate-500">{c.files.length} files</span>
                  </Button>
                ))}
                {cases.filter(c => !c.isTeamCase).length === 0 && (
                  <p className="text-sm text-slate-400 italic">No personal cases found.</p>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Teams</h3>
              <div className="grid grid-cols-2 gap-3">
                {cases.filter(c => c.isTeamCase).map(c => (
                  <Button 
                    key={c.id} 
                    variant="outline" 
                    className="justify-start h-auto py-3 px-4 text-left flex-col items-start gap-1"
                    onClick={() => handleCaseSelect(c.id)}
                  >
                    <span className="font-medium truncate w-full">{c.name}</span>
                    <span className="text-xs text-slate-500">{c.files.length} files</span>
                  </Button>
                ))}
                {cases.filter(c => c.isTeamCase).length === 0 && (
                  <p className="text-sm text-slate-400 italic">No team cases found.</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between border-t pt-4">
            <Button variant="outline" onClick={handleCreateCaseAndMove} className="gap-2">
              <Plus className="h-4 w-4" />
              Create New Case
            </Button>
            <Button variant="ghost" onClick={() => setIsMoveDialogOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Move Dialog */}
      <Dialog open={isConfirmMoveDialogOpen} onOpenChange={setIsConfirmMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Move</DialogTitle>
            <DialogDescription>
              Are you sure you want to upload this folder with these files into this case?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-slate-50 p-4 rounded-md border border-slate-200 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Folder:</span>
                <span className="font-medium">{activeFolder?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Files to upload:</span>
                <span className="font-medium">{activeFolder?.files.filter(f => f.fileObj).length} files</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Destination Case:</span>
                <span className="font-medium">{cases.find(c => c.id === selectedCaseId)?.name || 'New Case'}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmMoveDialogOpen(false)} disabled={isMoving}>Cancel</Button>
            <Button onClick={confirmMove} disabled={isMoving} className="bg-slate-900 hover:bg-slate-800">
              {isMoving ? 'Moving...' : 'Yes, Move Files'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Assistant Button */}
      <button className="fixed bottom-8 right-8 h-16 w-16 bg-[#9300FF] hover:bg-purple-700 text-white rounded-2xl shadow-lg shadow-purple-200 flex items-center justify-center transition-transform hover:scale-105 z-50">
        <Bot className="h-8 w-8" />
        <span className="absolute -top-2 -right-2 h-6 w-6 bg-amber-500 text-white text-xs font-bold flex items-center justify-center rounded-full border-2 border-white">
          1
        </span>
      </button>
    </div>
  );
}
