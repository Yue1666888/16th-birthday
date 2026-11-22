# Build dist with pnpm before packaging, matching the existing jar + Dockerfile delivery.
FROM nginx:alpine-slim
ENV BACKEND_ORIGIN=http://birthday-api:16620
ENV PUBLIC_SCHEME=http
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
