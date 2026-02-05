# QRev Client Dockerfile
# Multi-stage build for smaller final image

# Stage 1: Build
FROM node:18-alpine as build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .

# Build args for environment variables
ARG REACT_APP_BASE_API_URL=http://localhost:8080
ARG REACT_APP_QREV_BACKEND_HOST_URL=http://localhost:8080
ARG REACT_APP_GOOGLE_CLIENT_ID

ENV REACT_APP_BASE_API_URL=$REACT_APP_BASE_API_URL
ENV REACT_APP_QREV_BACKEND_HOST_URL=$REACT_APP_QREV_BACKEND_HOST_URL
ENV REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID

RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy built files
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx config for SPA routing
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api { \
        proxy_pass http://server:8080; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
