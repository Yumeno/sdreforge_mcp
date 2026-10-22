/**
 * MCP server directory resolution
 * ログ・出力ファイルの基準ディレクトリ(MCP_DIR)を解決する
 */

import * as path from 'path';

let cachedMcpDir: string | undefined;

/**
 * Resolve the MCP server directory (resolved once, then cached)
 * MCP_DIR環境変数を優先的に使用し、フォールバック処理も実装
 */
export function getMcpDir(): string {
  if (cachedMcpDir === undefined) {
    cachedMcpDir = resolveMcpDir();
  }
  return cachedMcpDir;
}

function resolveMcpDir(): string {
  if (process.env.MCP_DIR) {
    return process.env.MCP_DIR;
  }

  // MCP_DIRが未設定の場合の自動検出
  const cwd = process.cwd();
  const pathSegments = cwd.split(path.sep);
  const sdreforgeIndex = pathSegments.indexOf('sdreforge_mcp');

  if (sdreforgeIndex !== -1) {
    return pathSegments.slice(0, sdreforgeIndex + 1).join(path.sep);
  }

  // 最終的なフォールバック（ビルド済みの場合: dist/mcp-dir.js → プロジェクトルート）
  return path.resolve(__dirname, '..');
}
