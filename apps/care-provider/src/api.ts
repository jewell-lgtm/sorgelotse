import { treaty } from "@elysiajs/eden";
import type { App } from "@sorgelotse/api";

const API_URL = import.meta.env.API_URL || "http://api:6701";
export const api = treaty<App>(API_URL);
