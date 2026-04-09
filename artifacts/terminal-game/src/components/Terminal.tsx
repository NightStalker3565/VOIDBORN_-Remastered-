import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";
import { TerminalLine, TerminalState, Server } from "../types/terminal";
import { processCommand, processPasswordInput } from "../lib/commandProcessor";
import { pathToString, setFileAtPath } from "../lib/fileSystemUtils";
import { SERVERS, LOCAL_SERVER_ID } from "../data/servers";
import { C } from "../lib/colors";

// A boot line is either:
//   - a plain string "" or "__CLEAR__" for spacing / clear
//   - { text, color, charDelay? }
//       charDelay = ms between each character (default 18)
//       set charDelay: 3 for ASCII art so it sweeps in fast
type BootLine = string | { text: string; color: string; charDelay?: number };

const CHAR_DELAY_DEFAULT = 18; // ms per character for normal text
const CHAR_DELAY_ART     = 3;  // ms per character for ASCII art
const LINE_GAP           = 60; // ms added after each line finishes

const BOOT_SEQUENCE: BootLine[] = [
  { text: "MH-DOS Version 0.97",                               color: C.WHITE },
  { text: "Copyright (C) Macrohard 1994. All rights reserved.", color: C.WHITE  },
  { text: "Starting MH-DOS...",                                color: C.WHITE },
  { text: "...", color: C.WHITE, charDelay: 1000},
  { text: "Initiating CtrlOpus...",                            color: C.WHITE  },
  { text: "Running OpusBoot...",                            color: C.WHITE  },
  "__CLEAR__",
  { text: "  ____  _____ ____ ___ ____ _____ _   _ ",          color: C.WHITE, charDelay: 300 },
  { text: " |  _ \\| ____| __ )_ _|  _ \\_   _| | | |",        color: C.WHITE, charDelay: 300 },
  { text: " | |_) |  _| |  _ \\| || |_) || | | |_| |",         color: C.WHITE, charDelay: 300 },
  { text: " |  _ <| |___| |_) | ||  _ < | | |  _  |",         color: C.WHITE, charDelay: 300 },
  { text: " |_| \\_\\_____|____/___|_| \\_\\|_| |_| |_|",        color: C.WHITE, charDelay: 300 },
  { text: "  _        _     ____  ____  ",                     color: C.WHITE, charDelay: 300 },
  { text: " | |      / \\   | __ )/ ___| ",                     color: C.WHITE, charDelay: 300 },
  { text: " | |     / _ \\  |  _ \\___ \\ ",                     color: C.WHITE, charDelay: 300 },
  { text: " | |___ / ___ \\ | |_) |___) |",                    color: C.WHITE, charDelay: 300 },
  { text: " |_____/_/   \\_\\|____/|____/ ",                     color: C.WHITE, charDelay: 300 },
  "",
  "__CLEAR__",
  { text: "Type HELP for available commands.",                  color: C.WHITE  },
];

function generateId() {
  return Math.random().toString(36).slice(2);
}

function makeLine(
  type: TerminalLine["type"],
  content: string,
  color?: string,
): TerminalLine {
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
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let delay = 0;

    for (const entry of BOOT_SEQUENCE) {
      const isStr   = typeof entry === "string";
      const text    = isStr ? entry : entry.text;
      const color   = isStr ? C.WHITE : entry.color;
      const cDelay  = isStr ? CHAR_DELAY_DEFAULT : (entry.charDelay ?? CHAR_DELAY_DEFAULT);

      if (text === "__CLEAR__") {
        timeouts.push(setTimeout(() => {
          setState((prev) => ({ ...prev, lines: [] }));
        }, delay));
        delay += 80;
        continue;
      }

      if (text === "") {
        timeouts.push(setTimeout(() => {
          setState((prev) => ({
            ...prev,
            lines: [...prev.lines, makeLine("system", "", color)],
          }));
        }, delay));
        delay += 30;
        continue;
      }

      // Push an empty line first, then fill it character by character
      timeouts.push(setTimeout(() => {
        setState((prev) => ({
          ...prev,
          lines: [...prev.lines, makeLine("system", "", color)],
        }));
      }, delay));

      for (let i = 1; i <= text.length; i++) {
        const partial = text.slice(0, i);
        timeouts.push(setTimeout(() => {
          setState((prev) => {
            const lines = [...prev.lines];
            const last  = lines[lines.length - 1];
            if (last) lines[lines.length - 1] = { ...last, content: partial };
            return { ...prev, lines };
          });
        }, delay + i * cDelay));
      }

      delay += text.length * cDelay + LINE_GAP;
    }

    timeouts.push(setTimeout(() => {
      setBooted(true);
      inputRef.current?.focus();
    }, delay + 100));

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

  const submitCommand = useCallback(
    (inputValue: string) => {
      const prompt = getPrompt();
      const echoLine = makeLine("input", `${prompt}${inputValue}`);

      if (state.isWriteMode) {
        if (inputValue.trim() === ".") {
          const content = writeLines.join("\n");
          const updatedFs = setFileAtPath(
            state.fileSystem,
            state.currentPath,
            state.writeFileName,
            content,
          );
          setState((prev) => ({
            ...prev,
            lines: [
              ...prev.lines,
              echoLine,
              makeLine("system", `File saved: ${prev.writeFileName}`, C.WHITE),
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
          history: inputValue.trim()
            ? [inputValue, ...prev.history.slice(0, 99)]
            : prev.history,
          historyIndex: -1,
          isWriteMode: result.enterWriteMode ?? false,
          writeFileName: result.writeFileName ?? "",
          writeContent: "",
        };
      });
    },
    [state, awaitingPassword, pendingServer, writeLines, getPrompt],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        submitCommand(state.currentInput);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setState((prev) => {
          const newIndex = Math.min(
            prev.historyIndex + 1,
            prev.history.length - 1,
          );
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
            currentInput: newIndex === -1 ? "" : (prev.history[newIndex] ?? ""),
          };
        });
      } else if (e.key === "Tab") {
        e.preventDefault();
      }
    },
    [state.currentInput, submitCommand],
  );

  const getLineColor = (line: TerminalLine): string => {
    // Explicit color always wins
    if (line.color) return line.color;
    // Type-based fallbacks
    switch (line.type) {
      case "error":  return C.RED;
      case "input":  return C.WHITE;
      case "prompt": return C.WHITE;
      default:       return C.WHITE;
    }
  };

  const prompt = getPrompt();
  const displayInput = awaitingPassword
    ? "*".repeat(state.currentInput.length)
    : state.currentInput;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-black font-mono text-sm flex flex-col p-2 cursor-text"
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
          <div
            className="leading-5 flex items-center"
            style={{ color: C.WHITE }}
          >
            <span style={{ color: state.isWriteMode ? C.YELLOW : C.WHITE }}>
              {state.isWriteMode ? "[WRITE] " : prompt}
            </span>
            <span>{displayInput}</span>
            <span
              className="inline-block w-2 h-4 ml-0.5"
              style={{
                backgroundColor: cursorBlink ? C.WHITE : "transparent",
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
        onChange={(e) =>
          setState((prev) => ({
            ...prev,
            currentInput: e.target.value,
            historyIndex: -1,
          }))
        }
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
        style={{ color: C.GREY }}
      >
        <span>
          {state.connectedServer
            ? `SSH: ${state.connectedServer.hostname} (${state.connectedServer.ip})`
            : "LOCAL: HOME-PC"}
        </span>
        <span>
          {pathToString(state.currentPath)}
          {state.isWriteMode && (
            <span style={{ color: C.YELLOW }}>
              {" "}
              [WRITE MODE - type . to save]
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
