import { DataApi, FetchAdapter } from "@proofgeist/fmdapi";
import type { BusinessCardInfo, FileMakerConfig } from "../types";
import { type TNameCard, ZNameCard } from "../schema/NameCard";

/**
 * Cloudflare Workers Specific FileMaker Service
 */
export class FileMakerService {
	private readonly client: ReturnType<typeof DataApi>;
	private readonly layoutName = "for_FilemakerDataAPI";
	constructor(config: FileMakerConfig, KV: KVNamespace) {
		this.client = DataApi<any, TNameCard>({
			adapter: new FetchAdapter({
				auth: {
					username: config.username,
					password: config.password,
				},
				db: config.db,
				server: config.server,
				/**
				 * For Edge Runtime Token Persistence
				 */
				tokenStore: {
					getToken: async (key) => {
						console.log("get token", key);
						return await KV.get(key);
					},
					setToken: async (key, value) => {
						console.log("set token", key);
						return await KV.put(key, value);
					},
					clearToken: async (key) => {
						console.log("clear token", key);
						return await KV.delete(key);
					},
				},
			}),
			layout: this.layoutName,
			zodValidators: { fieldData: ZNameCard },
		});
	}

	async createNameCard(data: BusinessCardInfo): Promise<string> {
		const record = await this.client.create({
			fieldData: this.mapBusinessCardToFieldData(data),
			layout: this.layoutName,
		});
		return record.recordId;
	}

	async findDuplicate(name: string | undefined): Promise<boolean> {
		if (!name) return false;
		const record = await this.client.find({
			layout: this.layoutName,
			query: {
				氏名: name,
			},
			ignoreEmptyResult: true,
		});
		return record.dataInfo.foundCount > 0;
	}

	private mapBusinessCardToFieldData(data: BusinessCardInfo): TNameCard {
		// "/" は nullに変換
		const formatData = (value: string | null) => {
			if (value === "/" || !value) {
				return null;
			}
			return value;
		};

		const formatTel = (value: string | null) => {
			const formatted = formatData(value);
			if (!formatted) {
				return null;
			}
			// カッコを-に変換
			// 半角と全角どちらも
			return formatted.replace(/[()（）]/g, "-");
		};
		return {
			氏名: formatData(data.name) || "",
			氏名カナ: formatData(data.name_kana) || "",
			敬称: "様",
			郵便番号: formatData(data.zip_code) || "",
			住所1: formatData(data.address_1) || "",
			住所2: formatData(data.address_2) || "",
			会社名: formatData(data.company) || "",
			会社名カナ: formatData(data.company_kana) || "",
			URL: formatData(data.company_url) || "",
			部署名1: formatData(data.department) || "",
			部署名2_役職: formatData(data.job_title) || "",
			電話1: formatTel(data.tel) || "",
			電話2: formatTel(data.tel_2) || "",
			携帯電話: formatTel(data.tel_mobile) || "",
			FAX: formatTel(data.fax) || "",
			Eﾒｰﾙ: formatData(data.email) || "",
			携帯メール: formatData(data.email_2) || "",
			備考: "created by slackbot",
		};
	}
}
