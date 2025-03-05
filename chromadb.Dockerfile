FROM ghcr.io/chroma-core/chroma:latest

# Install wget for healthcheck
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

# Don't switch back to any user since 'chroma' user doesn't exist
# The container will run as the default user 
COPY config.yaml /config.yaml

# Add a startup script that waits for network to be ready
RUN echo '#!/bin/bash\n\
echo "Testing network before starting ChromaDB..."\n\
# Wait for DNS to be available\n\
until getent hosts localhost; do\n\
  echo "Waiting for DNS..."\n\
  sleep 1\n\
done\n\
echo "DNS is available, starting ChromaDB"\n\
exec "$@"' > /entrypoint.sh && \
    chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "chromadb.app:app", "--workers", "1", "--host", "0.0.0.0", "--port", "8000"]