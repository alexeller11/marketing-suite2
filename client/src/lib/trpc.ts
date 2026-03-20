import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/_core/router"; // ajuste se necessário

export const trpc = createTRPCReact<AppRouter>();
