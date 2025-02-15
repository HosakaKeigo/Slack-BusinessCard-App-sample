import { AzureOpenAI } from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { type Bindings, BusinessCardSchema } from "../types";
import { SYSTEM_PROMPT } from "../prompts";

export class OpenAIService {
	private readonly openai: AzureOpenAI;
	private readonly systemPrompt = SYSTEM_PROMPT;
	private readonly model: string;

	constructor(env: Bindings) {
		this.validateEnv(env);
		this.openai = new AzureOpenAI({
			apiKey: env.OPENAI_API_KEY,
			baseURL: `${env.CLOUDFLARE_AI_GATEWAY}/azure-openai/${env.AZURE_OPENAI_RESOURCE_NAME}`,
			apiVersion: env.AZURE_OPENAI_API_VERSION,
		});
		this.model = env.OPENAI_MODEL;
	}

	async parseImage(imageBase64: string) {
		const result = await this.openai.beta.chat.completions.parse({
			model: this.model,
			messages: [
				{
					role: "system",
					content: this.systemPrompt,
				},
				{
					role: "user",
					content: [
						{
							type: "text",
							text: "画像ファイルを解析してください",
						},
						{
							type: "image_url",
							image_url: {
								url: imageBase64,
							},
						},
					],
				},
			],
			response_format: zodResponseFormat(BusinessCardSchema, "name_card"),
		});

		const parsed = result.choices[0]?.message?.parsed;
		return parsed;
	}

	private validateEnv(env: Bindings) {
		const requiredEnvVars = [
			"OPENAI_API_KEY",
			"CLOUDFLARE_AI_GATEWAY",
			"AZURE_OPENAI_RESOURCE_NAME",
			"AZURE_OPENAI_API_VERSION",
			"OPENAI_MODEL",
		] as const;
		const missingEnvVars = requiredEnvVars.filter((envVar) => !env[envVar]);
		if (missingEnvVars.length > 0) {
			throw new Error(
				`Missing environment variables: ${missingEnvVars.join(", ")}`,
			);
		}
	}
}
