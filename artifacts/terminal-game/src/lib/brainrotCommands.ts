import { TerminalLine, TerminalState, Server } from "../types/terminal";
import { FileSystem } from "../types/terminal";
import { C } from "./colors";

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
  typingSequence?: { text: string; color?: string; charDelay?: number }[];
}

export function processBrainrotCommand(
  cmd: string,
  args: string[],
  state: TerminalState,
  terminalMetrics?: { cols: number; rows: number }
): CommandResult | null {
  switch (cmd) {
    case "GOLDEN_KNIGHT":
    case "GOLDENKNIGHT":
    case "GOLDEN_KNIGHTS":
    case "GOLDENKNIGHTS": {
      return {
        lines: [],
        clearScreen: false,
        typingSequence: [
          { text: "Not the best team, but they have style!", color: C.YELLOW, charDelay: 30 },
        ],
      };
    }

    case "BOYKISSER":
    case "BOY_KISSER":
    case "FEMBOY": {
      return {
        lines: [],
        clearScreen: false,
        typingSequence: [
          {
            text: `           @@@@                                                          @@@     
         @#..*@                                                      @@*..+@    
        @=.....%@                                                  @@+.....*@   
       @-.......:@@                                              @@-........%@  
      @-..........=@@                                          @@-...........@  
     @+.............%@         @@@@                          @@=.............*@ 
    @@...............:@@      @@....=*%@@@                  @*................@ 
   @..................+@      @:.........+@@             @@..................#@
  @%....................%@    @@............-@@@       @@-...................=@
  @-.....................=@@   @@..............*@@    @#.....................:@
 @@........................#@   @@...............+@@@@:.......................@
 @%.........................-@ @@@@@@..............*@.........................@
 @%........................-%%=......................%+.......................@
 @%......................#@:..................................................@
 @%....................%@++=======++%#......................................-@
 @@..........................................................................+@
  @..........................................................................%@
`,
            color: "#FF69B4",
            charDelay: 8,
          },
          {
            text: `  @#........................................................................=@ 
   @........................................................................@@ 
   @%......................................................................#@  
    @=........................................**#%%@@@@@@@@@@@@+..........*@   
     @:......*@@@%%%%%@@@@@@@@@@.............-@@@@@@@@=.....@:...........#@    
      @-.......#+.....*@@@@@@@@..............#@@@@@@@@*.....:@..........@@     
       @=.....-%......*@@@@@@@@..............@@@@@@@@@*......%-.......=@       
@@@@     @#....*+......*@@@@@@@@..............@@@@@@@@@*......%=.....-@@%+==+@@ 
@+..:*%%%%%#...@.......+@@@@@@@@..............=@@@@@@@@.......#=............*@  
 @-............@........@@@@@@@%...............@@@@@@@*.......%=...........@@   
  @#...........+*.......*@@@@@@.................#@@@@=........%-.........%@     
   @@#..........@-.......*@@@@:....###*................................#@       
       @@.....:............................................*=..-......#@        
       @-..++:+-.+**.....................................**:*+#.........@@      
      @*......#+:..............................-...........:*............*@     
`,
            color: "#FF69B4",
            charDelay: 4,
          },
          {
            text: `     @%........................#-##+%%+@-##+*:..........................=@    
    @%..................................................................   
   @%......:#%*...............................................#@@@@@@@@@@@@@    
     @@@@@@    @@#-......................................:=@@@                  
                  @@@@*.............................@@@@@@                      
                     @=.=*%@@%##-.....................-@                        
                      @#...............................=@                        
                       @@*..............................*@                       
                          @@+............................@@                      
                        @@+..............................:@                      
                       @@.................................-@                    
                      @@++*#@:.............................@@                    
                           @+...............................@                    
                          @*................................@@                   
                         @@..................................@                   
                         @=..................................@@                  
                        @@...................................=@                  
                        @=....................................@@                
                        @.....................................%@                
                       @+.....................................+@                
                       @-......................................@                
                       @.......................................@@                
                      @*.......................................#@                
                      @=.......................................#@                
                      @:.......................................*@                
                     @@........................................+@               
`,        
            color: "#FF69B4",
            charDelay: 2,},
        {
            text: `Erm.. why did you summon me?`,        
            color: "#FF69B4",
            charDelay: 150,},    
        {
            text: `Oh, I see... Well...`,        
            color: "#FF69B4",
            charDelay: 400,},  
        {
            text: `UWU`,        
            color: "#FF69B4",
            charDelay: 1000,},     
        ],
      };
    }

    case "MURDER_DRONES": {
      return {
        lines: [],
        clearScreen: false,
        typingSequence: [
          { text: "NULL", charDelay: 36 },
        ],
      };
    }

    case "67": {
      const cols = terminalMetrics?.cols ?? 80;
      const lineCount = Math.max(1, cols * 12);
      return {
        lines: [],
        clearScreen: false,
        typingSequence: [
          ...generatePatternLines("67", lineCount, cols, "#FF0000"),
        ],
      };
    }

    case "OHIO_RIZZLER":
    case "RIZZLER":
    case "RIZZ":
    case "OHIO": {
      return {
        lines: [],
        clearScreen: false,
        typingSequence: [
          { text: "ERROR: You can only use this command in Ohio.", color: "#FF0000", charDelay: 24 },
        ],
      };
    }

    case "SKIBIDI": {
      return {
        lines: [],
        clearScreen: false,
        typingSequence: [
          { text: "...", color: C.WHITE, charDelay: 1000 },
          { text: "...", color: C.WHITE, charDelay: 1000 },
          { text: "...", color: C.WHITE, charDelay: 1000 },
          { text: "...", color: C.WHITE, charDelay: 1000 },
          { text: "...", color: C.WHITE, charDelay: 1000 },
          { text: "dop dop?", color: C.GREY, charDelay: 75 },
        ],
      };
    }

    case "MATRIX": {
      const chars = "ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾙﾐ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&";
      function randStr(len: number) {
        let s = "";
        for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
        return s;
      }
      const cols = terminalMetrics?.cols ?? 80;
      const lineCount = Math.max(1, cols * 12);
      const lines = [];
      for (let i = 0; i < lineCount; i++) {
        lines.push({ text: randStr(cols), color: C.GREEN, charDelay: 0 });
      }
      lines.push({ text: "Follow the white rabbit, Neo.", color: C.WHITE, charDelay: 500 });
      return {
        lines: [],
        clearScreen: true,
        typingSequence: lines,
      };
    }

    default:
      return null;
  }
}