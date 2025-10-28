FROM nginx:alpine

# Install openssl and gettext for SSL certificate generation and envsubst
RUN apk add --no-cache openssl gettext

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Copy nginx configuration template
COPY weam-https.conf /etc/nginx/conf.d/weam-https.conf.template

# Create startup script
RUN echo '#!/bin/sh' > /startup.sh && \
    echo 'DOMAIN_NAME=${DOMAIN_NAME}' >> /startup.sh && \
    echo 'DOMAIN_NAME=$(echo $DOMAIN_NAME | sed "s|^https\?://||")' >> /startup.sh && \
    echo 'DOMAIN_NAME=$(echo $DOMAIN_NAME | sed "s|:[0-9]*$||")' >> /startup.sh && \
    echo 'echo "Using domain: $DOMAIN_NAME"' >> /startup.sh && \
    echo 'if [ ! -f /etc/nginx/ssl/cert.pem ] || [ ! -f /etc/nginx/ssl/key.pem ]; then' >> /startup.sh && \
    echo '  echo "Generating SSL certificate..."' >> /startup.sh && \
    echo '  mkdir -p /tmp/ssl' >> /startup.sh && \
    echo '  openssl genrsa -out /tmp/ssl/key.pem 2048' >> /startup.sh && \
    echo '  openssl req -new -x509 -key /tmp/ssl/key.pem -out /tmp/ssl/cert.pem -days 365 -subj "/C=US/ST=State/L=City/O=WEAM/CN=$DOMAIN_NAME" -addext "subjectAltName=DNS:$DOMAIN_NAME,DNS:*.$DOMAIN_NAME,IP:127.0.0.1"' >> /startup.sh && \
    echo '  cp /tmp/ssl/cert.pem /etc/nginx/ssl/cert.pem' >> /startup.sh && \
    echo '  cp /tmp/ssl/key.pem /etc/nginx/ssl/key.pem' >> /startup.sh && \
    echo '  echo "SSL certificate generated for: $DOMAIN_NAME"' >> /startup.sh && \
    echo 'else' >> /startup.sh && \
    echo '  echo "Using existing SSL certificates..."' >> /startup.sh && \
    echo 'fi' >> /startup.sh && \
    echo 'sed "s/\${DOMAIN_NAME}/$DOMAIN_NAME/g" /etc/nginx/conf.d/weam-https.conf.template > /etc/nginx/conf.d/default.conf' >> /startup.sh && \
    echo 'echo "Generated nginx configuration for domain: $DOMAIN_NAME"' >> /startup.sh && \
    echo 'exec nginx -g "daemon off;"' >> /startup.sh && \
    chmod +x /startup.sh

# Expose ports
EXPOSE 80 443

# Start nginx with dynamic configuration
CMD ["/startup.sh"]









