FROM node:10.6.0-alpine

WORKDIR /usr/app

COPY ./package.json ./package-lock.json ./index.js /usr/app/

RUN yarn install --production