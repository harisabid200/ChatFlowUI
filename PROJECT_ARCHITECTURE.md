# ChatFlowUI - Complete Architecture Diagram

> Self-hosted premium chatbot widget system for n8n

## Table of Contents
1. [High-Level Overview](#high-level-overview)
2. [Monorepo Structure](#monorepo-structure)
3. [Server Architecture](#server-architecture)
4. [Admin Dashboard Architecture](#admin-dashboard-architecture)
5. [Widget Architecture](#widget-architecture)
6. [Database Schema](#database-schema)
7. [Data Flow Diagrams](#data-flow-diagrams)
8. [Security Architecture](#security-architecture)
9. [Docker Architecture](#docker-architecture)
10. [Testing Architecture](#testing-architecture)

---

## High-Level Overview

```
+---------------------------------------------------------------------------------+
|                              ChatFlowUI System                                   |
+---------------------------------------------------------------------------------+
|                                                                                  |
|   +------------------+      +------------------+      +------------------+     |
|   |   Admin User     |      |  Website Visitor |      |    n8n Webhook   |     |
|   |  (Browser)       |      |  (Browser/Widget)|      |    Response      |     |
|   +---------+--------+      +---------+--------+      +---------^--------+     |
|             |                         |                         |               |
|             | HTTP/REST               | WebSocket/HTTP          | HTTP POST     |
|             |                         |                         |               |
|   +---------v-------------------------v-------------------------v------------+   |
|   |                          Express Server (Port 7861)                     |   |
|   |  +--------------+  +--------------+  +--------------+  +------------+  |   |
|   |  |  Auth Routes |  |Chatbot Routes|  | Theme Routes |  |Widget Routes|  |   |
|   |  |  /api/auth   |  |/api/chatbots |  | /api/themes  |  |  /widget    |  |   |
|   |  +--------------+  +--------------+  +--------------+  +------------+  |   |
|   |                                                                          |   |
|   |  +--------------+  +------------------+  +--------------------------+   |   |
|   |  |Webhook Routes|  |  Socket.io (WS)  |  |  Static File Serving     |   |   |
|   |  |  /webhook    |  |  /socket.io      |  |  /admin, /widget         |   |   |
|   |  +--------------+  +------------------+  +--------------------------+   |   |
|   +----------------------------------------------------------------------------+   |
|                                    |                                            |
|                                    v                                            |
|   +----------------------------------------------------------------------------+   |
|   |                          SQLite Database                                |   |
|   |  +--------------+  +--------------+  +--------------+                  |   |
|   |  | users        |  | chatbots     |  | themes       |                  |   |
|   |  | (auth)       |  | (config)     |  | (styling)    |                  |   |
|   |  +--------------+  +--------------+  +--------------+                  |   |
|   +----------------------------------------------------------------------------+   |
|                                                                                  |
+---------------------------------------------------------------------------------+
```

---

## Monorepo Structure

```
chatflowui/
|   # Root Configuration
|-- package.json              # Workspaces definition, shared scripts
|-- tsconfig.base.json        # Shared TypeScript strict config
|-- tsconfig.test.json        # Test TypeScript config
|-- playwright.config.ts      # E2E test configuration
|-- Dockerfile                # Multi-stage Docker build
|-- entrypoint.sh             # Runtime base path injection
|
|-- server/                   # Express.js + Socket.io Backend
|   |-- package.json
|   |-- tsconfig.json
|   |-- src/
|       |-- index.ts              # Entry point, bootstrap
|       |-- config.ts             # Environment validation (Zod)
|       |-- db/
|       |   |-- index.ts          # SQLite initialization & auto-save
|       |   |-- themes.ts         # Preset theme definitions
|       |   |-- helpers.ts        # DB query helpers
|       |-- routes/
|       |   |-- auth.ts           # JWT auth endpoints
|       |   |-- chatbots.ts       # CRUD + test message
|       |   |-- themes.ts         # Theme CRUD
|       |   |-- widget.ts         # Public widget config & message
|       |   |-- webhook.ts        # n8n inbound webhook handler
|       |-- services/
|       |   |-- websocket.ts      # Socket.io initialization
|       |   |-- webhook-forwarder.ts  # Outbound to n8n + SSRF guard
|       |   |-- chatbot-cache.ts  # In-memory chatbot caching
|       |   |-- theme-cache.ts    # In-memory theme caching
|       |   |-- user-cache.ts     # In-memory user caching
|       |-- middleware/
|       |   |-- auth.ts           # JWT verification
|       |   |-- cors.ts           # Dynamic CORS per chatbot
|       |   |-- rateLimit.ts      # Express-rate-limit
|       |-- utils/
|       |   |-- origin.ts         # Origin validation utilities
|       |-- types/
|       |   |-- index.ts          # Shared TypeScript types
|
|-- admin/                    # React + Tailwind Dashboard
|   |-- package.json
|   |-- tsconfig.json
|   |-- vite.config.ts
|   |-- tailwind.config.js
|   |-- postcss.config.js
|   |-- src/
|       |-- main.tsx              # React entry
|       |-- App.tsx               # Router & route guards
|       |-- api/
|       |   |-- index.ts          # API client (fetch wrapper)
|       |-- stores/
|       |   |-- auth.ts           # Zustand auth store
|       |-- pages/
|       |   |-- Login.tsx         # Admin login
|       |   |-- ChangePassword.tsx
|       |   |-- Dashboard.tsx     # Chatbot list
|       |   |-- ChatbotEditor.tsx # Create/edit chatbot
|       |   |-- Themes.tsx        # Theme gallery
|       |   |-- ThemeEditor.tsx   # Create/edit theme
|       |-- components/
|       |   |-- Layout.tsx        # Sidebar layout
|       |   |-- TestChat.tsx      # In-dashboard chat tester
|       |   |-- ImageCropper.tsx  # Logo upload/crop
|       |-- utils/
|       |   |-- navigation.ts     # Navigation helpers
|
|-- widget/                   # Embeddable TypeScript Widget
|   |-- package.json
|   |-- tsconfig.json
|   |-- vite.config.ts            # IIFE bundle config
|   |-- src/
|       |-- index.ts              # Global API & command queue
|       |-- widget.ts             # ChatWidget class (UI + logic)
|       |-- socket.ts             # Socket.io client wrapper
|       |-- storage.ts            # localStorage conversation manager
|       |-- styles.ts             # Dynamic CSS generation
|       |-- markdown.ts           # Markdown parser + helpers
|       |-- types.ts              # Widget type definitions
|
|-- tests/                    # Playwright E2E Tests
    |-- globalSetup.ts            # Test DB seeding
    |-- fixtures/
    |   |-- api-client.ts         # Authenticated API test client
    |-- *.spec.ts                 # Test suites
```

---

## Server Architecture

### Request Flow

```
+------------------------------------------------------------------------------+
|                         HTTP Request Lifecycle                               |
+------------------------------------------------------------------------------+

   Client Request
        |
        v
+---------------+
| Trust Proxy   |  <- X-Forwarded-For handling for reverse proxies
+-------+-------+
        |
        v
+---------------+
|    Helmet     |  <- CSP, HSTS, Security headers
+-------+-------+
        |
        v
+---------------+
|  Compression  |  <- gzip/deflate
+-------+-------+
        |
        v
+---------------+
| Rate Limiting |  <- /api routes only
+-------+-------+
        |
        v
+---------------+
|     CORS      |  <- Dynamic per-chatbot origin validation
+-------+-------+
        |
        v
+---------------+
|  Body Parser  |  <- Size limits: /api=2MB, /widget=16KB, /webhook=64KB
+-------+-------+
        |
        v
+----------------------------------------------------------------------------+
|                           Route Handlers                                  |
|  +---------+  +---------+  +---------+  +---------+  +-----------------+  |
|  |/api/auth|  |/api/... |  |/widget  |  |/webhook |  | / (Static SPA)  |  |
|  |  Auth   |  |  Auth   |  | Public  |  |  Public |  |   Admin UI      |  |
|  |Middleware|  |Middleware|  |         |  |         |  |                 |  |
|  +---------+  +---------+  +---------+  +---------+  +-----------------+  |
+----------------------------------------------------------------------------+
```

### Service Layer

```
+------------------------------------------------------------------------------+
|                           Services Architecture                              |
+------------------------------------------------------------------------------+

+---------------------+    +---------------------+    +---------------------+
|  Webhook Forwarder  |    |   WebSocket Service |    |   Cache Services    |
+---------------------+    +---------------------+    +---------------------+
| - forwardToWebhook()|    | - Socket.io Server  |    | - Chatbot Cache     |
| - SSRF Protection   |    | - Room Management   |    | - Theme Cache       |
| - Response Parser   |    | - Origin Validation |    | - User Cache        |
| - HMAC Signing      |    | - Multi-tab Support |    | - TTL-based         |
| - Timeout Handling  |    | - Session Cleanup   |    | - LRU Eviction      |
+----------+----------+    +----------+----------+    +---------------------+
           |                          |
           v                          v
+------------------------------------------------------------------------------+
|                              SQLite Database                                 |
+------------------------------------------------------------------------------+
```

### Middleware Stack

```
+------------------------------------------------------------------------------+
|                         Middleware Configuration                             |
+------------------------------------------------------------------------------+

  +------------------------------------------------------------------------+   
  | Auth Middleware (JWT)                                                  |   
  | - Extract token from Authorization header or cookie                    |   
  | - Verify JWT signature                                                 |   
  | - Check token_version matches DB                                       |   
  | - Attach user to request                                               |   
  +------------------------------------------------------------------------+   

  +------------------------------------------------------------------------+   
  | CORS Middleware (Dynamic)                                              |   
  | - Check ADMIN_ORIGIN (bypass)                                          |   
  | - Check global CORS_ALLOWED_ORIGINS                                    |   
  | - Check chatbot-specific allowed_origins                               |   
  | - Allow localhost in development                                       |   
  | - Support wildcard domains (*.example.com)                             |   
  +------------------------------------------------------------------------+   

  +------------------------------------------------------------------------+   
  | Rate Limit Middleware                                                  |   
  | - Window: 60 seconds                                                   |   
  | - Max requests: 100 per window                                         |   
  | - Keyed by IP address                                                  |   
  | - Applies to: /api/*, /webhook/*                                       |   
  +------------------------------------------------------------------------+   
```

---

## Admin Dashboard Architecture

### Component Hierarchy

```
+------------------------------------------------------------------------------+
|                        Admin Dashboard React Tree                            |
+------------------------------------------------------------------------------+

                              +-------------+
                              |    main.tsx |
                              |  (React 18) |
                              +------+------+
                                     |
                              +------+------+
                              |   App.tsx   |
                              |   (Router)  |
                              +------+------+
                                     |
         +---------------------------+---------------------------+
         |                           |                           |
   +-----+------+            +-------+--------+        +---------+---------+
   |PublicRoute |            | ProtectedRoute |        |  ProtectedRoute   |
   |            |            |                |        |                   |
   | /login     |            | / (Dashboard)  |        | /chatbots/*       |
   +-----+------+            | /change-pw     |        | /themes/*         |
         |                   +-------+--------+        +-------------------+
         |                           |
   +-----+------+            +-------+--------+
   | Login.tsx  |            |   Layout.tsx   |
   |            |            |  (Sidebar Nav) |
   | - Form     |            +-------+--------+
   | - Validation|                   |
   | - Error UI |            +-------+--------+
   +------------+            |  Page Content  |
                             +----------------+


Page Components:
+--------------------+---------------------------------------------------------+
| Page               | Features                                                |
+--------------------+---------------------------------------------------------+
| Dashboard.tsx      | - Chatbot list/grid view                                |
|                    | - Create new chatbot button                             |
|                    | - Embed code copy                                       |
|                    | - Quick actions (edit, test, delete)                    |
+--------------------+---------------------------------------------------------+
| ChatbotEditor.tsx  | - Create/Edit chatbot form                              |
|                    | - Webhook URL configuration                             |
|                    | - Allowed origins (CORS)                                |
|                    | - Theme selection                                       |
|                    | - Custom CSS input                                      |
|                    | - Pre-chat form builder                                 |
|                    | - Logo upload with cropper                              |
|                    | - Settings (welcome msg, placeholders)                  |
|                    | - Live preview (TestChat component)                     |
+--------------------+---------------------------------------------------------+
| Themes.tsx         | - Theme gallery/grid                                    |
|                    | - Preset themes (Default, Dark, Minimal, etc.)          |
|                    | - Create custom theme                                   |
|                    | - Edit/Delete custom themes                             |
+--------------------+---------------------------------------------------------+
| ThemeEditor.tsx    | - Visual color picker                                   |
|                    | - Live preview                                          |
|                    | - Typography controls                                   |
|                    | - Dimension controls                                    |
+--------------------+---------------------------------------------------------+
```

### State Management (Zustand)

```
+------------------------------------------------------------------------------+
|                          Auth Store (Zustand)                                |
+------------------------------------------------------------------------------+

interface AuthState {
  // State
  isAuthenticated: boolean;
  user: { username: string; mustChangePassword: boolean } | null;
  token: string | null;
  
  // Actions
  login: (credentials) => Promise<void>;
  logout: () => void;
  changePassword: (data) => Promise<void>;
  checkAuth: () => boolean;
}

+------------------------------------------------------------------------------+
|                              API Client                                      |
+------------------------------------------------------------------------------+

apiClient
|- request<T>(method, endpoint, body?)     # Generic fetch wrapper
|- get<T>(endpoint)                        # GET helper
|- post<T>(endpoint, body)                 # POST helper
|- put<T>(endpoint, body)                  # PUT helper
|- delete<T>(endpoint)                     # DELETE helper
|- Authentication: Bearer token from localStorage
```

---

## Widget Architecture

### Initialization Flow

```
+------------------------------------------------------------------------------+
|                        Widget Initialization Sequence                        |
+------------------------------------------------------------------------------+

1. EMBED SNIPPET (Website Owner Places This)
   ==========================================
   <script>
     (function(w,d,s,o,f,js,fjs){
       w['ChatFlowUI']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
       js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
       js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
     }(window,document,'script','chatflowui','https://server.com/widget/widget.iife.js'));
     
     chatflowui('init', { chatbotId: 'xxx', baseUrl: 'https://server.com' });
   </script>


2. SCRIPT LOADING
   ===============
   +------------------+      +------------------+      +------------------+
   |  Page Loads      |----->|  Script Injected |----->|  Queue Processed |
   |  (Queue Begins)  |      |  (IIFE Bundle)   |      |  (Pending cmds)  |
   +------------------+      +------------------+      +--------+---------+
                                                                |
                                                                v
                                                       +------------------+
                                                       | ChatWidget.init()|
                                                       +------------------+


3. WIDGET INITIALIZATION
   =====================
   ChatWidget.init()
   |
   |---> Fetch config from /widget/{chatbotId}/config
   |
   |---> Inject Google Fonts (non-blocking)
   |
   |---> Generate & inject CSS styles (theme + custom CSS)
   |
   |---> Render DOM elements (launcher, chat container)
   |
   |---> Bind event listeners
   |
   |---> Restore previous conversation from localStorage
   |
   +---> Widget Ready (WebSocket NOT connected yet - lazy)


4. USER OPENS CHAT
   ================
   User clicks launcher
   |
   |---> Chat window opens
   |
   |---> setupSocket() called (lazy connection)
   |     |---> SocketClient connects to Socket.io
   |     |---> 'join' event sent with chatbotId + sessionId
   |     +---> Ready for real-time messages
   |
   +---> Focus input field
```

### Widget Class Structure

```
+------------------------------------------------------------------------------+
|                          ChatWidget Class                                    |
+------------------------------------------------------------------------------+

class ChatWidget {
  // --- Dependencies ---
  - config: WidgetConfig          # Theme, settings, preChatForm
  - storage: StorageManager       # localStorage wrapper
  - socket: SocketClient | null   # Socket.io (lazy)
  
  // --- DOM Elements ---
  - container: HTMLElement        # Root widget element
  - messagesContainer: HTMLElement
  - inputElement: HTMLInputElement
  
  // --- State ---
  - isOpen: boolean
  - isTyping: boolean
  - isPending: boolean            # Waiting for response
  - quickReplies: string[]
  
  // --- Public Methods ---
  + init(): Promise<void>         # Initialize widget
  + open(): void                  # Open chat window
  + close(): void                 # Close chat window
  + toggle(): void                # Toggle open/close
  + destroy(): void               # Remove widget completely
  
  // --- Private Methods ---
  - injectStyles(): void          # Inject CSS
  - render(): void                # Build DOM
  - bindEvents(): void            # Attach listeners
  - setupSocket(): void           # Initialize WebSocket
  - sendMessage(): Promise<void>  # Send with retry logic
  - addMessage(): void            # Add to UI + storage
  - showTyping(): void            # Show typing indicator
  - showPreChatForm(): void       # Display form if enabled
  - restoreState(): void          # Load from localStorage
  - playSound(): void             # Web Audio notification
}
```

### Storage Architecture

```
+------------------------------------------------------------------------------+
|                     localStorage Schema (Per Chatbot)                        |
+------------------------------------------------------------------------------+

Key: cfui_conversation_{chatbotId}
+----------------------------------------------------------------------------+
| {                                                                          |
|   "sessionId": "uuid-v4",          # Unique session identifier              |
|   "messages": [                    # Array of chat messages                 |
|     {                                                                      |
|       "id": "msg-uuid",                                                    |
|       "type": "user" | "bot" | "system",                                   |
|       "content": "Hello!",                                                 |
|       "quickReplies": [...],       # Optional quick replies                 |
|       "timestamp": "2024-01-15T10:30:00Z"                                  |
|     }                                                                      |
|   ],                                                                       |
|   "metadata": {                    # From pre-chat form                     |
|     "name": "John",                                                        |
|     "email": "john@example.com"                                            |
|   },                                                                       |
|   "preChatCompleted": true,        # Whether form was submitted             |
|   "createdAt": "2024-01-15T10:00:00Z"                                      |
| }                                                                          |
+----------------------------------------------------------------------------+

Key: cfui_settings_{chatbotId}
+----------------------------------------------------------------------------+
| {                                                                          |
|   "isOpen": false,                 # Whether widget was left open           |
|   "soundMuted": false              # User's sound preference               |
| }                                                                          |
+----------------------------------------------------------------------------+
```

---

## Database Schema

```sql
-- Users Table (Authentication)
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  must_change_password INTEGER DEFAULT 1,
  token_version INTEGER DEFAULT 1,      -- For JWT invalidation
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Themes Table (Styling)
CREATE TABLE themes (
  id TEXT PRIMARY KEY,                  -- 'default', 'dark', 'custom-uuid'
  name TEXT NOT NULL,
  is_preset INTEGER DEFAULT 0,          -- 1 = built-in, 0 = custom
  config TEXT NOT NULL,                 -- JSON: colors, typography, dimensions
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Chatbots Table (Configuration)
CREATE TABLE chatbots (
  id TEXT PRIMARY KEY,                  -- UUID v4
  name TEXT NOT NULL,
  webhook_url TEXT NOT NULL,            -- n8n webhook endpoint
  webhook_secret TEXT,                  -- For HMAC signature
  allowed_origins TEXT NOT NULL,        -- JSON array of domains
  theme_id TEXT,                        -- FK to themes
  custom_css TEXT,                      -- User-defined CSS
  pre_chat_form TEXT,                   -- JSON: enabled, title, fields[]
  settings TEXT NOT NULL,               -- JSON: welcomeMessage, placeholders, etc.
  launcher_logo TEXT,                   -- Base64 image (max 2MB)
  header_logo TEXT,                     -- Base64 image (max 2MB)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (theme_id) REFERENCES themes(id)
);

CREATE INDEX idx_chatbots_theme ON chatbots(theme_id);
```

### Theme Configuration JSON Structure

```typescript
interface ThemeConfig {
  colors: {
    primary: string;
    primaryHover: string;
    background: string;
    headerBg: string;
    headerText: string;
    userMessageBg: string;
    userMessageText: string;
    botMessageBg: string;
    botMessageText: string;
    inputBg: string;
    inputText: string;
    inputBorder: string;
  };
  typography: {
    fontFamily: string;
    baseSize: string;
    scale: number;
  };
  dimensions: {
    width: string;
    height: string;
    borderRadius: string;
  };
  branding: {
    logo: string | null;
    title: string;
    subtitle: string;
    inputPlaceholder: string;
  };
  features: {
    typingIndicator: boolean;
    soundEnabled: boolean;
    showTimestamps: boolean;
    markdownSupport: boolean;
  };
}
```
