const {
    Client,
    GatewayIntentBits
} = require("discord.js");

const {
    joinVoiceChannel,
    VoiceConnectionStatus
} = require("@discordjs/voice");

// ================================
// CLIENT
// ================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// ================================
// RAILWAY VARIABLES
// ================================

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;

// ================================
// KIỂM TRA VARIABLES
// ================================

if (
    !TOKEN ||
    !GUILD_ID ||
    !CHANNEL_ID
) {
    console.error(
        `[${getTime()}] ❌ Thiếu Railway Variables.`
    );

    process.exit(1);
}

// ================================
// HÀM LẤY GIỜ
// ================================

function getTime() {

    const now = new Date();

    return now.toLocaleTimeString(
        "vi-VN",
        {
            hour12: false,
            timeZone: "Asia/Ho_Chi_Minh"
        }
    );

}

// ================================
// VOICE CONNECTION
// ================================

let connection = null;
let reconnectTimer = null;
let checkingVoice = false;

// ================================
// HÀM VÀO PHÒNG
// ================================

function joinRoom() {

    const guild =
        client.guilds.cache.get(
            GUILD_ID
        );

    if (!guild) {

        console.log(
            `[${getTime()}] ❌ Không tìm thấy server.`
        );

        scheduleReconnect();

        return;
    }

    const channel =
        guild.channels.cache.get(
            CHANNEL_ID
        );

    if (!channel) {

        console.log(
            `[${getTime()}] ❌ Không tìm thấy phòng thoại.`
        );

        scheduleReconnect();

        return;
    }

    if (!channel.isVoiceBased()) {

        console.log(
            `[${getTime()}] ❌ CHANNEL_ID không phải phòng thoại.`
        );

        return;
    }

    // ==========================
    // HỦY CONNECTION CŨ
    // ==========================

    if (connection) {

        try {

            connection.destroy();

        } catch {}

        connection = null;
    }

    // ==========================
    // TẠO CONNECTION MỚI
    // ==========================

    try {

        connection =
            joinVoiceChannel({
                channelId: channel.id,
                guildId: guild.id,
                adapterCreator:
                    guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: false
            });

        console.log(
            `[${getTime()}] 🎧 Đã vào phòng: ${channel.name}`
        );

        // ==========================
        // VOICE READY
        // ==========================

        connection.on(
            VoiceConnectionStatus.Ready,
            () => {

                console.log(
                    `[${getTime()}] ✅ Voice đã sẵn sàng.`
                );

            }
        );

        // ==========================
        // VOICE DISCONNECTED
        // ==========================

        connection.on(
            VoiceConnectionStatus.Disconnected,
            () => {

                console.log(
                    `[${getTime()}] ⚠️ Voice bị mất kết nối.`
                );

                scheduleReconnect();

            }
        );

        // ==========================
        // VOICE DESTROYED
        // ==========================

        connection.on(
            VoiceConnectionStatus.Destroyed,
            () => {

                console.log(
                    `[${getTime()}] ⚠️ Voice connection đã bị hủy.`
                );

                connection = null;

                scheduleReconnect();

            }
        );

    } catch (error) {

        console.error(
            `[${getTime()}] ❌ Lỗi khi vào voice:`,
            error.message
        );

        scheduleReconnect();
    }
}

// ================================
// LÊN LỊCH KẾT NỐI LẠI
// ================================

function scheduleReconnect() {

    if (reconnectTimer) {

        return;
    }

    reconnectTimer =
        setTimeout(
            () => {

                reconnectTimer = null;

                console.log(
                    `[${getTime()}] 🔄 Đang thử kết nối lại voice...`
                );

                joinRoom();

            },
            5000
        );
}

// ================================
// KIỂM TRA BOT CÓ TRONG VOICE
// ================================

function checkVoice() {

    if (checkingVoice) {

        return;
    }

    checkingVoice = true;

    try {

        const guild =
            client.guilds.cache.get(
                GUILD_ID
            );

        if (!guild) {

            console.log(
                `[${getTime()}] ⚠️ Không tìm thấy server khi kiểm tra voice.`
            );

            return;
        }

        const channel =
            guild.channels.cache.get(
                CHANNEL_ID
            );

        if (!channel) {

            console.log(
                `[${getTime()}] ⚠️ Không tìm thấy phòng voice khi kiểm tra.`
            );

            return;
        }

        // ==========================
        // KIỂM TRA BOT ĐANG Ở VOICE
        // ==========================

        const botVoice =
            guild.members.me?.voice;

        const currentChannelId =
            botVoice?.channelId;

        // ==========================
        // KHÔNG Ở PHÒNG MỤC TIÊU
        // ==========================

        if (
            currentChannelId !== CHANNEL_ID
        ) {

            console.log(
                `[${getTime()}] ⚠️ Bot không còn ở phòng voice mục tiêu.`
            );

            if (
                currentChannelId
            ) {

                console.log(
                    `[${getTime()}] 📍 Bot hiện đang ở channel: ${currentChannelId}`
                );

            } else {

                console.log(
                    `[${getTime()}] 📍 Bot hiện không ở phòng voice nào.`
                );

            }

            joinRoom();

            return;
        }

        // ==========================
        // ĐANG Ở ĐÚNG PHÒNG
        // ==========================

        console.log(
            `[${getTime()}] ✅ Voice check: Bot vẫn đang ở đúng phòng.`
        );

    } catch (error) {

        console.error(
            `[${getTime()}] ❌ Lỗi kiểm tra voice:`,
            error.message
        );

    } finally {

        checkingVoice = false;

    }
}

// ================================
// BOT ONLINE
// ================================

client.once(
    "clientReady",
    () => {

        console.log(
            `[${getTime()}] =================================`
        );

        console.log(
            `[${getTime()}] 🤖 Bot online: ${client.user.tag}`
        );

        console.log(
            `[${getTime()}] 🆔 PID: ${process.pid}`
        );

        console.log(
            `[${getTime()}] 🏠 GUILD_ID: ${GUILD_ID}`
        );

        console.log(
            `[${getTime()}] 🎧 CHANNEL_ID: ${CHANNEL_ID}`
        );

        console.log(
            `[${getTime()}] =================================`
        );

        // ==========================
        // VÀO VOICE NGAY
        // ==========================

        joinRoom();

        // ==========================
        // KIỂM TRA VOICE MỖI 1 PHÚT
        // ==========================

        setInterval(
            () => {

                checkVoice();

            },
            60 * 1000
        );

        // ==========================
        // HEARTBEAT MỖI 5 PHÚT
        // ==========================

        setInterval(
            () => {

                console.log(
                    `[${getTime()}] 💓 BOT ALIVE | ${new Date().toISOString()} | PID=${process.pid}`
                );

            },
            5 * 60 * 1000
        );

    }
);

// ================================
// DISCORD ERROR
// ================================

client.on(
    "error",
    error => {

        console.error(
            `[${getTime()}] ❌ Discord Error:`,
            error
        );

    }
);

// ================================
// UNHANDLED REJECTION
// ================================

process.on(
    "unhandledRejection",
    error => {

        console.error(
            `[${getTime()}] ❌ Unhandled Rejection:`,
            error
        );

    }
);

// ================================
// UNCAUGHT EXCEPTION
// ================================

process.on(
    "uncaughtException",
    error => {

        console.error(
            `[${getTime()}] ❌ Uncaught Exception:`,
            error
        );

    }
);

// ================================
// PROCESS EXIT
// ================================

process.on(
    "exit",
    code => {

        console.log(
            `[${getTime()}] 🛑 PROCESS EXIT | code=${code}`
        );

    }
);

// ================================
// SIGTERM
// ================================

process.on(
    "SIGTERM",
    () => {

        console.log(
            `[${getTime()}] ⚠️ SIGTERM - Railway đang yêu cầu dừng process.`
        );

    }
);

// ================================
// SIGINT
// ================================

process.on(
    "SIGINT",
    () => {

        console.log(
            `[${getTime()}] ⚠️ SIGINT - Process bị dừng.`
        );

    }
);

// ================================
// LOGIN
// ================================

console.log(
    `[${getTime()}] 🔑 Đang đăng nhập Discord...`
);

client.login(
    TOKEN
);
