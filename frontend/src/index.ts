import { SlackApp, type SlackEdgeAppEnv } from "slack-cloudflare-workers";
import { processImage } from "./helpers/processImage";
import {
	postMessage,
	postSuccessResults,
	postFailureResults,
	postSummary,
	postErrorResponse,
	type BaseMessageParams,
} from "./helpers/slackMessages";
import { classifyResults } from "./helpers/processResults";
import { getValidImageFiles } from "./helpers/validation";
import type {
	BusinessCardInfo,
	ProcessFailureResult,
	ProcessResult,
	ProcessSuccessResult,
} from "./types";
import { ACTION_IDs, MAX_IMAGE_COUNT } from "./const";
import { errorBlocks } from "./helpers/slackBlocks";
import { openFileUrl } from "./filemakerConfig";

export default {
	async fetch(
		request: Request,
		env: Env & SlackEdgeAppEnv,
		ctx: ExecutionContext,
	): Promise<Response> {
		const app = new SlackApp({ env });

		/**
		 * 添付ファイル付きメッセージのリスナー
		 */
		app.event("message", async ({ context, payload }) => {
			console.log(payload);
			if (payload.subtype !== "file_share") {
				return;
			}

			const baseMessageParams: BaseMessageParams = {
				client: app.client,
				channelId: context.channelId,
				threadTs: payload.ts,
			};

			const validFiles = getValidImageFiles(payload.files);
			if (validFiles.length === 0) {
				await postMessage({
					...baseMessageParams,
					text: "画像を添付してください",
				});
				return;
			}

			if (validFiles.length > MAX_IMAGE_COUNT) {
				await postMessage({
					...baseMessageParams,
					text: `:warning: 画像は最大${MAX_IMAGE_COUNT}枚までです`,
					blocks: errorBlocks(`画像は最大${MAX_IMAGE_COUNT}枚までです`),
				});
				return;
			}

			try {
				// 開始メッセージ
				console.log(`Processing ${validFiles.length} images...`);
				await postMessage({
					...baseMessageParams,
					text: `:flashlight: 解析中...（:bookmark: ${validFiles.length}枚）`,
				});

				const results: ProcessResult[] = await Promise.all(
					validFiles.map((image) =>
						processImage({
							file: image,
							botToken: context.botToken,
							backend: env.SLACKBOT_TO_NAMECARD_BACKEND,
							baseUrl: request.url,
						})
							.then(
								(result): ProcessSuccessResult => ({
									fileName: image.name,
									result: {
										success: true,
										error: null,
										data: result.data,
									},
								}),
							)
							.catch(
								(error): ProcessFailureResult => ({
									fileName: image.name,
									result: {
										success: false,
										error: error instanceof Error ? error.message : String(error),
										data: null,
									},
								}),
							),
					),
				);

				const { successes, failures, total } = classifyResults(results);
				console.log(`Success: ${successes.length}, Failure: ${failures.length}`);

				// 結果通知
				if (successes.length > 0) {
					await postSuccessResults({
						...baseMessageParams,
						results: successes,
					});
				}

				if (failures.length > 0) {
					await postFailureResults({
						...baseMessageParams,
						results: failures,
					});
				}

				await postSummary({
					...baseMessageParams,
					totalCount: total,
					successes,
					successCount: successes.length,
					failureCount: failures.length,
					buttonUrl: openFileUrl,
				});
			} catch (e) {
				console.error(e);
				const errorMessage = e instanceof Error ? e.message : String(e);
				await postErrorResponse({
					...baseMessageParams,
					errorMessage,
				});
			}
		});

		app.action(ACTION_IDs.OPEN_FILEMAKER, async () => {
			return {
				status: 200,
			};
		});

		app.action(ACTION_IDs.SEARCH_RECORD, async () => {
			return {
				status: 200,
			};
		});

		app.action(ACTION_IDs.CREATE_RECORD, async ({ payload }) => {
			console.log(payload);
			const action = payload.actions.filter(action => action.action_id === ACTION_IDs.CREATE_RECORD)[0];
			if (action.type !== "button") {
				console.error("Invalid action type");
				return {
					status: 400,
				}
			}

			const { threadTs, channelId } = JSON.parse(action.value);
			if (!channelId || !threadTs) {
				await postErrorResponse({
					client: app.client,
					channelId,
					threadTs,
					errorMessage: "エラーが発生しました: channelId or threadTs is not found",
				})
				return {
					status: 400,
				};
			}

			// レコード作成リクエスト
			const recordData: BusinessCardInfo = JSON.parse(action.value).data;
			try {
				const response = await env.SLACKBOT_TO_NAMECARD_BACKEND.fetch(
					new URL("/createRecord", request.url).toString(),
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify(recordData),
					}
				)
				if (!response.ok) {
					throw new Error(`Failed to create record: ${response.status} ${response.statusText}`);
				}
				const resJson = await response.json() as { success: boolean, message?: string };
				if (!resJson.success) {
					throw new Error(resJson.message);
				}
				console.log(resJson.message);

				await postMessage({
					client: app.client,
					channelId,
					threadTs,
					text: `レコードを作成しました: ${recordData.name}${recordData.name_kana ? ` (${recordData.name_kana})` : ""}`,
					blocks: [
						{
							type: "section",
							text: {
								type: "mrkdwn",
								text: `:white_check_mark: *レコードを作成しました*: ${recordData.name}${recordData.name_kana ? ` (${recordData.name_kana})` : ""}`
							}
						}
					]
				})
				return {
					status: 200,
				}
			}
			catch (e) {
				await postErrorResponse({
					client: app.client,
					channelId,
					threadTs,
					errorMessage: `エラーが発生しました: ${e instanceof Error ? e.message : String(e)}`,
				});
				return {
					status: 400,
				}
			}
		});

		app.action(
			ACTION_IDs.DELETE_MESSAGES,
			async () => {
				return { status: 200 };
			},
			async ({ payload }) => {
				const action = payload.actions.filter(
					(action) => action.action_id === ACTION_IDs.DELETE_MESSAGES,
				)[0];
				if (action.type === "button") {
					const { threadTs, channelId } = JSON.parse(action.value);
					if (!channelId || !threadTs) {
						console.error("channelId or threadTs is not found");
						return;
					}
					// delete thread messages
					const { messages } = await app.client.conversations.replies({
						channel: channelId,
						ts: threadTs,
					});

					if (!messages) {
						console.error("messages is not found");
						return;
					}

					const botMessageTs = messages
						?.filter((message) => message.bot_id && message.ts)
						.map((botMessage) => botMessage.ts as string);

					await Promise.all(
						botMessageTs.map((ts) =>
							app.client.chat
								.delete({
									channel: channelId,
									ts,
								})
								.catch((e) => {
									console.error("Failed to delete message:", e);
								}),
						),
					);
				}
			},
		);

		// admin権限がないとできない。
		//app.action(ACTION_IDs.DELETE_IMAGES,
		//	async () => {
		//		return { status: 200 };
		//	},
		//	async ({ payload }) => {
		//		const action = payload.actions.filter(action => action.action_id === ACTION_IDs.DELETE_IMAGES)[0];
		//		if (action.type === "button") {
		//			const { threadTs, channelId } = JSON.parse(action.value);
		//			if (!channelId || !threadTs) {
		//				console.error("channelId or threadTs is not found");
		//				return;
		//			}

		//			const { messages } = await app.client.conversations.replies({
		//				channel: channelId,
		//				ts: threadTs,
		//			});

		//			if (!messages) {
		//				console.error("messages is not found");
		//				return;
		//			}

		//			// 全メッセージから画像ファイルのIDを収集
		//			const imageIds = messages
		//				.flatMap(message => message.files ?? [])
		//				.filter(file =>
		//					file.mimetype?.startsWith("image/") && file.id
		//				)
		//				.map(file => file.id as string);

		//			if (imageIds.length === 0) {
		//				return;
		//			}

		//			// 画像の削除を並列実行
		//			await Promise.all(
		//				imageIds.map(fileId =>
		//					app.client.files.delete({ file: fileId })
		//						.catch(error => {
		//							console.error(`Failed to delete file ${fileId}:`, error);
		//						})
		//				)
		//			);
		//		}
		//	});

		return await app.run(request, ctx);
	},
};
