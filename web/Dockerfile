FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY src ./src
ARG VITE_API_URL=/api
ARG VITE_ENABLE_DEMO_AUTH=false
ARG VITE_DEMO_AUTH_KEY=
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_ENABLE_DEMO_AUTH=${VITE_ENABLE_DEMO_AUTH}
ENV VITE_DEMO_AUTH_KEY=${VITE_DEMO_AUTH_KEY}
RUN npm run build

FROM nginx:1.28-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
