const express = require('express');
const app = express();
const socketIo = require('socket.io');
const http = require('http').createServer(app);
const CryptoJS = require('crypto-js');
const io = socketIo(http, {
  cors: {
    origin: '*',
  },
});

class Game {
  #sendData;
  #winners;
  #secretKey;
  #dataSentCount;
  #greaterThan50RunHorses;
  #horsesGreaterThan50RunFlag;
  #obj;
  #objModificationCount;
  #sendingDataFlag;
  #totalRun;

  constructor(io, secretKey) {
    this.io = io;
    this.#sendingDataFlag = true; // set flag to true initially
    this.#secretKey = secretKey;
    this.#dataSentCount = 0;
    this.#greaterThan50RunHorses = [];
    this.#horsesGreaterThan50RunFlag = false;
    this.#winners = [];
    this.#obj = {};
    this.#objModificationCount = 0;
    this.#totalRun = Array.from({ length: 14 }, () => 0);
    this.setupSocketListeners();
  }

  setupSocketListeners() {
    this.io.on('connection', (socket) => {
      console.log('New client connected');
      socket.on('disconnect', () => {
        console.log('Client disconnected');
      });
    });
  }

  reset() {
    this.#totalRun = Array.from({ length: 14 }, () => 0);
    this.#dataSentCount = 0;
    this.#greaterThan50RunHorses.length = 0;
    this.#horsesGreaterThan50RunFlag = false;
    this.#winners.length = 0;
    this.#objModificationCount = 0;
    for (var member in this.#obj) delete this.#obj[member];
    this.#sendingDataFlag = true;
  }

  sendNumbers() {
    if (this.#sendingDataFlag) {
      this.sendingSingleData(); // Sending Data to client

      if (this.checkValueGreaterThan100() > 3) {
        this.#sendingDataFlag = false; // set flag to false if sum is greater than 100
        this.reset();
        console.log('GAME COMPLETE ..10s BREAK..');
        setTimeout(() => {
          this.#sendingDataFlag = true; // set flag to true again after 30 seconds
          this.sendNumbers(); // retry sending data using recursion
        }, 10000);
        return;
      }
    }
    setTimeout(() => this.sendNumbers(), 500); // send data every 5 seconds
  }

  sendingSingleData() {
    const data = Array.from({ length: 14 }, () =>
      Math.floor(Math.random() * 4 + 1)
    );

    this.checkValueGretterThan50(); // Check which 5 values are greater than 50 and store in array

    if (this.#horsesGreaterThan50RunFlag) {
      this.changeData_5_Horses_Greater_then_50_Run(); // Change data of 5 horses which are greater than 50
    }

    console.log(
      'Greater_then_50_Run_5_Horses : ',
      this.#greaterThan50RunHorses,
      ' - ' + this.#greaterThan50RunHorses.length,
      ' - FLAG ---' + this.#horsesGreaterThan50RunFlag
    );

    this.#totalRun.forEach((num, index) => {
      this.#totalRun[index] += data[index]; // add random data to total run
    });

    process.stdout.write(
      '\r' + 'Data Sent : ' + (this.#dataSentCount + 1) + ' --} '
    );

    for (let i = 0; i < this.#totalRun.length; i++) {
      process.stdout.write(i + 1 + '.   ' + this.#totalRun[i] + '%  | ');
    }

    this.sendData('data', this.#totalRun);
  }

  async sendData(event, data) {
    if (this.#sendingDataFlag) {
      await this.io.emit(event, this.encryptData(data));
      this.#dataSentCount++;
    }
  }

  checkValueGretterThan50() {
    if (this.#greaterThan50RunHorses.length > 5) {
      return this.#greaterThan50RunHorses;
    } else {
      for (let i = 0; i < this.#totalRun.length; i++) {
        if (this.#totalRun[i] >= 50) {
          if (this.#greaterThan50RunHorses.length < 5) {
            if (!this.#greaterThan50RunHorses.includes(i + 1))
              this.#greaterThan50RunHorses.push(i + 1);
          } else {
            this.#horsesGreaterThan50RunFlag = true;
          }
        }
      }
    }
  }

  changeData_5_Horses_Greater_then_50_Run() {
    console.log('\nBEFORE : ', this.#totalRun);
    this.#totalRun.forEach((num, index) => {
      if (!this.#greaterThan50RunHorses.includes(index + 1)) {
        this.#totalRun[index] += Math.floor(Math.random() * 8 + 1);
      }
    });
    console.log('\nAFTER : ', this.#totalRun);
  }

  checkValueGreaterThan100() {
    let count = 0;
    for (let i = 0; i < this.#totalRun.length; i++) {
      if (this.#totalRun[i] >= 100) {
        count++;
        if (!this.#winners.includes(i + 1)) {
          this.#winners.push(i + 1);
        }
      }
    }
    const winners = this.getWinningHorses();
    if (winners) {
      console.log('Winning_queue : ', this.#winners, 'Horses');
      console.log('Winners : ', winners);
    }
    return count;
  }

  getWinningHorses() {
    if (this.#winners.length === 1) {
      this.#obj['1'] = this.#winners[0];
      this.#objModificationCount++;
      console.log('obj : ', this.#obj);
      return Object.values(this.#obj);
    }
    if (this.#winners.length > 1) {
      while (
        Object.keys(this.#obj).length <
        (this.#winners.length > 3 ? 3 : this.#winners.length)
      ) {
        let randomNo = Math.floor(Math.random() * this.#winners.length);
        console.log('RANDOM : ', randomNo);
        if (!Object.values(this.#obj).includes(this.#winners[randomNo])) {
          this.#obj[`${this.#objModificationCount + 1}`] =
            this.#winners[randomNo];
          this.#objModificationCount++;
        }
      }
      if (Object.keys(this.#obj).length === 3) {
        this.#sendingDataFlag = false;
        this.io.emit('winners', this.encryptData(Object.values(this.#obj)));
      }
      console.log('obj : ', this.#obj);
      return Object.values(this.#obj);
    }
  }

  encryptData(data) {
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(data),
      this.#secretKey
    ).toString();

    const binaryString = CryptoJS.enc.Base64.parse(encrypted).toString(
      CryptoJS.enc.Latin1
    );
    const byteArray = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      byteArray[i] = binaryString.charCodeAt(i);
    }

    return byteArray.buffer;
  }

  get sendFlag() {
    return this.#sendingDataFlag;
  }

  set sendFlag(flag) {
    this.#sendingDataFlag = flag;
  }

  get sum() {
    return this.#totalRun;
  }
}

class Server {
  #port;
  #game;

  constructor(port) {
    this.#port = port;
    this.#game = new Game(io, 'mysecretkey');
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
