# Use a base image that already has Node.js and Chromium
FROM ghcr.io/puppeteer/puppeteer:latest

# Set the working directory
WORKDIR /app

ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer
# Switch to the non-root user
USER pptruser

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies and force the browser download
RUN npm install --ignore-scripts=false

# Set the executable path via a command, not an environment variable
RUN npm install --prefix /app/node_modules/puppeteer

# Copy the rest of your application code
COPY . .

# Expose the port your app runs on
EXPOSE 5001

# Start the application
CMD ["npm", "start"]