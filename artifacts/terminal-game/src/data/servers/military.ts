import { Server } from "../../types/terminal";

export const SERVER: Server = {
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
          content: "TOP SECRET OMEGA PROJECT\nWe lost control in 2003.",
        },
      },
    },
  },
};

export const ALIASES = ["MIL-SEC-99"];
