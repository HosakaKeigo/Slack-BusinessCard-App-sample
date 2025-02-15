import type {
	ProcessResult,
	ProcessSuccessResult,
	ProcessFailureResult,
} from "../types";

/**
 * 成功処理と失敗処理のエラーマッピング
 */
export function classifyResults(results: ProcessResult[]) {
	const successes = results.filter(
		(r): r is ProcessSuccessResult => r.result.success,
	);
	const failures = results.filter(
		(r): r is ProcessFailureResult => !r.result.success,
	);

	return {
		successes,
		failures,
		total: results.length,
	};
}
