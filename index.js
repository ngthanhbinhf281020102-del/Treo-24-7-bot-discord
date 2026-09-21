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
// HÀM LẤY GIỜ
// ================================

function getTime() {
    return new Date().toLocaleTimeString(
        "vi-VN",
        {
            hour12: false,
            timeZone: "Asia/Ho_Chi_Minh"
        }
    );
}

// ================================
// KIỂM TRA VARIABLES
// ================================

if (!TOKEN || !GUILD_ID || !CHANNEL_ID) {

    console.error(
        `[${getTime()}] ❌ Thiếu Railway Variables.`
    );

    process.exit(1);
}

// ================================
// VOICE CONNECTION
// ================================

let connection = null;
let reconnectTimer = null;
let checkingVoice = false;

// ================================
// HÀM KIỂM TRA CONNECTION CÒN HOẠT ĐỘNG
// ================================

function isConnectionActive() {

    if (!connection) {
        return false;
    }

    const status = connection.state.status;

    return (
        status === VoiceConnectionStatus.Ready ||
        status === VoiceConnectionStatus.Connecting ||
        status === VoiceConnectionStatus.Signalling
    );
}

// ================================
// HỦY CONNECTION CŨ
// ================================

function destroyConnection() {

    const oldConnection = connection;

    // Xóa tham chiếu trước khi hủy.
    // Điều này giúp event từ connection cũ
    // không ảnh hưởng đến connection mới.

    connection = null;

    if (oldConnection) {

        try {

            oldConnection.destroy();

            console.log(
                `[${getTime()}] 🧹 Đã dọn connection voice cũ.`
            );

        } catch (error) {

            console.error(
                `[${getTime()}] ❌ Lỗi hủy connection:`,
                error.message
            );

        }
    }
}

// ================================
// HÀM VÀO PHÒNG
// ================================

function joinRoom() {

    // Nếu connection hiện tại vẫn hoạt động,
    // không tạo connection mới.

    if (isConnectionActive()) {

        console.log(
            `[${getTime()}] ℹ️ Connection vẫn hoạt động, bỏ qua yêu cầu kết nối trùng.`
        );

        return;
    }

    // Nếu connection cũ còn nhưng không hoạt động,
    // dọn dẹp trước khi tạo connection mới.

    if (connection) {
        destroyConnection();
    }

    // ================================
    // LẤY SERVER
    // ================================

    const guild = client.guilds.cache.get(GUILD_ID);

    if (!guild) {

        console.log(
            `[${getTime()}] ❌ Không tìm thấy server.`
        );

        scheduleReconnect();

        return;
    }

    // ================================
    // LẤY CHANNEL
    // ================================

    const channel = guild.channels.cache.get(CHANNEL_ID);

    if (!channel) {

        console.log(
            `[${getTime()}] ❌ Không tìm thấy phòng thoại.`
        );

        scheduleReconnect();

        return;
    }

    // ================================
    // KIỂM TRA CHANNEL
    // ================================

    if (!channel.isVoiceBased()) {

        console.log(
            `[${getTime()}] ❌ CHANNEL_ID không phải phòng thoại.`
        );

        return;
    }

    // ================================
    // TẠO CONNECTION
    // ================================

    try {

        const newConnection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,

            // Bot không nghe âm thanh.
            selfDeaf: true,

            // Không tự mute microphone.
            selfMute: false
        });

        connection = newConnection;

        console.log(
            `[${getTime()}] 🎧 Đang kết nối phòng: ${channel.name}`
        );

        // ==========================
        // VOICE READY
        // ==========================

        newConnection.on(
            VoiceConnectionStatus.Ready,
            () => {

                // Bỏ qua event từ connection cũ.

                if (connection !== newConnection) {
                    return;
                }

                console.log(
                    `[${getTime()}] ✅ Voice đã sẵn sàng.`
                );

                // Connection thành công,
                // hủy timer reconnect nếu đang có.

                if (reconnectTimer) {

                    clearTimeout(reconnectTimer);

                    reconnectTimer = null;

                }
            }
        );

        // ==========================
        // VOICE DISCONNECTED
        // ==========================

        newConnection.on(
            VoiceConnectionStatus.Disconnected,
            () => {

                // Bỏ qua event từ connection cũ.

                if (connection !== newConnection) {
                    return;
                }

                console.log(
                    `[${getTime()}] ⚠️ Voice bị mất kết nối.`
                );

                scheduleReconnect(newConnection);
            }
        );

        // ==========================
        // VOICE DESTROYED
        // ==========================

        newConnection.on(
            VoiceConnectionStatus.Destroyed,
            () => {

                // Nếu connection này đã bị thay thế
                // thì không làm gì.

                if (connection !== newConnection) {
                    return;
                }

                console.log(
                    `[${getTime()}] ⚠️ Voice connection đã bị destroy.`
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

function scheduleReconnect(disconnectedConnection = null) {

    // Chỉ cho phép một timer reconnect tồn tại.

    if (reconnectTimer) {
        return;
    }

    reconnectTimer = setTimeout(
        () => {

            reconnectTimer = null;

            // ================================
            // KIỂM TRA CONNECTION CŨ
            // ================================

            if (
                disconnectedConnection &&
                connection !== disconnectedConnection
            ) {

                console.log(
                    `[${getTime()}] ℹ️ Bỏ qua reconnect của connection cũ.`
                );

                return;
            }

            // ================================
            // KIỂM TRA CONNECTION HIỆN TẠI
            // ================================

            if (isConnectionActive()) {

                console.log(
                    `[${getTime()}] ✅ Connection đã phục hồi, bỏ qua reconnect.`
                );

                return;
            }

            console.log(
                `[${getTime()}] 🔄 Đang thử kết nối lại voice...`
            );

            // ================================
            // DỌN CONNECTION CŨ
            // ================================

            if (connection) {
                destroyConnection();
            }

            // ================================
            // VÀO LẠI PHÒNG
            // ================================

            joinRoom();

        },
        5000
    );
}

// ================================
// KIỂM TRA BOT CÓ ĐÚNG PHÒNG VOICE
// ================================

function checkVoice() {

    // Không cho phép nhiều lần kiểm tra
    // chạy cùng lúc.

    if (checkingVoice) {
        return;
    }

    checkingVoice = true;

    try {

        // ================================
        // LẤY SERVER
        // ================================

        const guild = client.guilds.cache.get(GUILD_ID);

        if (!guild) {

            console.log(
                `[${getTime()}] ⚠️ Không tìm thấy server khi kiểm tra voice.`
            );

            return;
        }

        // ================================
        // LẤY CHANNEL
        // ================================

        const channel = guild.channels.cache.get(CHANNEL_ID);

        if (!channel) {

            console.log(
                `[${getTime()}] ⚠️ Không tìm thấy phòng voice khi kiểm tra.`
            );

            return;
        }

        // ================================
        // KIỂM TRA VOICE STATE THỰC TẾ
        // ================================

        const botVoice = guild.members.me?.voice;

        const currentChannelId = botVoice?.channelId || null;

        // ================================
        // BOT ĐANG ĐÚNG PHÒNG
        // ================================

        if (currentChannelId === CHANNEL_ID) {

            // Nếu connection cũng hoạt động
            // thì hoàn toàn bình thường.

            if (isConnectionActive()) {

                console.log(
                    `[${getTime()}] ✅ Voice check: Bot đang đúng phòng và connection hoạt động.`
                );

                return;
            }

            // Bot vẫn ở phòng nhưng connection
            // của thư viện không còn hoạt động.

            console.log(
                `[${getTime()}] ⚠️ Bot vẫn ở đúng phòng nhưng connection không hoạt động.`
            );

            if (reconnectTimer) {
                return;
            }

            scheduleReconnect();

            return;
        }

        // ================================
        // BOT KHÔNG Ở ĐÚNG PHÒNG
        // ================================

        console.log(
            `[${getTime()}] ⚠️ Bot không còn ở phòng voice mục tiêu.`
        );

        // ================================
        // BOT ĐANG Ở PHÒNG KHÁC
        // ================================

        if (currentChannelId) {

            console.log(
                `[${getTime()}] 📍 Bot hiện đang ở channel: ${currentChannelId}`
            );

        } else {

            console.log(
                `[${getTime()}] 📍 Bot hiện không ở phòng voice nào.`
            );
        }

        // ================================
        // DỌN CONNECTION CŨ
        // ================================

        if (connection) {
            destroyConnection();
        }

        // ================================
        // VÀO LẠI PHÒNG MỤC TIÊU
        // ================================

        scheduleReconnect();

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

        // Cho Railway tự khởi động lại process
        // trong trường hợp lỗi nghiêm trọng.

        process.exit(1);
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

        // Hủy timer reconnect.

        if (reconnectTimer) {

            clearTimeout(reconnectTimer);

            reconnectTimer = null;
        }

        // Dọn voice connection.

        if (connection) {

            try {

                connection.destroy();

            } catch (error) {

                console.error(
                    `[${getTime()}] ❌ Lỗi cleanup voice:`,
                    error.message
                );
            }

            connection = null;
        }

        // Đóng Discord client.

        try {

            client.destroy();

        } catch (error) {

            console.error(
                `[${getTime()}] ❌ Lỗi đóng Discord client:`,
                error.message
            );
        }

        process.exit(0);
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

        // Hủy timer reconnect.

        if (reconnectTimer) {

            clearTimeout(reconnectTimer);

            reconnectTimer = null;
        }

        // Dọn voice connection.

        if (connection) {

            try {

                connection.destroy();

            } catch (error) {

                console.error(
                    `[${getTime()}] ❌ Lỗi cleanup voice:`,
                    error.message
                );
            }

            connection = null;
        }

        // Đóng Discord client.

        try {

            client.destroy();

        } catch (error) {

            console.error(
                `[${getTime()}] ❌ Lỗi đóng Discord client:`,
                error.message
            );
        }

        process.exit(0);
    }
);

// ================================
// LOGIN
// ================================

console.log(
    `[${getTime()}] 🔑 Đang đăng nhập Discord...`
);

client.login(TOKEN);
