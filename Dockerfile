# Use a base image that already has Node.js and Chromium
FROM ghcr.io/puppeteer/puppeteer:latest

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Change ownership of the files to the correct user
USER root
RUN chown -R pptruser:pptruser /app

# Switch to the non-root user
USER pptruser

# Install dependencies
RUN npm install

# Copy the rest of your application code
COPY . .

# Expose the port your app runs on
EXPOSE 5001

# Start the application
CMD ["npm", "start"]