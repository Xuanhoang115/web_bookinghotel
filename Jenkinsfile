pipeline {
    agent any

    tools {
        nodejs 'NodeJS 20'
    }

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    stages {
        stage('Install dependencies') {
            steps {
                sh 'npm ci --prefix backend'
                sh 'npm ci --prefix frontend'
            }
        }

        stage('Check backend') {
            steps {
                dir('backend') {
                    sh 'node --check server.js'
                }
            }
        }

        stage('Build frontend') {
            steps {
                sh 'CI=false npm run build --prefix frontend'
            }
        }
    }

    post {
        success {
            echo 'CI passed. Render can deploy this commit from GitHub.'
        }
        failure {
            echo 'CI failed. Review the stage logs before deploying.'
        }
    }
}