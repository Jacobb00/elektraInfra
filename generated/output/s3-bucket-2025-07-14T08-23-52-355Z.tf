# S3 Bucket - Teleform Generated
# Generated at: 2025-07-14T08:23:52.351Z

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "bucket_name" {
  description = "S3 bucket name"
  type        = string
  default     = "trtfef"
}

variable "environment" {
  description = "Environment tag"
  type        = string
  default     = "staging"
}

# S3 Bucket
resource "aws_s3_bucket" "teleform_bucket" {
  bucket = var.bucket_name

  tags = {
    Name        = "trtfef"
    Environment = "staging"
    CreatedBy   = "Teleform"
    ManagedBy   = "Terraform"
  }
}

# Bucket Versioning

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "teleform_bucket_encryption" {
  bucket = aws_s3_bucket.teleform_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Public access block
resource "aws_s3_bucket_public_access_block" "teleform_bucket_pab" {
  bucket = aws_s3_bucket.teleform_bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Static website hosting
resource "aws_s3_bucket_website_configuration" "teleform_bucket_website" {
  bucket = aws_s3_bucket.teleform_bucket.id

  index_document {
    suffix = "index.html"
  }

}

# Bucket policy for website hosting
resource "aws_s3_bucket_policy" "teleform_bucket_policy" {
  bucket = aws_s3_bucket.teleform_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.teleform_bucket.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.teleform_bucket_pab]
}

# CORS configuration

# Lifecycle configuration

# Outputs
output "bucket_id" {
  description = "S3 bucket ID"
  value       = aws_s3_bucket.teleform_bucket.id
}

output "bucket_arn" {
  description = "S3 bucket ARN"
  value       = aws_s3_bucket.teleform_bucket.arn
}

output "bucket_domain_name" {
  description = "S3 bucket domain name"
  value       = aws_s3_bucket.teleform_bucket.bucket_domain_name
}

output "website_endpoint" {
  description = "S3 bucket website endpoint"
  value       = aws_s3_bucket_website_configuration.teleform_bucket_website.website_endpoint
}

output "website_domain" {
  description = "S3 bucket website domain"
  value       = aws_s3_bucket_website_configuration.teleform_bucket_website.website_domain
}

output "bucket_region" {
  description = "S3 bucket region"
  value       = aws_s3_bucket.teleform_bucket.region
} 