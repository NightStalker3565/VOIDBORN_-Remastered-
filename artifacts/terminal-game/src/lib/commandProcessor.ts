import { TerminalLine, TerminalState, Server } from "../types/terminal";
import { FileSystem } from "../types/terminal";
import {
  getNodeAtPath,
  pathToString,
  resolvePath,
  setFileAtPath,
  makeDirAtPath,
} from "./fileSystemUtils";
import { SERVERS, IP_TO_SERVER, LOCAL_SERVER_ID } from "../data/servers";
import { C } from "./colors";
import { clearScreenDown } from "node:readline";
import { processBrainrotCommand } from "./brainrotCommands";

let lineCounter = 0;
function makeLine(
  type: TerminalLine["type"],
  content: string,
  color?: string
): TerminalLine {
  return { id: `line-${++lineCounter}`, type, content, color };
}

function out(content: string, color?: string): TerminalLine {
  return makeLine("output", content, color ?? C.WHITE);
}
function err(content: string): TerminalLine {
  return makeLine("error", content, C.RED);
}
function sys(content: string, color?: string): TerminalLine {
  return makeLine("system", content, color ?? C.CYAN);
}

function generatePatternLines(pattern: string, lineCount: number, lineLength: number, color?: string) {
  const row = Array.from({ length: lineLength }, (_, i) => pattern[i % pattern.length]).join("");
  return Array.from({ length: lineCount }, () => ({ text: row, color, charDelay: 0 }));
}

export interface CommandResult {
  lines: TerminalLine[];
  newPath?: string[];
  newServer?: Server | null;
  newFs?: FileSystem;
  enterWriteMode?: boolean;
  writeFileName?: string;
  clearScreen?: boolean;
  awaitingPassword?: boolean;
  pendingServer?: Server;
  typingSequence?: { text: string; color?: string; charDelay?: number; appendToPrev?: boolean }[];
  brainrotEnabled?: boolean;
}

export function processCommand(
  raw: string,
  state: TerminalState,
  terminalMetrics?: { cols: number; rows: number }
): CommandResult {
  const trimmed = raw.trim();
  if (!trimmed) return { lines: [] };

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toUpperCase();
  const args = parts.slice(1);

  const { currentPath, fileSystem, connectedServer } = state;
  const isRemote = !!connectedServer;
  const hostname = connectedServer ? connectedServer.hostname : "HOME-PC";

  switch (cmd) {
    case "CLS":
    case "CLEAR":
    case "CLR":
      return { lines: [], clearScreen: true };

    case "VER":
      return {
        lines: [
          out(""),
          out("MH-DOS Version 0.97", C.WHITE),
          out("Reborn Labs Employee Terminal OS V0.2 - AUTHORIZED SUB-BUILD", C.WHITE),
          out(""),
        ],
      };

    case "HELP": {
      const topic = args[0]?.toUpperCase();
      if (topic === "DIR") return { lines: [
        out(""),
        out("DIR [drive:][path][filename] [/P] [/W]", C.YELLOW),
        out(""),
        out("  Displays a list of files and subdirectories in a directory."),
        out("  /P  Pauses after each screenful of information."),
        out("  /W  Uses wide list format."),
        out(""),
      ]};
      if (topic === "COPY") return { lines: [
        out(""),
        out("COPY source destination", C.YELLOW),
        out(""),
        out("  Copies one or more files to another location."),
        out(""),
      ]};
      return {
        lines: [
          out(""),
          out("MH-DOS Commands:", C.YELLOW),
          out(""),
          out("  ATTRIB    Display or change file attributes"),
          out("  CD        Change the current directory"),
          out("  CHKDSK    Check a disk and display a status report"),
          out("  CLS       Clear the screen"),
          out("  COPY      Copy one or more files"),
          out("  DATE      Display or set the date"),
          out("  DEL       Delete one or more files"),
          out("  DELTREE   Delete a directory and all the files in it"),
          out("  DIR       Display a list of files and subdirectories"),
          out("  ECHO      Display messages"),
          out("  EDIT      Start the MH-DOS Editor"),
          out("  EXIT      Quit the SSH session and return to DOS"),
          out("  FIND      Search for a text string in a file"),
          out("  FORMAT    Format a disk (restricted)"),
          out("  HELP      Provide Help information for DOS commands"),
          out("  IPCONFIG  Display IP configuration"),
          out("  LABEL     Create, change, or delete the volume label"),
          out("  MD        Create a directory"),
          out("  MEM       Display amount of used and free memory"),
          out("  MKDIR     Create a directory"),
          out("  MORE      Display output one screen at a time"),
          out("  MOVE      Move one or more files"),
          out("  PATH      Display or set a search path for executable files"),
          out("  PING      Test network connection to a host"),
          out("  PROMPT    Change the command prompt"),
          out("  RD        Remove a directory"),
          out("  REN       Rename a file"),
          out("  RENAME    Rename a file"),
          out("  RMDIR     Remove a directory"),
          out("  SET       Display, set, or remove environment variables"),
          out("  SORT      Sort input"),
          out("  SSH       Connect to a remote server"),
          out("  TIME      Display or set the system time"),
          out("  TREE      Graphically display directory structure"),
          out("  TYPE      Display the contents of a text file"),
          out("  UNDELETE  Restore files that were deleted (restricted)"),
          out("  VER       Display the OS version"),
          out("  VOL       Display a disk volume label and serial number"),
          out("  WHOAMI    Display current user"),
          out("  WRITE     Create or edit a file"),
          out("  XCOPY     Copy files and directory trees"),
          out(""),
          out("For more info on a specific command, type HELP <command>", C.GREY),
          out("Tip: Use UP/DOWN arrows to navigate history", C.GREY),
          out(""),
        ],
      };
    }

    case "DIR": {
      const target = args[0];
      let lookPath = currentPath;
      if (target) {
        const resolved = resolvePath(currentPath, target, fileSystem);
        if (!resolved) return { lines: [err(`Invalid directory: ${target}`)] };
        lookPath = resolved;
      }
      const node = getNodeAtPath(fileSystem, lookPath);
      if (!node || node.type !== "dir") {
        return { lines: [err("Directory not found.")] };
      }
      const children = node.children || {};
      const entries = Object.entries(children);
      const dirs = entries.filter(([, n]) => n.type === "dir");
      const files = entries.filter(([, n]) => n.type === "file");

      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
      const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

      const lines: TerminalLine[] = [
        out(""),
        out(` Volume in drive C is MH-DOS`, C.GREY),
        out(` Directory of ${pathToString(lookPath)}`, C.GREY),
        out(""),
      ];
      if (dirs.length === 0 && files.length === 0) {
        lines.push(out("  (empty)"));
      }
      for (const [name] of dirs) {
        lines.push(out(`  ${dateStr}  ${timeStr}    <DIR>          ${name}`, C.BLUE));
      }
      for (const [name, n] of files) {
        const size = n.content ? n.content.length : 0;
        const sizeStr = String(size).padStart(10);
        lines.push(out(`  ${dateStr}  ${timeStr} ${sizeStr} ${name}`));
      }
      lines.push(out(""));
      const totalSize = files.reduce((s, [, n]) => s + (n.content?.length ?? 0), 0);
      lines.push(out(`  ${files.length} File(s)     ${totalSize} bytes`, C.GREY));
      lines.push(out(`  ${dirs.length} Dir(s)   512,000,000 bytes free`, C.GREY));
      lines.push(out(""));
      return { lines };
    }

    case "CD": {
      if (!args[0]) {
        return { lines: [out(pathToString(currentPath))] };
      }
      const target = args.join(" ");
      if (target === "..") {
        if (currentPath.length <= 1) return { lines: [] };
        return { lines: [], newPath: currentPath.slice(0, -1) };
      }
      const resolved = resolvePath(currentPath, target, fileSystem);
      if (!resolved) {
        return { lines: [err(`Invalid directory: ${target}`)] };
      }
      return { lines: [], newPath: resolved };
    }

    case "TYPE":
    case "CAT": {
      if (!args[0]) {
        return { lines: [err(`Usage: TYPE <filename>`)] };
      }
      const filename = args.join(" ").toUpperCase();
      const node = getNodeAtPath(fileSystem, currentPath);
      if (!node || node.type !== "dir" || !node.children) {
        return { lines: [err("Directory not found.")] };
      }
      const file = node.children[filename];
      if (!file) {
        return {
          lines: [err(`File not found - ${filename}`)],
        };
      }
      if (file.type !== "file") {
        return { lines: [err(`${filename} is a directory.`)] };
      }
      const contentLines = (file.content || "").split("\n").map((l) => out(l));
      return { lines: [out(""), ...contentLines, out("")] };
    }

    case "WRITE":
    case "EDIT": {
      if (!args[0]) {
        return { lines: [err(`Usage: ${cmd} <filename>`)] };
      }
      const filename = args[0].toUpperCase();
      return {
        lines: [
          out(""),
          sys(`-- Write Mode: ${filename} --`, C.YELLOW),
          sys("Type your content. Enter a line with only '.' to save.", C.GREY),
          out(""),
        ],
        enterWriteMode: true,
        writeFileName: filename,
      };
    }

    case "MKDIR":
    case "MD": {
      if (!args[0]) {
        return { lines: [err(`Usage: ${cmd} <directory>`)] };
      }
      const dirname = args[0];
      const newFs = makeDirAtPath(fileSystem, currentPath, dirname);
      return {
        lines: [out(`Directory created: ${dirname.toUpperCase()}`)],
        newFs,
      };
    }

    case "RD":
    case "RMDIR": {
      if (!args[0]) {
        return { lines: [err(`Usage: ${cmd} <directory>`)] };
      }
      const dirname = args[0].toUpperCase();
      const node = getNodeAtPath(fileSystem, currentPath);
      if (!node || node.type !== "dir" || !node.children) {
        return { lines: [err("Current directory not found.")] };
      }
      if (!node.children[dirname]) {
        return { lines: [err(`Directory not found - ${dirname}`)] };
      }
      if (node.children[dirname].type !== "dir") {
        return { lines: [err(`${dirname} is not a directory.`)] };
      }
      const kids = node.children[dirname].children || {};
      if (Object.keys(kids).length > 0) {
        return { lines: [err(`Directory is not empty - ${dirname}`), out("Use DELTREE to remove a non-empty directory.")] };
      }
      const newChildren = { ...node.children };
      delete newChildren[dirname];
      const newFs = setDirectoryChildren(fileSystem, currentPath, newChildren);
      return { lines: [out(`Directory removed: ${dirname}`)], newFs };
    }

    case "DEL":
    case "DELETE":
    case "ERASE": {
      if (!args[0]) {
        return { lines: [err(`Usage: ${cmd} <filename>`)] };
      }
      const filename = args[0].toUpperCase();
      const node = getNodeAtPath(fileSystem, currentPath);
      if (!node || node.type !== "dir" || !node.children) {
        return { lines: [err("Directory not found.")] };
      }
      if (!node.children[filename]) {
        return { lines: [err(`File not found - ${filename}`)] };
      }
      if (node.children[filename].type === "dir") {
        return { lines: [err(`${filename} is a directory. Use RD to remove directories.`)] };
      }
      const newChildren = { ...node.children };
      delete newChildren[filename];
      const newFs = setDirectoryChildren(fileSystem, currentPath, newChildren);
      return { lines: [out(`${filename} deleted.`)], newFs };
    }

    case "REN":
    case "RENAME": {
      if (args.length < 2) {
        return { lines: [err(`Usage: REN <source> <destination>`)] };
      }
      const srcName = args[0].toUpperCase();
      const dstName = args[1].toUpperCase();
      const node = getNodeAtPath(fileSystem, currentPath);
      if (!node || node.type !== "dir" || !node.children) {
        return { lines: [err("Directory not found.")] };
      }
      if (!node.children[srcName]) {
        return { lines: [err(`File not found - ${srcName}`)] };
      }
      if (node.children[dstName]) {
        return { lines: [err(`File already exists - ${dstName}`)] };
      }
      const newChildren = { ...node.children };
      newChildren[dstName] = newChildren[srcName];
      delete newChildren[srcName];
      const newFs = setDirectoryChildren(fileSystem, currentPath, newChildren);
      return { lines: [out(`${srcName} renamed to ${dstName}`)], newFs };
    }

    case "COPY":
    case "XCOPY": {
      if (args.length < 2) {
        return { lines: [err(`Usage: ${cmd} <source> <destination>`)] };
      }
      const srcName = args[0].toUpperCase();
      const dstName = args[1].toUpperCase();
      const node = getNodeAtPath(fileSystem, currentPath);
      if (!node || node.type !== "dir" || !node.children) {
        return { lines: [err("Directory not found.")] };
      }
      if (!node.children[srcName]) {
        return { lines: [err(`File not found - ${srcName}`)] };
      }
      if (node.children[srcName].type === "dir") {
        return { lines: [err(`${srcName} is a directory. Use XCOPY /S to copy directories.`)] };
      }
      const newChildren = { ...node.children };
      newChildren[dstName] = { ...newChildren[srcName] };
      const newFs = setDirectoryChildren(fileSystem, currentPath, newChildren);
      return { lines: [out(`1 file(s) copied.`)], newFs };
    }

    case "MOVE": {
      if (args.length < 2) {
        return { lines: [err("Usage: MOVE <source> <destination>")] };
      }
      const srcName = args[0].toUpperCase();
      const dstName = args[1].toUpperCase();
      const node = getNodeAtPath(fileSystem, currentPath);
      if (!node || node.type !== "dir" || !node.children) {
        return { lines: [err("Directory not found.")] };
      }
      if (!node.children[srcName]) {
        return { lines: [err(`File not found - ${srcName}`)] };
      }
      if (node.children[dstName]) {
        return { lines: [err(`File already exists - ${dstName}`)] };
      }
      const newChildren = { ...node.children };
      newChildren[dstName] = newChildren[srcName];
      delete newChildren[srcName];
      const newFs = setDirectoryChildren(fileSystem, currentPath, newChildren);
      return { lines: [out(`${srcName} moved to ${dstName}.`)], newFs };
    }

    case "DELTREE": {
      if (!args[0]) {
        return { lines: [err("Usage: DELTREE <directory>")] };
      }
      const dirname = args[0].toUpperCase();
      const node = getNodeAtPath(fileSystem, currentPath);
      if (!node || node.type !== "dir" || !node.children) {
        return { lines: [err("Directory not found.")] };
      }
      if (!node.children[dirname]) {
        return { lines: [err(`Directory not found - ${dirname}`)] };
      }
      if (node.children[dirname].type !== "dir") {
        return { lines: [err(`${dirname} is not a directory.`)] };
      }
      const newChildren = { ...node.children };
      delete newChildren[dirname];
      const newFs = setDirectoryChildren(fileSystem, currentPath, newChildren);
      return {
        lines: [
          out(`Delete directory "${dirname}" and all its subdirectories? [y/n] y`),
          out(`Deleting ${dirname}...`),
          out(`${dirname} deleted.`),
        ],
        newFs,
      };
    }

    case "UWU": {
      return {
        lines: [out("ayoooooo")],
      };
    }

    case "ATTRIB": {
      if (!args[0]) {
        const node = getNodeAtPath(fileSystem, currentPath);
        if (!node || node.type !== "dir" || !node.children) {
          return { lines: [err("Directory not found.")] };
        }
        const lines: TerminalLine[] = [out("")];
        for (const [name, n] of Object.entries(node.children)) {
          const attr = n.type === "dir" ? "     D " : "  A    ";
          lines.push(out(`${attr}  ${pathToString(currentPath)}\\${name}`));
        }
        lines.push(out(""));
        return { lines };
      }
      const filename = args[0].toUpperCase();
      return {
        lines: [
          out(""),
          out(`  A      ${pathToString(currentPath)}\\${filename}`),
          out(""),
        ],
      };
    }

    case "FIND": {
      if (args.length < 2) {
        return { lines: [err(`Usage: FIND "string" <filename>`)] };
      }
      const searchStr = args[0].replace(/^"|"$/g, "");
      const filename = args[1].toUpperCase();
      const node = getNodeAtPath(fileSystem, currentPath);
      if (!node || node.type !== "dir" || !node.children) {
        return { lines: [err("Directory not found.")] };
      }
      const file = node.children[filename];
      if (!file || file.type !== "file") {
        return { lines: [err(`File not found - ${filename}`)] };
      }
      const matchLines = (file.content || "")
        .split("\n")
        .filter((l) => l.toLowerCase().includes(searchStr.toLowerCase()));
      if (matchLines.length === 0) {
        return { lines: [out(""), out(`---------- ${filename}`), out(""), out("  (no matches found)")] };
      }
      return {
        lines: [
          out(""),
          out(`---------- ${filename}`),
          ...matchLines.map((l) => out(l, C.YELLOW)),
          out(""),
          out(`  ${matchLines.length} match(es) found.`, C.GREY),
          out(""),
        ],
      };
    }

    case "TREE": {
      function buildTree(node: ReturnType<typeof getNodeAtPath>, prefix: string, name: string): TerminalLine[] {
        const result: TerminalLine[] = [];
        if (!node || node.type !== "dir") return result;
        result.push(out(`${prefix}${name}`, C.BLUE));
        const children = Object.entries(node.children || {});
        children.forEach(([childName, childNode], i) => {
          const isLast = i === children.length - 1;
          const newPrefix = prefix + (isLast ? "    " : "|   ");
          const connector = isLast ? "\\---" : "+---";
          if (childNode.type === "dir") {
            result.push(...buildTree(childNode, newPrefix, `${connector}${childName}`));
          } else {
            result.push(out(`${newPrefix}${connector}${childName}`));
          }
        });
        return result;
      }
      const rootNode = getNodeAtPath(fileSystem, currentPath);
      const treeName = pathToString(currentPath);
      const treeLines = buildTree(rootNode, "", treeName);
      return { lines: [out(""), ...treeLines, out(""), out(`No subfolders exist`, C.GREY), out("")] };
    }

    case "VOL": {
      return {
        lines: [
          out(""),
          out(` Volume in drive C is MH-DOS`),
          out(` Volume Serial Number is 1994-0101`),
          out(""),
        ],
      };
    }

    case "LABEL": {
      return {
        lines: [
          out(""),
          out(" Volume in drive C is MH-DOS"),
          out(" Volume Serial Number is 1994-0101"),
          out(""),
          out("Access restricted. Label modification requires SYSOP privileges.", C.RED),
          out(""),
        ],
      };
    }

    case "DATE": {
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", {
        weekday: "short", month: "2-digit", day: "2-digit", year: "numeric"
      });
      return {
        lines: [
          out(""),
          out(`Current date is ${dateStr}`),
          out("Enter new date (MM-DD-YY): (press Enter to skip)"),
          out(""),
        ],
      };
    }

    case "TIME": {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
      });
      return {
        lines: [
          out(""),
          out(`Current time is ${timeStr}`),
          out("Enter new time: (press Enter to skip)"),
          out(""),
        ],
      };
    }

    case "MEM": {
      return {
        lines: [
          out(""),
          out("Memory Type       Total     Used     Free"),
          out("----------------  --------  -------  --------"),
          out("Conventional       640K      347K      293K"),
          out("Upper              155K      109K       46K"),
          out("Reserved           384K      384K        0K"),
          out("Extended (XMS)    7168K     2048K     5120K"),
          out("----------------  --------  -------  --------"),
          out("Total memory      8347K     2888K     5459K"),
          out(""),
          out("Total under 1 MB   795K      456K      339K"),
          out(""),
          out("Largest executable program size:  292K  (299,104 bytes)", C.GREY),
          out("Largest free upper memory block:   44K   (45,056 bytes)", C.GREY),
          out("MH-DOS is resident in the high memory area.", C.GREY),
          out(""),
        ],
      };
    }

    case "CHKDSK": {
      return {
        lines: [
          out(""),
          out("The type of the file system is MH-FAT16."),
          out(""),
          out(" Volume MH-DOS           created  01-01-1994 12:00a"),
          out(" Volume Serial Number is 1994-0101"),
          out(""),
          out("Windows is verifying files and folders..."),
          out("File and folder verification is complete."),
          out(""),
          out("  524,288,000 bytes total disk space"),
          out("    2,048,000 bytes in 3 directories"),
          out("   22,528,000 bytes in 14 user files"),
          out("  499,712,000 bytes available on disk"),
          out(""),
          out("        4,096 bytes in each allocation unit"),
          out("      128,000 total allocation units on disk"),
          out("      122,000 available allocation units"),
          out(""),
          out("      655,360 total bytes memory"),
          out("      299,104 bytes free"),
          out(""),
          out("CHKDSK found no problems.", C.GREEN),
          out(""),
        ],
      };
    }

    case "SET": {
      const hostname2 = isRemote ? connectedServer!.hostname : "HOME-PC";
      return {
        lines: [
          out(""),
          out(`COMSPEC=C:\\MH-DOS\\COMMAND.COM`),
          out(`HOSTNAME=${hostname2}`),
          out(`OS=MH-DOS`),
          out(`OSVERSION=0.97`),
          out(`PATH=C:\\MH-DOS;C:\\`),
          out(`PROMPT=$P$G`),
          out(`TEMP=C:\\TEMP`),
          out(`USER=${isRemote ? "admin" : "user"}`),
          out(""),
        ],
      };
    }

    case "PATH": {
      return {
        lines: [out("PATH=C:\\MH-DOS;C:\\")],
      };
    }

    case "PROMPT": {
      return { lines: [out("PROMPT has no effect in this shell.", C.GREY)] };
    }

    case "MORE": {
      return { lines: [out("Usage: TYPE <file> | MORE is not supported in this shell. Use TYPE directly.", C.GREY)] };
    }

    case "SORT": {
      return { lines: [out("SORT: Pipe operations are not supported in this shell.", C.GREY)] };
    }

    case "FORMAT": {
      const drive = args[0] ? args[0].toUpperCase() : "C:";
      if (drive === "C:" || drive === "C") {
        return {
          lines: [
            out(""),
            err("WARNING: Drive C is the system drive."),
            err("FORMAT aborted. Formatting the system drive is restricted."),
            out(""),
          ],
        };
      }
      return {
        lines: [
          out(""),
          err(`FORMAT: Drive ${drive} not found or access denied.`),
          out(""),
        ],
      };
    }

    case "UNDELETE": {
      return {
        lines: [
          out(""),
          out("UNDELETE - Restore deleted files", C.YELLOW),
          out(""),
          out("This feature requires SYSOP privileges.", C.RED),
          out("Contact your system administrator to restore deleted files."),
          out(""),
        ],
      };
    }

    case "FDISK": {
      return {
        lines: [
          out(""),
          err("FDISK: Access denied. Partition management requires SYSOP privileges."),
          out(""),
        ],
      };
    }

    case "DEFRAG": {
      return {
        lines: [
          out(""),
          out("Microsoft(R) Defrag", C.WHITE),
          out("Copyright (C) 1994 Macrohard Corp."),
          out(""),
          out("Analyzing drive C..."),
          out("Drive C is 2% fragmented."),
          out(""),
          out("It is not necessary to defragment this drive at this time.", C.GREY),
          out(""),
        ],
      };
    }

    case "SCANREG": {
      return {
        lines: [
          out(""),
          out("MH Registry Checker", C.WHITE),
          out("Scanning registry..."),
          out(""),
          out("Registry scan complete. No errors found.", C.GREEN),
          out(""),
        ],
      };
    }

    case "ECHO": {
      if (args.length === 0) return { lines: [out("ECHO is on.")] };
      return { lines: [out(args.join(" "))] };
    }

    case "WHOAMI": {
      if (isRemote) {
        return {
          lines: [out(`admin@${connectedServer!.hostname}`, C.WHITE)],
        };
      }
      return { lines: [out("user@HOME-PC", C.WHITE)] };
    }

    case "IPCONFIG": {
      if (isRemote) {
        return {
          lines: [
            out(""),
            out("Remote connection info:"),
            out(`  Host:     ${connectedServer!.hostname}`),
            out(`  IP Addr:  ${connectedServer!.ip}`),
            out(""),
          ],
        };
      }
      return {
        lines: [
          out(""),
          out("Binbows IP Configuration"),
          out(""),
          out("Ethernet adapter Local Area Connection:"),
          out("  IP Address. . . : 192.168.1.100"),
          out("  Subnet Mask . . : 255.255.255.0"),
          out("  Default Gateway : 192.168.1.1"),
          out(""),
          out("Known network hosts:"),
          out("  192.168.1.50  CORP-MAIN", C.BLUE),
          out("  10.0.0.1      UNKNOWN", C.ORANGE),
          out("  172.16.0.99   MIL-SEC-99", C.RED),
          out(""),
        ],
      };
    }

    case "PING": {
      if (!args[0]) {
        return { lines: [err("Usage: PING <host>")] };
      }
      const host = args[0];
      const serverId = IP_TO_SERVER[host] || IP_TO_SERVER[host.toUpperCase()];
      if (serverId) {
        const s = SERVERS[serverId];
        const times = [47, 51, 44, 49].map(() => 30 + Math.floor(Math.random() * 40));
        return {
          lines: [
            out(""),
            out(`Pinging ${host} [${s.ip}] with 32 bytes of data:`),
            out(`Reply from ${s.ip}: bytes=32 time=${times[0]}ms TTL=64`),
            out(`Reply from ${s.ip}: bytes=32 time=${times[1]}ms TTL=64`),
            out(`Reply from ${s.ip}: bytes=32 time=${times[2]}ms TTL=64`),
            out(`Reply from ${s.ip}: bytes=32 time=${times[3]}ms TTL=64`),
            out(""),
            out(`Ping statistics for ${s.ip}:`, C.GREY),
            out(`  Packets: Sent=4, Received=4, Lost=0 (0% loss)`, C.GREY),
            out(`Approximate round trip times in milli-seconds:`, C.GREY),
            out(`  Minimum=${Math.min(...times)}ms, Maximum=${Math.max(...times)}ms, Average=${Math.round(times.reduce((a, b) => a + b, 0) / times.length)}ms`, C.GREY),
            out(""),
          ],
        };
      }
      return {
        lines: [
          out(""),
          out(`Pinging ${host} with 32 bytes of data:`),
          out(`Request timed out.`),
          out(`Request timed out.`),
          out(`Request timed out.`),
          out(`Request timed out.`),
          out(""),
          out(`Ping statistics for ${host}:`, C.GREY),
          out(`  Packets: Sent=4, Received=0, Lost=4 (100% loss)`, C.GREY),
          out(""),
          err(`Destination host unreachable.`),
          out(""),
        ],
      };
    }

    case "SSH": {
      if (!args[0]) {
        return { lines: [err("Usage: SSH [user@]host")] };
      }
      const hostArg = args[0].includes("@") ? args[0].split("@")[1] : args[0];
      const serverId = IP_TO_SERVER[hostArg] || IP_TO_SERVER[hostArg.toUpperCase()];

      if (!serverId || serverId === LOCAL_SERVER_ID) {
        return {
          lines: [
            out(""),
            err(`ssh: connect to host ${hostArg}: Connection refused`),
            out(""),
          ],
        };
      }

      const server = SERVERS[serverId];
      if (!server) {
        return {
          lines: [
            out(""),
            err(`ssh: connect to host ${hostArg}: No route to host`),
            out(""),
          ],
        };
      }

      if (serverId === "rli-hub") { 
        return {
          lines: [],
          awaitingPassword: false,
          pendingServer: server,
          clearScreen: true,
          typingSequence: [
            { text: `Connecting to ${hostArg} (${server.ip})`, color: C.GREY, charDelay: 50 },
            { text: "...", color: C.GREY, charDelay: 1000, appendToPrev: true },
            { text: "Matching server ID detected on COM23.", color: C.GREY, charDelay: 75 },
            { text: "Forwarding connection attempt to COM23", color: C.GREY, charDelay: 50 },
            { text: "...", color: C.GREY, charDelay: 1000, appendToPrev: true },
            { text: "Attempting to connect to server", color: C.GREY, charDelay: 50 },
            { text: "...", color: C.GREY, charDelay: 1000, appendToPrev: true },
            { text: "Connection established.", color: C.WHITE, charDelay: 50 },
            { text: server.motd, color: C.ORANGE, charDelay: 20 },
            { text: `Password: `, color: C.YELLOW, charDelay: 50 },
          ],
        };
      }

      if (server.requiresPassword) {
        return {
          lines: [],
          awaitingPassword: true,
          pendingServer: server,
          clearScreen: true,
          typingSequence: [
            { text: "", color: C.WHITE },
            { text: `Connecting to ${hostArg} (${server.ip})...`, color: C.GREY, charDelay: 50 },
            { text: "Connection established.", color: C.WHITE, charDelay: 50 },
            { text: server.motd, color: C.ORANGE, charDelay: 20 },
            { text: `Password: `, color: C.YELLOW, charDelay: 50 },
          ],
        };
      }

      const startPath = Object.keys(server.fileSystem)[0];
      return {
        lines: [
          out(""),
          sys(`Connecting to ${hostArg} (${server.ip})...`, C.GREY),
          sys(`Connection established.`, C.WHITE),
          sys(server.motd, C.ORANGE),
        ],
        newServer: server,
        newPath: [startPath],
        newFs: server.fileSystem,
      };
    }

    case "EXIT":
    case "LOGOUT":
    case "DISCONNECT": {
      if (!isRemote) {
        return { lines: [out("Not connected to a remote server.")] };
      }
      return {
        lines: [
          out(""),
          sys(`Disconnected from ${connectedServer!.hostname}`, C.GREY),
          out(""),
        ],
        newServer: null,
      };
    }

    case "BRAINROT":
    case "BRAIN_ROT": {
      return {
        lines: [],
        clearScreen: false,
        typingSequence: [
          {
            text: "Brainrot mode enabled",
            color: C.GREY,
            charDelay: 30,
          },
        ],
        brainrotEnabled: true,
      };
    }

    default:
      // Check brainrot commands if enabled
      if (state.brainrotEnabled) {
        const brainrotResult = processBrainrotCommand(cmd, args, state, terminalMetrics);
        if (brainrotResult) return brainrotResult;
      }
      return {
        lines: [
          err(`Bad command or file name: ${cmd}`),
        ],
      };
  }
}

function setDirectoryChildren(
  fs: FileSystem,
  path: string[],
  newChildren: Record<string, FileSystem[string]>
): FileSystem {
  if (path.length === 1) {
    const root = path[0];
    return {
      ...fs,
      [root]: {
        ...fs[root],
        children: newChildren,
      },
    };
  }
  const [root, ...rest] = path;
  const rootNode = fs[root];
  if (!rootNode) return fs;

  function setChildren(
    node: FileSystem[string],
    segments: string[],
    children: Record<string, FileSystem[string]>
  ): FileSystem[string] {
    if (segments.length === 0) {
      return { ...node, children };
    }
    const [seg, ...remaining] = segments;
    const child = node.children?.[seg];
    if (!child) return node;
    return {
      ...node,
      children: {
        ...node.children,
        [seg]: setChildren(child, remaining, children),
      },
    };
  }

  return {
    ...fs,
    [root]: setChildren(rootNode, rest, newChildren),
  };
}

export function processPasswordInput(
  password: string,
  server: Server
): CommandResult & { authenticated: boolean } {
  const correct =
    !server.requiresPassword || password === server.password;

  if (correct) {
    const startPath = Object.keys(server.fileSystem)[0];
    return {
      authenticated: true,
      lines: [
        out(""),
        sys("Access granted.", C.WHITE),
        out(""),
      ],
      newServer: server,
      newPath: [startPath],
      newFs: server.fileSystem,
    };
  } else {
    return {
      authenticated: false,
      lines: [
        out(""),
        err("Access denied. Incorrect password."),
        out(""),
      ],
      newServer: null,
    };
  }
}
