# Build kontekst je OVAJ folder (frontend/):
#
#   docker build -f frontend/Dockerfile -t chronos/frontend:v1 frontend

# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app

# Odvojen layer za zavisnosti - "npm ci" se ponovo pokrece samo kad se
# promeni package*.json, ne na svaku izmenu izvornog koda.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# VITE_API_BASE_URL se "peče" u JS bundle u trenutku build-a (Vite čita
# import.meta.env.* samo pri build-u, ne u runtime-u) - zato je ovo build ARG,
# ne environment promenljiva kontejnera. Podrazumevana vrednost odgovara
# portu na koji docker-compose mapira Gateway kontejner na host masini.
ARG VITE_API_BASE_URL=http://localhost:5076
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# --- Runtime stage ---
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
