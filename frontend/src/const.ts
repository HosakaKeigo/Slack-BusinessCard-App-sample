export const BLOCK_IDs = {
	SUMMARY: "summary_actions",
};
export const ACTION_IDs = {
	OPEN_FILEMAKER: "open_record",
	DELETE_MESSAGES: "delete_messages",
	CREATE_RECORD: "create_record",
	SEARCH_RECORD: "search_record",
	//DELETE_IMAGES: 'delete_images'
};

/**
 * Cloudflare WorkersのSimultaneous open connectionsは6まで。最大でも5あたりが限界
 *
 * https://developers.cloudflare.com/workers/platform/limits/#simultaneous-open-connections
 */
export const MAX_IMAGE_COUNT = 5;
