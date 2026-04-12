import { Server } from "../../types/terminal";

export const SERVER: Server = {
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
              content: "@ECHO OFF\nPROMPT $P$G\nPATH C:\\DOS;C:\\TOOLS",
            },
            "CONFIG.SYS": {
              type: "file",
              content: "DEVICE=C:\\DOS\\HIMEM.SYS\nDEVICE=C:\\DOS\\EMM386.EXE\nBUFFERS=20\nFILES=40\nDOS=HIGH,UMB",
            },
          },
        },
        TOOLS: {
          type: "dir",
          children: {
            "SSH.EXE": {
              type: "file",
              content: "SSH client for MH-DOS. Usage: SSH [user@]host [-p port]",
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
              content: "Welcome to your employee terminal! You will primarily use this terminal to\nremotely access server logs and contact other employees using our built-in IMS.\nYou may use this terminal for personal matters, but DO NOT use SSH servers\nfor personal affairs. As per your contract, you are a SERVER TECHNICIAN.\n\nAvailable commands:\n  DIR\n  CD [dir]\n  TYPE [file]\n  SSH [host]\n  CLS\n  HELP\n  EXIT\n  VER\n",
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
};

export const ALIASES = ["localhost"];
