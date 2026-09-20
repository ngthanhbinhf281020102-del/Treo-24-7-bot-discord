const {
    Client,
    GatewayIntentBits
} = require("discord.js");

const {
    joinVoiceChannel,
    VoiceConnectionStatus
} = require("@discordjs/voice");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// Lấy từ Railway Variables
const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;

let connection;

function joinRoom() {
    const guild = client.guilds.cache.get(GUILD_ID);

    if (!guild) {
        console.log("Không tìm thấy server.");
        return;
    }

    const channel = guild.channels.cache.get(CHANNEL_ID);

    if (!channel) {
        console.log("Không tìm thấy phòng thoại.");
        return;
    }

    if (!channel.isVoiceBased()) {
        console.log("CHANNEL_ID không phải phòng thoại.");
        return;
    }

    if (connection) {
        try {
            connection.destroy();
        } catch {}
    }

    connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: true
    });

    console.log(`Đã vào phòng: ${channel.name}`);

    connection.on(
        VoiceConnectionStatus.Disconnected,
        () => {
            console.log("Mất kết nối, đang kết nối lại...");

            setTimeout(() => {
                joinRoom();
            }, 5000);
        }
    );
}

client.once("ready", () => {
    console.log(`Bot online: ${client.user.tag}`);

    joinRoom();
});

client.login(TOKEN);