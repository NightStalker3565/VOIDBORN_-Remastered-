import { Server } from "../types/terminal";

export const LOCAL_SERVER_ID = "localhost";

export const SERVERS: Record<string, Server> = {
  localhost: {
    id: "localhost",
    hostname: "HOME-PC",
    ip: "127.0.0.1",
    description: "Your local machine",
    motd: "",
    fileSystem: {
      "C:": {
        type: "dir",
        children: {
          DOS: {
            type: "dir",
            children: {
              "COMMAND.COM": { type: "file", content: "MS-DOS Command Interpreter v6.22" },
              "AUTOEXEC.BAT": { type: "file", content: "@ECHO OFF\nPROMPT $P$G\nPATH C:\\DOS;C:\\TOOLS" },
              "CONFIG.SYS": { type: "file", content: "DEVICE=C:\\DOS\\HIMEM.SYS\nDEVICE=C:\\DOS\\EMM386.EXE\nBUFFERS=20\nFILES=40\nDOS=HIGH,UMB" },
            },
          },
          TOOLS: {
            type: "dir",
            children: {
              "SSH.EXE": { type: "file", content: "SSH client for MS-DOS. Usage: SSH [user@]host [-p port]" },
              "EDIT.COM": { type: "file", content: "Text editor for MS-DOS" },
            },
          },
          DOCUMENTS: {
            type: "dir",
            children: {
              "README.TXT": { type: "file", content: "Welcome to the Hacker Terminal!\n\nAvailable commands:\n  DIR          - list directory\n  CD [dir]     - change directory\n  TYPE [file]  - view file contents\n  WRITE [file] - write/create a file\n  MKDIR [dir]  - make directory\n  SSH [host]   - connect to a server\n  CLS          - clear screen\n  HELP         - show help\n  EXIT         - quit SSH session\n  VER          - show version\n" },
              "NOTES.TXT": { type: "file", content: "Server IPs to investigate:\n\n  192.168.1.50  - Corporate mainframe (admin/admin?)\n  10.0.0.1      - Unknown server on the network\n  172.16.0.99   - Seems to be a military server...\n" },
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
  ║       MEGACORP INTERNAL NETWORK v2.3             ║
  ║   AUTHORIZED ACCESS ONLY - ALL ACTIVITY LOGGED  ║
  ╚══════════════════════════════════════════════════╝
`,
    requiresPassword: true,
    password: "admin",
    fileSystem: {
      "~": {
        type: "dir",
        children: {
          "WELCOME.TXT": { type: "file", content: "Welcome to the MegaCorp mainframe.\nYou have (1) new message." },
          "INBOX": {
            type: "dir",
            children: {
              "MSG001.TXT": { type: "file", content: "FROM: ceo@megacorp.com\nTO: admin@megacorp.com\nSUBJECT: Project OMEGA\n\nThe package has been moved to the secure vault.\nAccess code: 7734\nDo NOT share this with anyone.\n" },
            },
          },
          "PROJECTS": {
            type: "dir",
            children: {
              "OMEGA.TXT": { type: "file", content: "PROJECT OMEGA - TOP SECRET\n\nPhase 1: Complete\nPhase 2: In progress\nPhase 3: [REDACTED]\n\nNext server: 10.0.0.1\nPassword: [REDACTED - check MSG001.TXT]\n" },
            },
          },
          "SYSTEM": {
            type: "dir",
            children: {
              "USERS.DAT": { type: "file", content: "admin:admin (you cracked it!)\nceo:c30_p4ss\nhr:humanresources\ndev:d3v3lop3r\n" },
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
          "NODE.TXT": { type: "file", content: "You've reached Shadow Node #7.\nThis is one of 12 nodes in the network.\nThe network key is split across all nodes.\n\nThis node's fragment: 4F-A2\n" },
          "NETWORK.MAP": { type: "file", content: "Shadow Network Map\n==================\nNode 1:  203.0.113.1  [OFFLINE]\nNode 2:  203.0.113.2  [OFFLINE]\n...\nNode 7:  10.0.0.1     [YOU ARE HERE]\n...\nNode 12: 172.16.0.99  [UNKNOWN STATUS]\n" },
          "TOOLS": {
            type: "dir",
            children: {
              "DECRYPT.EXE": { type: "file", content: "Decryption tool for Shadow Network archives.\nUsage: DECRYPT [archive] [key]\nYou need all 12 key fragments to use this." },
            },
          },
          "FRAGMENTS": {
            type: "dir",
            children: {
              "FRAG_07.DAT": { type: "file", content: "[ENCRYPTED DATA]\n4F-A2-XX-XX-XX-XX-XX-XX-XX-XX-XX-XX\n\nFragment 7/12 of the master key." },
            },
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
  CONNECTION IS BEING TRACED
  !! WARNING !! WARNING !! WARNING !!
`,
    requiresPassword: true,
    password: "classified",
    fileSystem: {
      "~": {
        type: "dir",
        children: {
          "CLASSIFIED.TXT": { type: "file", content: "[TOP SECRET - CLEARANCE LEVEL OMEGA]\n\nIf you're reading this, you've gone very deep.\nThe Shadow Network was created by us.\nWe lost control of it in 2003.\nProject OMEGA is our attempt to shut it down.\n\nYou may be our only hope.\n\nContact: deep_throat@nowhere.net\n" },
          "ARCHIVE": {
            type: "dir",
            children: {
              "HISTORY.TXT": { type: "file", content: "Timeline:\n1999 - Shadow Network created as black project\n2001 - Network gains sentience (unconfirmed)\n2003 - We lose access\n2024 - YOU find it\n" },
            },
          },
        },
      },
    },
  },
};

export const IP_TO_SERVER: Record<string, string> = {
  "127.0.0.1": "localhost",
  "localhost": "localhost",
  "192.168.1.50": "corp",
  "CORP-MAIN": "corp",
  "10.0.0.1": "shadow",
  "172.16.0.99": "military",
  "MIL-SEC-99": "military",
};
