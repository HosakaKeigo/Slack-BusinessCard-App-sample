import { createRoute, z } from "@hono/zod-openapi";
import { BusinessCardSchema } from "../types";

const ImageUploadSchema = z
	.object({
		image: z.string().openapi("Base64 encoded image"),
	})
	.openapi("ImageUpload");

const UploadResponseSchema = z
	.object({
		success: z.boolean(),
		namecard: BusinessCardSchema,
		mayBeDuplicate: z.boolean(),
	})
	.openapi("UploadResponse");

const ErrorResponseSchema = z
	.object({
		success: z.boolean(),
		message: z.string(),
	})
	.openapi("ErrorResponse");

export const UploadPostRoute = createRoute({
	method: "post",
	path: "/upload",
	request: {
		body: {
			content: {
				"application/json": {
					schema: ImageUploadSchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: UploadResponseSchema,
				},
			},
			description: "Successfully uploaded the image",
		},
		400: {
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
			description: "Bad request or invalid file",
		},
	},
});
