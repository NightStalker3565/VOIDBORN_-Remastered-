import { FileSystem, FileSystemNode } from "../types/terminal";

export function getNodeAtPath(fs: FileSystem, path: string[]): FileSystemNode | null {
  if (path.length === 0) return null;

  const root = path[0];
  let node: FileSystemNode | undefined = fs[root];
  if (!node) return null;

  for (let i = 1; i < path.length; i++) {
    if (node.type !== "dir" || !node.children) return null;
    node = node.children[path[i]];
    if (!node) return null;
  }

  return node;
}

export function pathToString(path: string[]): string {
  if (path.length === 0) return "C:\\";
  if (path.length === 1) return path[0] + "\\";
  return path.join("\\");
}

export function resolvePath(currentPath: string[], input: string, fs: FileSystem): string[] | null {
  if (!input || input === ".") return currentPath;
  if (input === "\\") return [currentPath[0]];

  let parts: string[];
  let basePath: string[];

  if (input.includes(":") || input.startsWith("~")) {
    if (input === "~" || input === "~/") return ["~"];
    parts = input.replace(/\//g, "\\").split("\\").filter(Boolean);
    basePath = [];
  } else if (input.startsWith("\\")) {
    parts = input.replace(/\//g, "\\").split("\\").filter(Boolean);
    basePath = [currentPath[0]];
  } else {
    parts = input.replace(/\//g, "\\").split("\\").filter(Boolean);
    basePath = [...currentPath];
  }

  const newPath = [...basePath];
  for (const part of parts) {
    if (part === "..") {
      if (newPath.length > 1) newPath.pop();
    } else if (part !== ".") {
      newPath.push(part.toUpperCase());
    }
  }

  const node = getNodeAtPath(fs, newPath);
  if (!node || node.type !== "dir") return null;
  return newPath;
}

export function setFileAtPath(
  fs: FileSystem,
  path: string[],
  filename: string,
  content: string
): FileSystem {
  const newFs = deepCloneFs(fs);
  const node = getNodeAtPath(newFs, path);
  if (!node || node.type !== "dir") return fs;
  if (!node.children) node.children = {};
  node.children[filename.toUpperCase()] = { type: "file", content };
  return newFs;
}

export function makeDirAtPath(
  fs: FileSystem,
  path: string[],
  dirname: string
): FileSystem {
  const newFs = deepCloneFs(fs);
  const node = getNodeAtPath(newFs, path);
  if (!node || node.type !== "dir") return fs;
  if (!node.children) node.children = {};
  const upper = dirname.toUpperCase();
  if (!node.children[upper]) {
    node.children[upper] = { type: "dir", children: {} };
  }
  return newFs;
}

function deepCloneFs(fs: FileSystem): FileSystem {
  return JSON.parse(JSON.stringify(fs));
}
