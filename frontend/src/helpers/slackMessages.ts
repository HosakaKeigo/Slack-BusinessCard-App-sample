import type { SlackAPIClient, AnyMessageBlock, SectionBlock, HeaderBlock } from "slack-cloudflare-workers";
import type { ProcessFailureResult, ProcessSuccessResult } from "../types";
import { createBusinessCardBlocks, summaryBlocks } from "./slackBlocks";

export interface BaseMessageParams {
	client: SlackAPIClient;
	channelId: string;
	threadTs: string;
	iconEmoji?: string;
}

interface MessageParams extends BaseMessageParams {
	text: string;
	blocks?: AnyMessageBlock[];
}

export type Summary = BaseMessageParams & {
	totalCount: number;
	successes: ProcessSuccessResult[];
	successCount: number;
	failureCount: number;
	buttonUrl: string;
	threadTs: string;
	channelId: string;
};

export async function postMessage({
	client,
	channelId,
	threadTs,
	text,
	blocks,
	iconEmoji,
}: MessageParams) {
	return await client.chat.postMessage({
		channel: channelId,
		thread_ts: threadTs,
		text,
		...(blocks && { blocks }),
		...(iconEmoji && { icon_emoji: iconEmoji }),
	});
}

export async function postSuccessResults(
	params: BaseMessageParams & { results: ProcessSuccessResult[] },
) {
	const businessCardBlocks = params.results.map((success) => createBusinessCardBlocks(success.fileName, success.result.data));
	// Note: Blockは最大50個まで。5つずつにまとめる。（APIリクエストを軽減するため）
	const chunks: AnyMessageBlock[][] = [];
	for (let i = 0; i < businessCardBlocks.length; i += 5) {
		chunks.push(...businessCardBlocks.slice(i, i + 5));
	}

	// 各名刺情報を個別に投稿
	await Promise.all(
		chunks.map((blocks) =>
			postMessage({
				...params,
				text: "✅ 解析結果", // fallback text
				blocks,
			}),
		),
	);
}

export async function postFailureResults(
	params: BaseMessageParams & { results: ProcessFailureResult[] },
) {
	const failureBlocks: AnyMessageBlock[] = [
		{
			type: "header",
			text: {
				type: "plain_text",
				text: "❌ 解析失敗",
				emoji: true,
			},
		},
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: params.results
					.map((failure) => `• *${failure.fileName}*\n>${failure.result.error}`)
					.join("\n\n"),
			},
		},
	];

	await postMessage({
		...params,
		text: "画像の解析に失敗しました", // fallback text
		blocks: failureBlocks,
	});
}

export async function postSummary(params: Summary) {
	await postMessage({
		...params,
		text: "処理完了レポート", // fallback text
		blocks: summaryBlocks(params),
	});
}

export async function postErrorResponse(
	params: BaseMessageParams & {
		errorMessage: string;
	},
) {
	const errorBlocks: AnyMessageBlock[] = [
		{
			type: "header",
			text: {
				type: "plain_text",
				text: "⚠️ システムエラー",
				emoji: true,
			},
		},
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: params.errorMessage,
			},
		},
	];

	await postMessage({
		...params,
		text: `システムエラーが発生しました: ${params.errorMessage}`, // fallback text
		blocks: errorBlocks,
	});
}
