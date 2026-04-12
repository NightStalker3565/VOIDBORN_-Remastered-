import { Server } from "../../types/terminal";

export const SERVER: Server = {
  id: "corp",
  hostname: "CORP-MAIN",
  ip: "192.168.1.50",
  description: "Corporate Mainframe",
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
          content: "Welcome to the MegaCorp mainframe.\nYou have (1) new message.",
        },
        INBOX: {
          type: "dir",
          children: {
            "MSG001.TXT": {
              type: "file",
              content: "FROM: ceo@rebornlabs.com\nTO: admin@rebornlabs.com\nSUBJECT: Project OMEGA\n\nAccess code: 7734\n",
            },
          },
        },
        PROJECTS: {
          type: "dir",
          children: {
            "OMEGA.TXT": {
              type: "file",
              content: "PROJECT OMEGA - TOP SECRET\nNext server: 10.0.0.1\n",
            },
          },
        },
        SYSTEM: {
          type: "dir",
          children: {
            "USERS.DAT": {
              type: "file",
              content: "admin:admin\nceo:c30_p4ss\nhr:humanresources\ndev:d3v3lop3r\n",
            },
          },
        },
      },
    },
  },
};

export const ALIASES = ["CORP-MAIN"];
