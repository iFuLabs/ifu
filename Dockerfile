FROM node:24-alpine@sha256:d1b3b4da11eefd5941e7f0b9cf17783fc99d9c6fc34884a665f40a06dbdfc94f

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup && chown -R appuser:appgroup /app

COPY --chown=appuser:appgroup package.json* ./

RUN npm ci --only=production

COPY --chown=appuser:appgroup . .

EXPOSE 3000

USER appuser

CMD ["npm", "run", "start"]