#!/bin/bash

IP_ADDRESS=$(ipconfig getifaddr en0)
echo "Detected IP Address: $IP_ADDRESS"

# Navigate to the video progress backend directory and start the FastAPI app
(cd video-progress-backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload) &

# Wait for the backend to start
sleep 10

# Navigate to the video progress frontend directory and start the React app
(cd video-progress-frontend && REACT_APP_API_URL=http://$IP_ADDRESS:8000 npm start --host 0.0.0.0) &

# Wait for both apps to finish (they won't in this case)
wait
