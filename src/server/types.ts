/**
 * MCP Server Type Definitions
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Tool definition for MCP
 */
export interface MCPTool extends Tool {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Server configuration
 */
export interface ServerConfig {
  presetsDir?: string;
  apiUrl?: string;
  serverName?: string;
  serverVersion?: string;
  debug?: boolean;
}