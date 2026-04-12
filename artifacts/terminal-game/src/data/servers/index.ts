import { Server } from "../../types/terminal";

type ServerModule = {
  SERVER?: Server;
  ALIASES?: string[];
};

const modules = import.meta.glob("./*.ts", { eager: true }) as Record<string, ServerModule>;

export const SERVERS: Record<string, Server> = {};
export const IP_TO_SERVER: Record<string, string> = {};

for (const module of Object.values(modules)) {
  if (!module.SERVER) continue;
  const server = module.SERVER;
  SERVERS[server.id] = server;
  IP_TO_SERVER[server.ip] = server.id;
  IP_TO_SERVER[server.hostname] = server.id;
  if (module.ALIASES) {
    for (const alias of module.ALIASES) {
      IP_TO_SERVER[alias] = server.id;
    }
  }
}

export const LOCAL_SERVER_ID = "localhost";
