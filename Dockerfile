# Static site served by nginx on Cloud Run.
# Cloud Run sends traffic to the port in $PORT (default 8080); we honor it.
#
# Base images are pinned by digest so builds are reproducible. To update:
# pick the new tag's digest from Docker Hub and replace the sha256 below.

# ---- Stage 1: bundle the DualShock tool (49 module requests -> a few) ----
FROM node:22-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a AS dualshock
WORKDIR /build
COPY Dualshock-tool/package.json Dualshock-tool/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY Dualshock-tool/ ./
RUN npx gulp build --production

# ---- Stage 2: site files without the unbuilt DualShock sources ----
FROM nginx:1.28-alpine@sha256:a8b39bd9cf0f83869a2162827a0caf6137ddf759d50a171451b335cecc87d236 AS site
# .dockerignore keeps out .git, build/config files, docs and source artwork.
COPY . /site/
RUN rm -rf /site/Dualshock-tool /site/nginx /site/default.conf.template

# ---- Stage 3: nginx ----
FROM nginx:1.28-alpine@sha256:a8b39bd9cf0f83869a2162827a0caf6137ddf759d50a171451b335cecc87d236

# Default port for local runs; Cloud Run overrides PORT at deploy time.
ENV PORT=8080

# Wheel-Size Fitment API key. Leave empty here and inject the real value at
# deploy time via a Cloud Run secret/env var named WHEEL_SIZE_KEY. Declaring a
# default (empty) ensures envsubst can resolve ${WHEEL_SIZE_KEY} so nginx starts
# even before the key is configured (OEM presets simply return an error until set).
ENV WHEEL_SIZE_KEY=""

# Optional custom domain allowed to call the Wheel-Size proxy, in addition
# to the *.run.app URLs (e.g. "toolmeup.com"). Empty = run.app only.
ENV ALLOWED_REFERER_HOST=""

# nginx:alpine runs envsubst on *.template files at startup, writing the
# result into /etc/nginx/conf.d/. This lets us bind to $PORT dynamically.
COPY default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/ /etc/nginx/snippets/

# The site, plus the DualShock production bundle from stage 1.
COPY --from=site /site/ /usr/share/nginx/html/
COPY --from=dualshock /build/dist/ /usr/share/nginx/html/Dualshock-tool/

EXPOSE 8080
