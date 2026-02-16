# ChatFlowUI Deployment Guide

## Overview

ChatFlowUI supports two deployment scenarios using the **same Docker image**:

1. **Direct Port Access**: `http://your-domain.com:7861/`
2. **Reverse Proxy Subpath**: `http://your-domain.com/7861/`

The base path is configured at **runtime** using the `BASE_PATH` environment variable.

## Scenario 1: Direct Port Access (Default)

This is the simplest deployment where users access ChatFlowUI directly via port 7861.

### Docker Run Command

```bash
docker run -d \
  --name chatflowui \
  --restart unless-stopped \
  -p 7861:7861 \
  -v chatflowui_data:/app/data \
  harisabid/chatflowui:latest
```

### Access

- Admin Dashboard: `http://your-domain.com:7861/`
- API: `http://your-domain.com:7861/api`

**No additional configuration needed!**

---

## Scenario 2: Reverse Proxy Subpath

This is for setups where you want ChatFlowUI at a subpath (e.g., alongside n8n).

### Docker Run Command

```bash
docker run -d \
  --name chatflowui \
  --restart unless-stopped \
  -p 7861:7861 \
  -e BASE_PATH=/7861/ \
  -v chatflowui_data:/app/data \
  harisabid/chatflowui:latest
```

**Key difference**: Added `-e BASE_PATH=/7861/`

### Nginx Configuration

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
        proxy_pass http://localhost:7861/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Caddy Configuration

```caddy
your-domain.com {
    # n8n at root
    reverse_proxy localhost:5678

    # ChatFlowUI at /7861/
    handle_path /7861/* {
        reverse_proxy localhost:7861
    }
}
```

### Access

- Admin Dashboard: `http://your-domain.com/7861/`
- API: `http://your-domain.com/7861/api`

---

## Docker Compose Example

### Scenario 1: Direct Port Access

```yaml
version: '3.8'

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

### Scenario 2: Reverse Proxy Subpath

```yaml
version: '3.8'

services:
  chatflowui:
    image: harisabid/chatflowui:latest
    container_name: chatflowui
    restart: unless-stopped
    ports:
      - "7861:7861"
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
| `BASE_PATH` | `/` | Base path for the application. Use `/` for port-based access, `/7861/` for subpath access |
| `PORT` | `7861` | Port the server listens on |
| `HOST` | `0.0.0.0` | Host to bind to |
| `NODE_ENV` | `production` | Node environment |
| `JWT_SECRET` | Auto-generated | JWT secret for authentication |
| `ADMIN_PASSWORD` | Auto-generated | Admin password (shown in logs on first run) |

---

## Troubleshooting

### Assets Return 404 Errors

**Symptom**: White screen, browser console shows 404 for `/assets/index-*.js`

**Solution**: 
1. Check if `BASE_PATH` is set correctly
2. Verify the container restarted after setting `BASE_PATH`
3. Check container logs: `docker logs chatflowui`

### Login Fails After Changing BASE_PATH

**Symptom**: "Invalid credentials" error

**Solution**: The database is stored in the volume. If you change `BASE_PATH`, you may need to:
1. Clear browser cookies
2. Try in incognito mode
3. Or reset the container: `docker rm -f chatflowui && docker volume rm chatflowui_data`

### Reverse Proxy Returns 502 Bad Gateway

**Symptom**: Nginx/Caddy shows 502 error

**Solution**:
1. Verify ChatFlowUI container is running: `docker ps`
2. Check container is healthy: Look for "healthy" status
3. Verify port mapping: Container should expose 7861
4. Check logs: `docker logs chatflowui`

### WebSocket Connection Fails

**Symptom**: Real-time updates don't work

**Solution**: Ensure your reverse proxy forwards WebSocket connections:
- Nginx: Add `proxy_http_version 1.1;` and `Upgrade`/`Connection` headers
- Caddy: WebSocket support is automatic

---

## Verification

After deployment, verify everything works:

```bash
# 1. Check container is healthy
docker ps

# 2. Check logs for admin credentials
docker logs chatflowui | grep "Password:"

# 3. Test health endpoint
curl http://localhost:7861/health

# 4. Access admin dashboard in browser
# - Direct: http://your-domain.com:7861/
# - Subpath: http://your-domain.com/7861/
```

---

## Security Recommendations

1. **Change admin password** immediately after first login
2. **Use HTTPS** in production (configure in your reverse proxy)
3. **Set custom JWT_SECRET** via environment variable
4. **Regular backups** of the `chatflowui_data` volume
5. **Keep Docker image updated**: `docker pull harisabid/chatflowui:latest`

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
