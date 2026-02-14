FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY admin/package*.json ./admin/
COPY widget/package*.json ./widget/
COPY tsconfig.base.json ./

# Install dependencies (use ci for reproducible builds)
RUN npm ci

# Copy source
COPY server ./server
COPY admin ./admin
COPY widget ./widget

# Build all packages
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install wget for healthcheck
RUN apk add --no-cache wget

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY server/package*.json ./server/
COPY admin/package*.json ./admin/
COPY widget/package*.json ./widget/
RUN npm ci --workspace=server --production && \
  npm cache clean --force

# Copy built files
COPY --from=builder --chown=nodejs:nodejs /app/server/dist ./server/dist
# Copy admin build for serving
COPY --from=builder --chown=nodejs:nodejs /app/admin/dist ./admin/dist
# Copy widget build for serving
COPY --from=builder --chown=nodejs:nodejs /app/widget/dist ./widget/dist
COPY --from=builder --chown=nodejs:nodejs /app/tsconfig.base.json ./

# Create data directory with correct permissions
RUN mkdir -p /app/data && chown nodejs:nodejs /app/data

# Set environment
ENV NODE_ENV=production
ENV PORT=7861
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/app/data/chatflowui.db

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 7861

# Copy entrypoint script for runtime base path configuration
COPY --chown=nodejs:nodejs entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Health check - increased start-period to allow for database initialization
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:7861/health || exit 1

# Set entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]

# Start server
CMD ["node", "server/dist/index.js"]
