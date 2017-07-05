"use strict";

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

module.exports = {
  promisify,
}
