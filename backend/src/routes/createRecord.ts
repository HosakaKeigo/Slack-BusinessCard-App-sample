import { OpenAPIHono } from "@hono/zod-openapi"
import { Bindings } from "../types"
import { CreateRecordRoute } from "../schema/createRecord"
import { FileMakerService } from "../services/fileMakerService"

/**
 * FileMakerのレコードを作成する
 */
export const createRecordAPI = (app: OpenAPIHono<{ Bindings: Bindings }>) => {
  app.openapi(CreateRecordRoute, async (c) => {
    try {
      const body = c.req.valid("json")
      console.log(`body: ${JSON.stringify(body)}`)
      const filemaker = new FileMakerService({
        username: c.env.FM_USERNAME,
        password: c.env.FM_PASSWORD,
        db: c.env.FM_DATABASE,
        server: c.env.FM_SERVER,
      }, c.env.FM_TOKEN_KV)
      await filemaker.createNameCard(body)

      return c.json({ success: true, message: "Record created successfully" }, 200)
    } catch (e) {
      console.error(e)
      return c.json({ success: false, message: e instanceof Error ? e.message : String(e) }, 400)
    }
  })
}