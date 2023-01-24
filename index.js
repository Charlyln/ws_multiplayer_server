const express = require('express');
const http = require('http');
const ws = require('ws');

const app = express();
app.get('/', (req, res) => {
  res.send('WS MULTIPLAYER SERVER');
});

const httpServer = http.createServer(app);
const wss = new ws.Server({ server: httpServer });

wss.on('connection', (ws) => {
  console.log('client connection', wss.clients.size);
  ws.onmessage = (wsevent) => {
    var temp = wsevent.data.toString();

    var mySubString = temp.substring(
      temp.lastIndexOf('{'),
      temp.lastIndexOf('}') + 1
    );
    const parsed = JSON.parse(mySubString);
    const { id, event, ...data } = parsed;
    console.log(`receive event [${event}] from client [${id}] data:`, data);

    let message;

    switch (event) {
      case 'connect':
        ws.state = {
          id: id,
          x: data.x,
          y: data.y,
          name: data.name,
          color: data.color,
        };

        const init_players = [];

        if (wss.clients.size > 1) {
          const connect_msg = { event: 'connect', player: ws.state };
          wss.clients.forEach((client) => {
            if (client.state?.id && client.state?.id !== id) {
              init_players.push(client.state);
              client.send(JSON.stringify(connect_msg));
            }
          });
          console.log('send new player to all clients', init_players.length);
        } else {
          console.log('firest player connected');
        }

        const init_msg = { event: 'init', players: init_players };
        ws.send(JSON.stringify(init_msg));

        break;

      case 'move':
        ws.state.x = data.x;
        ws.state.y = data.y;

        message = { event: 'move', player: ws.state };

        wss.clients.forEach((client) => {
          if (client.id !== id) {
            client.send(JSON.stringify(message));
          }
        });

        break;

      case 'bullet':
        ws.state.x = data.x;
        ws.state.y = data.y;
        ws.state.mouse_x = data.mouse_x;
        ws.state.mouse_y = data.mouse_y;

        message = { event: 'bullet', player: ws.state };

        wss.clients.forEach((client) => {
          if (client.id !== id) {
            client.send(JSON.stringify(message));
          }
        });

        break;

      case 'disconnect':
        break;

      default:
        console.log('received unknow event', parsed);
        break;
    }
  };

  ws.onclose = (event) => {
    console.log('closing socket');
    try {
      if (ws.state?.id) {
        console.log('need to destroy instance player');
        message = { event: 'disconnect', player: { id: ws.state.id } };
        console.log(message);
        wss.clients.forEach((client) => {
          client.send(JSON.stringify(message));
        });
        console.log('socket closed', wss.clients.size);
      } else {
        console.log('no need to send destroy event');
      }
    } catch (error) {
      console.log(error);
    }
  };
});

const port = process.env.PORT || 80;

httpServer.listen(port, () => {
  console.log('Server started. Port: ', port);
});
