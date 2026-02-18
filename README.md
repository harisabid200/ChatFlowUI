# ChatFlowUI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://hub.docker.com/r/harisabid/chatflowui)
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

There are two ways to run ChatFlowUI depending on your setup:

---

### Scenario 1: Direct Port Access (Local / Simple VPS)

Use this if you just want to run ChatFlowUI on its own — locally or on a VPS where it's the only app.

**Linux/macOS:**
```bash
docker run -d \
  --name chatflowui \
  --restart unless-stopped \
  -p 7861:7861 \
  -v chatflowui_data:/app/data \
  harisabid/chatflowui:latest
```

**Windows (PowerShell):**
```powershell
docker run -d `
  --name chatflowui `
  --restart unless-stopped `
  -p 7861:7861 `
  -v chatflowui_data:/app/data `
  harisabid/chatflowui:latest
```

Access at: **`http://localhost:7861`** (or `http://your-server-ip:7861`)

```bash
# View auto-generated credentials
docker logs chatflowui
```

> No `BASE_PATH` needed — it defaults to `/`.

---

### Scenario 2: VPS alongside n8n (Reverse Proxy)

Use this when n8n is already running on your VPS and you want ChatFlowUI accessible at `https://your-domain.com/7861/`.

**Step 1 — Run the container (bind to localhost only for security):**

**Linux/macOS:**
```bash
docker run -d \
  --name chatflowui \
  --restart unless-stopped \
  -p 127.0.0.1:7861:7861 \
  -e BASE_PATH=/7861/ \
  -v chatflowui_data:/app/data \
  harisabid/chatflowui:latest
```

**Windows (PowerShell):**
```powershell
docker run -d `
  --name chatflowui `
  --restart unless-stopped `
  -p 127.0.0.1:7861:7861 `
  -e BASE_PATH=/7861/ `
  -v chatflowui_data:/app/data `
  harisabid/chatflowui:latest
```

**Step 2 — Add this block to your Nginx config:**

```nginx
location /7861/ {
    proxy_pass http://127.0.0.1:7861;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # WebSocket support
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

> ⚠️ **Important:** Do **not** add a trailing slash to `proxy_pass` — `http://127.0.0.1:7861` not `http://127.0.0.1:7861/`. The trailing slash breaks asset loading.

Access at: **`https://your-domain.com/7861/`**

```bash
# View auto-generated credentials
docker logs chatflowui
```

For Caddy, Traefik, and Nginx Proxy Manager instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

---

### Docker Compose

```bash
curl -O https://raw.githubusercontent.com/harisabid200/ChatFlowUI/main/docker-compose.yml
docker compose up -d
docker compose logs chatflowui
```

## First Run

1. Open the URL in your browser (see above for your scenario)
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
  }(window,document,'script','chatflowui','http://<your-server-ip>:7861/widget/widget.js'));
  
  chatflowui('init', { chatbotId: 'your-chatbot-id' });
</script>
```

## Configuration

All settings are optional. ChatFlowUI auto-generates secure defaults on first run.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `7861` | Server port |
| `HOST` | `0.0.0.0` | Bind address |
| `BASE_PATH` | `/` | Base path. Use `/` for direct port access, `/7861/` for reverse proxy subpath |
| `ADMIN_USERNAME` | `admin` | Admin username |
| `ADMIN_PASSWORD` | (generated) | Admin password |
| `JWT_SECRET` | (generated) | JWT signing key |
| `DATABASE_PATH` | `./data/chatflowui.db` | SQLite database location |

## Development

```bash
# Clone repository
git clone https://github.com/harisabid200/ChatFlowUI.git
cd ChatFlowUI

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

- 📖 [Documentation](https://github.com/harisabid200/ChatFlowUI/wiki)
- 🐛 [Report Bug](https://github.com/harisabid200/ChatFlowUI/issues/new?template=bug_report.md)
- 💡 [Request Feature](https://github.com/harisabid200/ChatFlowUI/issues/new?template=feature_request.md)
- 💬 [Discussions](https://github.com/harisabid200/ChatFlowUI/discussions)
- 🤝 [Contributing](CONTRIBUTING.md)
- 🔒 [Security Policy](SECURITY.md)

## Roadmap

See [open issues](https://github.com/harisabid200/ChatFlowUI/issues) for planned features and known issues.

## Contributors

Thanks to all contributors! 🎉

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=harisabid200/ChatFlowUI&type=Date)](https://star-history.com/#harisabid200/ChatFlowUI&Date)

## License

MIT
