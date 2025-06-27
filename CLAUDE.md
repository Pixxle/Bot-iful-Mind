# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server with ngrok tunnel and webhook setup
- `npm run setup` - Initialize local DynamoDB tables and environment
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run the compiled application
- `npm test` - Run Jest test suite
- `npm run lint` - Run ESLint on source files
- `npm run typecheck` - Run TypeScript compiler without emitting files
- `npm run format` - Format code with Prettier

### Webhook Management
- `npm run set-webhook` - Set Telegram webhook URL
- `npm run clear-webhook` - Clear Telegram webhook

### Local Development Setup
1. Run `docker-compose up -d` to start local DynamoDB
2. Run `npm run setup` to initialize database tables
3. Run `npm run dev` to start development server with tunnel

## Architecture Overview

### Core Flow
The bot follows a sophisticated routing pattern:
1. **Message Reception**: Telegram webhook → `api/webhook.ts` → `MessageHandler`
2. **Intelligent Routing**: `ToolRouter` uses LLM to analyze if message needs tool usage
3. **Tool Execution**: If tool needed, executes via `ToolRegistry` with proper logging
4. **Response Formatting**: `ResponseFormatter` creates user-friendly responses

### Key Components

**MessageHandler** (`src/bot/messageHandler.ts`)
- Central orchestrator that coordinates the entire message processing flow
- Handles text messages and voice transcription
- Implements comprehensive logging with timing metrics
- Manages error handling and context propagation

**ToolRouter** (`src/llm/toolRouter.ts`) 
- Uses LLM to intelligently determine when tools are needed vs direct responses
- Analyzes user intent and routes to appropriate tools
- Provides fallback mechanism when tools are unavailable

**ToolRegistry** (`src/tools/index.ts`)
- Plugin-based architecture for tool management
- Auto-registers tools: WeatherTool, SearchTool, ButcherTool
- Converts Zod schemas to LLM-readable parameter descriptions
- Provides centralized tool discovery

**BaseTool** (`src/tools/base.ts`)
- Abstract base class for all tools with built-in logging
- Standardized error handling and response formatting
- Zod schema validation for parameters
- Execution timing and metrics collection

### Infrastructure

**Database Layer** (`src/db/`)
- DynamoDB integration with rate limiting per user
- Uses AWS SDK v3 with proper error handling
- Supports both local (Docker) and production AWS environments

**Voice Processing** (`src/bot/voiceProcessor.ts`)
- OpenAI Whisper integration for voice message transcription
- Handles Telegram voice message format conversion

**Deployment**
- Vercel serverless functions with 30-second timeout
- GitHub Actions for CI/CD with automated testing
- Environment-specific configurations via Vercel

### Tool Development Pattern

When creating new tools:

1. **Extend BaseTool**: Inherit from `src/tools/base.ts`
2. **Define Schema**: Use Zod for parameter validation
3. **Register Tool**: Add to `ToolRegistry` constructor in `src/tools/index.ts`
4. **Implement Logic**: Focus on the `execute()` method
5. **Error Handling**: Use `createSuccessResponse()` and `createErrorResponse()`

Example structure:
```typescript
export class MyTool extends BaseTool {
  name = 'mytool';
  description = 'Tool description for LLM routing';
  protected parametersSchema = z.object({
    param: z.string()
  });

  async execute(input: ToolInput): Promise<ToolOutput> {
    // Implementation
  }
}
```

### Context and Logging

**RequestContext** (`src/utils/requestContext.ts`)
- Thread-local storage for request-scoped data
- Tracks user ID, message context, and tool usage
- Provides structured logging throughout the request lifecycle

**Logger** (`src/utils/logger.ts`)
- Winston-based structured logging
- Component-based log categorization
- Built-in tool execution timing and metrics

### Environment Configuration

Required environment variables:
- `TELEGRAM_BOT_TOKEN` - Bot authentication
- `OPENAI_API_KEY` - LLM and voice processing
- `AWS_REGION`, DynamoDB configuration
- `WEBHOOK_URL` - Vercel deployment URL

Optional tool-specific variables:
- `WEATHER_API_KEY` - OpenWeatherMap
- `SEARCH_API_KEY` - Google Custom Search

### Testing Strategy

- Unit tests for tools in `tests/tools/`
- Jest configuration with TypeScript support
- Focus on tool logic and error handling
- Mock external API dependencies

The codebase emphasizes modularity, comprehensive logging, and intelligent message routing to provide a robust foundation for extending bot capabilities.

## MCP Servers and Capabilities

The following MCP (Model Context Protocol) servers are available when working with Claude Code in this repository:

### Serena (Code Analysis & Editing)
**Primary use case**: Advanced code analysis, symbol manipulation, and project understanding

**Key capabilities**:
- `find_symbol`, `find_referencing_symbols` - Symbol-based code navigation
- `replace_symbol_body`, `insert_after_symbol`, `insert_before_symbol` - Intelligent code editing
- `get_symbols_overview`, `list_dir` - Project structure analysis
- `search_for_pattern` - Pattern searching across codebase
- `write_memory`, `read_memory` - Memory system for storing project knowledge
- Code thinking and validation tools for quality assurance

### Context7 (Documentation & Library Reference)
**Primary use case**: Fetching up-to-date documentation for libraries and frameworks

**Key capabilities**:
- `resolve-library-id` - Library ID resolution for popular packages
- `get-library-docs` - Documentation retrieval with topic filtering
- Support for major frameworks and libraries (React, Node.js, TypeScript, etc.)

### Sequential Thinking (Problem Solving)
**Primary use case**: Complex problem analysis and multi-step reasoning

**Key capabilities**:
- Dynamic problem-solving through structured thoughts
- Hypothesis generation and verification
- Adaptive planning with course correction
- Multi-step solution development

### When to Use Each MCP Server

**Use Serena when**:
- Analyzing code structure or finding specific symbols/functions in this bot codebase
- Making targeted code edits that require understanding of code relationships
- Working with the tool system (`src/tools/`) or message handling flow
- Need to remember project-specific information across sessions
- Understanding the LLM routing architecture or DynamoDB integration

**Use Context7 when**:
- Need current documentation for dependencies like Telegraf, OpenAI, AWS SDK, or Winston
- Looking up API references for external services (Telegram Bot API, OpenAI)
- Want to understand best practices for TypeScript, Jest, or Vercel deployment
- Researching new tools or libraries to add to the bot

**Use Sequential Thinking when**:
- Breaking down complex bot feature implementations
- Planning multi-step debugging approaches for message flow issues
- Designing new tool integrations that require careful consideration
- Analyzing performance optimization strategies for the serverless architecture