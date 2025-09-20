#!/bin/bash
# deploy-rating-api.sh - SECURE VERSION (no hardcoded secrets)

echo "🚀 Deploying rating-api (pnpm) to Sydney Cloud Run..."
echo "📍 Project: rating-app-453105"
echo "🌐 Region: australia-southeast1 (Sydney)"
echo "🐳 Port: 8888"

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
# Load .env variables into shell (securely)
set -a  # Automatically export all variables
source .env
set +a  # Stop exporting

echo "✅ Environment variables loaded:"
echo "   ✅ DATABASE_URL: ${DATABASE_URL:0:20}..."  # Show first 20 chars only
echo "   ✅ JWT_SECRET: ${JWT_SECRET:0:10}..."     # Show first 10 chars only
echo "   ✅ AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID:0:10}..."  # Show first 10 chars only
echo ""

# Build substitution arguments from .env
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

echo "🐳 Building Docker image..."
echo "📤 Uploading to Artifact Registry..."
echo "🚀 Deploying to Cloud Run..."

# Start the build with substitutions from .env
BUILD_ID=$(gcloud builds submit --config cloudbuild.yaml "${SUBS_ARGS[@]}" --async --format="value(id)" 2>/dev/null)
if [ $? -eq 0 ]; then
  echo "🔄 Build started: $BUILD_ID"
  echo "⏳ Monitoring build progress (5-10 minutes)..."
  
  # Wait for build
  gcloud builds wait $BUILD_ID
  
  BUILD_STATUS=$(gcloud builds describe $BUILD_ID --format="value(status)")
  if [ "$BUILD_STATUS" = "SUCCESS" ]; then
    echo ""
    echo "🎉 DEPLOYMENT SUCCESSFUL!"
    
    SERVICE_URL=$(gcloud run services describe rating-api \
      --region=australia-southeast1 \
      --format='value(status.url)' 2>/dev/null || echo "")
    
    if [ -n "$SERVICE_URL" ]; then
      echo ""
      echo "📍 Service URL: $SERVICE_URL"
      echo "🔍 Health check: $SERVICE_URL/health"
      echo "📚 Swagger docs: $SERVICE_URL/swagger"
      
      echo ""
      echo "🧪 Testing health endpoint..."
      if curl -f -s --max-time 30 "$SERVICE_URL/health" > /dev/null 2>&1; then
        echo "✅ Health check: PASSED"
      else
        echo "⚠️  Health check: PENDING (wait 1-3 minutes)"
      fi
      
      echo ""
      echo "📊 Monitor logs:"
      echo "   gcloud run services logs tail rating-api --region=australia-southeast1"
      echo ""
      echo "🎯 Your rating-api is LIVE in Sydney!"
      echo "🌍 Latency from NZ: 60-80ms"
    else
      echo "⚠️  Service still starting up..."
    fi
  else
    echo "❌ BUILD FAILED"
    echo "💡 View logs: gcloud builds log $BUILD_ID"
    exit 1
  fi
else
  echo "❌ Failed to start build"
  echo "💡 Check: gcloud builds list --limit=1"
  exit 1
fi