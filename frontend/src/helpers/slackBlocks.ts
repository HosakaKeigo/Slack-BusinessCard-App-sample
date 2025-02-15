import type {
	SectionBlock,
	AnyMessageBlock,
	ActionsBlock,
	DividerBlock,
	HeaderBlock,
} from "slack-cloudflare-workers";
import type { BusinessCardInfo } from "../types";
import type { Summary } from "./slackMessages";
import { ACTION_IDs, BLOCK_IDs } from "../const";
import { openFileWithNameUrl } from "../filemakerConfig";

export function createBusinessCardBlocks(
	fileName: string,
	data: BusinessCardInfo,
): AnyMessageBlock[] {
	const formatField = (
		label: string,
		value: string | null,
		subValue: string | null = null,
	): string => {
		const mainText = value || "None";
		return `*${label}*\n${mainText}${subValue ? `\n(${subValue})` : ""}`;
	};

	const formatTelFields = (): string => {
		const fields = [
			["固定", data.tel],
			["固定2", data.tel_2],
			["携帯", data.tel_mobile],
		].filter(([_, value]) => value);

		if (fields.length === 0) return "*電話番号*\n-";
		return `*電話番号*\n${fields.map(([label, value]) => `${label}: ${value}`).join("\n")}`;
	};

	const formatEmailFields = (): string => {
		const emails = [data.email, data.email_2].filter(Boolean);
		if (emails.length === 0) return "*メール*\n-";
		return `*メール*\n${emails.join("\n")}`;
	};

	const formatAddress = (): string => {
		return [
			"*住所*",
			data.zip_code ? `〒${data.zip_code}` : "-",
			data.address_1 || "-",
			data.address_2 || "-",
		].join("\n");
	};

	const header: HeaderBlock = {
		type: "header",
		text: {
			type: "plain_text",
			text: `:white_check_mark:  ${fileName}`,
			emoji: true,
		},
	};

	const nameCompanySection: SectionBlock = {
		type: "section",
		fields: [
			{
				type: "mrkdwn",
				text: formatField("氏名", data.name, data.name_kana),
			},
			{
				type: "mrkdwn",
				text: formatField("会社", data.company, data.company_kana),
			},
		],
	};

	const departmentSection: SectionBlock = {
		type: "section",
		fields: [
			{
				type: "mrkdwn",
				text: formatField("部署", data.department),
			},
			{
				type: "mrkdwn",
				text: formatField("役職", data.job_title),
			},
		],
	};

	const contactSection: SectionBlock = {
		type: "section",
		fields: [
			{
				type: "mrkdwn",
				text: formatTelFields(),
			},
			{
				type: "mrkdwn",
				text: formatEmailFields(),
			},
		],
	};

	const addressSection: SectionBlock = {
		type: "section",
		fields: [
			{
				type: "mrkdwn",
				text: formatAddress(),
			},
			{
				type: "mrkdwn",
				text: formatField("Webサイト", data.company_url),
			},
		],
	};

	const divider: DividerBlock = {
		type: "divider",
	};

	return [
		header,
		nameCompanySection,
		departmentSection,
		contactSection,
		addressSection,
		divider,
	];
}

/**
 * - 結果の統計情報
 * - 新規作成レコード
 * - 重複可能性のある名刺情報
 */
export const summaryBlocks = (params: Summary): AnyMessageBlock[] => {
	// 重複可能性のある名刺情報を抽出
	const possibleDuplication = params.successes
		.filter(
			(success) => success.result.data.mayBeDuplicate && success.result.data.name,
		)
		.map((success) => success.result.data);

	const newlyCreated = params.successes
		.filter(
			(success) => !success.result.data.mayBeDuplicate && success.result.data.name,
		)
		.map((success) => success.result.data);

	let successMessage = `*成功*\n${params.successCount}枚`;
	if (possibleDuplication.length > 0) {
		successMessage += `（:warning: 重複疑い: ${possibleDuplication.length}枚）`;
	}
	const baseBlocks: AnyMessageBlock[] = [
		{
			type: "header",
			text: {
				type: "plain_text",
				text: "📊 完了レポート",
				emoji: true,
			},
		},
		{
			type: "section",
			fields: [
				{
					type: "mrkdwn",
					text: `*総数*\n${params.totalCount}枚`,
				},
				{
					type: "mrkdwn",
					text: successMessage,
				},
				{
					type: "mrkdwn",
					text: `*失敗*\n${params.failureCount}枚`,
				},
			],
		},
		{
			type: "divider",
		},
	];

	const newlyCreatedSection: SectionBlock[] = newlyCreated.map((data) => ({
		type: "section",
		text: {
			type: "mrkdwn",
			text: `:pushpin: *${data.name}${data.name_kana ? ` (${data.name_kana})` : ""}*`,
		},
		accessory: {
			type: "button",
			text: {
				type: "plain_text",
				text: "検索する",
				emoji: true,
			},
			url: openFileWithNameUrl(data.name || ""),
			action_id: ACTION_IDs.SEARCH_RECORD,
		},
	}));
	if (newlyCreatedSection.length === 0) {
		newlyCreatedSection.push({
			type: "section",
			text: {
				type: "mrkdwn",
				text: "新規作成されたレコードはありません。",
			},
		});
	}

	const newlyCreatedBlocks: (SectionBlock | HeaderBlock)[] = [
		{
			type: "header",
			text: {
				type: "plain_text",
				text: ":white_check_mark: 新規作成されたレコード",
				emoji: true,
			},
		},
		...newlyCreatedSection,
	];

	// 重複レコードがある場合;
	// ボタンを押すとレコードが作成される
	const duplicateBlock: (SectionBlock | HeaderBlock)[] = [];
	if (possibleDuplication.length > 0) {
		duplicateBlock.push({
			type: "header",
			text: {
				type: "plain_text",
				text: ":warning: 重複している可能性があるレコード（Skipped)",
				emoji: true,
			},
		});
		duplicateBlock.push({
			type: "section",
			text: {
				type: "mrkdwn",
				text:
					"同姓同名のレコードが見つかったため、 *レコードの作成をスキップ* しました。FileMakerで確認し、問題なければボタンをクリックしてレコードを作成してください。",
			},
		});
		for (const data of possibleDuplication) {
			const nameWithKana = `${data.name}${data.name_kana ? ` (${data.name_kana})` : ""}`;
			const duplicateInfoSections: SectionBlock[] = [
				{
					type: "section",
					text: {
						type: "mrkdwn",
						text: `:pushpin: *氏名*: ${nameWithKana}`,
					},
					accessory: {
						type: "button",
						text: {
							type: "plain_text",
							text: "レコードを作成する",
							emoji: true,
						},
						style: "primary",
						value: JSON.stringify({
							data,
							threadTs: params.threadTs,
							channelId: params.channelId,
						}),
						action_id: ACTION_IDs.CREATE_RECORD,
					},
				},
			];
			if (data.name) {
				// FileMakerで指定の氏名を検索した状態で開く
				duplicateInfoSections.push({
					type: "section",
					text: {
						type: "mrkdwn",
						text: `:mag: FileMakerで「${nameWithKana}」を検索する（PC）`,
					},
					accessory: {
						type: "button",
						text: {
							type: "plain_text",
							text: "検索する",
							emoji: true,
						},
						url: openFileWithNameUrl(data.name),
						action_id: ACTION_IDs.SEARCH_RECORD,
					},
				});
			}

			duplicateBlock.push(...duplicateInfoSections);
		}
	}

	const actionBlock: ActionsBlock = {
		type: "actions",
		block_id: BLOCK_IDs.SUMMARY,
		elements: [
			{
				type: "button",
				text: {
					type: "plain_text",
					text: "作成されたレコードを開く（FileMaker）",
					emoji: true,
				},
				url: params.buttonUrl,
				action_id: ACTION_IDs.OPEN_FILEMAKER,
				style: "primary",
			},
			{
				type: "button",
				text: {
					type: "plain_text",
					text: "メッセージを削除する",
					emoji: true,
				},
				action_id: ACTION_IDs.DELETE_MESSAGES,
				value: JSON.stringify({
					threadTs: params.threadTs,
					channelId: params.channelId,
				}),
				style: "danger",
			},
			// admin権限がないとできない。
			//{
			//  type: "button",
			//  text: {
			//    type: "plain_text",
			//    text: "画像を削除する",
			//    emoji: true
			//  },
			//  action_id: ACTION_IDs.DELETE_IMAGES,
			//  value: JSON.stringify({
			//    threadTs: params.threadTs,
			//    channelId: params.channelId
			//  }),
			//  style: "danger"
			//}
		],
	};

	return [...baseBlocks, ...newlyCreatedBlocks, ...duplicateBlock, actionBlock];
};

export const errorBlocks = (errorMessage: string): AnyMessageBlock[] => {
	return [
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: errorMessage,
			},
			accessory: {
				type: "image",
				image_url:
					"https://corporate.piano.or.jp/assets/img/material-ptnyan_37.webp",
				alt_text: "cute cat",
			},
		},
	];
};
