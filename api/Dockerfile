FROM node:lts
WORKDIR /app
EXPOSE 8101

# Install dependencies.
RUN apt-get update -y && \
    apt-get install curl git wget yasm pkgconf libzvbi-dev libmp3lame-dev libavahi-compat-libdnssd-dev -y

# Launch the API.
CMD npm rebuild mdns && \
    service dbus start && \
    avahi-daemon --no-rlimits -D && \
    yarn api:dev