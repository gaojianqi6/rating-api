# RateEverything API

RateEverything is a unified rating and review platform that brings together diverse media types under one roof. From movies , TV Series, Variety show and books to music, podcasts, and even physical establishments, RateEverything provides a seamless experience for users to rate and review anything they encounter.

## 🌟 Features

- **Unified Rating System**: Rate and review multiple media types in one place
- **Cross-Media Recommendations**: Get personalized suggestions across different media types
- **User Profiles**: Maintain a single profile for all your ratings and reviews
- **Authentication**:
  - Email/Password registration and login
  - Google OAuth2 integration
  - Email verification system
- **Secure**: Password encryption using bcrypt
- **API Documentation**: Comprehensive Swagger documentation

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL
- pnpm package manager

### Installation

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd rating-api
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```env
   # Database Configuration
   DATABASE_URL="postgresql://postgres:***@localhost:5432/rating?schema=public"

   # Frontend URL
   WEBSITE_URL=http://localhost:3000

   # JWT Configuration
   JWT_SECRET=your-secret-key

   # Google OAuth2 Configuration
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:8888/auth/google/callback

   # AWS Configuration (for file uploads)
   AWS_ACCESS_KEY_ID=your-aws-access-key
   AWS_SECRET_ACCESS_KEY=your-aws-secret-key
   AWS_REGION=us-east-1
   S3_BUCKET=rating-item
   ```

4. Generate new prisma files: `npx prisma generate`
5. Start the development server:
   ```bash
   pnpm start
   ```

The API will be available at `http://localhost:8888`

## 📚 API Documentation

Once the server is running, you can access the Swagger documentation at:
```
http://localhost:8888/swagger
```

## 🔧 Technology Stack

- **Framework**: NestJS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Passport.js with JWT
- **Email Service**: Resend
- **Password Hashing**: bcrypt
- **API Documentation**: Swagger/OpenAPI
- **File Storage**: AWS S3

## 🛠️ Development

### Available Scripts

- `pnpm start`: Start the development server
- `pnpm build`: Build the application
- `pnpm test`: Run tests
- `pnpm lint`: Run linting

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
