const	createPost = require('./util'),
	Instagram = require('instagram-web-api')
	path = require('path'),
	{ readFile } = require('fs'),
	cron = require('cron')

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
/*
async function login() { 
	const client = new IgApiClient()
	if (process.env.IG_USERNAME && process.env.IG_PASSWORD) {
		try {
			client.state.generateDevice(process.env.IG_USERNAME)
			await client.simulate.preLoginFlow()
			const user = await client.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD)
			process.nextTick(async () => await client.simulate.postLoginFlow())
			console.info('Instagram login success.\n')
			return { client, user }
		} catch (error) {
			console.error('Instagram login fail: ' + error)
			process.exit(-1)
		}
	} else {
		throw Error('Instagram username and password are required to be set in the environment.')
	}
}
*/
const client = new Instagram({ username: process.env.IG_USERNAME, password: process.env.IG_PASSWORD })

client.login().then(async () => {
	const user = await client.getProfile()
	console.info(`Logged in as ${user.username}`)
	cron.job('0 */30 * * * *', async () => {
		try {
			console.info(`Starting post.`)
			createPost().then(async (caption) => {
				const post = await client.uploadPhoto({ photo: path.join(__dirname, 'temp.jpeg'), caption, post: 'feed' })
				console.log(post)
				console.info(`Post status: ${post.status} (${post.id})`)
			})
		}catch(err) {
			console.error(err)
		}
	}).start()
	cron.job('0 * * * * *', async () => {
		try {
			console.info('Searching for mentions.')
			const mentions = (await client.getActivity()).activity_feed.edge_web_activity_feed.edges
				.map(e => e.node).filter(n => n.type === 5)
			mentions.forEach(async (mention) => {
				const commentId = mention.id.split('_')[1] 
				if(alreadyReplied.includes(commentId))
					return
				const caption = await createPost(mention.media.thumbnail_src)
				const comment = await client.addComment({ 
					mediaId: mention.media.id, 
					text: caption, 
					replyToCommentId: commentId
				})
				console.info(`Comment status: ${comment.status} (${comment.id})`)
				alreadyReplied.push(commentId)
			})
		}catch(err) {
			console.error(err)
		}
	}).start()
})

