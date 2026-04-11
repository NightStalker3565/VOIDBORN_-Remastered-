import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";
import { TerminalLine, TerminalState, Server } from "../types/terminal";
import { processCommand, processPasswordInput } from "../lib/commandProcessor";
import { pathToString, setFileAtPath } from "../lib/fileSystemUtils";
import { SERVERS, LOCAL_SERVER_ID } from "../data/servers";
import { C } from "../lib/colors";
import { SFX } from "../lib/sounds";

type BootLine = string | { text: string; color: string; charDelay?: number };

const CHAR_DELAY_DEFAULT = 18;
const LINE_GAP           = 60;

const BOOT_SEQUENCE: BootLine[] = [
  { text: "MH-DOS Version 0.97",                               color: C.WHITE },
  { text: "Copyright (C) Macrohard 1994. All rights reserved.", color: C.WHITE },
  { text: "Starting MH-DOS...",                                color: C.WHITE },
  { text: "...",                                               color: C.WHITE, charDelay: 1000 },
  { text: "Initiating CtrlOpus...",                            color: C.WHITE },
  { text: "Running OpusBoot...",                               color: C.WHITE },
  "__CLEAR__",
  { text: "  ____  _____ ____ ___ ____ _____ _   _ ",          color: C.WHITE, charDelay: 12 },
  { text: " |  _ \\| ____| __ )_ _|  _ \\_   _| | | |",        color: C.WHITE, charDelay: 12 },
  { text: " | |_) |  _| |  _ \\| || |_) || | | |_| |",         color: C.WHITE, charDelay: 12 },
  { text: " |  _ <| |___| |_) | ||  _ < | | |  _  |",         color: C.WHITE, charDelay: 12 },
  { text: " |_| \\_\\_____|____/___|_| \\_\\|_| |_| |_|",        color: C.WHITE, charDelay: 12 },
  { text: "  _        _     ____  ____  ",                     color: C.WHITE, charDelay: 12 },
  { text: " | |      / \\   | __ )/ ___| ",                     color: C.WHITE, charDelay: 12 },
  { text: " | |     / _ \\  |  _ \\___ \\ ",                     color: C.WHITE, charDelay: 12 },
  { text: " | |___ / ___ \\ | |_) |___) |",                    color: C.WHITE, charDelay: 12 },
  { text: " |_____/_/   \\_\\|____/|____/ ",                     color: C.WHITE, charDelay: 12 },
  "",
  "__CLEAR__",
  { text: "Type HELP for available commands.",                  color: C.WHITE },
];

const RETURN_BOOT_SEQUENCE: BootLine[] = [
  { text: "Welcome back.",                   color: C.GREEN },
  { text: "Type HELP for available commands.", color: C.WHITE },
  "",
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

// Delay between each output line appearing (ms) — gives the "slow drip" effect
const OUTPUT_LINE_DELAY = 28;

export default function Terminal() {
  const [state, setState] = useState<TerminalState>(initialState);
  const [booted, setBooted] = useState(false);
  const [awaitingPassword, setAwaitingPassword] = useState(false);
  const [pendingServer, setPendingServer] = useState<Server | null>(null);
  const [writeLines, setWriteLines] = useState<string[]>([]);
  const [cursorBlink, setCursorBlink] = useState(true);
  const [commandSequence, setCommandSequence] = useState<{ text: string; color?: string; charDelay?: number }[] | null>(null);
  const [cursorPos, setCursorPos] = useState(0);
  const [zoomOut, setZoomOut] = useState(false);

  // Queue of lines to drip-print into state.lines one at a time
  const [outputQueue, setOutputQueue] = useState<TerminalLine[]>([]);
  const outputQueueRef = useRef<TerminalLine[]>([]);
  const outputTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zoomRestoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cursor blink
  useEffect(() => {
    const interval = setInterval(() => setCursorBlink((b) => !b), 530);
    return () => clearInterval(interval);
  }, []);

  // Reset blink when cursor moves (so it stays solid briefly after moving)
  const resetBlink = useCallback(() => {
    setCursorBlink(true);
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.lines, state.currentInput, outputQueue]);

  // Boot sequence
  useEffect(() => {
    const isReturning = localStorage.getItem("mhdos_played") === "true";
    const sequence = isReturning ? RETURN_BOOT_SEQUENCE : BOOT_SEQUENCE;

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let delay = 0;
    let clearedOnce = false;

    timeouts.push(setTimeout(() => SFX.powerOn(), 0));

    for (const entry of sequence) {
      const isStr   = typeof entry === "string";
      const text    = isStr ? entry : entry.text;
      const color   = isStr ? C.WHITE : entry.color;
      const cDelay  = isStr ? CHAR_DELAY_DEFAULT : (entry.charDelay ?? CHAR_DELAY_DEFAULT);

      if (text === "__CLEAR__") {
        timeouts.push(setTimeout(() => {
          setState((prev) => ({ ...prev, lines: [] }));
          if (!clearedOnce) { SFX.systemLoading(); clearedOnce = true; }
        }, delay));
        delay += 80;
        continue;
      }

      if (text === "" || cDelay === 0) {
        timeouts.push(setTimeout(() => {
          setState((prev) => ({
            ...prev,
            lines: [...prev.lines, makeLine("system", text, color)],
          }));
        }, delay));
        delay += cDelay === 0 ? 20 : 30;
        continue;
      }

      timeouts.push(setTimeout(() => {
        setState((prev) => ({
          ...prev,
          lines: [...prev.lines, makeLine("system", "", color)],
        }));
      }, delay));

      for (let i = 1; i <= text.length; i++) {
        const partial = text.slice(0, i);
        timeouts.push(setTimeout(() => {
          SFX.typing();
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
      if (!isReturning) localStorage.setItem("mhdos_played", "true");
      SFX.systemBoot();
      setBooted(true);
      inputRef.current?.focus();
    }, delay + 100));

    return () => timeouts.forEach(clearTimeout);
  }, []);

  // Typing animation for SSH / special command sequences
  useEffect(() => {
    if (!commandSequence) return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let delay = 0;

    for (const entry of commandSequence) {
      const text = entry.text;
      const color = entry.color ?? C.WHITE;
      const cDelay = entry.charDelay ?? CHAR_DELAY_DEFAULT;

      if (text === "" || cDelay === 0) {
        timeouts.push(setTimeout(() => {
          setState((prev) => ({
            ...prev,
            lines: [...prev.lines, makeLine("system", text, color)],
          }));
        }, delay));
        delay += cDelay === 0 ? 20 : 30;
        continue;
      }

      timeouts.push(setTimeout(() => {
        setState((prev) => ({
          ...prev,
          lines: [...prev.lines, makeLine("system", "", color)],
        }));
      }, delay));

      for (let i = 1; i <= text.length; i++) {
        const partial = text.slice(0, i);
        timeouts.push(setTimeout(() => {
          SFX.typing();
          setState((prev) => {
            const lines = [...prev.lines];
            const last = lines[lines.length - 1];
            if (last) lines[lines.length - 1] = { ...last, content: partial };
            return { ...prev, lines };
          });
        }, delay + i * cDelay));
      }

      delay += text.length * cDelay + LINE_GAP;
    }

    timeouts.push(setTimeout(() => {
      setCommandSequence(null);
      if (awaitingPassword) {
        inputRef.current?.focus();
      }
    }, delay + 100));

    return () => timeouts.forEach(clearTimeout);
  }, [commandSequence, awaitingPassword]);

  // Output queue drip effect — one line every OUTPUT_LINE_DELAY ms
  const drainQueue = useCallback(() => {
    if (outputQueueRef.current.length === 0) return;
    const [next, ...rest] = outputQueueRef.current;
    outputQueueRef.current = rest;
    setState((prev) => ({ ...prev, lines: [...prev.lines, next] }));
    if (rest.length > 0) {
      outputTimerRef.current = setTimeout(drainQueue, OUTPUT_LINE_DELAY);
    }
  }, []);

  const enqueueLines = useCallback(
    (lines: TerminalLine[]) => {
      if (lines.length === 0) return;
      // Cancel any in-flight drain and flush remaining items first
      if (outputTimerRef.current) clearTimeout(outputTimerRef.current);
      outputQueueRef.current = [...outputQueueRef.current, ...lines];
      outputTimerRef.current = setTimeout(drainQueue, OUTPUT_LINE_DELAY);
    },
    [drainQueue],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (outputTimerRef.current) clearTimeout(outputTimerRef.current);
      if (zoomRestoreTimerRef.current) clearTimeout(zoomRestoreTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (commandSequence !== null) return;
    if (!zoomOut) return;

    if (zoomRestoreTimerRef.current) {
      clearTimeout(zoomRestoreTimerRef.current);
    }

    zoomRestoreTimerRef.current = setTimeout(() => {
      setZoomOut(false);
      zoomRestoreTimerRef.current = null;
    }, 1200);

    return () => {
      if (zoomRestoreTimerRef.current) clearTimeout(zoomRestoreTimerRef.current);
    };
  }, [commandSequence, zoomOut]);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClick = () => inputRef.current?.focus();
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
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

      setCursorPos(0);

      if (state.isWriteMode) {
        if (inputValue.trim() === ".") {
          const content = writeLines.join("\n");
          const updatedFs = setFileAtPath(
            state.fileSystem,
            state.currentPath,
            state.writeFileName,
            content,
          );
          SFX.documentClose();
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
        setState((prev) => ({
          ...prev,
          lines: [...prev.lines, echoLine],
          currentInput: "",
          historyIndex: -1,
        }));
        enqueueLines(result.lines);

        if (result.authenticated) {
          SFX.notification();
          setAwaitingPassword(false);
          setPendingServer(null);
          setState((prev) => ({
            ...prev,
            connectedServer: result.newServer ?? null,
            currentPath: result.newPath ?? prev.currentPath,
            fileSystem: result.newFs ?? prev.fileSystem,
          }));
        } else {
          setAwaitingPassword(false);
          setPendingServer(null);
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

      const cmd = inputValue.trim().toUpperCase().split(/\s+/)[0];
      if (cmd === "TYPE" || cmd === "CAT") SFX.documentOpen();
      if (result.enterWriteMode)          SFX.documentOpen();
      if (result.awaitingPassword)        SFX.notification();
      if ("newServer" in result) {
        if (result.newServer === null)    SFX.endOfConversation();
        else                              SFX.notification();
      }

      if (result.typingSequence) {
        if (result.zoomOut) setZoomOut(true);
        setState((prev) => {
          const newLines = result.clearScreen ? [] : [...prev.lines, echoLine];
          return {
            ...prev,
            lines: newLines,
            currentInput: "",
            history: inputValue.trim()
              ? [inputValue, ...prev.history.slice(0, 99)]
              : prev.history,
            historyIndex: -1,
          };
        });
        setCommandSequence(result.typingSequence);
        if (result.awaitingPassword && result.pendingServer) {
          setAwaitingPassword(true);
          setPendingServer(result.pendingServer);
        }
        return;
      }

      setState((prev) => {
        let newLines: TerminalLine[];
        if (result.clearScreen) {
          newLines = [echoLine];
        } else {
          newLines = [...prev.lines, echoLine];
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

      // Drip the output lines instead of dumping them all at once
      enqueueLines(result.lines);
    },
    [state, awaitingPassword, pendingServer, writeLines, getPrompt, enqueueLines],
  );

  // Read the native input's selectionStart after the browser has updated it
  const syncCursorPos = useCallback(() => {
    requestAnimationFrame(() => {
      const pos = inputRef.current?.selectionStart ?? null;
      if (pos !== null) {
        setCursorPos(pos);
        resetBlink();
      }
    });
  }, [resetBlink]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        SFX.enter();
        submitCommand(state.currentInput);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setState((prev) => {
          const newIndex = Math.min(
            prev.historyIndex + 1,
            prev.history.length - 1,
          );
          const newInput = prev.history[newIndex] ?? "";
          // Cursor goes to end of restored command
          setTimeout(() => setCursorPos(newInput.length), 0);
          return {
            ...prev,
            historyIndex: newIndex,
            currentInput: newInput,
          };
        });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setState((prev) => {
          const newIndex = Math.max(prev.historyIndex - 1, -1);
          const newInput = newIndex === -1 ? "" : (prev.history[newIndex] ?? "");
          setTimeout(() => setCursorPos(newInput.length), 0);
          return {
            ...prev,
            historyIndex: newIndex,
            currentInput: newInput,
          };
        });
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        // Let the browser handle cursor movement, then sync our position
        syncCursorPos();
      } else if (e.key === "Home" || e.key === "End") {
        syncCursorPos();
      } else if (e.key === "Tab") {
        e.preventDefault();
      } else if (e.key.length === 1) {
        SFX.typing();
        // Cursor will be updated via onChange
      } else if (e.key === "Backspace" || e.key === "Delete") {
        // Cursor will be updated via onChange
      }
    },
    [state.currentInput, submitCommand, syncCursorPos],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      const pos = e.target.selectionStart ?? val.length;
      setState((prev) => ({
        ...prev,
        currentInput: val,
        historyIndex: -1,
      }));
      setCursorPos(pos);
      resetBlink();
    },
    [resetBlink],
  );

  const handleSelect = useCallback(() => {
    syncCursorPos();
  }, [syncCursorPos]);

  const getLineColor = (line: TerminalLine): string => {
    if (line.color) return line.color;
    switch (line.type) {
      case "error":  return C.RED;
      case "input":  return C.WHITE;
      case "prompt": return C.WHITE;
      default:       return C.WHITE;
    }
  };

  const prompt = getPrompt();

  // Build the cursor-split display
  const rawInput = awaitingPassword
    ? "*".repeat(state.currentInput.length)
    : state.currentInput;

  const safeCursorPos = Math.min(cursorPos, rawInput.length);
  const beforeCursor = rawInput.slice(0, safeCursorPos);
  const cursorChar   = rawInput[safeCursorPos] ?? " ";
  const afterCursor  = rawInput.slice(safeCursorPos + 1);

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-black font-mono flex flex-col p-2 cursor-text"
      onClick={focusInput}
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: zoomOut ? "0.7rem" : "0.875rem",
        transform: zoomOut ? "scale(0.92)" : "scale(1)",
        transformOrigin: "top center",
        transition: "font-size 200ms ease, transform 200ms ease",
      }}
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
            <span>{beforeCursor}</span>
            <span
              style={{
                backgroundColor: cursorBlink ? C.WHITE : "transparent",
                color: cursorBlink ? "black" : C.WHITE,
                minWidth: "0.5rem",
                display: "inline-block",
              }}
            >
              {cursorChar}
            </span>
            <span>{afterCursor}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <input
        ref={inputRef}
        type="text"
        value={state.currentInput}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={handleSelect}
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
