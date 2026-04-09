import { Server } from "../types/terminal";

export const LOCAL_SERVER_ID = "localhost";

export const SERVERS: Record<string, Server> = {
  localhost: {
    id: "localhost",
    hostname: "HOME-PC",
    ip: "127.0.0.1",
    description: "Your local machine.",
    motd: "",
    fileSystem: {
      "C:": {
        type: "dir",
        children: {
          DOS: {
            type: "dir",
            children: {
              "COMMAND.COM": {
                type: "file",
                content: "MH-DOS Command Interpreter v0.97",
              },
              "AUTOEXEC.BAT": {
                type: "file",
                content:
                  "@ECHO OFF\nPROMPT $P$G\nPATH C:\\DOS;C:\\TOOLS",
              },
              "CONFIG.SYS": {
                type: "file",
                content:
                  "DEVICE=C:\\DOS\\HIMEM.SYS\nDEVICE=C:\\DOS\\EMM386.EXE\nBUFFERS=20\nFILES=40\nDOS=HIGH,UMB",
              },
            },
          },
          TOOLS: {
            type: "dir",
            children: {
              "SSH.EXE": {
                type: "file",
                content:
                  "SSH client for MH-DOS. Usage: SSH [user@]host [-p port]",
              },
              "EDIT.COM": {
                type: "file",
                content: "Text editor for MH-DOS",
              },
            },
          },
          DOCUMENTS: {
            type: "dir",
            children: {
              "README.TXT": {
                type: "file",
                content:
                  "Welcome to your employee terminal! You will primarily use this terminal to\nremotely access server logs and contact other employees using our built-in IMS.\nYou may use this terminal for personal matters, but DO NOT use SSH servers\nfor personal affairs. As per your contract, you are a SERVER TECHNICIAN.\n\nAvailable commands:\n  DIR\n  CD [dir]\n  TYPE [file]\n  SSH [host]\n  CLS\n  HELP\n  EXIT\n  VER\n",
              },
              "EMPLOYEE_DOCUMENTATION.TXT": {
                type: "file",
                content: "Main Server ID: 192.168.1.50",
              },
            },
          },
          TEMP: {
            type: "dir",
            children: {},
          },
        },
      },
    },
  },

  corp: {
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
            content:
              "Welcome to the MegaCorp mainframe.\nYou have (1) new message.",
          },
          INBOX: {
            type: "dir",
            children: {
              "MSG001.TXT": {
                type: "file",
                content:
                  "FROM: ceo@rebornlabs.com\nTO: admin@rebornlabs.com\nSUBJECT: Project OMEGA\n\nAccess code: 7734\n",
              },
            },
          },
          PROJECTS: {
            type: "dir",
            children: {
              "OMEGA.TXT": {
                type: "file",
                content:
                  "PROJECT OMEGA - TOP SECRET\nNext server: 10.0.0.1\n",
              },
            },
          },
          SYSTEM: {
            type: "dir",
            children: {
              "USERS.DAT": {
                type: "file",
                content:
                  "admin:admin\nceo:c30_p4ss\nhr:humanresources\ndev:d3v3lop3r\n",
              },
            },
          },
        },
      },
    },
  },

  shadow: {
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
            content:
              "Node #7 fragment: 4F-A2",
          },
          "NETWORK.MAP": {
            type: "file",
            content:
              "Node 7: 10.0.0.1 [YOU ARE HERE]\nNode 12: 172.16.0.99",
          },
        },
      },
    },
  },

  military: {
    id: "military",
    hostname: "MIL-SEC-99",
    ip: "172.16.0.99",
    description: "Military server",
    motd: `
!! WARNING !! WARNING !! WARNING !!
CLASSIFIED GOVERNMENT SYSTEM
UNAUTHORIZED ACCESS IS A FEDERAL CRIME
!! WARNING !! WARNING !! WARNING !!
`,
    requiresPassword: true,
    password: "classified",
    fileSystem: {
      "~": {
        type: "dir",
        children: {
          "CLASSIFIED.TXT": {
            type: "file",
            content:
              "TOP SECRET OMEGA PROJECT\nWe lost control in 2003.",
          },
        },
      },
    },
  },
};

export const IP_TO_SERVER: Record<string, string> = {
  "127.0.0.1": "localhost",
  localhost: "localhost",
  "192.168.1.50": "corp",
  "CORP-MAIN": "corp",
  "10.0.0.1": "shadow",
  "172.16.0.99": "military",
  "MIL-SEC-99": "military",
};