import { Server } from "../../types/terminal";

export const SERVER: Server = {
  id: "shadow",
  hostname: "UNKNOWN-HOST",
  ip: "10.0.0.1",
  description: "Unknown server",
  motd: `
██████████████████████████████
█                            █
█   ACCESS GRANTED - SHADOW  █
█   NETWORK NODE #7          █
█                            █
██████████████████████████████
`,
  requiresPassword: true,
  password: "7734",
  fileSystem: {
    "~": {
      type: "dir",
      children: {
        "NODE.TXT": {
          type: "file",
          content: "Node #7 fragment: 4F-A2",
        },
        "NETWORK.MAP": {
          type: "file",
          content: "Node 7: 10.0.0.1 [YOU ARE HERE]\nNode 12: 172.16.0.99",
        },
      },
    },
  },
};

export const ALIASES = [];
