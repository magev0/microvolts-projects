
#------ (distroless for security)------#

# Stage 1: Build environment (Debian-based to match distroless glibc)
FROM node:22-bullseye-slim AS builder

WORKDIR /usr/src/app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Stage 2: Distroless production environment
FROM gcr.io/distroless/nodejs22-debian12

WORKDIR /usr/src/app

# Copy dependencies and application files from the builder stage
COPY --from=builder /usr/src/app /usr/src/app

# We can no longer use '&&' because distroless does not have a shell.
# It's better practice to avoid deploying commands on every startup anyway to avoid Discord API rate limits.
# To deploy commands in the future, you can run a temporary container or execute the deploy script directly.
CMD ["bot.js"]
