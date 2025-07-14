// =====================================================
// LEGACY ROUTES - BACKWARD COMPATIBILITY
// =====================================================
// Eski /api/generate/* endpoint'leri için backward compatibility
// Yeni client'lar /api/aws/* kullanmalı

const express = require('express');
const router = express.Router();

// AWS Service Route Handlers'ını import et
const ec2Handler = require('./aws/ec2');
const s3Handler = require('./aws/s3');
const rdsHandler = require('./aws/rds');

// Legacy endpoint'leri yeni handler'lara forward et
router.use('/ec2', ec2Handler);
router.use('/s3', s3Handler);  
router.use('/rds', rdsHandler);

module.exports = router; 