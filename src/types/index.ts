export interface CaseFile {
  id: string;
  name: string;
  extractedText: string;
  uploadedAt: string;
  folderName?: string;
}

export interface Case {
  id: string;
  name: string;
  isTeamCase: boolean;
  files: CaseFile[];
  folders?: string[];
  summary: string;
  sharedWith: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const TEAM_MEMBERS = [
  { id: '1', name: 'John Smith' },
  { id: '2', name: 'Sarah Lee' },
  { id: '3', name: 'Michael Chen' },
];
