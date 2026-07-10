FROM node:24-alpine AS build
WORKDIR /app
ARG BACKEND_INTERNAL_URL=http://backend:7001
ENV BACKEND_INTERNAL_URL=$BACKEND_INTERNAL_URL
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
RUN npm ci
COPY frontend frontend
RUN npm run build --workspace frontend

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/frontend ./frontend
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "frontend"]
