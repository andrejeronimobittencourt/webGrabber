import winston from 'winston'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs')
if (!fs.existsSync(logsDir)) {
	fs.mkdirSync(logsDir, { recursive: true })
}

/**
 * Custom log format
 */
const customFormat = winston.format.combine(
	winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
	winston.format.errors({ stack: true }),
	winston.format.json(),
)

/**
 * Console format for development
 */
const consoleFormat = winston.format.combine(
	winston.format.colorize(),
	winston.format.timestamp({ format: 'HH:mm:ss' }),
	winston.format.printf(({ timestamp, level, message, ...meta }) => {
		let msg = `${timestamp} [${level}]: ${message}`
		if (Object.keys(meta).length > 0) {
			msg += ` ${JSON.stringify(meta)}`
		}
		return msg
	}),
)

/**
 * Create logger instance
 */
const logger = winston.createLogger({
	level: process.env.LOG_LEVEL || 'info',
	format: customFormat,
	defaultMeta: { service: 'webgrabber' },
	transports: [
		// Write logs to console (only errors by default to avoid noise)
		new winston.transports.Console({
			format: consoleFormat,
			level: process.env.CONSOLE_LOG_LEVEL || 'error',
		}),
		// Write all logs to file
		new winston.transports.File({
			filename: path.join(logsDir, 'error.log'),
			level: 'error',
			maxsize: 5242880, // 5MB
			maxFiles: 5,
		}),
		new winston.transports.File({
			filename: path.join(logsDir, 'combined.log'),
			maxsize: 5242880, // 5MB
			maxFiles: 5,
		}),
	],
})

/**
 * Create child logger with context
 */
export const createLogger = (context = {}) => {
	return logger.child(context)
}

export default logger
