import { rateLimit } from 'express-rate-limit'
import logger from '../utils/logger.js'

/**
 * Rate limiter middleware for /grab endpoint
 * Configurable via environment variables
 */
export default rateLimit({
	windowMs: parseInt(process.env.GRABBER_RATE_LIMIT_WINDOW_MS || 900000), // 15 minutes
	max: parseInt(process.env.GRABBER_RATE_LIMIT_MAX_REQUESTS || 100), // 100 requests per window
	standardHeaders: true, // Return rate limit info in RateLimit-* headers
	legacyHeaders: false, // Disable X-RateLimit-* headers
	handler: (req, res) => {
		logger.warn('Rate limit exceeded', {
			ip: req.ip,
			path: req.path,
			event: 'rate_limit_exceeded',
		})
		res.status(429).json({
			error: 'Too many requests',
			message: 'You have exceeded the rate limit. Please try again later.',
		})
	},
})
