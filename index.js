const { Plugin } = require("powercord/entities")
const { getModule , channels } = require("powercord/webpack")
const { createBotMessage } = getModule([ "createBotMessage" ], false)
const { receiveMessage }   = getModule([ "receiveMessage" ], false)

const fs = require("fs")
const ytdl = require("ytdl-core")
const dir = __dirname
// I saw in pc-commands they some how required a fucking folder don't know how to do that tbh
// const commands = fs.readdirSync(`${dir}\\commands`).map(file => {
//     const command = require(`${dir}\\commands\\${file}`)
//     command.module = this
//     return command
// })
// const ffmpeg = require("fluent-ffmpeg")
// const { createFFmpeg, fetchFile } = require("@ffmpeg/ffmpeg")
// const ffmpeg = createFFmpeg({ corePath: `${dir}\\ffmpeg-core.js` })

const ffmpegPlatform = process.platform != "win32" ? "mac" : "windows.exe"
const exec = require("util").promisify(require("child_process").exec)
let downloading = false

module.exports = class YoutubeMusic extends Plugin {
    constructor() {
        super()
        this.playing = undefined
        this.volume = 0.50
        this.name = ""
        this.getAudio = this.getAudio.bind(this)
        this.downloadVideo = this.downloadVideo.bind(this)

    }
    
    async sendBotMessage(content, title, footer, author, url, footerURL ) {
        const received = createBotMessage(channels.getChannelId())
        received.author.username = "Youtube Music"
        // received.author.avatar = "https://bloximages.newyork1.vip.townnews.com/jewishaz.com/content/tncms/assets/v3/editorial/9/e0/9e0f4054-50aa-11e9-8169-030b16b2a5e4/5c9ba015c2cc7.image.jpg"
        console.log(received)
        received.embeds.push({
            color: 0x0099ff,
            title: title,
            url: url,
            author: {
                name: author,
            },
            description: content,
            timestamp: new Date(),
            footer: {
                text: footer,
                icon_url: footerURL,
            },
        })
        return receiveMessage(received.channel_id, received)
    }
    
    async getAudio(pattern, cb) { // im just sending it this cause idk fuck me right im retarded murder me please im a sin just living im a fucking mistake right alright got it 
        const { getAudioList } = this
        
        const list = await getAudioList()

        for (const name of list) {
            if (name.toLowerCase().match(pattern.toLowerCase())) {
                cb(name)
                return 
            }
        }

        cb(false)
    }
    
    async downloadVideo(url, cb) { // i fucking hate ffmpeg fuck stream to mp3 im just installing mp4 then converting to mp3, i know that hurts you but i"ve done it anyway so kill me murder me then please
        if (downloading) return
        const rawFiles = await fs.promises.readdir(`${__dirname}\\content\\`)
        const files = rawFiles.map(x => x.split(".").slice(0, -1).join(".")) // removes extension names like mp3/mp4/avi/js
        
        downloading = true
        const stream = ytdl(url)
        
        
        stream.on("info", (info) => {
            const { videoDetails } = info
            const { title } = info.videoDetails
            console.log(videoDetails)
            const mp4Path = `${__dirname}\\downloading\\${title}.mp4`
            
            console.log(videoDetails)

            if (files.indexOf(title) != -1) {
                cb(`Installation of "${title}" was terminated because there is a audio with a matching name already installed.`)
                downloading = false
            } else {
                cb(`Installation of "${title}" has started and will take a specific amount of time depending on the size of the video. (closing/refreshing discord will cancel)`)
                stream.pipe(fs.createWriteStream(mp4Path))
                
                // this is tied to the memory shit in stream.on that errors

                // const data = []

                // stream.on("data", (chunk) => {
                //     data.push(chunk)
                // })
                
                stream.on("end", async () => {
                    await exec(`${ffmpegPlatform} -i "downloading/${title}.mp4" "downloading/${title}.mp3"`, {
                        cwd: __dirname
                    })

                    const path = `${__dirname}\\downloading\\${title}`

                    // I tried to do this shit but like it errors getting memory so for now im just leaving the exe I can't do shit atm 
                    // const buffers = Buffer.concat(data)
                    // await ffmpeg.load()
                    // ffmpeg.FS("writeFile", `${path}.mp4`, new Uint8Array(buffers, 0, buffers.byteLength))
                    // await ffmpeg.run("-i", `${path}.mp4`, `${path}.mp3`)
                    // await fs.promises.writeFile(`${path}.mp3`, ffmpeg.FS("readFile", `${path}.mp3`))

                    await fs.promises.unlink(mp4Path)
                    await fs.promises.rename(`${__dirname}\\downloading\\${title}.mp3`, `${__dirname}\\content\\${title}.mp3`)
                    cb(`Installation of "${title}" should be completed and can be viewed in ytlist.`)
                    downloading = false
                })
                
                return videoDetails
            }
        })
    }
    
    async getAudioList() {
        const rawList = await fs.promises.readdir(`${dir}/content/`)
        return rawList.map(x => x.split(".").slice(0, -1).join("."))
    }
    
    getPlaying(_this) { // yeah idk feel like it looks better but of course no thats probably false cause i can"t ever be right im always wrong 
        return _this.playing
    }

    async startPlugin() {
        const dlPath = `${__dirname}\\downloading\\` // clears downloads for people that could have refreshed/closed discord while there was shit installing still 
        const files = await fs.promises.readdir(dlPath)
        
        console.log(files)
        for await (const file of files) {
            await fs.promises.unlink(`${dlPath}\\${file}`)
        }
        // Object.values(commands).forEach(c => powercord.api.commands.registerCommand(c))

        const file = `${__dirname}\\${ process.platform == "win32" ? "mac" : "windows.exe" }`

        fs.stat(file, (_, stats) => { // removes the version that won't be used
            if ((stats) && (stats.isFile())) {
                fs.promises.unlink(file)
            }
        })
  
        
        const { sendBotMessage, downloadVideo, getAudioList, getAudio, getPlaying } = this
        
        
        powercord.api.commands.registerCommand({
            command: "ytplay",
            description: "play downloaded youtube audio",
            usage: "{c}",
            executor: async (args) => {
                const name = args.join(" ")
                const playing = getPlaying(this)

                if (playing) { 
                    if (name) {
                        playing.pause()
                        playing.currentTime = 0
                    } else {
                        const time = Math.floor((playing.currentTime/playing.duration) * 50) 

                        if (playing.paused) {
                            playing.play()
                            sendBotMessage(`🎵 [ ${"-".repeat(time)}⏺${"-".repeat(50-time)} ]`, this.name, `${this.volume*100}%`)
                        }    
                        return
                    } 
                } else {
                    if (!name) {
                        sendBotMessage("Please use the name of a song, to view your installed audio use the command ytlist. (ex: .ytplay drip drop)")
                        return
                    }
                }
                


                await getAudio(name, (content) => {
                    if (!content) {
                        sendBotMessage(`Couldn't find the audio matching the pattern of "${name}", retype the command or review downloaded audio with the ytlist command.`)
                        return
                    }

                    const data = fs.readFileSync(`${__dirname}\\content\\${content}.mp3`,"base64")
                    const audio = new Audio(`data:audio/mp3;base64,${data}`) // i got this shit from a snippet in the powercord discord cause im retarded as fuck and dumb and also bad
                    audio.volume = this.volume
                    this.playing = audio
                    this.name = content
                    audio.play()
                }, this)
            }
        })

        powercord.api.commands.registerCommand({
            command: "ytpause",
            description: "play downloaded youtube audio",
            usage: "{c}",
            executor: async (args) => {
                if (args.length != 0) return
                const playing = getPlaying(this)
                const time = Math.floor((playing.currentTime/playing.duration) * 50) 

                if ((playing) && (!playing.paused)) {
                    playing.pause()
                    sendBotMessage(`⏸ [ ${"-".repeat(time)}⏺${"-".repeat(50-time)} ]`, this.name, `${this.volume*100}%`)
                }               
                
            }
        })

        powercord.api.commands.registerCommand({
            command: "ytvolume",
            description: "play downloaded youtube audio",
            usage: "{c}",
            executor: async (args) => {
                if (args.length != 1) return
                const volume = (Number(args.shift()) || 50)/100
                const playing = getPlaying(this)

                if ((volume) && (volume <= 1) && (volume >= 0.01)) {
                    this.volume = volume
                    if (playing) {
                        playing.volume = volume
                        let time = Math.floor((playing.currentTime/playing.duration) * 50) 
                        sendBotMessage(`${playing?playing.paused?"⏸ ":"🎵 ":""}[ ${"-".repeat(time)}⏺${"-".repeat(50-time)} ]`, this.name, `${this.volume*100}%`)  
                    }

                }               
                
            }
        })
        
        powercord.api.commands.registerCommand({
            command: "ytdownload",
            description: "download video audio from youtube",
            usage: "{c}",
            executor: async (args) => {
                const [url] = args
                
                if (downloading) {
                    sendBotMessage("There is a video that is still downloading currently.")
                    return
                }
                
                await downloadVideo(url, sendBotMessage)
            }
        })
        
        powercord.api.commands.registerCommand({
            command: "ytlist",
            description: "list of downloaded youtube audio",
            usage: "{c}",
            executor: async (args) => { // this is kinda retarded making it mostly just a function call and string manipulation im just retarded idk why im alive tbh 
                const list = await getAudioList()
                
                sendBotMessage(list.join("\n"), "Downloaded Audio:")
            }
        })

        powercord.api.commands.registerCommand({
            command: "ytrename",
            description: "rename downloaded youtube audio",
            usage: "{c}",
            executor: async (args) => { // this is kinda retarded making it mostly just a function call and string manipulation im just retarded idk why im alive tbh 
                if (args.length <= 2) {
                    sendBotMessage("This command was typed improperly use this example: (.ytrename unreleased Juice WRLD - drip drop).")
                    return
                }
                const pattern = args[0]
                const rename = args.slice(1).join(" ")

                await getAudio(pattern, (content) => {
                    if (!content) {
                        sendBotMessage(`Couldn't find the audio matching the pattern of "${pattern}", retype the command or review downloaded audio with the ytlist command.`)
                        return
                    }

                    if (content == this.name) {
                        this.name = rename
                    }
                    fs.promises.rename(`${__dirname}\\content\\${content}.mp3`, `${__dirname}\\content\\${rename.trim()}.mp3`)
                }, this)
            }
        })

        powercord.api.commands.registerCommand({
            command: "ytdelete",
            description: "delete downloaded youtube audio",
            usage: "{c}",
            executor: async (args) => { // this is kinda retarded making it mostly just a function call and string manipulation im just retarded idk why im alive tbh 
                if (args.length >= 2) {
                    sendBotMessage("This command was typed improperly use this example: (.ytrename unreleased Juice WRLD - drip drop).")
                    return
                }
                const pattern = args.join(" ")

                await getAudio(pattern, async (content) => {
                    if (!content) {
                        sendBotMessage(`Couldn't find the audio matching the pattern of "${pattern}", retype the command or review downloaded audio with the ytlist command.`)
                        return
                    }

                    if (content == this.name) {
                        this.name = ""
                    }

                    await fs.promises.unlink(`${__dirname}\\content\\${content}.mp3`)
                    sendBotMessage(`Removed the audio called "${content}" that was downloaded from Youtube.`)

                }, this)
            }
        })
    }
    
    pluginWillUnload() {
        // Object.values(commands).forEach(command => powercord.api.commands.unregisterCommand(command.command))
        powercord.api.commands.unregisterCommand("ytplay")
        powercord.api.commands.unregisterCommand("ytdownload")
        powercord.api.commands.unregisterCommand("ytlist")
        powercord.api.commands.unregisterCommand("ytvolume")
        powercord.api.commands.unregisterCommand("ytrename")
        powercord.api.commands.unregisterCommand("ytdelete")
        
    }
}