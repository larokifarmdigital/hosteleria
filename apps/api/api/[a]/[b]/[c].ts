import { getRequestListener } from "@hono/node-server";
import { createApp } from "../../../src/app.js";

export const config = { runtime: "nodejs" };

const app = createApp();
export default getRequestListener(app.fetch);
