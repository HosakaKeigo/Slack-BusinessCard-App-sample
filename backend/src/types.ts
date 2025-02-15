import { z } from "zod";

export type Bindings = {
	OPENAI_API_KEY: string;
	OPENAI_MODEL: string;
	CLOUDFLARE_AI_GATEWAY: string;
	AZURE_OPENAI_RESOURCE_NAME: string;
	AZURE_OPENAI_API_VERSION: string;
	FM_SERVER: string;
	FM_DATABASE: string;
	FM_USERNAME: string;
	FM_PASSWORD: string;
	FM_TOKEN_KV: KVNamespace;
};

export const BusinessCardSchema = z.object({
	name: z
		.string()
		.nullable()
		.describe("名刺に記載された氏名（苗字と名前の間は全角スペース）"),
	name_kana: z
		.string()
		.nullable()
		.describe(
			"氏名のフリガナ。見つからない場合は名前から推測（苗字と名前の間は全角スペース）。ローマ字記載がある場合は、それをカナにしてください。",
		),
	company: z.string().nullable().describe("会社名"),
	company_kana: z
		.string()
		.nullable()
		.describe("会社名のフリガナ。情報がない場合は、推測せず、空文字にすること。"),
	department: z.string().nullable().describe("部署名"),
	job_title: z.string().nullable().describe("役職"),
	tel: z
		.string()
		.nullable()
		.describe("電話番号（ハイフン区切り。ハイフン区切り出なければ変換すること）"),
	tel_2: z
		.string()
		.nullable()
		.describe(
			"電話番号2（ハイフン区切り。ハイフン区切り出なければ変換すること）。もしあれば。",
		),
	tel_mobile: z
		.string()
		.nullable()
		.describe(
			"電話番号2（ハイフン区切り。ハイフン区切り出なければ変換すること）。携帯番号。もしあれば。",
		),
	email: z.string().nullable().describe("メールアドレス"),
	email_2: z.string().nullable().describe("メールアドレス2。もしあれば。"),
	fax: z.string().nullable().describe("FAX番号。もしあれば"),
	company_url: z.string().nullable().describe("会社のWebサイトURL"),
	zip_code: z
		.string()
		.nullable()
		.describe("郵便番号（ハイフン区切り。ハイフン区切り出なければ変換すること）"),
	address_1: z.string().nullable().describe("都道府県・市区町村・番地"),
	address_2: z.string().nullable().describe("建物名・階数"),
	is_valid_image: z.boolean().describe("画像が解析可能な名刺画像かどうか"),
});

// TypeScriptの型を生成
export type BusinessCardInfo = z.infer<typeof BusinessCardSchema>;

export interface FileMakerConfig {
	username: string;
	password: string;
	/**
	 * FileMaker Database Name including .fmp12
	 */
	db: string;
	/**
	 * FileMaker Server URL starting with https://
	 */
	server: string;
}
