const API_BASE_URL = "http://sherlock-backend-env.eba-vi7tm3gu.eu-north-1.elasticbeanstalk.com/api/v1";
const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

const CONFIG = {
    API_URL: isLocal
        ? "http://sherlock-backend-env.eba-vi7tm3gu.eu-north-1.elasticbeanstalk.com/api/v1"
        : "/api/v1",

    AI_SERVICE_URL: isLocal
        ? "http://ai-serviceapp-env.eba-84cs83tr.eu-north-1.elasticbeanstalk.com"
        : "/ai",

    SOCKET_URL: isLocal
        ? "http://sherlock-backend-env.eba-vi7tm3gu.eu-north-1.elasticbeanstalk.com/api/v1"
        : window.location.origin
};
