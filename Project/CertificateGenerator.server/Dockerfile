# Use official Node image
FROM node:18

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the code
COPY . .

# Build TypeScript
RUN npm run build

# 🔥 Copy SQL files into dist
RUN mkdir -p dist/script && cp src/script/*.sql dist/script/

# Expose port
EXPOSE 5000

# Start app
CMD ["npm", "start"]