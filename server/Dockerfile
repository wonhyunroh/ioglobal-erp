FROM node:20-alpine

WORKDIR /app

# better-sqlite3 네이티브 컴파일에 필요한 도구 (Alpine용)
RUN apk add --no-cache python3 make g++

# 의존성 설치
COPY package*.json ./
RUN npm ci

# TypeScript 빌드
COPY . .
RUN npm run build

# 불필요한 devDependencies 정리
RUN npm prune --omit=dev

EXPOSE $PORT

CMD ["node", "dist/index.js"]
