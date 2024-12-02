ARG NODE_IMAGE=node:20.11.0-alpine

FROM $NODE_IMAGE AS base
RUN apk --no-cache add dumb-init
RUN mkdir -p /home/node/app && chown node:node /home/node/app
WORKDIR /home/node/app
USER node

FROM base AS dependencies
COPY --chown=node:node ./package*.json ./
RUN npm ci
COPY --chown=node:node . .

FROM dependencies AS build
RUN npm run build

FROM build AS production
WORKDIR /home/node/app/dist

EXPOSE 3000
CMD [ "dumb-init", "node", "server.js" ]
