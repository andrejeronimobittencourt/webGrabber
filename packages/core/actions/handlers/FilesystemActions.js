import path from 'path'
import constants from '../../utils/constants.js'
import { present } from '../../infrastructure/presenter/present.js'
import { sanitizeString } from '../../utils/stringUtils.js'
import { pathJoin, rootPathJoin } from '../../utils/paths.js'
import { FileSystem } from '../../utils/FileSystem.js'
import axios from 'axios'
import cliProgress from 'cli-progress'

/**
 * Resolve a sub-path relative to the brain's current directory and validate
 * that it does not escape the base directory (prevents path traversal).
 * @param {string} base
 * @param {string} dir
 * @returns {string}
 */
function resolveContainedPath(base, dir) {
	const resolved = path.resolve(base, dir)
	const relative = path.relative(base, resolved)
	if (relative.startsWith('..') || path.isAbsolute(relative)) {
		throw new Error(`Directory traversal detected: '${dir}' resolves outside the base directory.`)
	}
	return resolved
}

export default class FilesystemActions {
	static register(actionList) {
		actionList.add('setBaseDir', async (brain) => {
			const { dir } = brain.run.params
			brain.fs.baseDir = rootPathJoin('output', dir)
			if (!FileSystem.exists(brain.fs.baseDir))
				await FileSystem.mkdir(brain.fs.baseDir)
		})

		actionList.add('setCurrentDir', async (brain) => {
			let { dir, useBaseDir = false } = brain.run.params
			dir = sanitizeString(dir)
			const sourceDir = useBaseDir ? brain.fs.baseDir : brain.fs.currentDir

			// Validate the target path exists and does not escape the base directory.
			const targetPath = resolveContainedPath(brain.fs.baseDir, pathJoin(sourceDir, dir))
			if (!FileSystem.exists(targetPath)) {
				throw new Error(`Directory ${dir} does not exist`)
			}

			present(
				[
					{ text: ': Setting current dir to ', color: 'white', style: 'italic' },
					{ text: dir, color: 'gray', style: 'italic' },
				],
				brain,
			)
			brain.fs.currentDir = targetPath
		}, { serverBlocked: true })

		actionList.add('resetCurrentDir', async (brain) => {
			brain.fs.currentDir = brain.fs.baseDir
		})

		actionList.add('backToParentDir', async (brain) => {
			if (brain.fs.currentDir === brain.fs.baseDir) return
			brain.fs.currentDir = path.dirname(brain.fs.currentDir)
		}, { serverBlocked: true })

		actionList.add('createDir', async (brain) => {
			let { dir, useBaseDir = false } = brain.run.params
			dir = sanitizeString(dir)
			present(
				[
					{ text: ': Creating directory ', color: 'white', style: 'italic' },
					{ text: dir, color: 'gray', style: 'italic' },
				],
				brain,
			)
			const dirPath = pathJoin(
				useBaseDir ? brain.fs.baseDir : brain.fs.currentDir,
				dir,
			)
			if (!FileSystem.exists(dirPath)) {
				await FileSystem.mkdir(dirPath)
			}
		}, { serverBlocked: true })

		actionList.add('deleteFolder', async (brain) => {
			const { foldername } = brain.run.params
			const folderPath = `${brain.fs.currentDir}/${foldername}`
			present(
				[
					{ text: ': Deleting folder ', style: 'italic' },
					{ text: folderPath, color: 'gray', style: 'italic' },
				],
				brain,
			)
			if (FileSystem.exists(folderPath))
				await FileSystem.rmdir(folderPath, { recursive: true })
		}, { serverBlocked: true })

		actionList.add('listFolders', async (brain) => {
			present(
				[
					{ text: ': Listing folders ', style: 'italic' },
					{ text: `${brain.fs.currentDir}`, color: 'gray', style: 'italic' },
				],
				brain,
			)
			const files = await FileSystem.readdir(
				brain.fs.currentDir,
				{ withFileTypes: true },
			)
			const folders = files
				.filter((dirent) => dirent.isDirectory())
				.map((dirent) => dirent.name)
			brain.learn(constants.inputKey, folders)
		}, { serverBlocked: true })

		actionList.add('createFile', async (brain) => {
			const { filename, content = '' } = brain.run.params
			present(
				[
					{ text: ': Creating file ', style: 'italic' },
					{ text: `${brain.fs.currentDir}/${filename}.txt`, style: 'bold' },
				],
				brain,
			)
			await FileSystem.appendFile(
				`${brain.fs.currentDir}/${filename}.txt`,
				content,
			)
		}, { serverBlocked: true })

		actionList.add('readFromText', async (brain) => {
			const { filename, breakLine = false } = brain.run.params
			const filePath = `${brain.fs.currentDir}/${filename}.txt`
			present(
				[
					{ text: ': Loading file ', style: 'italic' },
					{ text: filePath, color: 'gray', style: 'italic' },
				],
				brain,
			)
			const content = await FileSystem.readFile(filePath, 'utf8')
			if (breakLine) {
				// Split by newline and remove trailing empty strings from trailing newlines.
				brain.learn(constants.inputKey, content.split('\n').filter((line, index, arr) => {
					return index < arr.length - 1 || line !== ''
				}))
			} else {
				brain.learn(constants.inputKey, content)
			}
		}, { serverBlocked: true })

		actionList.add('saveToText', async (brain) => {
			const { key, filename } = brain.run.params
			const content = brain.recall(key)
			if (content) {
				const filePath = `${brain.fs.currentDir}/${filename}.txt`
				present([
					{ text: ': Saving ', color: 'white', style: 'italic' },
					{ text: filePath, color: 'gray', style: 'italic' },
				], brain)
				await FileSystem.writeFile(
					filePath,
					Array.isArray(content) ? content.join('\n') : content,
				)
			}
		}, { serverBlocked: true })

		actionList.add('appendToText', async (brain) => {
			const { key, filename } = brain.run.params
			const content = brain.recall(key)
			if (content) {
				const filePath = `${brain.fs.currentDir}/${filename}.txt`
				present([
					{ text: ': Appending to ', color: 'white', style: 'italic' },
					{ text: filePath, color: 'gray', style: 'italic' },
				], brain)
				await FileSystem.appendFile(
					filePath,
					Array.isArray(content) ? content.join('\n') : content + '\n',
				)
			}
		}, { serverBlocked: true })

		actionList.add('deleteFile', async (brain) => {
			const { filename } = brain.run.params
			const filePath = `${brain.fs.currentDir}/${filename}.txt`
			present(
				[
					{ text: ': Deleting file ', style: 'italic' },
					{ text: filePath, color: 'gray', style: 'italic' },
				],
				brain,
			)
			if (FileSystem.exists(filePath))
				await FileSystem.unlink(filePath)
		}, { serverBlocked: true })

		actionList.add('fileExists', async (brain) => {
			const { filename } = brain.run.params
			const filePath = `${brain.fs.currentDir}/${filename}`
			present(
				[
					{ text: ': Checking if file exists ', style: 'italic' },
					{ text: filePath, color: 'gray', style: 'italic' },
				],
				brain,
			)
			brain.learn(constants.inputKey, FileSystem.exists(filePath))
		}, { serverBlocked: true })

		actionList.add('checkStringInFile', async (brain) => {
			const { filename, string } = brain.run.params
			const filePath = `${brain.fs.currentDir}/${filename}.txt`
			present(
				[
					{ text: ': Checking if string is in file ', style: 'italic' },
					{ text: filePath, color: 'gray', style: 'italic' },
				],
				brain,
			)
			const content = await FileSystem.readFile(filePath, 'utf8')
			brain.learn(constants.inputKey, content.includes(string))
		}, { serverBlocked: true })

		actionList.add('download', async (brain) => {
			const { url, filename, host, showProgress = true } = brain.run.params
			const name = filename ?? url.split('/').pop()
			const sanitizedFilename = sanitizeString(name)
			const needsHost = !url.startsWith('http')
			const fullUrl = needsHost ? `${host}${url}` : url
			const destPath = `${brain.fs.currentDir}/${sanitizedFilename}`

			present(
				[
					{ text: ': Downloading ', color: 'white', style: 'italic' },
					{ text: name, color: 'gray', style: 'italic' },
				],
				brain,
			)

			const response = await axios({
				url: fullUrl,
				method: 'GET',
				responseType: 'stream',
			})

			const writer = FileSystem.createWriteStream(destPath)

			let progressBar
			if (showProgress) {
				const totalMb = parseInt(response.headers['content-length'] || '0', 10) / (1024 * 1024)
				progressBar = new cliProgress.SingleBar(
					{
						format: ' {bar} {percentage}% | {value}/{total} MB',
						barCompleteChar: '\u2588',
						barIncompleteChar: '\u2591',
						hideCursor: true,
						gracefulExit: true,
					},
					cliProgress.Presets.shades_classic,
				)
				let current = 0
				progressBar.start(totalMb, current)

				response.data.on('data', (chunk) => {
					current += chunk.length / (1024 * 1024)
					progressBar.update(current)
				})
			}

			response.data.pipe(writer)

			return new Promise((resolve, reject) => {
				writer.on('finish', () => {
					if (progressBar) progressBar.stop()
					resolve()
				})
				writer.on('error', async (error) => {
					if (progressBar) progressBar.stop()
					// Clean up the partial file so the next attempt starts fresh.
					try {
						if (FileSystem.exists(destPath)) await FileSystem.unlink(destPath)
					} catch (_cleanupError) {
						// Best-effort cleanup; do not shadow the original error.
					}
					reject(error)
				})
			})
		}, { serverBlocked: true })
	}
}
