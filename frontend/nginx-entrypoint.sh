#!/bin/sh

# Print environment for debugging
echo "Starting nginx with API_URL=$API_URL"

# Replace environment variables in nginx config
envsubst '${API_URL}' < /etc/nginx/conf.d/default.conf > /etc/nginx/conf.d/default.conf.tmp
mv /etc/nginx/conf.d/default.conf.tmp /etc/nginx/conf.d/default.conf

# Verify the files in the html directory
echo "Files in /usr/share/nginx/html:"
ls -la /usr/share/nginx/html

# If index.html doesn't exist, copy from backup
if [ ! -f /usr/share/nginx/html/index.html ]; then
  echo "index.html missing, copying from backup"
  cp /usr/share/nginx/html/index.html.backup /usr/share/nginx/html/index.html
fi

# Set proper permissions
chmod -R 755 /usr/share/nginx/html

# Start nginx
echo "Starting nginx..."
nginx -g "daemon off;" 