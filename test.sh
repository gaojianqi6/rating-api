source .env

# Escape special characters (=, :, @, /, ?, etc.) for Cloud Build
escape_sub() {
  local key=$1
  local value=$2
  
  value="${value//=/\\=}"
  value="${value//:/\\:}"
  value="${value//@/\\@}"
  value="${value//\//\\\\/}"
  value="${value//?/\\?}"
  value="${value//#/\\#}"
  value="${value//[/\\[}"
  value="${value//]/\\]}"
  value="${value//\"/\\\"}"
  value="${value//\'/\\\'}"
  value="${value// /\\ }"
  value="${value//$/\\$}"
  value="${value//\\/\\\\}"
  value="${value//\`/\\\\\`}"
  value="${value//$'\n'/\\n}"
  
  echo "--substitutions=_$key=$value"
}

# Test escaping function
echo "Raw DATABASE_URL: '$DATABASE_URL'"
echo "Escaped: $(escape_sub "DATABASE_URL" "$DATABASE_URL')"
echo "Raw JWT_SECRET: '$JWT_SECRET'"
echo "Escaped: $(escape_sub "JWT_SECRET" "$JWT_SECRET")"