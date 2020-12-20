const	createPost = require('./util'),
	Instagram = require('instagram-web-api')
	path = require('path'),
	{ readFile } = require('fs'),
	cron = require('cron'),
	mongoose = require('mongoose')

const result = require('dotenv').config()
result.error && console.error(result.error)
const alreadyReplied = [
	'17903759710624074',
	'17909399302572969',
	'17856953801368114',
	'17907593437592514',
	'18048818101279278',
	'17851021136430423'
]

mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true,  useUnifiedTopology: true})
mongoose.connection.on('error', console.error.bind(console, 'Connection error:'))

const Reply = mongoose.model("Reply", mongoose.Schema({
	mentionId: Number,
	replyId: Number
}));

const client = new Instagram({ username: process.env.IG_USERNAME, password: process.env.IG_PASSWORD })

client.login().then(async () => {
	const user = await client.getProfile()
	console.info(`Logged in as ${user.username}`)
	cron.job('0 */30 * * * *', async () => {
		try {
			console.info(`Starting post.`)
			createPost().then(async (caption) => {
				const post = await client.uploadPhoto({ photo: path.join(__dirname, 'temp.jpeg'), caption, post: 'feed' })
				console.info(`Post status: ${post.status}`)
			})
		}catch(err) {
			console.error(err)
		}
	}).start()
	cron.job('0 * * * * *', async () => {
		try {
			const mentions = (await client.getActivity()).activity_feed.edge_web_activity_feed.edges
				.map(e => e.node).filter(n => n.type === 5)
			mentions.forEach(async (mention) => {
				const commentId = mention.id.split('_')[1] 
				const reply = await Reply.findOne({ mentionId: commentId }).exec()
				if(reply)
					return
				const caption = await createPost(mention.media.thumbnail_src)
				const comment = await client.addComment({ 
					mediaId: mention.media.id, 
					text: caption, 
					replyToCommentId: commentId
				})
				const mentionReply = await new Reply({ mentionId: commentId, replyId: comment.id }).save()
				console.info(`Comment status: ${comment.status} (${mentionReply.replyId})`)
			})
		}catch(err) {
			console.error(err.message)
			await new Reply({ mentionId: commentId, errorMessage: err.message }).save()
		}
	}).start()
})

