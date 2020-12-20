const { createCanvas, loadImage } = require('canvas'),
	Vibrant = require('node-vibrant'),
	Frame = require('canvas-to-buffer'),
	fs = require('fs'),
	path = require('path')

async function createPost(imageUrl) {
	return new Promise(async (resolve, _reject) => {
		const canvas = createCanvas(600, 600)
		const ctx = canvas.getContext('2d')
		ctx.drawImage(await loadImage(imageUrl ?? 'https://source.unsplash.com/600x500'), 0, 0, 600, 500)
		const palette = await Vibrant.from(canvas.toBuffer()).getPalette()
		ctx.fillStyle = '#fff'
		ctx.fillRect(0, 600, 600, 100)
		const keys = Object.keys(palette)
		for (const i in keys) {
			ctx.fillStyle = palette[keys[i]].getHex()
			ctx.fillRect(45 + (i * 60) + (i * 30), 520, 60, 60)
		}
		const out = fs.createWriteStream(path.join(__dirname, imageUrl ? 'commentTemp.jpeg': '/temp.jpeg'))
		out.on('finish', () => resolve(`Colors extracted: ${Object.keys(palette).map(key => palette[key].getHex()).join(', ')}`))
		canvas.createJPEGStream().pipe(out)
	})
}

module.exports = createPost