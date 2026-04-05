# 🌾 Agro AI Assistant

Agro AI Assistant is a modern, AI-powered agricultural dashboard designed to help farmers and agronomists diagnose crop diseases, receive personalized treatment recommendations, and track real-time local weather parameters.

This project uses an intelligent web interface to simplify complex agricultural queries, integrating seamlessly with AI models and secure cloud storage.

## 🚀 Features
- **Crop Disease Prediction:** Upload images of crops directly to the platform. Images are processed securely and analyzed for signs of disease using advanced Hugging Face ML models.
- **AI Treatment Recommendations:** Integrated with OpenAI, the system provides actionable treatment recommendations for identified crop issues.
- **Dynamic Weather Widget:** Uses the browser's Geolocation API alongside OpenStreetMap's Nominatim and Open-Meteo APIs to instantly grab and display accurate, live local weather data precisely where you are.
- **Secure Cloud Backend:** All user data, historic predictions, and image uploads are handled gracefully via Supabase Auth, Postgres, and Edge functions backed by AWS S3.

## 🛠️ Tech Stack
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Backend & Database:** Supabase (Database, Auth, Edge Functions)
- **Image Storage:** AWS S3 (Interfaced via Supabase Edge Functions / Deno)
- **External Integration:** Udify Chatbot Widget

---

## 💻 Local Development Setup

### 1. Prerequisites
You need **Node.js 20+** and **npm** installed on your workstation.

### 2. Clone and Install
```bash
git clone https://github.com/KBSanchai/Agro-AI-Assistant.git
cd Agro-AI-Assistant
npm install
```

### 3. Environment Variables
Create a file named `.env` in the root folder of the project. You must fill in these placeholders with your actual keys from Supabase:

```env
# Supabase Configuration
VITE_SUPABASE_PROJECT_ID="your_project_id"
VITE_SUPABASE_URL="https://your_project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your_anon_key"

# AWS Configuration (Used heavily in Supabase Edge Functions)
AWS_ACCESS_KEY_ID="your_aws_access_key"
AWS_SECRET_ACCESS_KEY="your_aws_secret_key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="cropimagesave"
```

### 4. Run the Development Server
```bash
npm run dev
```
The application will launch and be locally accessible at `http://localhost:5173`.

---

## 🐳 Docker Deployment

For clean infrastructure and production-ready static serving, this project can be containerized. The `Dockerfile` uses a multi-stage build spanning Node.js and Nginx.

### 1. Build the Docker Image
*Because Vite is a frontend framework, you MUST pass your Supabase variables as build-arguments so they are baked securely into the compiled web client!*

```bash
docker build \
  --build-arg VITE_SUPABASE_PROJECT_ID="your_project_id" \
  --build-arg VITE_SUPABASE_URL="https://your_project.supabase.co" \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY="your_anon_key" \
  -t agro-ai-assistant .
```

### 2. Run the Container
```bash
docker run -d -p 8080:80 --name agro-ai-app agro-ai-assistant
```
The production-optimized static site is now running on Nginx at `http://localhost:8080`.

---

## 🔮 Supabase Edge Functions
To deploy the backend functions necessary for AWS S3 handling and the prediction logic, assure you have the Supabase CLI installed, then push your edge functions to the cloud:
```bash
supabase functions deploy s3-upload
supabase functions deploy predict
```
*Don't forget to also push your `AWS_*` variables as secrets through the Supabase Dashboard so the functions can utilize them!*
=======
# Agro-AI-Assistant
>>>>>>> 2978a60ccc9f37730d3447de400d9b40da1ef393
