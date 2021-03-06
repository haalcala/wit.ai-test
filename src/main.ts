//importing dependencies
import express from "express";
import fileUpload from "express-fileupload";
import multer from "multer";
import axios from "axios";
import _ from "lodash";

import * as AWS from "aws-sdk";

import dotenv from "dotenv";

dotenv.config();

AWS.config.getCredentials(function (err) {
  if (err) console.log(err.stack);
  // credentials not loaded
  else {
    console.log("Access key:", AWS.config.credentials.accessKeyId);
  }
});

AWS.config.update({ region: "ap-northeast-1" });

var ec2 = new AWS.EC2({ apiVersion: "2016-11-15" });

function describeInstances(params) {
  return new Promise((res, rej) => {
    ec2.describeInstances(params, (err, data) => {
      if (err) {
        return rej(err);
      }

      //   console.log("data:", data);

      res(data);
    });
  });
}

const witToken = process.env.WIT_AI_KEY; //don't put your token inline

//start express app
const app = express();

// make all the files in 'public' available
// https://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

app.use((req, res, next) => {
  // -----------------------------------------------------------------------
  // authentication middleware

  const auth = { login: process.env.BASIC_AUTH_USER || "" + new Date(), password: process.env.BASIC_AUTH_PASS || "" + new Date() }; // change this

  // parse login and password from headers
  const b64auth = (req.headers.authorization || "").split(" ")[1] || "";
  const [login, password] = Buffer.from(b64auth, "base64").toString().split(":");

  // Verify login and password are set and correct
  if (login && password && login === auth.login && password === auth.password) {
    // Access granted...
    return next();
  }

  // Access denied...
  res.set("WWW-Authenticate", 'Basic realm="401"'); // change this
  res.status(401).send("Authentication required."); // custom message

  // -----------------------------------------------------------------------
});

// https://expressjs.com/en/starter/basic-routing.html
app.get("/", (request, response) => {
  response.sendFile(__dirname + "/views/index.html");
});

app.use(fileUpload({}));

const upload = multer({
  limits: {
    // 2 MB upload limit.  Should just fall under wit's 20-second limit
    fileSize: 2 * 1024 * 1024,
    files: 1, // 1 file
  },
});

app.post("/upload", upload.single("myfile"), async (req, res, next) => {
  //extract the file from the request

  // @ts-ignore
  let upFile = req.files.myfile;

  console.log("file uploaded:");
  console.log(upFile);
  var buffer = upFile.data;

  const date = `${new Date().getFullYear()}${new Date().getMonth()}${new Date().getDate()}${new Date().getHours()}${new Date().getMinutes()}`;

  const url = "https://api.wit.ai/speech";

  console.log(`Sending to ${url}`);

  try {
    const witResponse = await axios.post(url, buffer, {
      headers: {
        Authorization: "Bearer " + witToken,
        "Content-Type": "audio/wav",
      },
    });

    const resp = JSON.parse(`[${witResponse.data.split("\r")}]`);
    console.log("wit response: " + JSON.stringify(resp));

    const ai_result = {} as any

    for (let r of resp) {
        if (r.entities) {
            for (let i of Object.keys(r.entities)) {
                for (let e of r.entities[i]) {
                  if (e.confidence > 0.8) {
                      ai_result[e.name] = e.value
                  }
                
              }
            }
        }
    }

    console.log("ai_result:",ai_result);

    if (ai_result.instances === "instances") {
        const aws_resp = (await describeInstances({})) as any;

        console.log("aws_resp:", aws_resp);

        let instances = [];

        for (let r of aws_resp.Reservations) {
          for (let s of r.Instances) {
            const instance = { InstanceId: s.InstanceId, state: s.State } as any;

            for (let t of s.Tags) {
              if (t.Key === "Name") {
                instance.Name = t.Value;

                instances.push(instance);

                break;
              }
            }
          }
        }

        if (ai_result.state) {
            instances = instances.filter(i => i.state.Name.toLowerCase() === ai_result.state.toLowerCase())
        }

        // @ts-ignore
        const ret = { wit_response: resp, attachment: { instances: instances } };
        console.log("Success", JSON.stringify(ret, null, 4));

        res.json(ret);

        return;
    }

    res.json({ wit_response: resp });
  } catch (e) {
    console.log("error sending to wit: " + e);
    res.json({ error: e.message });
  }
});

// listen for requests :)
const listener = app.listen(7777, () => {
  // @ts-ignore
  console.log("Your app is listening on port " + listener.address().port);
});
