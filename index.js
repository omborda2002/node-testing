const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

class Game {
  #sendData;
  #sumArray;

  constructor() {
    this.#sendData = true; // set flag to true initially
    this.#sumArray = [0, 0, 0, 0]; // initialize array to store sums
  }

  reset() {
    this.#sumArray = [0, 0, 0, 0];
    this.#sendData = true;
  }

  sendNumbers() {
    if (this.#sendData) {
      let numbers = [
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
      ];
      this.#sumArray.forEach((num, index) => {
        this.#sumArray[index] += numbers[index];
      });

      let sum = this.#sumArray.find((element) => element > 100); // Check sum is find in sumArray greater then 100

      io.emit('data', numbers); // send numbers to clients
      console.log(`Sent numbers: ${numbers}, sumArray: ${this.#sumArray}`);

      if (sum) {
        this.#sendData = false; // set flag to false if sum is greater than 100
        sum = false;
        console.log('GAME COMPLETE ..10s BREAK..');
        this.reset();
        setTimeout(() => {
          this.#sendData = true; // set flag to true again after 30 seconds
          this.sendNumbers(); // retry sending data using recursion
        }, 10000);
        return;
      }
    }
    setTimeout(() => this.sendNumbers(), 500); // send data every 5 seconds
  }

  get sendFlag() {
    return this.#sendData;
  }

  set sendFlag(flag) {
    this.#sendData = flag;
  }

  get sum() {
    return this.#sumArray;
  }
}

class Server {
  #port;
  #game;

  constructor(port) {
    this.#port = port;
    this.#game = new Game();
  }

  start() {
    // start sending numbers
    this.#game.sendNumbers();

    // start server
    http.listen(this.#port, () => {
      console.log(`Server started on port ${this.#port}`);
    });
  }

  get game() {
    return this.#game;
  }

  set game(g) {
    this.#game = g;
  }
}

const server = new Server(3000);
server.start();
