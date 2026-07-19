# CA Console backend
# node:22-slim (Debian) rather than alpine: bcrypt ships prebuilt binaries
# for glibc, so we avoid needing a compiler toolchain in the image.
FROM node:22-slim

WORKDIR /app

# Install deps first so this layer is cached unless package*.json changes
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# App source
COPY src ./src
COPY routes ./routes

# Uploads live here at runtime — mounted as a volume in compose so files
# survive container rebuilds
RUN mkdir -p src/uploads && chown -R node:node /app

# Don't run as root inside the container
USER node

ENV NODE_ENV=production
EXPOSE 5000

# Uses the /health endpoint the app already exposes
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||5000)+'/api/health/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/app.js"]
