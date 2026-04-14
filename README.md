# 🌾 Agro AI Assistant

An AI-powered agricultural dashboard that helps farmers diagnose crop diseases, receive personalized treatment recommendations, and track real-time weather conditions.

![Tech Stack](https://img.shields.io/badge/React-18-blue) ![Supabase](https://img.shields.io/badge/Supabase-Edge_Functions-green) ![Docker](https://img.shields.io/badge/Docker-Ready-blue) ![AI](https://img.shields.io/badge/AI-Gemini_1.5_Flash-orange)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🌿 **Crop Disease Detection** | Upload crop images — analyzed by Hugging Face ML models |
| 🤖 **AI Treatment Advice** | Google Gemini 1.5 Flash generates structured 4-section treatment plans |
| 🌡️ **Weather Correlation** | Automatically records temperature & humidity with every scan |
| 📈 **Plant Growth Tracking** | Tag scans to specific plant locations and view health timelines |
| 📊 **Analytics Dashboard** | Visualize scan history, disease trends, and weather data |
| 🌦️ **Live Weather Widget** | Real-time local weather using Open-Meteo + geolocation |
| 🔐 **Secure Auth** | Full user authentication via Supabase Auth |

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions/Deno)
- **AI:** Google Gemini 1.5 Flash + Hugging Face models
- **Storage:** Supabase Storage (crop-images bucket)
- **Serving:** Nginx (production) / Vite dev server (development)
- **Containerization:** Docker + Docker Compose

---

## 💻 Local Development

### 1. Clone and Install
```bash
git clone https://github.com/KBSanchai/AI-Agro-Assistant.git
cd AI-Agro-Assistant
npm install
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```
Edit `.env` with your Supabase credentials:
```env
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_URL=https://your_project_id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

### 3. Run the Database Migrations
Run this SQL in your [Supabase SQL Editor](https://supabase.com/dashboard):
```sql
-- Enable plant growth tracking
CREATE TABLE IF NOT EXISTS public.plants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  crop_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add weather correlation columns
ALTER TABLE public.predictions
  ADD COLUMN IF NOT EXISTS temperature FLOAT,
  ADD COLUMN IF NOT EXISTS humidity INTEGER,
  ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own plants" ON public.plants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own plants" ON public.plants FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 4. Start Development Server
```bash
npm run dev
```
App is available at `http://localhost:5173`

---

## 🐳 Docker (Local)

```bash
# Build and run with docker compose (reads .env automatically)
docker compose up -d --build

# App is live at http://localhost:80
```

---

## ☁️ AWS EC2 Deployment (Step-by-Step)

### Phase 1: Launch EC2 Instance
1. Go to [AWS EC2 Console](https://console.aws.amazon.com/ec2) → **Launch Instance**
2. Configure:
   - **AMI:** Ubuntu Server 24.04 LTS
   - **Instance Type:** `t2.micro` (Free Tier) or `t3.small` (recommended)
   - **Key Pair:** Create new → download `.pem` file
   - **Storage:** 20 GB (gp3)
3. **Security Group — Add Inbound Rules:**

| Type | Port | Source |
|------|------|--------|
| SSH | 22 | My IP |
| HTTP | 80 | 0.0.0.0/0 |
| HTTPS | 443 | 0.0.0.0/0 |

### Phase 2: Connect to EC2
```bash
ssh -i "your-key.pem" ubuntu@YOUR_EC2_PUBLIC_IP
```

### Phase 3: Install Docker on EC2
```bash
sudo apt-get update -y
sudo apt-get install -y docker.io docker-compose-v2
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu
exit  # Log out and reconnect
```

Reconnect and verify:
```bash
ssh -i "your-key.pem" ubuntu@YOUR_EC2_PUBLIC_IP
docker --version
```

### Phase 4: Clone & Configure
```bash
git clone https://github.com/KBSanchai/AI-Agro-Assistant.git
cd AI-Agro-Assistant
cp .env.example .env
nano .env   # Fill in your Supabase keys, then Ctrl+X → Y → Enter
```

### Phase 5: Build & Launch 🚀
```bash
docker compose up -d --build
```

Your app is now live at:
```
http://YOUR_EC2_PUBLIC_IP
```

### Phase 6: Update App in the Future
```bash
ssh -i "your-key.pem" ubuntu@YOUR_EC2_PUBLIC_IP
cd AI-Agro-Assistant
git pull origin main
docker compose up -d --build
```

---

## 🔧 Supabase Edge Function

Deploy the AI prediction function (requires Docker):
```bash
npx supabase functions deploy predict
```

Set these secrets in your [Supabase Dashboard](https://supabase.com/dashboard) → Project → Edge Functions → Secrets:
- `GOOGLE_API_KEY` — Your Google Gemini API key

---

## 🛑 Useful Docker Commands

```bash
docker compose ps          # View running containers
docker compose logs -f     # View live logs
docker compose down        # Stop the app
docker compose restart     # Restart the app
```

---

## 🔐 Security

- **Never** commit your `.env` file — it's excluded by `.gitignore`
- Use `.env.example` as a template for collaborators
- All Supabase keys are passed as build-time arguments and baked into the compiled JS

---

## ⛓️ CI/CD with Jenkins

Automate your builds and deployments with the provided Jenkins configuration.

### 1. Run Jenkins Locally (Docker)
If you don't have a Jenkins server, you can start one using the provided compose file:
```bash
docker compose -f jenkins-compose.yml up -d
```
Access Jenkins at `http://localhost:8080`. Follow the on-screen instructions to unlock it.

### 2. Configure the Pipeline
1. Create a new **Pipeline** job in Jenkins.
2. Under **Pipeline**, select **Pipeline script from SCM**.
3. Choose **Git** and enter your repository URL.
4. Set the script path to `Jenkinsfile`.

### 3. Environment Variables
Ensure the following variables are set in Jenkins (either as Credentials or Global Env Vars) to allow the build to succeed:
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
