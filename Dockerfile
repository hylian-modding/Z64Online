FROM node:14
WORKDIR /usr/src/app
ADD https://repo.modloader64.com/update/ModLoader64-server.tar.gz ./
RUN tar -zxvf ModLoader64-server.tar.gz
ADD https://repo.modloader64.com/mods/Ooto/update/OotOnline.pak ./mods/
COPY server.json ./ModLoader64-config.json
EXPOSE 8082
CMD [ "node", "./src/index.js"]