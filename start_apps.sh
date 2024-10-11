#!/bin/bash

# Navigate to the video progress backend directory and start the FastAPI app
(cd video-progress-backend && uvicorn app.main:app --host 0.0.0.0 --port 8000) &

# Wait for the backend to start
sleep 10

# Navigate to the video progress frontend directory and start the React app
(cd video-progress-frontend && npm start) &

# Wait for both apps to finish (they won't in this case)
wait
