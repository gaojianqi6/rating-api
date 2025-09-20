# syntax=docker/dockerfile:1

# ===========================================
# BUILD STAGE (Development dependencies)
# ===========================================
FROM node:22.11.0-alpine AS builder

# Set working directory
WORKDIR /app

# Install ca-certificates for HTTPS
RUN apk add --no-cache ca-certificates && \
    update-ca-certificates

# Copy package files
COPY package.json ./

# Install ALL dependencies (including devDependencies for build)
# Flags BEFORE install command
RUN npm install --network-timeout=120000 --fetch-retries=3

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# ===========================================
# PRODUCTION STAGE (Optimized runtime)
# ===========================================
FROM node:22.11.0-alpine AS production

# Set working directory
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache ca-certificates && \
    update-ca-certificates

# Create non-root user for security
RUN addgroup --system --gid 1001 rating && \
    adduser --system --uid 1001 rating-api

# Copy package files
COPY package.json ./

# Install only production dependencies
# Flags BEFORE install command + use --omit=dev (npm warning fix)
RUN npm install --only=production --network-timeout=120000 --fetch-retries=3 && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=rating-api:rating /app/dist ./dist

# Copy Prisma client (generated in build stage)
COPY --from=builder --chown=rating-api:rating /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=rating-api:rating /app/node_modules/@prisma/engines/ ./node_modules/@prisma/engines/

# Copy Prisma schema (needed for migrations)
COPY --from=builder --chown=rating-api:rating /app/prisma ./prisma

# Copy package files
COPY --from=builder --chown=rating-api:rating /app/package.json ./package.json

# Change to non-root user
USER rating-api

# Expose port 8888 (your app's default)
EXPOSE 8888

# Health check for port 8888
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8888/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))" || exit 1

# Start the application
CMD ["npm", "run", "start:prod"]