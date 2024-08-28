FROM node:20.11.0-alpine3.18

WORKDIR /app

COPY package.json .
COPY develop.sh .
COPY yarn.* .
COPY .env .

RUN apk update

# Install dependencies
RUN yarn --network-timeout 1000000

RUN yarn global add @medusajs/medusa-cli@latest

COPY . .

ENTRYPOINT ["sh", "develop.sh"]