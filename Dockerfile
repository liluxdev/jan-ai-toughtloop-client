FROM node:21
WORKDIR /app
COPY package.json /app
COPY . /app
RUN npm install
CMD ["npm", "start"]
EXPOSE 3000