FROM node:alpine
WORKDIR /app
COPY package.json .
RUN npm install
RUN npm install typescript -g
COPY . .
RUN tsc
CMD ["node", "./build/index.js"]