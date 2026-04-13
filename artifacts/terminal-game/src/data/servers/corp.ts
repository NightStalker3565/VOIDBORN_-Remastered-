import { Server } from "../../types/terminal";

export const SERVER: Server = {
  id: "rli-hub",
  hostname: "rliGuest",
  ip: "192.168.1.50",
  description: "Primary workspace terminal transfer hub for workers.",
  motd: `
╔══════════════════════════════════════════════════╗
║        REBORN LABS INTERNAL NETWORK v0.8         ║
║   AUTHORIZED ACCESS ONLY - ALL ACTIVITY LOGGED   ║
╚══════════════════════════════════════════════════╝
`,
  requiresPassword: false,
  fileSystem: {
    "~": {
      type: "dir",
      children: {
        "WELCOME.TXT": {
          type: "file",
          content: "Welcome to Reborn Labs internal system hub.\nPlease transfer to your assigned workstation.",
        },
            },
          },
        },
      };
export const ALIASES = ["RLI-HUB"];
