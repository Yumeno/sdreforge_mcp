#!/usr/bin/env node

/**
 * SD WebUI Reforge MCP Server Entry Point
 */

import { MCPServer } from './server';

async function main() {
  try {
    const server = new MCPServer({
      debug: process.env.DEBUG === 'true'
    });

    await server.start();
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('Shutting down MCP server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Shutting down MCP server...');
  process.exit(0);
});

// Start server
main();