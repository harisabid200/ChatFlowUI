# Changelog

All notable changes to ChatFlowUI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-13

### Added
- Self-hosted chatbot widget system for n8n integration
- Real-time WebSocket messaging with Socket.io
- Multi-tenant admin dashboard with React
- 4 premium theme presets (Modern, Gradient, Minimal, Professional)
- Custom CSS and branding support
- JWT authentication with token versioning for secure logout
- Rate limiting (100 req/15min API, 30 req/min widget, 10 req/15min auth)
- Dynamic CORS validation per chatbot
- Pre-chat forms with field validation
- Quick replies support
- Markdown message rendering with DOMPurify sanitization
- Session persistence via localStorage
- Sound notifications with user mute control
- Typing indicators
- Message retry on failure
- Docker deployment with non-root user
- Graceful shutdown handling (SIGTERM)
- Auto-generated admin credentials on first run

### Security
- bcrypt password hashing (cost factor 12)
- Helmet security headers (CSP, HSTS, X-Frame-Options)
- HMAC webhook signing for n8n responses
- HTTP-only authentication cookies
- Cache-Control headers for API endpoints
- Input validation with Zod schemas
- XSS protection via DOMPurify
- SQL injection protection via parameterized queries

### Performance
- Widget bundle: 92.65 KB (25.45 KB gzipped)
- 1-year browser caching for widget assets
- Lazy WebSocket connection (on first open)
- Non-blocking Google Fonts loading
- RequestAnimationFrame for smooth scrolling
- CSS scroll-margin-top for proper message visibility

### Documentation
- Comprehensive README with quick start guide
- Security policy (SECURITY.md)
- Docker deployment guide
- System architecture documentation
- Production readiness report
- Network security review

[1.0.0]: https://github.com/harisabid200/ChatFlowUI/releases/tag/v1.0.0
