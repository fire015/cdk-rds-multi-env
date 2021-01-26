#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { NetworkStack } from "../lib/network-stack";
import { IDatabaseStackEnvProps } from "../lib/IDatabaseStackEnvProps";
import { DatabaseStack } from "../lib/database-stack";
import { IEnvProps } from "../lib/shared/IEnvProps";

const app = new cdk.App();
const name = app.node.tryGetContext("app:name");

const prodAccountNr: string = app.node.tryGetContext("app:prodAwsAccountNumber");
const stackEnvPropsProd: IEnvProps | undefined =
  prodAccountNr && prodAccountNr.length === 12
    ? {
        account: prodAccountNr,
        region: app.node.tryGetContext("app:prodAwsRegion"),
        envName: "prod",
        appName: name,
      }
    : undefined;

const stackEnvPropsTest: IEnvProps = {
  account: app.node.tryGetContext("app:testAwsAccountNumber"),
  region: app.node.tryGetContext("app:testAwsRegion"),
  envName: "test",
  appName: name,
};

let stackEnvProps: IEnvProps;

if (stackEnvPropsProd) {
  stackEnvProps = stackEnvPropsProd;
} else {
  stackEnvProps = stackEnvPropsTest;
}

const networkStack = new NetworkStack(app, `${stackEnvProps.appName}-NetworkStack-${stackEnvProps.envName}`, stackEnvProps);

const databaseStackEnvProps: IDatabaseStackEnvProps = {
  ...stackEnvProps,
  vpc: networkStack.vpc,
  bastion: networkStack.bastion,
};

const databaseStack = new DatabaseStack(
  app,
  `${databaseStackEnvProps.appName}-DatabaseStack-${databaseStackEnvProps.envName}`,
  databaseStackEnvProps
);

databaseStack.addDependency(networkStack);
