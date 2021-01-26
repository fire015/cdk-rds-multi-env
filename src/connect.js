const fs = require("fs");
const path = require("path");
const AWS = require("aws-sdk");
const mysql = require("mysql");

const getConnectionDetails = async () => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, "../outputs.json")));

  for (const key in data) {
    if (key.includes("DatabaseStack")) {
      const connectionDetails = JSON.parse(data[key]["connectionDetails"]);
      const secretData = await getSecretData(connectionDetails["secretArn"]);
      secretData["host"] = connectionDetails["readHostname"];

      return secretData;
    }
  }
};

const getSecretData = async (secretArn) => {
  const client = new AWS.SecretsManager({
    region: "us-east-1",
  });

  const secret = await client.getSecretValue({ SecretId: secretArn }).promise();
  const secretData = JSON.parse(secret.SecretString);

  return secretData;
};

const run = async () => {
  const config = await getConnectionDetails();
  //console.log(config);

  const connection = mysql.createConnection({
    host: config.host,
    user: config.username,
    password: config.password,
    port: config.port,
    connectTimeout: 2000,
  });

  connection.connect(function (err) {
    if (err) {
      console.error("Database connection failed: " + err.stack);
      return;
    }

    console.log("Connected to database.");
  });

  connection.on("error", function (err) {
    console.error("DB error:", err);
  });

  connection.end();
};

run();
