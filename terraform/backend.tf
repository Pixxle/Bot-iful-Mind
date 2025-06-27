# This file should be configured after the initial terraform apply
# Uncomment and update the bucket name after creating the S3 bucket

# terraform {
#   backend "s3" {
#     bucket         = "bot-iful-mind-terraform-state-production"
#     key            = "terraform.tfstate"
#     region         = "us-east-1"
#     encrypt        = true
#     dynamodb_table = "bot-iful-mind-terraform-locks"
#   }
# }
