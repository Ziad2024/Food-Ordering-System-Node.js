FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Bundle app source
COPY . .

# Default env vars (overridden by Back4App environment variables if set)
ENV NODE_ENV=production
ENV REDIS_URL=rediss://default:gQAAAAAAARhWAAIgcDIwOWM2MWI4YTI1Yzg0OTE0OTFiMGRmN2RiNjdlMjcyYQ@crisp-starfish-71766.upstash.io:6379
ENV FRONTEND_URL=https://foodorderingep.netlify.app

# Expose the port the app runs on
EXPOSE 5000

# Start the server
CMD [ "npm", "start" ]
