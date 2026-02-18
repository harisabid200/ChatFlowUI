# ChatFlowUI Deployment Guide

## Overview

ChatFlowUI supports two deployment scenarios using the **same Docker image**:

1. **Direct Port Access** — `http://your-server-ip:7861/`
2. **Reverse Proxy Subpath** — `https://your-domain.com/7861/` (alongside n8n)

The base path is configured at **runtime** using the `BASE_PATH` environment variable.

> ⚠️ **Common mistake**: Setting `BASE_PATH=/7861/` without a reverse proxy causes a **white screen**. `BASE_PATH` only works correctly when a reverse proxy (Nginx, Caddy, etc.) is forwarding traffic to the container. See [Troubleshooting](#troubleshooting) for details.

---

## Scenario 1: Direct Port Access (Default)

The simplest deployment — users access ChatFlowUI directly via port 7861.

### Docker Run

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

### Access

- Admin Dashboard: `http://your-server-ip:7861/`
- API: `http://your-server-ip:7861/api`

**No `BASE_PATH` needed — it defaults to `/`.**

---

## Scenario 2: VPS alongside n8n (Reverse Proxy Subpath)

Use this when n8n is already running on your domain and you want ChatFlowUI accessible at `https://your-domain.com/7861/`.

### Step 1 — Run the Container

Bind to `127.0.0.1` (localhost only) so the port is not publicly exposed — your reverse proxy handles all incoming traffic.

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

### Step 2 — Configure Your Reverse Proxy

Choose your reverse proxy below.

#### Nginx (config file)

Add this `location` block inside your existing `server {}` block:

```nginx
# ChatFlowUI at /7861/
location /7861/ {
    proxy_pass http://127.0.0.1:7861;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # WebSocket support (required for real-time chat)
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

> ⚠️ **Critical**: Do **not** add a trailing slash to `proxy_pass`. Use `http://127.0.0.1:7861` not `http://127.0.0.1:7861/`. The trailing slash strips the `/7861/` prefix before forwarding, which breaks asset loading when `BASE_PATH=/7861/` is set.

Full example with n8n at root:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # n8n at root
    location / {
        proxy_pass http://localhost:5678;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ChatFlowUI at /7861/
    location /7861/ {
        proxy_pass http://127.0.0.1:7861;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

#### Nginx Proxy Manager (NPM)

If you use the Nginx Proxy Manager UI:

1. Go to **Proxy Hosts** → **Add Proxy Host**
2. Set **Domain Names** to your domain
3. Set **Forward Hostname/IP** to `127.0.0.1` and **Forward Port** to `7861`
4. Enable **Websockets Support**
5. Go to the **Advanced** tab and add this custom config:
   ```nginx
   location /7861/ {
       proxy_pass http://127.0.0.1:7861;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
   }
   ```

#### Caddy

```caddy
your-domain.com {
    # n8n at root
    reverse_proxy localhost:5678

    # ChatFlowUI at /7861/
    handle_path /7861/* {
        rewrite * /7861/{path}
        reverse_proxy 127.0.0.1:7861
    }
}
```

### Access

- Admin Dashboard: `https://your-domain.com/7861/`
- API: `https://your-domain.com/7861/api`

---

## Docker Compose Examples

### Scenario 1: Direct Port Access

```yaml
services:
  chatflowui:
    image: harisabid/chatflowui:latest
    container_name: chatflowui
    restart: unless-stopped
    ports:
      - "7861:7861"
    volumes:
      - chatflowui_data:/app/data
    # No BASE_PATH needed - defaults to /

volumes:
  chatflowui_data:
```

### Scenario 2: Reverse Proxy Subpath (alongside n8n)

```yaml
services:
  chatflowui:
    image: harisabid/chatflowui:latest
    container_name: chatflowui
    restart: always
    ports:
      - "127.0.0.1:7861:7861"   # Bind to localhost only
    environment:
      - BASE_PATH=/7861/
    volumes:
      - chatflowui_data:/app/data

volumes:
  chatflowui_data:
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_PATH` | `/` | Base path. Use `/` for direct port access, `/7861/` for reverse proxy subpath |
| `PORT` | `7861` | Port the server listens on |
| `HOST` | `0.0.0.0` | Host to bind to |
| `NODE_ENV` | `production` | Node environment |
| `JWT_SECRET` | Auto-generated | JWT secret for authentication |
| `ADMIN_PASSWORD` | Auto-generated | Admin password (shown in logs on first run) |

---

## Troubleshooting

### White Screen When Accessing Directly at Port

**Symptom**: White screen when visiting `http://ip:7861/` after setting `BASE_PATH=/7861/`

**Cause**: `BASE_PATH=/7861/` tells the React app its assets are at `/7861/assets/...`. When you access the app directly at `http://ip:7861/`, there's no reverse proxy to route `/7861/` — the browser requests assets from a path the server doesn't serve.

**Fix**: Remove `BASE_PATH` (or set `BASE_PATH=/`) for direct port access. Only set `BASE_PATH=/7861/` when using a reverse proxy.

### Assets Return 404 Errors

**Symptom**: White screen, browser console shows 404 for `/assets/index-*.js`

**Solution**:
1. Check if `BASE_PATH` is set correctly
2. Verify the container restarted after setting `BASE_PATH`
3. Check container logs: `docker logs chatflowui`

### Nginx Returns 502 Bad Gateway

**Symptom**: Nginx shows 502 error

**Solution**:
1. Verify ChatFlowUI container is running: `docker ps`
2. Check container logs: `docker logs chatflowui`
3. Verify port binding: `ss -tlnp | grep 7861`
4. If using `127.0.0.1:7861`, ensure Nginx proxies to `127.0.0.1:7861` not `localhost:7861`

### proxy_pass Trailing Slash Breaks Assets

**Symptom**: App loads but all API calls and assets 404 after setting up Nginx

**Cause**: `proxy_pass http://127.0.0.1:7861/;` (trailing slash) strips the `/7861/` prefix before forwarding. The server receives `/` but the React app still looks for assets at `/7861/assets/...`.

**Fix**: Remove the trailing slash — use `proxy_pass http://127.0.0.1:7861;`

### Login Fails After Changing BASE_PATH

**Symptom**: "Invalid credentials" error

**Solution**:
1. Clear browser cookies
2. Try in incognito mode
3. Or reset: `docker rm -f chatflowui && docker volume rm chatflowui_data`

### WebSocket Connection Fails

**Symptom**: Real-time updates don't work

**Solution**: Ensure your reverse proxy forwards WebSocket connections:
- Nginx: Add `proxy_http_version 1.1;` and `Upgrade`/`Connection` headers (shown in configs above)
- Caddy: WebSocket support is automatic

---

## Verification

After deployment, verify everything works:

```bash
# 1. Check container is running
docker ps

# 2. Check logs for admin credentials
docker logs chatflowui

# 3. Test health endpoint
curl http://localhost:7861/health

# 4. Access admin dashboard in browser
# - Direct:   http://your-server-ip:7861/
# - Subpath:  https://your-domain.com/7861/
```

---

## Security Recommendations

1. **Change admin password** immediately after first login
2. **Use HTTPS** in production (configure in your reverse proxy)
3. **Bind to 127.0.0.1** when using a reverse proxy (`-p 127.0.0.1:7861:7861`)
4. **Set custom JWT_SECRET** via environment variable
5. **Regular backups** of the `chatflowui_data` volume
6. **Keep Docker image updated**: `docker pull harisabid/chatflowui:latest`

---

## Getting Admin Credentials

On first run, ChatFlowUI generates random credentials:

```bash
docker logs chatflowui | grep -A 5 "FIRST RUN"
```

You'll see:
```
🔑 FIRST RUN - AUTO-GENERATED CREDENTIALS
============================================================
   Username: admin
   Password: <random-password>
============================================================
```

**Save these credentials!** They're also stored in `/app/data/.credentials.json` inside the container.
