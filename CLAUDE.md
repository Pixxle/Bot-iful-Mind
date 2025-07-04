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

- GitHub Actions for CI/CD with automated testing
- Vercel integration

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
    param: z.string(),
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

### Serena (Code Analysis & Editing) - **PREFERRED FOR ALL CODE WORK**

**Primary use case**: Advanced code analysis, symbol manipulation, and project understanding

**Core Navigation & Discovery**:

- `find_symbol` - Find classes, functions, methods, variables by name/path patterns
- `find_referencing_symbols` - Find all references to a symbol (usage analysis, subclasses)
- `get_symbols_overview` - Get high-level view of file/directory structure and symbols
- `list_dir` - Directory listing with gitignore respect
- `search_for_pattern` - Regex pattern search across codebase with context

**Intelligent Code Editing**:

- `replace_symbol_body` - Replace entire function/class/method body intelligently
- `insert_after_symbol` / `insert_before_symbol` - Add code relative to symbols
- `replace_regex` - Advanced regex-based replacements with wildcards
- `replace_lines` / `delete_lines` / `insert_at_line` - Line-based editing
- `create_text_file` - Create new files (use sparingly, prefer editing existing)

**Project Memory & Context**:

- `write_memory` / `read_memory` / `list_memories` - Persistent project knowledge
- `think_about_collected_information` - Analyze gathered information
- `think_about_task_adherence` - Verify you're on track with requirements
- `think_about_whether_you_are_done` - Check completion status
- `summarize_changes` - Document what was modified

**Development Workflow**:

- `execute_shell_command` - Run build, test, lint commands with output capture
- `onboarding` / `check_onboarding_performed` - Project setup and configuration
- `restart_language_server` - Fix language server state issues

**Advanced Features**:

- Symbol-based operations understand code structure (classes, methods, imports)
- Automatic code relationship analysis (find all usages, inheritance)
- Context-aware editing that preserves formatting and conventions
- Memory system for complex multi-session work

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

**Use Serena for ALL code work including**:

- **Code Discovery**: Finding any symbol, class, function, or variable in the codebase
- **Impact Analysis**: Understanding what code references or depends on a symbol
- **Intelligent Refactoring**: Symbol-aware editing that preserves code relationships
- **Architecture Understanding**: Getting high-level overviews of modules and their structure
- **Complex Editing**: Multi-step code changes that require understanding context
- **Tool Development**: Working with the tool system (`src/tools/`) and adding new capabilities
- **Message Flow Analysis**: Understanding the bot's request processing pipeline
- **Database Integration**: Working with DynamoDB service and rate limiting
- **LLM Integration**: Modifying the OpenAI client and tool routing logic
- **Testing & Validation**: Running lints, tests, and builds with proper error handling
- **Project Memory**: Storing insights about architecture decisions and patterns
- **Session Continuity**: Maintaining context across multiple development sessions

**Serena vs Traditional Tools**:

- **Use Serena**: When you need to understand code relationships, find symbols, or make intelligent edits
- **Use Read/Edit**: Only for simple file reading or when Serena tools aren't sufficient
- **Always prefer Serena** for any task involving code analysis, symbol manipulation, or project understanding

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

## Serena MCP Usage Examples

### Code Discovery Workflow

```
1. `get_symbols_overview src/` - Get project structure overview
2. `find_symbol ToolRouter` - Find the tool routing logic
3. `find_referencing_symbols ToolRouter src/` - See what uses the router
4. `search_for_pattern "error.*handling"` - Find error handling patterns
```

### Intelligent Code Editing Workflow

```
1. `find_symbol execute src/tools/` - Find all tool execute methods
2. `get_symbols_overview src/tools/implementations/` - See available tools
3. `replace_symbol_body MyTool/execute src/tools/implementations/mytool.ts` - Update logic
4. `insert_after_symbol MyTool src/tools/implementations/mytool.ts` - Add helper method
```

### Development & Testing Workflow

```
1. `execute_shell_command "npm run lint"` - Check code quality
2. `execute_shell_command "npm test"` - Run test suite
3. `think_about_collected_information` - Analyze results
4. `summarize_changes` - Document what was done
```

### Project Memory Usage

```
1. `write_memory "tool-architecture" "..." - Store architectural insights
2. `read_memory "tool-architecture"` - Retrieve stored knowledge
3. `list_memories` - See all available project memories
```

**Key Benefits of Using Serena**:

- **Faster Development**: Symbol-based navigation is much faster than manual file searching
- **Better Code Quality**: Understanding relationships prevents breaking changes
- **Persistent Knowledge**: Memory system maintains context across sessions
- **Integrated Workflow**: Single tool for analysis, editing, testing, and documentation
