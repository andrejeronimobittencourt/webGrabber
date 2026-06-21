import constants from '../../utils/constants.js'
import { present } from '../../infrastructure/presenter/present.js'
import { sanitizeString } from '../../utils/stringUtils.js'
import { pathJoin, rootPathJoin } from '../../utils/paths.js'
import { FileSystem } from '../../utils/FileSystem.js'
import axios from 'axios'
import cliProgress from 'cli-progress'

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
			if (
				!FileSystem.exists(
					pathJoin(brain.fs.currentDir, dir),
				)
			)
				throw new Error(`Directory ${dir} does not exist`)
			present(
				[
					{ text: ': Setting current dir to ', color: 'white', style: 'italic' },
					{ text: dir, color: 'gray', style: 'italic' },
				],
				brain,
			)
			brain.fs.currentDir = pathJoin(
				useBaseDir ? brain.fs.baseDir : brain.fs.currentDir,
				dir,
			)
		}, { serverBlocked: true })
		actionList.add('resetCurrentDir', async (brain) => {
			brain.fs.currentDir = brain.fs.baseDir
		})
		actionList.add('backToParentDir', async (brain) => {
			if (brain.fs.currentDir === brain.fs.baseDir) return
			brain.fs.currentDir = brain.fs.currentDir.split('/').slice(0, -1).join('/')
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
			present(
				[
					{ text: ': Deleting folder ', style: 'italic' },
					{
						text: `${brain.fs.currentDir}/${foldername}`,
						color: 'gray',
						style: 'italic',
					},
				],
				brain,
			)
			if (
				FileSystem.exists(
					`${brain.fs.currentDir}/${foldername}`,
				)
			)
				await FileSystem.rmdir(
					`${brain.fs.currentDir}/${foldername}`,
					{ recursive: true },
				)
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
			present(
				[
					{ text: ': Loading file ', style: 'italic' },
					{
						text: `${brain.fs.currentDir}/${filename}.txt`,
						color: 'gray',
						style: 'italic',
					},
				],
				brain,
			)
			const content = await FileSystem.readFile(
				`${brain.fs.currentDir}/${filename}.txt`,
				'utf8',
			)
			if (breakLine) {
				// add to brain using an array
				brain.learn(constants.inputKey, content.split('\n'))
			} else {
				// add to brain using a string
				brain.learn(constants.inputKey, content)
			}
		}, { serverBlocked: true })
		actionList.add('saveToText', async (brain) => {
			const { key, filename } = brain.run.params
			const content = brain.recall(key)
			if (content) {
				present([
					{ text: ': Saving ', color: 'white', style: 'italic' },
					{
						text: `${brain.fs.currentDir}/${filename}.txt`,
						color: 'gray',
						style: 'italic',
					},
				], brain)
				await FileSystem.writeFile(
					`${brain.fs.currentDir}/${filename}.txt`,
					Array.isArray(content) ? content.join('\n') : content,
				)
			}
		}, { serverBlocked: true })
		actionList.add('appendToText', async (brain) => {
			const { key, filename } = brain.run.params
			const content = brain.recall(key)
			if (content) {
				present([
					{ text: ': Appending to ', color: 'white', style: 'italic' },
					{
						text: `${brain.fs.currentDir}/${filename}.txt`,
						color: 'gray',
						style: 'italic',
					},
				], brain)
				await FileSystem.appendFile(
					`${brain.fs.currentDir}/${filename}.txt`,
					Array.isArray(content) ? content.join('\n') : content + '\n',
				)
			}
		}, { serverBlocked: true })
		actionList.add('deleteFile', async (brain) => {
			const { filename } = brain.run.params
			present(
				[
					{ text: ': Deleting file ', style: 'italic' },
					{
						text: `${brain.fs.currentDir}/${filename}.txt`,
						color: 'gray',
						style: 'italic',
					},
				],
				brain,
			)
			if (
				FileSystem.exists(
					`${brain.fs.currentDir}/${filename}.txt`,
				)
			)
				await FileSystem.unlink(
					`${brain.fs.currentDir}/${filename}.txt`,
				)
		}, { serverBlocked: true })
		actionList.add('fileExists', async (brain) => {
			const { filename } = brain.run.params
			present(
				[
					{ text: ': Checking if file exists ', style: 'italic' },
					{
						text: `${brain.fs.currentDir}/${filename}`,
						color: 'gray',
						style: 'italic',
					},
				],
				brain,
			)
			const exists = FileSystem.exists(
				`${brain.fs.currentDir}/${filename}`,
			)
			brain.learn(constants.inputKey, exists)
		}, { serverBlocked: true })
		actionList.add('checkStringInFile', async (brain) => {
			const { filename, string } = brain.run.params
			present(
				[
					{ text: ': Checking if string is in file ', style: 'italic' },
					{
						text: `${brain.fs.currentDir}/${filename}.txt`,
						color: 'gray',
						style: 'italic',
					},
				],
				brain,
			)
			const content = await FileSystem.readFile(
				`${brain.fs.currentDir}/${filename}.txt`,
				'utf8',
			)
			brain.learn(constants.inputKey, content.includes(string))
		}, { serverBlocked: true })
		actionList.add('download', async (brain) => {
			const { url, filename, host, showProgress = true } = brain.run.params
			const name = filename ?? url.split('/').pop()
			const sanitizedFilename = sanitizeString(name)
			const needsHost = !url.startsWith('http')

			present(
				[
					{ text: ': Downloading ', color: 'white', style: 'italic' },
					{ text: name, color: 'gray', style: 'italic' },
				],
				brain,
			)
			const response = await axios({
				url: needsHost ? `${host}${url}` : url,
				method: 'GET',
				responseType: 'stream',
			})

			const writer = FileSystem.createWriteStream(
				`${brain.fs.currentDir}/${sanitizedFilename}`,
			)

			let progressBar
			if (showProgress) {
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
				progressBar.start(parseInt(response.headers['content-length'] / (1024 * 1024)), current)

				response.data.on('data', (chunk) => {
					current += chunk.length / (1024 * 1024)
					progressBar.update(parseInt(current))
				})
			}

			response.data.pipe(writer)

			return new Promise((resolve, reject) => {
				writer.on('finish', () => {
					if (progressBar) progressBar.stop()
					resolve()
				})
				writer.on('error', reject)
			})
		}, { serverBlocked: true })
	}
}
