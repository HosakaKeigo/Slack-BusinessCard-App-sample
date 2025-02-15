import { createRoute, z } from "@hono/zod-openapi";
import { BusinessCardSchema } from '../types';

const ResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})

/**
 * FileMakerのレコードを作成する
 */
export const CreateRecordRoute = createRoute({
  method: "post",
  path: "/createRecord",
  request: {
    body: {
      content: {
        "application/json": {
          schema: BusinessCardSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
      description: "Successfully created the record",
    },
    400: {
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
      description: "Bad request",
    },
  }
})