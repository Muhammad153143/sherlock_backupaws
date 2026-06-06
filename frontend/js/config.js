const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

const CONFIG = {
    API_URL: isLocal
        ? "http://localhost:5000/api/v1"
        : "/api/v1",

    AI_SERVICE_URL: isLocal
        ? "http://localhost:10000"
        : "/ai",

    SOCKET_URL: isLocal
        ? "http://localhost:5000"
        : window.location.origin
};