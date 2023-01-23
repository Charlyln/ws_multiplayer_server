const express = require('express');
const http = require('http');
const ws = require('ws');
const path = require('path');

const app = express();
app.get('/', (req, res) => {
  res.send('WS MULTIPLAYER SERVER');
});

const httpServer = http.createServer(app);
const wss = new ws.Server({ server: httpServer });

let clients = [];

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.onmessage = (wsevent) => {
    var temp = wsevent.data.toString();

    var mySubString = temp.substring(
      temp.indexOf('{'),
      temp.lastIndexOf('}') + 1
    );

    const parsed = JSON.parse(mySubString);

    const { id, event, ...data } = parsed;

    console.log(`receive event [${event}] from client [${id}] data:`, data);

    let messageEvent;
    let message;
    let buffer;

    switch (event) {
      case 'connect':
        clients.push({
          id,
          x: data.x,
          y: data.y,
          name: data.name,
          color: data.color,
        });

        messageEvent = 'connect';

        message = { event: messageEvent, players: clients };
        buffer = Buffer.from(JSON.stringify(message));

        wss.clients.forEach((client) => {
          client.send(JSON.stringify(message));
        });

        break;

      case 'move':
        messageEvent = 'move';

        const moveIndex = clients.findIndex((client) => client.id === id);

        clients[moveIndex].x = data.x;
        clients[moveIndex].y = data.y;

        message = { event: messageEvent, player: clients[moveIndex] };

        wss.clients.forEach((client) => {
          client.send(JSON.stringify(message));
        });

        break;

      case 'bullet':
        messageEvent = 'bullet';

        const bulletIndex = clients.findIndex((client) => client.id === id);

        clients[bulletIndex].x = data.x;
        clients[bulletIndex].y = data.y;
        clients[bulletIndex].mouse_x = data.mouse_x;
        clients[bulletIndex].mouse_y = data.mouse_y;

        message = { event: messageEvent, player: clients[bulletIndex] };

        console.log(message);

        wss.clients.forEach((client) => {
          client.send(JSON.stringify(message));
        });

        break;

      case 'disconnect':
        const index = clients.findIndex((client) => client.id === id);

        messageEvent = 'disconnect';
        message = { event: messageEvent, index, player: clients[index] };

        if (index > -1) {
          clients.splice(index, 1);
        }

        wss.clients.forEach((client) => {
          client.send(JSON.stringify(message));
        });

        break;

      default:
        console.log('received unknow event', parsed);
        break;
    }
  };

  ws.onclose = (event) => {
    console.log('close socket');
  };
});

const port = process.env.PORT || 80;

httpServer.listen(port, () => {
  console.log('Server started. Port: ', port);
});
