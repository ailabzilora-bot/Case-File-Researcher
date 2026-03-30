import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface LibraryFile {
  id: string;
  name: string;
  size: number;
  type: string;
  fileObj?: File;
}

export interface LibraryFolder {
  id: string;
  name: string;
  files: LibraryFile[];
}

const INITIAL_FOLDERS: LibraryFolder[] = [
  { id: '1', name: 'Corporate Litigation', files: [] },
  { id: '2', name: 'Intellectual Property', files: [] },
  { id: '3', name: 'Client Intake Docs', files: [] },
  { id: '4', name: 'Firm Archives', files: [] },
];

interface LibraryContextType {
  folders: LibraryFolder[];
  setFolders: React.Dispatch<React.SetStateAction<LibraryFolder[]>>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [folders, setFolders] = useState<LibraryFolder[]>(() => {
    const stored = localStorage.getItem('library-folders');
    return stored ? JSON.parse(stored) : INITIAL_FOLDERS;
  });

  useEffect(() => {
    localStorage.setItem('library-folders', JSON.stringify(folders));
  }, [folders]);

  return (
    <LibraryContext.Provider value={{ folders, setFolders }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (context === undefined) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
}
