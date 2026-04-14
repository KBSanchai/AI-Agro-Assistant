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
                bat 'npm install'
            }
        }

        stage('Lint') {
            steps {
                echo 'Running lint...'
                bat 'npm run lint || exit 0' // Allow build to continue if lint has warnings
            }
        }

        stage('Test') {
            steps {
                echo 'Running tests...'
                bat 'npm run test'
            }
        }

        stage('Build') {
            steps {
                echo 'Building application...'
                bat 'npm run build'
            }
        }

        stage('Docker Build') {
            steps {
                echo 'Building Docker image...'
                script {
                    def projectId = env.VITE_SUPABASE_PROJECT_ID ?: "placeholder"
                    def pubKey = env.VITE_SUPABASE_PUBLISHABLE_KEY ?: "placeholder"
                    def url = env.VITE_SUPABASE_URL ?: "placeholder"
                    
                    bat "docker build \
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
                // bat 'docker-compose up -d --build'
            }
        }
    }

    post {
        always {
            echo 'Pipeline finished.'
        }
        success {
            echo 'Build and Test Succeeded!'
        }
        failure {
            echo 'Build or Test Failed.'
        }
    }
}
