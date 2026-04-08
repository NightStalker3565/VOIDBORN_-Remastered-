import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";
import { TerminalLine, TerminalState, Server } from "../types/terminal";
import { processCommand, processPasswordInput } from "../lib/commandProcessor";
import { pathToString, setFileAtPath } from "../lib/fileSystemUtils";
import { SERVERS, LOCAL_SERVER_ID } from "../data/servers";

const BOOT_SEQUENCE = [
  "MS-DOS Version 6.22",
  "Copyright (C) MegaCorp 1994. All rights reserved.",
  "",
  "HIMEM is testing extended memory...done.",
  "C:\\WINDOWS\\HIMEM.SYS loaded.",
  "",
  "Starting MS-DOS...",
  "",
  "Loading HACKER.SYS...",
  "Loading NETWORK.DRV...",
  "Loading SSH.COM...",
  "",
  "C:\\> AUTOEXEC.BAT executing...",
  "  PATH=C:\\DOS;C:\\TOOLS",
  "  BLASTER=A220 I7 D1",
  "",
  'Type HELP for available commands.',
  "",
];

function generateId() {
  return Math.random().toString(36).slice(2);
}

function makeLine(type: TerminalLine["type"], content: string, color?: string): TerminalLine {
  return { id: generateId(), type, content, color };
}

const localServer = SERVERS[LOCAL_SERVER_ID];

const initialState: TerminalState = {
  lines: [],
  currentInput: "",
  currentPath: ["C:"],
  connectedServer: null,
  fileSystem: localServer.fileSystem,
  history: [],
  historyIndex: -1,
  isWriteMode: false,
  writeFileName: "",
  writeContent: "",
};

export default function Terminal() {
  const [state, setState] = useState<TerminalState>(initialState);
  const [booted, setBooted] = useState(false);
  const [awaitingPassword, setAwaitingPassword] = useState(false);
  const [pendingServer, setPendingServer] = useState<Server | null>(null);
  const [writeLines, setWriteLines] = useState<string[]>([]);
  const [cursorBlink, setCursorBlink] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setCursorBlink((b) => !b), 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.lines, state.currentInput]);

  useEffect(() => {
    let timeouts: ReturnType<typeof setTimeout>[] = [];
    let delay = 0;

    for (const line of BOOT_SEQUENCE) {
      const t = setTimeout(() => {
        setState((prev) => ({
          ...prev,
          lines: [
            ...prev.lines,
            makeLine("system", line, line.startsWith("Loading") ? "#00ff00" : line.startsWith("  ") ? "#888888" : undefined),
          ],
        }));
      }, delay);
      timeouts.push(t);
      delay += line === "" ? 30 : 40;
    }

    const doneTimeout = setTimeout(() => {
      setBooted(true);
      inputRef.current?.focus();
    }, delay + 100);
    timeouts.push(doneTimeout);

    return () => timeouts.forEach(clearTimeout);
  }, []);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const getPrompt = useCallback((): string => {
    const { connectedServer, currentPath } = state;
    if (connectedServer) {
      return `${connectedServer.hostname.toLowerCase()}:${pathToString(currentPath)}> `;
    }
    return `${pathToString(currentPath)}> `;
  }, [state]);

  const submitCommand = useCallback((inputValue: string) => {
    const prompt = getPrompt();
    const echoLine = makeLine("input", `${prompt}${inputValue}`);

    if (state.isWriteMode) {
      if (inputValue.trim() === ".") {
        const content = writeLines.join("\n");
        const updatedFs = setFileAtPath(state.fileSystem, state.currentPath, state.writeFileName, content);
        setState((prev) => ({
          ...prev,
          lines: [
            ...prev.lines,
            echoLine,
            makeLine("system", `File saved: ${prev.writeFileName}`, "#00ff00"),
            makeLine("output", ""),
          ],
          currentInput: "",
          isWriteMode: false,
          writeFileName: "",
          writeContent: "",
          fileSystem: updatedFs,
          history: [inputValue, ...prev.history.slice(0, 99)],
          historyIndex: -1,
        }));
        setWriteLines([]);
      } else {
        setWriteLines((prev) => [...prev, inputValue]);
        setState((prev) => ({
          ...prev,
          lines: [...prev.lines, echoLine],
          currentInput: "",
          historyIndex: -1,
        }));
      }
      return;
    }

    if (awaitingPassword && pendingServer) {
      const result = processPasswordInput(inputValue, pendingServer);
      const newLines = [...state.lines, echoLine, ...result.lines];

      if (result.authenticated) {
        setAwaitingPassword(false);
        setPendingServer(null);
        setState((prev) => ({
          ...prev,
          lines: newLines,
          currentInput: "",
          connectedServer: result.newServer ?? null,
          currentPath: result.newPath ?? prev.currentPath,
          fileSystem: result.newFs ?? prev.fileSystem,
          historyIndex: -1,
        }));
      } else {
        setAwaitingPassword(false);
        setPendingServer(null);
        setState((prev) => ({
          ...prev,
          lines: newLines,
          currentInput: "",
          historyIndex: -1,
        }));
      }
      return;
    }

    if (!inputValue.trim()) {
      setState((prev) => ({
        ...prev,
        lines: [...prev.lines, echoLine],
        currentInput: "",
        historyIndex: -1,
      }));
      return;
    }

    const result = processCommand(inputValue, state);

    setState((prev) => {
      let newLines: TerminalLine[];
      if (result.clearScreen) {
        newLines = [];
      } else {
        newLines = [...prev.lines, echoLine, ...result.lines];
      }

      let newConnectedServer = prev.connectedServer;
      let newPath = result.newPath ?? prev.currentPath;
      let newFs = result.newFs ?? prev.fileSystem;

      if (result.awaitingPassword && result.pendingServer) {
        setAwaitingPassword(true);
        setPendingServer(result.pendingServer);
      } else if ("newServer" in result) {
        const srv = result.newServer ?? null;
        if (srv === null) {
          newConnectedServer = null;
          newPath = ["C:"];
          newFs = localServer.fileSystem;
        } else {
          newConnectedServer = srv;
        }
      }

      return {
        ...prev,
        lines: newLines,
        currentInput: "",
        currentPath: newPath,
        connectedServer: newConnectedServer,
        fileSystem: newFs,
        history: inputValue.trim() ? [inputValue, ...prev.history.slice(0, 99)] : prev.history,
        historyIndex: -1,
        isWriteMode: result.enterWriteMode ?? false,
        writeFileName: result.writeFileName ?? "",
        writeContent: "",
      };
    });
  }, [state, awaitingPassword, pendingServer, writeLines, getPrompt]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      submitCommand(state.currentInput);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setState((prev) => {
        const newIndex = Math.min(prev.historyIndex + 1, prev.history.length - 1);
        return {
          ...prev,
          historyIndex: newIndex,
          currentInput: prev.history[newIndex] ?? "",
        };
      });
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setState((prev) => {
        const newIndex = Math.max(prev.historyIndex - 1, -1);
        return {
          ...prev,
          historyIndex: newIndex,
          currentInput: newIndex === -1 ? "" : prev.history[newIndex] ?? "",
        };
      });
    } else if (e.key === "Tab") {
      e.preventDefault();
    }
  }, [state.currentInput, submitCommand]);

  const getLineColor = (line: TerminalLine): string => {
    if (line.color) return line.color;
    switch (line.type) {
      case "error": return "#ff4444";
      case "system": return "#00aaff";
      case "input": return "#ffffff";
      case "prompt": return "#00ff00";
      default: return "#cccccc";
    }
  };

  const prompt = getPrompt();
  const displayInput = awaitingPassword
    ? "*".repeat(state.currentInput.length)
    : state.currentInput;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-black text-green-400 font-mono text-sm flex flex-col p-2 cursor-text"
      onClick={focusInput}
      style={{ fontFamily: "'Courier New', Courier, monospace" }}
    >
      <div className="flex-1 overflow-y-auto">
        {state.lines.map((line) => (
          <div
            key={line.id}
            className="leading-5 whitespace-pre-wrap break-words"
            style={{ color: getLineColor(line) }}
          >
            {line.content || "\u00A0"}
          </div>
        ))}

        {booted && (
          <div className="leading-5 flex items-center" style={{ color: "#cccccc" }}>
            <span style={{ color: state.isWriteMode ? "#ffff00" : "#00ff00" }}>
              {state.isWriteMode ? "[WRITE] " : prompt}
            </span>
            <span>{displayInput}</span>
            <span
              className="inline-block w-2 h-4 ml-0.5"
              style={{
                backgroundColor: cursorBlink ? "#00ff00" : "transparent",
              }}
            />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <input
        ref={inputRef}
        type="text"
        value={state.currentInput}
        onChange={(e) => setState((prev) => ({ ...prev, currentInput: e.target.value, historyIndex: -1 }))}
        onKeyDown={handleKeyDown}
        className="opacity-0 absolute -left-9999 w-0 h-0"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="Terminal input"
      />

      <div
        className="mt-2 pt-2 border-t border-gray-800 text-xs flex justify-between"
        style={{ color: "#444" }}
      >
        <span>
          {state.connectedServer
            ? `SSH: ${state.connectedServer.hostname} (${state.connectedServer.ip})`
            : "LOCAL: HOME-PC"}
        </span>
        <span>
          {pathToString(state.currentPath)}
          {state.isWriteMode && <span style={{ color: "#ffff00" }}> [WRITE MODE - type . to save]</span>}
        </span>
      </div>
    </div>
  );
}
