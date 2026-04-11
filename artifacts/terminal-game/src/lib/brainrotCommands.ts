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
  state: TerminalState
): CommandResult | null {
  switch (cmd) {
    case "GOLDENKNIGHT": {
      return {
        lines: [],
        clearScreen: false,
        typingSequence: [
          { text: "Not the best team, but they have style!", color: C.YELLOW, charDelay: 30 },
        ],
      };
    }

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
            charDelay: 15,
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
            charDelay: 50,
          },
          {
            text: `     @%........................#....:%%+@@##%@*:..........................=@    
    @%..........................-##+.......................................*@   
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
            charDelay: 90,
          },
        ],
      };
    }

    case "MURDER_DRONES": {
      return {
        lines: [],
        clearScreen: true,
        typingSequence: [
          { text: "NULL", charDelay: 36 },
        ],
      };
    }

    case "67": {
      return {
        lines: [],
        clearScreen: true,
        typingSequence: [
          { text: "   ██████╗ ███████╗", color: "#FF0000", charDelay: 20 },
          { text: "  ██╔════╝ ╚════██║", color: "#FF0000", charDelay: 20 },
          { text: "  ██████╗      ██╔╝", color: "#FF0000", charDelay: 20 },
          { text: "  ██╔══██╗    ██╔╝ ", color: "#FF0000", charDelay: 20 },
          { text: "  ╚██████╔╝   ██║  ", color: "#FF0000", charDelay: 20 },
          { text: "   ╚═════╝    ╚═╝  ", color: "#FF0000", charDelay: 20 },
          ...generatePatternLines("67", 24, 80, "#FF0000"),
        ],
      };
    }

    case "OHIO_RIZZLER":
    case "RIZZLER":
    case "RIZZ":
    case "OHIO": {
      return {
        lines: [],
        clearScreen: true,
        typingSequence: [
          { text: "ERROR: You can only use this command in Ohio.", color: "#FF0000", charDelay: 24 },
        ],
      };
    }

    case "SKIBIDI": {
      return {
        lines: [],
        clearScreen: true,
        typingSequence: [
          { text: "...", charDelay: 60 },
          { text: "...", color: C.CYAN, charDelay: 60 },
          { text: "...", color: C.CYAN, charDelay: 60 },
          { text: "...", color: C.CYAN, charDelay: 60 },
          { text: "...", color: C.GREY, charDelay: 60 },
          { text: "dop dop?", color: C.GREY, charDelay: 60 },
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
      const lines = [];
      for (let i = 0; i < 25; i++) {
        lines.push({ text: randStr(80), color: C.GREEN, charDelay: 0 });
      }
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