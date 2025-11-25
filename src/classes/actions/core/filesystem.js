import constants from '../../../utils/constants.js'
import { displayText } from '../../../utils/display.js'
import { sanitizeString } from '../../../utils/utils.js'
import { pathJoin, basePathJoin } from '../../../utils/paths.js'
import { FileSystem } from '../../../utils/fileSystem.js'
import axios from 'axios'
import cliProgress from 'cli-progress'

export default class FilesystemActions {
	static register(actionList) {
		actionList.add('setBaseDir', async (brain) => {
			const { dir } = brain.recall(constants.paramsKey)
			brain.learn(constants.baseDirKey, basePathJoin(`../resources/${dir}`))
			if (!FileSystem.exists(brain.recall(constants.baseDirKey)))
				await FileSystem.mkdir(brain.recall(constants.baseDirKey))
		})
		actionList.add('setCurrentDir', async (brain) => {
			let { dir, useBaseDir = false } = brain.recall(constants.paramsKey)
			dir = sanitizeString(dir)
			if (
				!FileSystem.exists(
					pathJoin(brain.recall(constants.currentDirKey), dir),
				)
			)
				throw new Error(`Directory ${dir} does not exist`)
			displayText(
				[
					{ text: ': Setting current dir to ', color: 'white', style: 'italic' },
					{ text: dir, color: 'gray', style: 'italic' },
				],
				brain,
			)
			brain.learn(
				constants.currentDirKey,
				pathJoin(
					useBaseDir ? brain.recall(constants.baseDirKey) : brain.recall(constants.currentDirKey),
					dir,
				),
			)
		})
		actionList.add('resetCurrentDir', async (brain) => {
			brain.learn(constants.currentDirKey, brain.recall(constants.baseDirKey))
		})
		actionList.add('backToParentDir', async (brain) => {
			if (brain.recall(constants.currentDirKey) === brain.recall(constants.baseDirKey)) return
			brain.learn(
				constants.currentDirKey,
				brain.recall(constants.currentDirKey).split('/').slice(0, -1).join('/'),
			)
		})
		actionList.add('createDir', async (brain) => {
			let { dir, useBaseDir = false } = brain.recall(constants.paramsKey)
			dir = sanitizeString(dir)
			displayText(
				[
					{ text: ': Creating directory ', color: 'white', style: 'italic' },
					{ text: dir, color: 'gray', style: 'italic' },
				],
				brain,
			)
			const dirPath = pathJoin(
				useBaseDir ? brain.recall(constants.baseDirKey) : brain.recall(constants.currentDirKey),
				dir,
			)
			if (!FileSystem.exists(dirPath)) {
				await FileSystem.mkdir(dirPath)
			}
		})
		actionList.add('deleteFolder', async (brain) => {
			const { foldername } = brain.recall(constants.paramsKey)
			displayText(
				[
					{ text: ': Deleting folder ', style: 'italic' },
					{
						text: `${brain.recall(constants.currentDirKey)}/${foldername}`,
						color: 'gray',
						style: 'italic',
					},
				],
				brain,
			)
			if (
				FileSystem.exists(
					`${brain.recall(constants.currentDirKey)}/${foldername}`,
				)
			)
				await FileSystem.rmdir(
					`${brain.recall(constants.currentDirKey)}/${foldername}`,
					{ recursive: true },
				)
		})
		actionList.add('listFolders', async (brain) => {
			displayText(
				[
					{ text: ': Listing folders ', style: 'italic' },
					{ text: `${brain.recall(constants.currentDirKey)}`, color: 'gray', style: 'italic' },
				],
				brain,
			)
			const files = await FileSystem.readdir(
				brain.recall(constants.currentDirKey),
				{ withFileTypes: true },
			)
			const folders = files
				.filter((dirent) => dirent.isDirectory())
				.map((dirent) => dirent.name)
			brain.learn(constants.inputKey, folders)
		})
		actionList.add('createFile', async (brain) => {
			const { filename, content = '' } = brain.recall(constants.paramsKey)
			displayText(
				[
					{ text: ': Creating file ', style: 'italic' },
					{ text: `${brain.recall(constants.currentDirKey)}/${filename}.txt`, style: 'bold' },
				],
				brain,
			)
			await FileSystem.appendFile(
				`${brain.recall(constants.currentDirKey)}/${filename}.txt`,
				content,
			)
		})
		actionList.add('readFromText', async (brain) => {
			const { filename, breakLine = false } = brain.recall(constants.paramsKey)
			displayText(
				[
					{ text: ': Loading file ', style: 'italic' },
					{
						text: `${brain.recall(constants.currentDirKey)}/${filename}.txt`,
						color: 'gray',
						style: 'italic',
					},
				],
				brain,
			)
			const content = await FileSystem.readFile(
				`${brain.recall(constants.currentDirKey)}/${filename}.txt`,
				'utf8',
			)
			if (breakLine) {
				// add to brain using an array
				brain.learn(constants.inputKey, content.split('\n'))
			} else {
				// add to brain using a string
				brain.learn(constants.inputKey, content)
			}
		})
		actionList.add('saveToText', async (brain) => {
			const { key, filename } = brain.recall(constants.paramsKey)
			const content = brain.recall(key)
			if (content) {
				displayText(
					[
						{ text: ': Saving ', color: 'white', style: 'italic' },
						{
							text: `${brain.recall(constants.currentDirKey)}/${filename}.txt`,
							color: 'gray',
							style: 'italic',
						},
					],
					brain,
				)
				await FileSystem.writeFile(
					`${brain.recall(constants.currentDirKey)}/${filename}.txt`,
					Array.isArray(content) ? content.join('\n') : content,
				)
			}
		})
		actionList.add('appendToText', async (brain) => {
			const { key, filename } = brain.recall(constants.paramsKey)
			const content = brain.recall(key)
			if (content) {
				displayText(
					[
						{ text: ': Appending to ', color: 'white', style: 'italic' },
						{
							text: `${brain.recall(constants.currentDirKey)}/${filename}.txt`,
							color: 'gray',
							style: 'italic',
						},
					],
					brain,
				)
				await FileSystem.appendFile(
					`${brain.recall(constants.currentDirKey)}/${filename}.txt`,
					Array.isArray(content) ? content.join('\n') : content + '\n',
				)
			}
		})
		actionList.add('deleteFile', async (brain) => {
			const { filename } = brain.recall(constants.paramsKey)
			displayText(
				[
					{ text: ': Deleting file ', style: 'italic' },
					{
						text: `${brain.recall(constants.currentDirKey)}/${filename}.txt`,
						color: 'gray',
						style: 'italic',
					},
				],
				brain,
			)
			if (
				FileSystem.exists(
					`${brain.recall(constants.currentDirKey)}/${filename}.txt`,
				)
			)
				await FileSystem.unlink(
					`${brain.recall(constants.currentDirKey)}/${filename}.txt`,
				)
		})
		actionList.add('fileExists', async (brain) => {
			const { filename } = brain.recall(constants.paramsKey)
			displayText(
				[
					{ text: ': Checking if file exists ', style: 'italic' },
					{
						text: `${brain.recall(constants.currentDirKey)}/${filename}`,
						color: 'gray',
						style: 'italic',
					},
				],
				brain,
			)
			const exists = FileSystem.exists(
				`${brain.recall(constants.currentDirKey)}/${filename}`,
			)
			brain.learn(constants.inputKey, exists)
		})
		actionList.add('checkStringInFile', async (brain) => {
			const { filename, string } = brain.recall(constants.paramsKey)
			displayText(
				[
					{ text: ': Checking if string is in file ', style: 'italic' },
					{
						text: `${brain.recall(constants.currentDirKey)}/${filename}.txt`,
						color: 'gray',
						style: 'italic',
					},
				],
				brain,
			)
			const content = await FileSystem.readFile(
				`${brain.recall(constants.currentDirKey)}/${filename}.txt`,
				'utf8',
			)
			brain.learn(constants.inputKey, content.includes(string))
		})
		actionList.add('download', async (brain) => {
			const { url, filename, host, showProgress = true } = brain.recall(constants.paramsKey)
			const name = filename ?? url.split('/').pop()
			const sanitizedFilename = sanitizeString(name)
			const needsHost = !url.startsWith('http')

			displayText(
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
				`${brain.recall(constants.currentDirKey)}/${sanitizedFilename}`,
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
		})
	}
}
