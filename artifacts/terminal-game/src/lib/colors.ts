// ─────────────────────────────────────────────
//  COLOR PALETTE
//  Import C from this file anywhere in the game.
//
//  Usage:
//    import { C } from "./colors";
//    out("Good job!", C.GREEN)
//    sys("Warning!", C.YELLOW)
//
//   C.WHITE   — plain text (default)
//   C.GREEN   — success / OK
//   C.CYAN    — info / system messages
//   C.YELLOW  — warnings / write mode
//   C.ORANGE  — MOTD banners / alerts
//   C.RED     — errors
//   C.GREY    — dim / comments / hints
//   C.BRIGHT  — highlighted text
//   C.BLUE    — directory names / links
// ─────────────────────────────────────────────
export const C = {
  WHITE:  "#ffffff",
  GREEN:  "#00ff00",
  CYAN:   "#00aaff",
  YELLOW: "#ffff00",
  ORANGE: "#ffaa00",
  RED:    "#ff4444",
  GREY:   "#888888",
  BRIGHT: "#aaffaa",
  BLUE:   "#44aaff",
} as const;
