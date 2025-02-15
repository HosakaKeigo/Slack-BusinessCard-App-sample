import type { FileElement } from "slack-cloudflare-workers";
import type { BusinessCardInfo } from "../types";

/**
 * 画像を解析してJSON -> FileMakerに保存する
 */
export const processImage = async ({
	botToken,
	file,
	backend,
	baseUrl,
}: {
	botToken: string;
	file: FileElement;
	backend: Service;
	baseUrl: string;
}) => {
	const imageUrl = file.url_private_download;
	const res = await fetch(imageUrl, {
		headers: {
			Authorization: `Bearer ${botToken}`,
		},
	});
	if (!res.ok) {
		throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
	}
	const buffer = await res.arrayBuffer();
	const base64 = Buffer.from(new Uint8Array(buffer as ArrayBuffer)).toString(
		"base64",
	);
	const base64Data = `data:${file.mimetype};base64,${base64}`;

	// Service BindingによるBackendへのリクエスト
	console.log("Request to backend start");
	const backendResponse = await backend.fetch(
		new URL("/upload", baseUrl).toString(),
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				image: base64Data,
			}),
		},
	);
	console.log("Request to backend end");

	const jsonResult = (await backendResponse.json()) as {
		success: boolean;
		message?: string;
		namecard: BusinessCardInfo;
		/**
		 * 重複可能性のある名刺情報かどうか
		 *
		 * この場合はレコードは作らず、結果メッセージのボタンを押して初めて作成される
		 */
		mayBeDuplicate: boolean;
	};
	if (!jsonResult.success) {
		throw new Error(jsonResult.message);
	}

	return {
		data: {
			...jsonResult.namecard,
			mayBeDuplicate: jsonResult.mayBeDuplicate,
		},
	};
};
