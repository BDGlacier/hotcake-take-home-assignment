/*
User Story
1. As McDonald's normal customer, after I submitted my order, I wish to see my order flow into "PENDING" area. After the cooking bot process my order, I want to see it flow into to "COMPLETE" area.
-> state: ? -> PENDING -> COMPLETE
2. As McDonald's VIP member, after I submitted my order, I want my order being process first before all order by normal customer. However if there's existing order from VIP member, my order should queue behind his/her order.
-> priority queue
3. As McDonald's manager, I want to increase or decrease number of cooking bot available in my restaurant. When I increase a bot, it should immediately process any pending order. When I decrease a bot, the processing order should remain un-process.
-> cooking bot = task consumer
4. As McDonald bot, it can only pickup and process 1 order at a time, each order required 10 seconds to complete process.

Requirements
1. When "New Normal Order" clicked, a new order should show up "PENDING" Area.
2. When "New VIP Order" clicked, a new order should show up in "PENDING" Area. It should place in-front of all existing "Normal" order but behind of all existing "VIP" order.
4. When "+ Bot" clicked, a bot should be created and start processing the order inside "PENDING" area. after 10 seconds picking up the order, the order should move to "COMPLETE" area. Then the bot should start processing another order if there is any left in "PENDING" area.
6. When "- Bot" clicked, the newest bot should be destroyed. If the bot is processing an order, it should also stop the process. The order now back to "PENDING" and ready to process by other bot.
3. The order number should be unique and increasing.
5. If there is no more order in the "PENDING" area, the bot should become IDLE until a new order come in.
7. No data persistance is needed for this prototype, you may perform all the process inside memory.
*/

import React, { useState } from 'react';
import {
  ScrollView,
  Text,
  View,
  Button,
} from 'react-native';

//TODO:
//1. Move these data into component (usestate)
//2. Bots access states via redux (maybe direct store access)
let orderId = 1;
let pendingVipOrders: Order[] = [];  //TODO: concurrent queue
let pendingOrders: Order[] = [];
let completedOrders: Order[] = [];
let botList: Bot[] = [];  //TODO: pool: clean up dead bots, or reuse them

enum Priority {
  Normal = 0,
  VIP = 1
}

// enum Status {
//   CREATED = 0,  //Do we really need this?
//   PENDING = 1,
//   // PROCESSING = 2,
//   COMPLETE = 3
// }

type Order = {
  id: number
  priority: Priority
  // status: Status
};

function App(): React.JSX.Element {
  const [dummy, setDummy] = useState<number>(0);  //force update UI

  function update() {
    setDummy(n => n + 1);
  }

  //give new update function to bots
  for (const bot of botList) {
    bot.update = update;
  }

  return (
    <View style={{ padding: 20, flexDirection: 'row' }}>
      <ScrollView style={{ flex: 1 }}>
        <View>
          <Text>bot count: {botList.length}</Text>
        </View>
        <View style={{ paddingTop: 20 }}>
          <Text>PENDING:</Text>
          {pendingVipOrders.map(o => <Text key={o.id}>{`id:${o.id}, priority:${Priority[o.priority]}`}</Text>)}
          {pendingOrders.map(o => <Text key={o.id}>{`id:${o.id}, priority:${Priority[o.priority]}`}</Text>)}
        </View>
        <View style={{ paddingTop: 20 }}>
        <Text>COMPLETE:</Text>
          {completedOrders.map(o => <Text key={o.id}>{`id:${o.id}, priority:${Priority[o.priority]}`}</Text>)}
        </View>
      </ScrollView>
      <View style={{ flex: 1, flexDirection: 'column', rowGap: 20 }}>
        <Button
          title="New Normal Order"
          color="blue"
          onPress={() => {
            pendingOrders.push({
              id: orderId,
              priority: Priority.Normal,
              // status: Status.PENDING,
            });
            orderId++;
            update();
          }}
        />
        <Button
          title="New VIP Order"
          color="orange"
          onPress={() => {
            pendingVipOrders.push({
              id: orderId,
              priority: Priority.VIP,
              // status: Status.PENDING,
            });
            orderId++;
            update();
          }}
        />
        <Button
          title="+ Bot"
          color="green"
          onPress={() => {
            const bot = new Bot(update);
            botList.push(bot);
            bot.run();
            update();
          }}
        />
        <Button
          title="- Bot"
          color="red"
          onPress={() => {
            const bot = botList.pop();
            bot?.destroy();
            update();
          }}
        />
      </View>
    </View>
  );
}

class Bot {
  running: boolean;
  update: () => void;

  constructor(update: () => void) {
    this.running = true;
    this.update = update;
  }

  destroy() {
    this.running = false;
  }

  async run() {
    while(this.running) {
      //idle
      //TODO: wait & notify, we want multi-thread here
      if(pendingVipOrders.length === 0 && pendingOrders.length === 0) {
        await sleep(200);
        continue;
      }

      //pick up an order
      let order = pendingVipOrders.length > 0 ? pendingVipOrders.splice(0, 1)[0] :  pendingOrders.splice(0, 1)[0];
      // order.status = Status.PROCESSING;
      this.update();

      //busy-waiting as if we are "processing"
      const start = Date.now();
      while(true) {
        //destroyed
        if(!this.running) {
          // order.status = Status.PENDING;
          if(order.priority === Priority.VIP) pendingVipOrders.splice(0, 0, order);  //put it back
          else pendingOrders.splice(0, 0, order);
          this.update();
          break;
        }
        //wait until 10 secs
        if(Date.now() - start < 10 * 1000) {
          await sleep(200);
          continue;
        }
        //complete the order
        // order.status = Status.COMPLETE;
        completedOrders.push(order);
        this.update();
        break;  //done
      }
    }
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default App;
