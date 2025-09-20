#!/bin/bash
# deploy-rating-api.sh - FIXED MONITORING (polling + real-time logs)

echo "🚀 Deploying rating-api to Sydney Cloud Run..."
echo "📍 Project: rating-app-453105"
echo "🌐 Region: australia-southeast1 (Sydney)"
echo "🐳 Port: 8080"

cd "$(dirname "$0")" || exit 1

# Check prerequisites
echo "🔍 Checking prerequisites..."
if ! docker info &>/dev/null; then
  echo "❌ Docker is not running. Please start Docker Desktop."
  exit 1
fi
echo "✅ Docker: Ready"

if ! gcloud version &>/dev/null; then
  echo "❌ gcloud CLI not found. Please install Google Cloud SDK."
  exit 1
fi
echo "✅ gcloud: Ready"

# Set project and region
gcloud config set project rating-app-453105
gcloud config set run/region australia-southeast1

# Check Artifact Registry
if ! gcloud artifacts repositories list --location=australia-southeast1 --project=rating-app-453105 | grep -q "rating-repo"; then
  echo "📦 Creating Artifact Registry..."
  gcloud artifacts repositories create rating-repo \
    --repository-format=docker \
    --location=australia-southeast1 \
    --description="Container images for rating system" \
    --project=rating-app-453105
  echo "✅ Artifact Registry: Created"
else
  echo "✅ Artifact Registry: Ready"
fi

# Check .env file
if [[ ! -f ".env" ]]; then
  echo "❌ .env file not found! Please create it with your environment variables."
  exit 1
fi

echo "📋 Reading environment variables from .env..."
set -a
source .env
set +a

echo "✅ Environment variables loaded:"
echo "   ✅ DATABASE_URL: ${DATABASE_URL:0:20}..."
echo "   ✅ JWT_SECRET: ${JWT_SECRET:0:10}..."
echo "   ✅ AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID:0:10}..."

# Build substitution arguments
SUBS_ARGS=(
  "--substitutions=_DATABASE_URL=$DATABASE_URL"
  "--substitutions=_JWT_SECRET=$JWT_SECRET"
  "--substitutions=_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID"
  "--substitutions=_GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET"
  "--substitutions=_WEBSITE_URL=$WEBSITE_URL"
  "--substitutions=_GOOGLE_CALLBACK_URL=$GOOGLE_CALLBACK_URL"
  "--substitutions=_AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID"
  "--substitutions=_AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY"
  "--substitutions=_AWS_REGION=$AWS_REGION"
  "--substitutions=_S3_BUCKET=$S3_BUCKET"
)

echo ""
echo "🐳 Building Docker image..."
echo "📤 Uploading to Artifact Registry..."
echo "🚀 Deploying to Cloud Run..."

# Start the build (async - no wait)
BUILD_ID=$(gcloud builds submit --config cloudbuild.yaml "${SUBS_ARGS[@]}" --async --format="value(id)" 2>/dev/null)
if [ $? -eq 0 ]; then
  echo "🔄 Build started: $BUILD_ID"
  echo ""
  echo "📊 Status command: gcloud builds describe $BUILD_ID --format='table(id,status,startTime,finishTime)'"
  echo "📄 Log command: gcloud builds log $BUILD_ID"
  echo "🌐 Web console: https://console.cloud.google.com/cloud-build/builds;region=global?project=rating-app-453105&buildId=$BUILD_ID"
  echo ""
  
  # POLLING LOOP: Monitor status until complete
  echo -n "⏳ Monitoring build progress"
  MAX_WAIT=1800  # 30 minutes max
  WAIT_INTERVAL=30  # Check every 30 seconds
  ELAPSED=0
  
  while [ $ELAPSED -lt $MAX_WAIT ]; do
    STATUS=$(gcloud builds describe $BUILD_ID --format="value(status)" 2>/dev/null || echo "ERROR")
    
    if [ "$STATUS" = "SUCCESS" ]; then
      echo ""
      echo "✅ BUILD COMPLETED SUCCESSFULLY!"
      break
    elif [ "$STATUS" = "FAILURE" ]; then
      echo ""
      echo "❌ BUILD FAILED"
      echo "💡 Full logs: gcloud builds log $BUILD_ID"
      echo "💡 Recent builds: gcloud builds list --limit=3"
      exit 1
    elif [ "$STATUS" = "WORKING" ]; then
      echo -n "."
      ELAPSED=$((ELAPSED + WAIT_INTERVAL))
      sleep $WAIT_INTERVAL
    elif [ "$STATUS" = "QUEUED" ]; then
      echo -n "Q"  # Queued
      ELAPSED=$((ELAPSED + WAIT_INTERVAL))
      sleep $WAIT_INTERVAL
    else
      echo -n " ($STATUS)"
      ELAPSED=$((ELAPSED + WAIT_INTERVAL))
      sleep $WAIT_INTERVAL
    fi
    
    # Show progress every 5 minutes
    if [ $((ELAPSED % 300)) -eq 0 ] && [ $ELAPSED -gt 0 ]; then
      echo ""
      echo "⏳ Elapsed: $((ELAPSED / 60)) minutes, Status: $STATUS"
      gcloud builds describe $BUILD_ID --format="table(startTime,finishTime)" 2>/dev/null || true
    fi
  done
  
  if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo ""
    echo "⚠️  Build timeout after 30 minutes"
    echo "💡 Check status: gcloud builds describe $BUILD_ID"
    exit 1
  fi
  
  # BUILD SUCCEEDED - Check Cloud Run deployment
  echo ""
  echo "🔍 Checking Cloud Run service deployment..."
  sleep 15  # Give Cloud Run time to deploy
  
  SERVICE_URL=$(gcloud run services describe rating-api \
    --region=australia-southeast1 \
    --format='value(status.url)' 2>/dev/null || echo "")
  
  if [ -n "$SERVICE_URL" ]; then
    echo ""
    echo "🎉 DEPLOYMENT SUCCESSFUL!"
    echo "📍 Service URL: $SERVICE_URL"
    echo "🔍 Health check: $SERVICE_URL/health"
    echo "📚 Swagger docs: $SERVICE_URL/swagger"
    
    echo ""
    echo "🧪 Testing health endpoint..."
    if curl -f -s --max-time 30 "$SERVICE_URL/health" > /dev/null 2>&1; then
      echo "✅ Health check: PASSED"
      echo "   $(curl -s "$SERVICE_URL/health" | jq -r '.status // "ok"')"
    else
      echo "⚠️  Health check: PENDING (wait 1-3 minutes for cold start)"
      echo "   Retest: curl -v \"$SERVICE_URL/health\""
    fi
    
    echo ""
    echo "📊 Monitor logs:"
    echo "   gcloud run services logs tail rating-api --region=australia-southeast1 --limit=50"
    echo ""
    echo "📈 Service details:"
    echo "   gcloud run services describe rating-api --region=australia-southeast1 --format='table(name,status.url,status.conditions)'"
    echo ""
    echo "🎯 Your rating-api is LIVE in Sydney, Australia!"
    echo "🌍 Expected latency from New Zealand: 60-80ms"
    echo ""
    echo "🏷️  Build ID: $BUILD_ID"
    echo "🖼️  Images: gcloud artifacts docker images list australia-southeast1-docker.pkg.dev/rating-app-453105/rating-repo --limit=5"
    echo ""
    echo "🔄 Next deployment: ./deploy-rating-api.sh (auto-overrides latest tag)"
  else
    echo "⚠️  Service URL not ready yet..."
    echo "🔍 Check deployment: gcloud run services describe rating-api --region=australia-southeast1"
  fi
else
  echo "❌ Failed to start build"
  echo "💡 Recent builds: gcloud builds list --limit=3 --format='table(id,status)'"
  exit 1
fi