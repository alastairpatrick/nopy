const https = require('https');
const fs = require('fs');

const promisify = (fn) => {
    return function (...args) {
        return new Promise((resolve, reject) => {
            fn.call(this, ...args, (error, result) => {
                if (error)
                    reject(error);
                else
                    resolve(result);
            });
        });
    };
}

const downloadFile = async (url, filePath) => {
    const res = await new Promise((resolve, reject) => {
        https.get(url, resolve).on('error', reject);
    });
    const fileStream = fs.createWriteStream(filePath);
    res.pipe(fileStream);
    await new Promise((resolve, reject) => {
        fileStream.on('finish', resolve);
        fileStream.on('error', reject);
    });
}

module.exports = {
    promisify,
    downloadFile,
}
