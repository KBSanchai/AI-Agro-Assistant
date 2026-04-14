pipeline {
    agent any

    environment {
        // These should be set in Jenkins Credentials or as Environment Variables
        // VITE_SUPABASE_PROJECT_ID = credentials('supabase-project-id')
        // VITE_SUPABASE_PUBLISHABLE_KEY = credentials('supabase-pub-key')
        // VITE_SUPABASE_URL = credentials('supabase-url')
        
        DOCKER_IMAGE = "field-vision-assist"
        DOCKER_TAG = "${env.BUILD_ID}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                echo 'Installing dependencies...'
                sh 'npm install'
            }
        }

        stage('Lint') {
            steps {
                echo 'Running lint...'
                sh 'npm run lint'
            }
        }

        stage('Test') {
            steps {
                echo 'Running tests...'
                sh 'npm run test'
            }
        }

        stage('Build') {
            steps {
                echo 'Building application...'
                // We pass build args to npm run build if needed, 
                // but usually Vite needs env vars at build time.
                sh 'npm run build'
            }
        }

        stage('Docker Build') {
            steps {
                echo 'Building Docker image...'
                script {
                    // Check if env vars are present, otherwise use placeholders or fail
                    def projectId = env.VITE_SUPABASE_PROJECT_ID ?: "placeholder"
                    def pubKey = env.VITE_SUPABASE_PUBLISHABLE_KEY ?: "placeholder"
                    def url = env.VITE_SUPABASE_URL ?: "placeholder"
                    
                    sh "docker build \
                        --build-arg VITE_SUPABASE_PROJECT_ID=${projectId} \
                        --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=${pubKey} \
                        --build-arg VITE_SUPABASE_URL=${url} \
                        -t ${DOCKER_IMAGE}:${DOCKER_TAG} \
                        -t ${DOCKER_IMAGE}:latest ."
                }
            }
        }

        stage('Deployment (Optional)') {
            when {
                branch 'main'
            }
            steps {
                echo 'Deploying to Production/Staging...'
                // Example: docker-compose up -d
                // sh 'docker-compose up -d --build'
            }
        }
    }

    post {
        always {
            echo 'Pipeline finished.'
            // Clean up workspace if needed
            // cleanWs()
        }
        success {
            echo 'Build and Test Succeeded!'
        }
        failure {
            echo 'Build or Test Failed.'
        }
    }
}
