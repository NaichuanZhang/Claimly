import os

from dotenv import load_dotenv

load_dotenv()

AWS_PROFILE = os.getenv("AWS_PROFILE", "tokenmaster")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
BEDROCK_MODEL_ID = os.getenv(
    "BEDROCK_MODEL_ID",
    "us.anthropic.claude-sonnet-4-20250514-v1:0",
)
CARDBRAIN_BASE_URL = os.getenv(
    "CARDBRAIN_BASE_URL",
    "https://cardbrain-plum.vercel.app",
)
N8N_EMAIL_WEBHOOK_URL = os.getenv(
    "N8N_EMAIL_WEBHOOK_URL",
    "https://alexdevdemo.app.n8n.cloud/webhook/6b70d97e-c104-4411-9be4-7b85d4c91d95",
)
