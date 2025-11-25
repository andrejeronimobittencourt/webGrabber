import fs from 'fs'
import fsPromises from 'fs/promises'
import { FileSystemError } from '../errors/ActionErrors.js'

/**
 * Async file system operations wrapper
 */
export class FileSystem {
	/**
	 * Read file asynchronously
	 */
	static async readFile(filePath, encoding = 'utf8') {
		try {
			return await fsPromises.readFile(filePath, encoding)
		} catch (error) {
			throw new FileSystemError('readFile', 'read', filePath, error)
		}
	}

	/**
	 * Write file asynchronously
	 */
	static async writeFile(filePath, data, encoding = 'utf8') {
		try {
			await fsPromises.writeFile(filePath, data, encoding)
		} catch (error) {
			throw new FileSystemError('writeFile', 'write', filePath, error)
		}
	}

	/**
	 * Append to file asynchronously
	 */
	static async appendFile(filePath, data, encoding = 'utf8') {
		try {
			await fsPromises.appendFile(filePath, data, encoding)
		} catch (error) {
			throw new FileSystemError('appendFile', 'append', filePath, error)
		}
	}

	/**
	 * Create directory asynchronously
	 */
	static async mkdir(dirPath, options = { recursive: true }) {
		try {
			await fsPromises.mkdir(dirPath, options)
		} catch (error) {
			throw new FileSystemError('mkdir', 'create', dirPath, error)
		}
	}

	/**
	 * Remove directory asynchronously
	 */
	static async rmdir(dirPath, options = { recursive: true }) {
		try {
			await fsPromises.rm(dirPath, options)
		} catch (error) {
			throw new FileSystemError('rmdir', 'remove', dirPath, error)
		}
	}

	/**
	 * Delete file asynchronously
	 */
	static async unlink(filePath) {
		try {
			await fsPromises.unlink(filePath)
		} catch (error) {
			throw new FileSystemError('unlink', 'delete', filePath, error)
		}
	}

	/**
	 * Read directory asynchronously
	 */
	static async readdir(dirPath, options = {}) {
		try {
			return await fsPromises.readdir(dirPath, options)
		} catch (error) {
			throw new FileSystemError('readdir', 'read', dirPath, error)
		}
	}

	/**
	 * Check if file/directory exists (sync, as there's no async equivalent)
	 */
	static exists(filePath) {
		return fs.existsSync(filePath)
	}

	/**
	 * Get file stats asynchronously
	 */
	static async stat(filePath) {
		try {
			return await fsPromises.stat(filePath)
		} catch (error) {
			throw new FileSystemError('stat', 'stat', filePath, error)
		}
	}
	/**
	 * Create write stream (sync, as streams are event-based)
	 */
	static createWriteStream(filePath, options = {}) {
		return fs.createWriteStream(filePath, options)
	}
}

