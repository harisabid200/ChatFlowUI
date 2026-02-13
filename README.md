# ChatFlowUI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://hub.docker.com/r/chatflowui/chatflowui)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

A self-hosted, premium chatbot widget system for n8n. Design beautiful chat widgets, connect them to your n8n workflows, and embed them on any website.

## Features

- 🎨 **Premium Widget Styles** - 4 built-in themes + custom CSS support
- 🔌 **n8n Integration** - Seamless webhook communication
- 💾 **Self-Hosted** - Your data stays on your server
- 🔒 **CORS Protection** - Control which websites can use your widgets
- 📱 **Responsive** - Works on desktop and mobile
- ⚡ **Real-time** - WebSocket-powered instant messaging
- 🎯 **Multi-tenant** - Manage multiple chatbots from one dashboard

## Quick Start

### Docker (Recommended)

```bash
# Single command install
docker run -d \
  --name chatflowui \
  -p 7861:7861 \
  -v chatflowui_data:/app/data \
  chatflowui/chatflowui:latest

# View auto-generated credentials
docker logs chatflowui
```

Or with docker-compose:

```bash
curl -O https://raw.githubusercontent.com/yourorg/chatflowui/main/docker-compose.yml
docker-compose up -d
docker-compose logs chatflowui
```

### NPM

```bash
npm install -g chatflowui
chatflowui start
```

## First Run

1. Open `http://your-server:7861` in your browser
2. Login with the credentials shown in the terminal
3. Change your password when prompted
4. Create your first chatbot
5. Connect it to your n8n workflow
6. Copy the embed code to your website

## n8n Integration

### Step 1: Create Webhook in n8n

Add a **Webhook** node at the start of your workflow:
- HTTP Method: `POST`
- Path: `my-chatbot` (any name)
- Response: `Using 'Respond to Webhook' node`

### Step 2: Add Response Node

At the end of your workflow, add a **Respond to Webhook** node:
- Respond With: `JSON`
- Response Body:
```json
{
  "message": "{{ $json.response }}",
  "quickReplies": ["Option A", "Option B"]
}
```

### Step 3: Connect in ChatFlowUI

1. Copy your n8n webhook URL (e.g., `https://n8n.example.com/webhook/my-chatbot`)
2. Paste it in ChatFlowUI when creating a chatbot
3. Click "Test Connection" to verify

### Message Format

ChatFlowUI sends messages to n8n in this format:
```json
{
  "chatbotId": "abc123",
  "sessionId": "sess_xyz789",
  "message": "Hello!",
  "metadata": {
    "name": "John",
    "email": "john@example.com"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Widget Embed Code

Add this to your website before `</body>`:

```html
<script>
  (function(w,d,s,o,f,js,fjs){
    w['ChatFlowUI']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','chatflowui','https://your-server:7861/widget/widget.js'));
  
  chatflowui('init', { chatbotId: 'your-chatbot-id' });
</script>
```

## Configuration

All settings are optional. ChatFlowUI auto-generates secure defaults on first run.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `7861` | Server port |
| `HOST` | `0.0.0.0` | Bind address |
| `ADMIN_USERNAME` | `admin` | Admin username |
| `ADMIN_PASSWORD` | (generated) | Admin password |
| `JWT_SECRET` | (generated) | JWT signing key |
| `DATABASE_PATH` | `./data/chatflowui.db` | SQLite database location |

## Development

```bash
# Clone repository
git clone https://github.com/yourorg/chatflowui.git
cd chatflowui

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
chatflowui/
├── server/          # Express.js backend
├── admin/           # React admin dashboard
├── widget/          # Embeddable chat widget
├── Dockerfile
└── docker-compose.yml
```

## API Reference

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user

### Chatbots
- `GET /api/chatbots` - List chatbots
- `POST /api/chatbots` - Create chatbot
- `GET /api/chatbots/:id` - Get chatbot
- `PUT /api/chatbots/:id` - Update chatbot
- `DELETE /api/chatbots/:id` - Delete chatbot
- `GET /api/chatbots/:id/embed` - Get embed code

### Themes
- `GET /api/themes` - List themes
- `POST /api/themes` - Create theme
- `PUT /api/themes/:id` - Update theme
- `DELETE /api/themes/:id` - Delete theme
- `POST /api/themes/:id/duplicate` - Duplicate theme

### Widget
- `GET /widget/:chatbotId/config` - Get widget configuration
- `POST /widget/:chatbotId/message` - Send message

### Webhook (from n8n)
- `POST /webhook/:chatbotId/response` - Receive bot response

## Community

- 📖 [Documentation](https://github.com/yourusername/chatflowui/wiki)
- 🐛 [Report Bug](https://github.com/yourusername/chatflowui/issues/new?template=bug_report.md)
- 💡 [Request Feature](https://github.com/yourusername/chatflowui/issues/new?template=feature_request.md)
- 💬 [Discussions](https://github.com/yourusername/chatflowui/discussions)
- 🤝 [Contributing](CONTRIBUTING.md)
- 🔒 [Security Policy](SECURITY.md)

## Roadmap

See [open issues](https://github.com/yourusername/chatflowui/issues) for planned features and known issues.

## Contributors

Thanks to all contributors! 🎉

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/chatflowui&type=Date)](https://star-history.com/#yourusername/chatflowui&Date)

## License

MIT
