# Use the official image as a parent image
FROM node:latest

# Copy app's source code from your host to your image filesystem
COPY . .

# Run the command inside your image filesystem
RUN npm install

# Inform Docker that the container is listening on the specified port at runtime
EXPOSE 8088

# Run the specified command within the container
CMD [ "node", "app.js" ]
