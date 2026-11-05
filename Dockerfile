# ---- Stage 1: build ----
FROM node:22-alpine AS build
WORKDIR /app

# copy package*.json dulu, baru npm ci → layer ini di-cache,
# jadi kalau cuma ubah kode di src/, npm ci nggak diulang
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# VITE_* di-"tanam" ke JS waktu BUILD, bukan waktu container jalan
ARG VITE_BASE_URL
ARG VITE_ORDER_APP_URL
ARG VITE_PUBLIC_REGISTRATION_ENABLED=false
ARG VITE_CONSULT_WHATSAPP_NUMBER
RUN npm run build

# ---- Stage 2: serve ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80