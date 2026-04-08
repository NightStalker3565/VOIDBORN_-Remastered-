export interface FileSystemNode {
  type: "file" | "dir";
  content?: string;
  children?: Record<string, FileSystemNode>;
}

export interface FileSystem {
  [key: string]: FileSystemNode;
}

export interface Server {
  id: string;
  hostname: string;
  ip: string;
  description: string;
  motd: string;
  fileSystem: FileSystem;
  requiresPassword?: boolean;
  password?: string;
}

export interface TerminalLine {
  id: string;
  type: "input" | "output" | "error" | "system" | "prompt";
  content: string;
  color?: string;
}

export interface TerminalState {
  lines: TerminalLine[];
  currentInput: string;
  currentPath: string[];
  connectedServer: Server | null;
  fileSystem: FileSystem;
  history: string[];
  historyIndex: number;
  isWriteMode: boolean;
  writeFileName: string;
  writeContent: string;
}
