import chalk from 'chalk'

export default class StyledConsole {
	static create(templateArray) {
		let chalkText = ''
		templateArray.reverse()
		templateArray.forEach((template) => {
			const { text, color, background, style } = template
			let tmpText = ''
			if (color && background && style) tmpText = chalk[color][background][style](text)
			else if (color && background) tmpText = chalk[color][background](text)
			else if (color && style) tmpText = chalk[color][style](text)
			else if (background && style) tmpText = chalk[background][style](text)
			else if (color) tmpText = chalk[color](text)
			else if (background) tmpText = chalk[background](text)
			else if (style) tmpText = chalk[style](text)
			else tmpText = chalk(text)
			chalkText = tmpText + chalkText
		})
		return chalkText
	}

	static write(templateArray) {
		console.log(StyledConsole.create(templateArray))
	}
}
