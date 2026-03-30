import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Case, CaseFile, TEAM_MEMBERS } from '../types';

const STORAGE_KEY = 'case-file-researcher-data';

const INITIAL_CASES: Case[] = [
  {
    id: '1',
    name: 'Smith vs. Jones Corp',
    isTeamCase: false,
    files: [
      {
        id: 'f1',
        name: 'Initial_Complaint.pdf',
        extractedText: 'This is simulated extracted text from Initial_Complaint.pdf. The plaintiff alleges breach of contract...',
        uploadedAt: new Date().toISOString(),
      }
    ],
    folders: [],
    summary: '',
    sharedWith: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Tech Merger Due Diligence',
    isTeamCase: true,
    files: [],
    folders: [],
    summary: 'Summary of case based on 5 files. Key issues include IP ownership, employee contracts, and regulatory compliance.',
    sharedWith: ['Sarah Lee', 'Michael Chen'],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export function useCases() {
  const [cases, setCases] = useState<Case[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : INITIAL_CASES;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
  }, [cases]);

  const createCase = () => {
    const newCase: Case = {
      id: uuidv4(),
      name: 'Untitled Case',
      isTeamCase: false,
      files: [],
      folders: [],
      summary: '',
      sharedWith: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCases((prev) => [newCase, ...prev]);

    // Trigger webhook
    fetch('https://n8n.srv843245.hstgr.cloud/webhook-test/fc060245-260e-45f4-919f-be09e59c462b', {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(newCase),
    }).catch((err) => console.error('Webhook failed', err));

    return newCase.id;
  };

  const updateCase = (id: string, updates: Partial<Case>) => {
    setCases((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c))
    );
  };

  const deleteCase = (id: string) => {
    const caseToDelete = cases.find((c) => c.id === id);
    setCases((prev) => prev.filter((c) => c.id !== id));

    if (caseToDelete) {
      // Trigger webhook
      fetch('https://n8n.srv843245.hstgr.cloud/webhook-test/9cb0413d-d222-4a63-94b3-b5f19d009dcc', {
        method: 'POST',
        body: JSON.stringify({ id: caseToDelete.id, name: caseToDelete.name }),
      }).catch((err) => console.error('Webhook failed', err));
    }
  };

  const addFileToCase = async (caseId: string, file: File, folderName?: string) => {
    const newFile: CaseFile = {
      id: uuidv4(),
      name: file.name,
      extractedText: `This is simulated extracted text from ${file.name}.\n\nIt contains legal jargon, dates, and names relevant to the case. The document outlines specific clauses and liabilities that need to be reviewed carefully.`,
      uploadedAt: new Date().toISOString(),
      folderName,
    };

    setCases((prev) =>
      prev.map((c) =>
        c.id === caseId
          ? { ...c, files: [...c.files, newFile], updatedAt: new Date().toISOString() }
          : c
      )
    );

    try {
      const formData = new FormData();
      formData.append('case_id', caseId);
      formData.append('file', file);
      formData.append('folder_name', folderName || '');

      await fetch('https://n8n.srv843245.hstgr.cloud/webhook-test/5c041d26-96e3-4ede-8b68-e17702d10ff9', {
        method: 'POST',
        mode: 'no-cors',
        body: formData,
      });
      console.log('Upload file webhook sent (opaque response)');
    } catch (err) {
      console.error('Upload file webhook failed:', err);
    }
  };


  const addFolderToCase = async (caseId: string, folderName: string, files: File[], allFileNames?: string[]) => {
    const names = allFileNames && allFileNames.length > 0 ? allFileNames : files.map(f => f.name);

    const newFiles: CaseFile[] = names.map(name => ({
      id: uuidv4(),
      name: name,
      extractedText: `This is simulated extracted text from ${name}.\n\nIt contains legal jargon, dates, and names relevant to the case. The document outlines specific clauses and liabilities that need to be reviewed carefully.`,
      uploadedAt: new Date().toISOString(),
      folderName,
    }));

    setCases((prev) =>
      prev.map((c) =>
        c.id === caseId
          ? { 
              ...c, 
              files: [...c.files, ...newFiles], 
              folders: c.folders ? Array.from(new Set([...c.folders, folderName])) : [folderName],
              updatedAt: new Date().toISOString() 
            }
          : c
      )
    );

    try {
      const formData = new FormData();
      formData.append('case_id', caseId);
      formData.append('folderName', folderName);
      formData.append('fileNames', JSON.stringify(names)); // Send file names explicitly
      
      files.forEach(file => {
        formData.append('data', file);
      });

      await fetch('https://n8n.srv843245.hstgr.cloud/webhook-test/3abee1a7-b75e-4f0d-b3ab-e76f7d00437a', {
        method: 'POST',
        mode: 'no-cors',
        body: formData,
      });
      console.log('Upload folder webhook sent (opaque response)');
    } catch (err) {
      console.error('Upload folder webhook failed:', err);
    }
  };

  const removeFolderFromCase = (caseId: string, folderName: string) => {
    setCases((prev) =>
      prev.map((c) =>
        c.id === caseId
          ? {
              ...c,
              folders: c.folders?.filter((f) => f !== folderName),
              files: c.files.filter((f) => f.folderName !== folderName),
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );
  };

  const removeFileFromCase = (caseId: string, fileId: string, fileName?: string, folderName?: string) => {
    setCases((prev) =>
      prev.map((c) =>
        c.id === caseId
          ? {
              ...c,
              files: c.files.filter((f) => {
                if (f.id === fileId) return false;
                if (fileName && f.name === fileName) {
                  // If folderName is provided, only remove if it matches
                  if (folderName && f.folderName === folderName) return false;
                  // If folderName is not provided but the file has one, don't remove it
                  if (!folderName && !f.folderName) return false;
                }
                return true;
              }),
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );
  };

  const generateSummary = async (caseId: string): Promise<void> => {
    const targetCase = cases.find((c) => c.id === caseId);
    if (!targetCase) return;

    try {
      const response = await fetch('https://n8n.srv843245.hstgr.cloud/webhook-test/9934d87c-4a16-4d6d-a0eb-685eca7ba81f', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caseId: targetCase.id,
          caseName: targetCase.name,
          fileCount: targetCase.files.length,
          namespace: targetCase.folders && targetCase.folders.length > 0 ? targetCase.folders.join(', ') : '',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Try to find the summary text in common n8n output fields
      const summary = data.summary || data.output || data.text || (typeof data === 'string' ? data : JSON.stringify(data));

      updateCase(caseId, { summary });
    } catch (error) {
      console.error('Generate summary webhook failed:', error);
      // Fallback to simulated summary if webhook fails
      const fileCount = targetCase.files.length;
      const fallbackSummary = `(Offline Mode) Summary of case based on ${fileCount} files. Key issues include legal dispute, liability considerations, and timeline review. The documents suggest a strong position on contract breach but potential exposure on procedural grounds.`;
      updateCase(caseId, { summary: fallbackSummary });
    }
  };

  const shareCase = (caseId: string, memberNames: string[]) => {
    updateCase(caseId, {
      sharedWith: memberNames,
      isTeamCase: memberNames.length > 0,
    });
  };

  const getCase = (id: string) => cases.find((c) => c.id === id);

  return {
    cases,
    createCase,
    updateCase,
    deleteCase,
    addFileToCase,
    addFolderToCase,
    removeFolderFromCase,
    removeFileFromCase,
    generateSummary,
    shareCase,
    getCase,
  };
}