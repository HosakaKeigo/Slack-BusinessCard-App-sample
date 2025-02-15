import { OpenAPIHono } from "@hono/zod-openapi";
import type { Bindings } from "./types";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { uploadAPI } from "./routes/upload";
import { createRecordAPI } from "./routes/createRecord";

const app = new OpenAPIHono<{ Bindings: Bindings }>();
app.use(logger());
app.use(secureHeaders());

uploadAPI(app);
createRecordAPI(app);

app.onError(async (error, c) => {
	console.error(error);
	return c.json(
		{
			success: false,
			message: error instanceof Error ? error.message : String(error),
		},
		500,
	);
});

export default app;
