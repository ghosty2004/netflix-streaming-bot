FROM node:22
WORKDIR /app

# Update and install required dependencies
RUN apt-get update
RUN apt-get install -y sudo acl libnss3-dev libgdk-pixbuf2.0-dev libgtk-3-dev libxss-dev libasound2 ffmpeg

# Add user and set permissions
RUN \
    useradd -m netflix-streaming-bot && \
    echo "netflix-streaming-bot:netflix-streaming-bot" | chpasswd && adduser netflix-streaming-bot sudo && \
    setfacl -R -m u:netflix-streaming-bot:rwx /app

# Set user
USER netflix-streaming-bot
COPY --chown=netflix-streaming-bot:netflix-streaming-bot package*.json .
RUN npm install
COPY --chown=netflix-streaming-bot:netflix-streaming-bot . .
ENTRYPOINT [ "npm", "start" ] 