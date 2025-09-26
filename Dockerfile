# Use a base image that already has Node.js and Chromium
FROM ghcr.io/puppeteer/puppeteer:latest

# Switch to the non-root user provided by the image
USER pptruser

# Set the working directory, owned by the user
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your application code
COPY . .

# Expose the port your app runs on
EXPOSE 5001

# Start the application
CMD ["npm", "start"]