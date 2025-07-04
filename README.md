# Bot-iful Mind

A modular Telegram bot with tool integration, built with TypeScript and deployed on Vercel. Features a plugin-based architecture for extensible tool support and intelligent LLM-based routing.

## Features

- 🤖 **Intelligent Tool Routing**: Uses LLM to determine when to use tools vs direct responses
- 🔧 **Modular Tool System**: Easy-to-extend plugin architecture for adding new tools
- 🎤 **Voice Message Support**: Transcribes voice messages using OpenAI Whisper
- 🚦 **Rate Limiting**: DynamoDB-based per-user daily message limits
- 🚀 **Serverless Deployment**: Runs on Vercel with AWS backend
- 🔄 **CI/CD Pipeline**: Automated testing and deployment with GitHub Actions

## Architecture

```
User Message → Telegram Webhook → Message Handler
                                         ↓
                                   LLM Router
                                    ↙        ↘
                            Tool Usage    Direct Response
                                ↓              ↓
                          Tool Execution       ↓
                                ↓              ↓
                          Response Formatter ←─┘
                                ↓
                            User Response
```

## Prerequisites

- Node.js 20+
- npm or yarn
- AWS Account
- Vercel Account
- Telegram Bot Token
- OpenAI API Key

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd bot-iful-mind
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

- `TELEGRAM_BOT_TOKEN`: From @BotFather on Telegram
- `OPENAI_API_KEY`: From OpenAI platform
- AWS credentials and region
- Optional: Weather and Search API keys

### 3. Local Development

Start local DynamoDB:

```bash
docker-compose up -d
```

Initialize local database:

```bash
npm run setup
```

Run development server:

```bash
npm run dev
```

### 4. Deploy to Vercel

Install Vercel CLI:

```bash
npm i -g vercel
```

Deploy:

```bash
vercel
```

Set webhook URL:

```bash
curl -X POST https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-deployment.vercel.app/api/webhook"}'
```

## Development

### Project Structure

```
src/
├── bot/          # Telegram bot handlers
├── llm/          # LLM integration
├── tools/        # Tool implementations
├── db/           # Database layer
└── types/        # TypeScript definitions
```

### Creating a New Tool

1. Create a new file in `src/tools/implementations/`:

```typescript
import { BaseTool } from '../base';
import { ToolInput, ToolOutput } from '../../types';

export class MyTool extends BaseTool {
  name = 'mytool';
  description = 'What this tool does';

  async execute(input: ToolInput): Promise<ToolOutput> {
    try {
      // Your tool logic here
      return this.createSuccessResponse(data);
    } catch (error) {
      return this.createErrorResponse('Error message');
    }
  }
}
```

2. Register in `src/tools/index.ts`:

```typescript
this.register(new MyTool());
```

### Testing

Run tests:

```bash
npm test
```

Lint code:

```bash
npm run lint
```

Type check:

```bash
npm run typecheck
```

## Environment Variables

| Variable                      | Description                  | Required         |
| ----------------------------- | ---------------------------- | ---------------- |
| `TELEGRAM_BOT_TOKEN`          | Telegram bot token           | Yes              |
| `OPENAI_API_KEY`              | OpenAI API key               | Yes              |
| `AWS_REGION`                  | AWS region                   | Yes              |
| `DYNAMODB_TABLE_NAME`         | DynamoDB table name          | Yes              |
| `WEBHOOK_URL`                 | Vercel deployment URL        | Yes              |
| `DEFAULT_DAILY_MESSAGE_LIMIT` | Daily message limit          | No (default: 10) |
| `WEATHER_API_KEY`             | OpenWeatherMap API key       | No               |
| `SEARCH_API_KEY`              | Google Custom Search API key | No               |

## Deployment

### GitHub Actions

The project includes two workflows:

2. **Deploy**: Runs tests and deploys to Vercel

Required GitHub Secrets:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### Production Checklist

- [ ] Set all required environment variables in Vercel
- [ ] Configure Telegram webhook URL
- [ ] Enable DynamoDB backups
- [ ] Set up monitoring and alerts
- [ ] Configure custom domain (optional)

## Troubleshooting

### Bot not responding

1. Check webhook status:

```bash
curl https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo
```

2. Check Vercel function logs
3. Verify environment variables

### Rate limiting issues

Check DynamoDB table in AWS Console or use local admin UI:

```
http://localhost:8001
```

### Voice messages not working

Ensure `OPENAI_API_KEY` is set and has Whisper API access.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT
