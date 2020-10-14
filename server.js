const { Client } = require('discord.js');
const YouTube = require('simple-youtube-api');
const yt = require('ytdl-core');
const ayarlar = require('./ayarlar.json');
const client = new Client();

const youtube = new YouTube(ayarlar.api);



let queue = {};

const commands = {
	'play': (msg) => {
		if (queue[msg.guild.id] === undefined) return msg.channel.sendMessage(`${ayarlar.prefix}add <url> ile birkaç müzik ekle`);
		if (!msg.guild.voiceConnection) return commands.join(msg).then(() => commands.play(msg));
		if (queue[msg.guild.id].playing) return msg.channel.sendMessage('Zaten Çalınan var');
		let dispatcher;
		queue[msg.guild.id].playing = true;

		console.log(queue);
		(function play(song) {
			console.log(song);
			if (song === undefined) return msg.channel.sendMessage('Sıra boş').then(() => {
				queue[msg.guild.id].playing = false;
				msg.member.voiceChannel.leave();
			});
			msg.channel.sendMessage(`Çalınan: **${song.title}** talep eden: **${song.requester}**`);
			dispatcher = msg.guild.voiceConnection.playStream(yt(song.url, { audioonly: true }), { passes : ayarlar.passes });
			let collector = msg.channel.createCollector(m => m);
			collector.on('message', m => {
				if (m.content.startsWith(ayarlar.prefix + 'pause')) {
					msg.channel.sendMessage('**durduruldu**').then(() => {dispatcher.pause();});
				} else if (m.content.startsWith(ayarlar.prefix + 'resume')){
					msg.channel.sendMessage('**devam ediyor**').then(() => {dispatcher.resume();});
				} else if (m.content.startsWith(ayarlar.prefix + 'skip')){
					msg.channel.sendMessage('**geçildi**').then(() => {dispatcher.end();});
				} else if (m.content.startsWith('volume+')){
					if (Math.round(dispatcher.volume*50) >= 100) return msg.channel.sendMessage(`Şiddet: ${Math.round(dispatcher.volume*50)}%`);
					dispatcher.setVolume(Math.min((dispatcher.volume*50 + (2*(m.content.split('+').length-1)))/50,2));
					msg.channel.sendMessage(`Şiddet: ${Math.round(dispatcher.volume*50)}%`);
				} else if (m.content.startsWith('volume-')){
					if (Math.round(dispatcher.volume*50) <= 0) return msg.channel.sendMessage(`Şiddet: ${Math.round(dispatcher.volume*50)}%`);
					dispatcher.setVolume(Math.max((dispatcher.volume*50 - (2*(m.content.split('-').length-1)))/50,0));
					msg.channel.sendMessage(`Şiddet: ${Math.round(dispatcher.volume*50)}%`);
				} else if (m.content.startsWith(ayarlar.prefix + 'time')){
					msg.channel.sendMessage(`Süre: ${Math.floor(dispatcher.time / 60000)}:${Math.floor((dispatcher.time % 60000)/1000) <10 ? '0'+Math.floor((dispatcher.time % 60000)/1000) : Math.floor((dispatcher.time % 60000)/1000)}`);
				}
			});
			dispatcher.on('end', () => {
				collector.stop();
				play(queue[msg.guild.id].songs.shift());
			});
			dispatcher.on('error', (err) => {
				return msg.channel.sendMessage('Hata: ' + err).then(() => {
					collector.stop();
					play(queue[msg.guild.id].songs.shift());
				});
			});
		})(queue[msg.guild.id].songs.shift());
	},
	'join': (msg) => {
		return new Promise((resolve, reject) => {
			const voiceChannel = msg.member.voiceChannel;
			if (!voiceChannel || voiceChannel.type !== 'voice') return msg.reply('Bir kanala katıl.');
			voiceChannel.join().then(connection => resolve(connection)).catch(err => reject(err));
		});
	},
	'leave': (msg) => {
					const voiceChannel = msg.member.voiceChannel;

			voiceChannel.leave()
		
	},
	'add': async (msg) => {
		const args = msg.content.split(' ');
		const searchString = args.slice(1).join(' ');
		const url2 = args[1].replace(/<.+>/g, '1');
		
		try {
			var video = await youtube.getVideo(url2)
		} catch (error) {
			try {
				var videos = await youtube.searchVideos(searchString, 1)
				var video = await youtube.getVideoByID(videos[0].id)
			} catch (err) {
				console.log(err)
				message.channel.send('Bir hata oluştu: ' + err)
			};
		};
		
		var url = `https://www.youtube.com/watch?v=${video.id}`
		
		if (url == '' || url === undefined) return msg.channel.sendMessage(`Bir YouTube linki eklemek için ${ayarlar.prefix}add <url> yazınız`);
		yt.getInfo(url, (err, info) => {
			if(err) return msg.channel.sendMessage('Geçersiz YouTube Bağlantısı: ' + err);
			if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].songs = [];
			queue[msg.guild.id].songs.push({url: url, title: info.title, requester: msg.author.username});
			msg.channel.sendMessage(`sıraya **${info.title}** eklendi`);
		});
	},
	'queue': (msg) => {
		if (queue[msg.guild.id] === undefined) return msg.channel.sendMessage(`Sıraya ilk önce bazı şarkıları ekle : ${ayarlar.prefix}add`);
		let tosend = [];
		queue[msg.guild.id].songs.forEach((song, i) => { tosend.push(`${i+1}. ${song.title} - Talep eden: ${song.requester}`);});
		msg.channel.sendMessage(`__**${msg.guild.name}'s Müzik Kuyruğu:**__ Şu anda **${tosend.length}** şarkı sırada ${(tosend.length > 15 ? '*[Sadece 15 tanesi gösteriliyor]*' : '')}\n\`\`\`${tosend.slice(0,15).join('\n')}\`\`\``);
	}
};

client.on('ready', () => {
	console.log('ready!');
});

client.on('message', msg => {
	if (!msg.content.startsWith(ayarlar.prefix)) return;
	if (commands.hasOwnProperty(msg.content.toLowerCase().slice(ayarlar.prefix.length).split(' ')[0])) commands[msg.content.toLowerCase().slice(ayarlar.prefix.length).split(' ')[0]](msg);
});
client.login(ayarlar.token);