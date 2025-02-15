import type { OpenAPIHono } from "@hono/zod-openapi";
import { UploadPostRoute } from "../schema/upload";
import { FileMakerService } from "../services/fileMakerService";
import { OpenAIService } from "../services/openAIService";
import type { Bindings } from "../types";

/**
 * Base64画像を解析して名刺情報を返す
 */
export const uploadAPI = (app: OpenAPIHono<{ Bindings: Bindings }>) => {
	app.openapi(UploadPostRoute, async (c) => {
		const body = c.req.valid("json");
		const file = body.image;

		if (!file) {
			const message = "画像を添付してください";
			return c.json({ success: false, message }, 400);
		}
		if (typeof file !== "string") {
			const message = "画像のアップロードに失敗しました";
			return c.json({ success: false, message }, 400);
		}

		try {
			const llm = new OpenAIService(c.env);
			const parsed = await llm.parseImage(file);
			if (!parsed || !parsed?.is_valid_image) {
				const message =
					"画像の解析に失敗しました。名刺の画像であることを確認してください";
				return c.json({ success: false, message }, 400);
			}
			console.log(`parsed: ${JSON.stringify(parsed)}`);

			const filemaker = new FileMakerService(
				{
					username: c.env.FM_USERNAME,
					password: c.env.FM_PASSWORD,
					db: c.env.FM_DATABASE,
					server: c.env.FM_SERVER,
				},
				c.env.FM_TOKEN_KV,
			);
			const mayBeDuplicate = parsed.name
				? await filemaker.findDuplicate(parsed.name)
				: false;
			console.log(`mayBeDuplicate: ${mayBeDuplicate}`);
			if (mayBeDuplicate) {
				console.warn(`Duplicate name: ${parsed.name}`);
				console.warn("Skip creating name card");
			} else {
				await filemaker.createNameCard(parsed);
			}
			console.log(`created: ${parsed.name}`);

			return c.json(
				{
					success: true,
					namecard: parsed,
					mayBeDuplicate,
				},
				200,
			);
		} catch (e) {
			console.error(e);
			return c.json(
				{ success: false, message: e instanceof Error ? e.message : String(e) },
				400,
			);
		}
	});
};
