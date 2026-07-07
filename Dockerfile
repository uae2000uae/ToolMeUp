# Static site served by nginx on Cloud Run.
# Cloud Run sends traffic to the port in $PORT (default 8080); we honor it.
FROM nginx:1.27-alpine

# Default port for local runs; Cloud Run overrides PORT at deploy time.
ENV PORT=8080

# Wheel-Size Fitment API key. Leave empty here and inject the real value at
# deploy time via a Cloud Run secret/env var named WHEEL_SIZE_KEY. Declaring a
# default (empty) ensures envsubst can resolve ${WHEEL_SIZE_KEY} so nginx starts
# even before the key is configured (OEM presets simply return an error until set).
ENV WHEEL_SIZE_KEY=""

# nginx:alpine runs envsubst on *.template files at startup, writing the
# result into /etc/nginx/conf.d/. This lets us bind to $PORT dynamically.
COPY default.conf.template /etc/nginx/templates/default.conf.template

# Copy the site. .dockerignore keeps out .git/.venv/.idea and other cruft.
COPY . /usr/share/nginx/html/

# Don't serve build/config files that got copied in.
RUN rm -f /usr/share/nginx/html/Dockerfile \
          /usr/share/nginx/html/default.conf.template \
          /usr/share/nginx/html/.dockerignore

EXPOSE 8080
