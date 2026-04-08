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

let lineCounter = 0;
function makeLine(
  type: TerminalLine["type"],
  content: string,
  color?: string
): TerminalLine {
  return { id: `line-${++lineCounter}`, type, content, color };
}

function out(content: string, color?: string): TerminalLine {
  return makeLine("output", content, color);
}
function err(content: string): TerminalLine {
  return makeLine("error", content);
}
function sys(content: string, color?: string): TerminalLine {
  return makeLine("system", content, color);
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
}

export function processCommand(
  raw: string,
  state: TerminalState
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
      return { lines: [], clearScreen: true };

    case "VER":
      return {
        lines: [
          out(""),
          out("MS-DOS Version 6.22", "#00ff00"),
          out("Hacker Terminal v0.1 - UNAUTHORIZED BUILD", "#00ff00"),
          out(""),
        ],
      };

    case "HELP":
      return {
        lines: [
          out(""),
          out("Available commands:", "#00ff00"),
          out("  DIR [path]       - List directory contents"),
          out("  CD [path]        - Change directory"),
          out("  TYPE [file]      - View file contents"),
          out("  WRITE [file]     - Create or edit a file"),
          out("  MKDIR [dir]      - Create a new directory"),
          out("  SSH [host]       - Connect to a remote server"),
          out("  EXIT             - Disconnect from server"),
          out("  CLS              - Clear screen"),
          out("  VER              - Show version info"),
          out("  ECHO [text]      - Print text"),
          out("  WHOAMI           - Show current user"),
          out("  IPCONFIG         - Show network info"),
          out("  PING [host]      - Ping a host"),
          out(""),
          out("Tip: Use UP/DOWN arrows to navigate command history", "#888888"),
          out(""),
        ],
      };

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

      const lines: TerminalLine[] = [
        out(""),
        out(` Directory of ${pathToString(lookPath)}`, "#888888"),
        out(""),
      ];
      if (dirs.length === 0 && files.length === 0) {
        lines.push(out("  (empty)"));
      }
      for (const [name] of dirs) {
        lines.push(out(`  <DIR>          ${name}`, "#00aaff"));
      }
      for (const [name, n] of files) {
        const size = n.content ? n.content.length : 0;
        const sizeStr = String(size).padStart(10);
        lines.push(out(`  ${sizeStr} ${name}`));
      }
      lines.push(out(""));
      lines.push(
        out(
          `  ${dirs.length} Dir(s)   ${files.length} File(s)`,
          "#888888"
        )
      );
      lines.push(out(""));
      return { lines };
    }

    case "CD": {
      if (!args[0]) {
        return { lines: [out(pathToString(currentPath))] };
      }
      const target = args.join(" ");
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

    case "WRITE": {
      if (!args[0]) {
        return { lines: [err("Usage: WRITE <filename>")] };
      }
      const filename = args[0].toUpperCase();
      return {
        lines: [
          out(""),
          sys(`-- Write Mode: ${filename} --`, "#ffff00"),
          sys("Type your content. Enter a line with only '.' to save.", "#888888"),
          out(""),
        ],
        enterWriteMode: true,
        writeFileName: filename,
      };
    }

    case "MKDIR": {
      if (!args[0]) {
        return { lines: [err("Usage: MKDIR <directory>")] };
      }
      const dirname = args[0];
      const newFs = makeDirAtPath(fileSystem, currentPath, dirname);
      return {
        lines: [out(`Directory created: ${dirname.toUpperCase()}`)],
        newFs,
      };
    }

    case "ECHO": {
      return { lines: [out(args.join(" "))] };
    }

    case "WHOAMI": {
      if (isRemote) {
        return {
          lines: [out(`admin@${connectedServer!.hostname}`, "#00ff00")],
        };
      }
      return { lines: [out("user@HOME-PC", "#00ff00")] };
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
          out("Windows IP Configuration"),
          out(""),
          out("Ethernet adapter Local Area Connection:"),
          out("  IP Address. . . : 192.168.1.100"),
          out("  Subnet Mask . . : 255.255.255.0"),
          out("  Default Gateway : 192.168.1.1"),
          out(""),
          out("Known network hosts:"),
          out("  192.168.1.50  CORP-MAIN", "#00aaff"),
          out("  10.0.0.1      UNKNOWN", "#ffaa00"),
          out("  172.16.0.99   MIL-SEC-99", "#ff4444"),
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
        return {
          lines: [
            out(""),
            out(`Pinging ${host} [${s.ip}]:`),
            out(`Reply from ${s.ip}: bytes=32 time=47ms TTL=64`),
            out(`Reply from ${s.ip}: bytes=32 time=51ms TTL=64`),
            out(`Reply from ${s.ip}: bytes=32 time=44ms TTL=64`),
            out(`Reply from ${s.ip}: bytes=32 time=49ms TTL=64`),
            out(""),
            out(`Ping statistics for ${s.ip}:`, "#888888"),
            out(`  Packets: Sent=4, Received=4, Lost=0 (0% loss)`, "#888888"),
            out(""),
          ],
        };
      }
      return {
        lines: [
          out(""),
          out(`Pinging ${host}...`),
          out(`Request timeout for icmp_seq 0`),
          out(`Request timeout for icmp_seq 1`),
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

      if (server.requiresPassword) {
        return {
          lines: [
            out(""),
            sys(`Connecting to ${hostArg} (${server.ip})...`, "#888888"),
            sys(`Connection established.`, "#00ff00"),
            sys(server.motd, "#ffaa00"),
            sys(`Password: `, "#ffff00"),
          ],
          awaitingPassword: true,
          pendingServer: server,
        };
      }

      const startPath = Object.keys(server.fileSystem)[0];
      return {
        lines: [
          out(""),
          sys(`Connecting to ${hostArg} (${server.ip})...`, "#888888"),
          sys(`Connection established.`, "#00ff00"),
          sys(server.motd, "#ffaa00"),
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
          sys(`Disconnected from ${connectedServer!.hostname}`, "#888888"),
          out(""),
        ],
        newServer: null,
      };
    }

    default:
      return {
        lines: [
          err(`Bad command or file name: ${cmd}`),
        ],
      };
  }
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
        sys("Access granted.", "#00ff00"),
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
