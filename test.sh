# Load .env
source .env

# Run the exact gcloud command with verbose output
echo "🔍 Testing gcloud builds submit with verbose logging..."
gcloud builds submit --config cloudbuild.yaml \
  --substitutions="_DATABASE_URL=$DATABASE_URL,_JWT_SECRET=$JWT_SECRET,_AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID,_AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY,_AWS_REGION=$AWS_REGION,_S3_BUCKET=$S3_BUCKET" \
  --verbosity=debug \
  2>&1 | tee build-debug.log

echo ""
echo "🔍 Full debug log saved to build-debug.log"
cat build-debug.log | grep -i error || echo "No explicit error found"