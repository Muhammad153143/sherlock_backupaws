// Initialize chat.js
console.log("=== Chat.js Started ===");
let socket;
let currentUser = null;
let currentItem = null;

// DOM Elements (will be initialized after DOM is ready)
let chatMessages;
let chatForm;
let messageInput;
let connectionStatus;
let itemInfo;
let chatWithHeader;
let logoutBtn;
let backBtn;

document.addEventListener('DOMContentLoaded', () => {
    console.log("=== DOM Loaded ===");
    // Initialize DOM elements
    chatMessages = document.getElementById('chatMessages');
    chatForm = document.getElementById('chatForm');
    messageInput = document.getElementById('messageInput');
    connectionStatus = document.getElementById('connectionStatus');
    itemInfo = document.getElementById('itemInfo');
    chatWithHeader = document.getElementById('chatWith');
    logoutBtn = document.getElementById('logoutBtn');
    backBtn = document.getElementById('backBtn');

    console.log("DOM Elements:", { chatMessages, chatForm, messageInput, connectionStatus, itemInfo });

    // Get URL params
    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('itemId');
    const userId = urlParams.get('userId');
    console.log("URL Params:", { itemId, userId });

    // Validate itemId
    if (!itemId) {
        alert('Item ID is missing! Redirecting to home...');
        window.location.href = 'index.html';
        return;
    }

    // Logout button listener
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            console.log("Logging out...");
            logout(); // Uses logout from app.js
        });
    }

    // Back button listener (if exists)
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            console.log("Going back...");
            window.history.back();
        });
    }

    // Chat form listener
    if (chatForm && messageInput) {
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageText = messageInput.value.trim();
            console.log("Sending message:", messageText);
            
            if (!messageText) {
                alert('Please enter a message!');
                return;
            }
            if (!currentUser) {
                alert('You must be logged in!');
                return;
            }
            if (!currentItem) {
                alert('Item details not loaded!');
                return;
            }

            let targetReceiverId = userId || (currentUser.role === 'admin' ? currentItem.user?._id : 'admin_placeholder');
            console.log("Target Receiver:", targetReceiverId);

            const messageData = {
                itemId,
                receiverId: targetReceiverId,
                message: messageText,
                senderId: currentUser._id,
                createdAt: new Date()
            };

            try {
                let savedMsg = await fetchAPI('/chat/send', {
                    method: 'POST',
                    body: JSON.stringify(messageData)
                });

                // Handle all possible response formats
                let finalMsg = savedMsg.data || savedMsg.chat || savedMsg.savedMessage || savedMsg;
                if (savedMsg.message && typeof savedMsg.message === "object") {
                    finalMsg = savedMsg.message;
                }

                console.log("Message saved final:", finalMsg);

                appendMessage(finalMsg);
                messageInput.value = "";

                if (socket && socket.connected) {
                    socket.emit("sendMessage", finalMsg);
                }
            } catch (error) {
                console.error('Error sending message:', error);
                alert('Error sending message: ' + (error.message || 'Unknown error'));
            }
        });
    }

    // Start auth check
    checkChatAuth(itemId, userId);
});

// Check Authentication
async function checkChatAuth(itemId, userId) {
    console.log("=== Checking Auth ===");
    const { token, user } = checkAuth(); // Uses checkAuth from app.js
    console.log("CheckAuth Result:", { token, user });

    if (!token || !user) {
        console.log('No token/user found, redirecting to login');
        window.location.href = 'login.html';
        return;
    }

    try {
        let data = await fetchAPI('/auth/me');
        // Handle all possible response formats
        if (data.user) data = data.user;
        if (data.data) data = data.data;
        console.log('Fetched current user:', data);
        currentUser = data;
        if (logoutBtn) {
            logoutBtn.style.display = 'block';
        }
        initChat(itemId, userId);
    } catch (error) {
        console.error('Auth error:', error);
        // Don't logout on auth/me error! Just proceed with cached user
        if (user) {
            currentUser = user;
            initChat(itemId, userId);
        } else {
            window.location.href = 'login.html';
        }
    }
}

// Initialize Chat
async function initChat(itemId, userId) {
    console.log("=== Initializing Chat ===");
    console.log("ItemId:", itemId, "UserId:", userId);
    console.log("CONFIG.SOCKET_URL:", CONFIG.SOCKET_URL);

    // Load Item Details first
    await loadItemDetails(itemId);

    // Load Chat History
    await loadChatHistory(itemId);

    // Initialize Socket.IO
    initializeSocket(itemId);
}

// Initialize Socket.IO
function initializeSocket(itemId) {
    if (typeof io === "undefined") {
        console.error("Socket.IO not loaded");
        if (connectionStatus) {
            connectionStatus.textContent = "🔴 Socket.IO not found";
            connectionStatus.style.color = "#e74c3c";
        }
        return;
    }

    socket = io(CONFIG.SOCKET_URL, {
        transports: ["websocket", "polling"],
        withCredentials: true
    });

    socket.on("connect", () => {
        console.log("✅ Socket connected! ID:", socket.id);

        if (connectionStatus) {
            connectionStatus.textContent = "🟢 Connected";
            connectionStatus.style.color = "#2ecc71";
        }

        socket.emit("joinRoom", { itemId });
        console.log("Joined room:", itemId);
    });

    socket.on("disconnect", () => {
        console.log("❌ Socket disconnected");

        if (connectionStatus) {
            connectionStatus.textContent = "🔴 Disconnected";
            connectionStatus.style.color = "#e74c3c";
        }
    });

    socket.on("connect_error", (error) => {
        console.error("❌ Socket connection error:", error.message);

        if (connectionStatus) {
            connectionStatus.textContent = "🔴 Connection Error";
            connectionStatus.style.color = "#e74c3c";
        }
    });

    socket.on("receiveMessage", (msg) => {
        console.log("Received message:", msg);

        if (!msg || msg.itemId !== itemId) return;

        const senderId = String(msg.senderId?._id || msg.senderId || "");
        const currentUserId = String(currentUser?._id || currentUser?.id || "");

        if (senderId === currentUserId) return;

        appendMessage(msg);
    });
}

// Load Item Details
async function loadItemDetails(itemId) {
    try {
        console.log("=== Loading Item Details ===");
        let item = await fetchAPI(`/items/${itemId}`);
        // Handle all possible response formats
        if (item.item) item = item.item;
        if (item.data) item = item.data;
        currentItem = item;
        console.log('Loaded item:', currentItem);

        if (itemInfo && currentItem) {
            itemInfo.textContent = `Item: ${currentItem.title} (${currentItem.type}) | Location: ${currentItem.location}`;
            if (chatWithHeader && currentUser) {
                const chatPartnerName = currentUser.role === 'admin' ? (currentItem.user?.name || 'User') : 'Administrator';
                chatWithHeader.textContent = `Chat with ${chatPartnerName} 💬`;
            }
        }
    } catch (error) {
        console.error('Error loading item:', error);
        if (itemInfo) {
            itemInfo.textContent = 'Error loading item details';
        }
    }
}

// Load Chat History
async function loadChatHistory(itemId) {
    try {
        console.log("=== Loading Chat History ===");
        let messages = await fetchAPI(`/chat/${itemId}`);
        // Handle all possible response formats
        if (messages.messages) messages = messages.messages;
        if (messages.data) messages = messages.data;
        console.log('Loaded chat history:', messages);
        if (chatMessages) {
            chatMessages.innerHTML = '';
            if (messages && messages.length > 0) {
                messages.forEach(msg => {
                    appendMessage(msg);
                });
            } else {
                chatMessages.innerHTML = '<p style="text-align:center;color:#888;">No messages yet. Say hi! 👋</p>';
            }
            scrollToBottom();
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        if (chatMessages) {
            chatMessages.innerHTML = '<p style="text-align:center;color:#e74c3c;">Error loading chat history</p>';
        }
    }
}

// Append Message to UI
function appendMessage(msg) {
    if (!chatMessages || !currentUser || !msg) {
        console.warn("Cannot append message:", { chatMessages, currentUser, msg });
        return;
    }

    const currentUserId = String(currentUser._id || currentUser.id || "");

    const senderId = String(
        msg.senderId?._id ||
        msg.senderId ||
        msg.sender?._id ||
        msg.sender ||
        ""
    );

    const messageText = msg.message || msg.text || msg.content || "";

    if (!messageText) {
        console.warn("Message text missing:", msg);
        return;
    }

    const isSent = senderId === currentUserId;

    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message");
    messageDiv.classList.add(isSent ? "sent" : "received");

    const timestamp = msg.createdAt
        ? new Date(msg.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        })
        : "";

    const senderName = isSent
        ? "You"
        : msg.senderId?.name || msg.sender?.name || "Other";

    messageDiv.innerHTML = `
        <div class="message-content">${messageText}</div>
        <div class="message-info">
            <span>${senderName}</span>
            <span>${timestamp}</span>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// Scroll to Bottom
function scrollToBottom() {
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}
