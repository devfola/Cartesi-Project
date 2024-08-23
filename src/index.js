// XXX even though ethers is not used in the code below, it's very likely
// it will be used by any DApp, so we are already including it here
const { ethers } = require("ethers");

const rollup_server = process.env.ROLLUP_HTTP_SERVER_URL;
console.log("HTTP rollup_server url is " + rollup_server);

let humansList = [];

class Users {

  constructor(address,username, age) {
    this.address = address;
    this.username = username;
    this.age = age;
  }
}


function registerUser(address, username, age) {
  humansList.push(new Users(address, username, age));
}



async function handle_advance(data) {
  console.log("Received advance request data: " + JSON.stringify(data));

  const metadata = data["metadata"];
  const sender = metadata["msg_sender"];
  const payload = data["payload"];

  try {
    const username = ethers.hexlify(ethers.toUtf8Bytes(JSON.stringify(payload.username)))
    const age = parseInt(hexToUtf8(payload.age));

    registerUser(sender, username, age);

    log.info(`User: ${sender} registered successfully!`);

    const notice_req = await fetch(rollup_server + "/notice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload: ethers.toUtf8Bytes(JSON.stringify(`User: ${sender} registered successfully!`))}),
    });

 
  } catch (error) {

    const report_req = await fetch(rollup_server + "/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload: ethers.toUtf8Bytes(JSON.stringify(error))}),
    });

  }

  return "accept";
}

async function handle_inspect(data) {
  console.log("Received inspect request data " + JSON.stringify(data));

  const users = JSON.stringify({humansList});

  const report_req = await fetch(rollup_server + "/report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      payload: ethers.hexlify(ethers.toUtf8Bytes(JSON.stringify({ users }))),
    }),
  });
  return "accept";
}

var handlers = {
  advance_state: handle_advance,
  inspect_state: handle_inspect,
};

var finish = { status: "accept" };

(async () => {
  while (true) {
    const finish_req = await fetch(rollup_server + "/finish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "accept" }),
    });

    console.log("Received finish status " + finish_req.status);

    if (finish_req.status == 202) {
      console.log("No pending rollup request, trying again");
    } else {
      const rollup_req = await finish_req.json();
      var handler = handlers[rollup_req["request_type"]];
      finish["status"] = await handler(rollup_req["data"]);
    }
  }
})();
