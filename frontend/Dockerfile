# Use the official Node.js image as the base image
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json into the working directory
COPY package*.json  ./

# Install frontend dependencies
RUN npm install

# Copy the rest of the frontend code into the container
COPY . .

# Build the React app for production
RUN npm run build

# Use the official Nginx image to serve the React app
FROM nginx:alpine

# Copy the built app from the first stage into the Nginx container
COPY --from=0 /app/build /usr/share/nginx/html

# Expose the frontend port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]