import type { FileElement } from "slack-cloudflare-workers";

/**
 * mimetypeがimage/で始まるファイルのみを取得
 */
export function getValidImageFiles(files: FileElement[] | undefined) {
	if (!files) return [];
	return files.filter((file) => file.id && file.mimetype?.startsWith("image/"));
}
