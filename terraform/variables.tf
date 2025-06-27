variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "bot-iful-mind"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "dynamodb_billing_mode" {
  description = "DynamoDB billing mode"
  type        = string
  default     = "PAY_PER_REQUEST"
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project     = "bot-iful-mind"
    ManagedBy   = "terraform"
    Environment = "production"
  }
}
