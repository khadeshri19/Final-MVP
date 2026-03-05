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

# Ensure upload and generated directories exist
RUN mkdir -p uploads uploads/csv generated

# Expose port
EXPOSE 5000

# Start app
CMD ["npm", "start"]