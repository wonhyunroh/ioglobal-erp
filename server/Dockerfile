FROM node:20-alpine

WORKDIR /app

# 의존성 설치
COPY package*.json ./
RUN npm ci --omit=dev=false

# TypeScript 빌드
COPY . .
RUN npm run build

# 불필요한 devDependencies 정리
RUN npm prune --omit=dev

EXPOSE $PORT

CMD ["node", "dist/index.js"]
