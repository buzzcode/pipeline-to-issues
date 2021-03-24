//
// Util methods
//

// delay method to deal with rate-limiting
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class ApiError extends Error {
    constructor(message) {
        super(message);
        this.code = 403;
    }
}

module.exports = { sleep, ApiError };