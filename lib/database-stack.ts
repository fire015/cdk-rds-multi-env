import { Construct, Duration, Stack, RemovalPolicy, CfnOutput } from "@aws-cdk/core";
import * as rds from "@aws-cdk/aws-rds";
import * as ec2 from "@aws-cdk/aws-ec2";
import { IDatabaseStackEnvProps } from "./IDatabaseStackEnvProps";
import { IsProd } from "./shared/Environment";

interface IDatabaseConnectionDetails {
  secretArn: string;
  readHostname: string;
}

export class DatabaseStack extends Stack {
  constructor(scope: Construct, id: string, props: IDatabaseStackEnvProps) {
    super(scope, id, {
      env: {
        account: props.account,
        region: props.region,
      },
      tags: {
        environment: props.envName,
      },
    });

    let connectionDetails: IDatabaseConnectionDetails;

    if (IsProd(props)) {
      const rdsDbCluster = new rds.DatabaseCluster(this, `${props.appName}-${props.envName}-DbCluster`, {
        clusterIdentifier: `${props.appName}-${props.envName}-DbCluster`,
        defaultDatabaseName: props.appName,
        engine: rds.DatabaseClusterEngine.auroraMysql({
          version: rds.AuroraMysqlEngineVersion.VER_2_09_1,
        }),
        instanceProps: {
          instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
          vpcSubnets: {
            subnetType: ec2.SubnetType.ISOLATED,
          },
          vpc: props.vpc,
        },
        instances: 2,
        storageEncrypted: false,
        backup: {
          retention: Duration.days(1),
        },
      });

      if (props.bastion) {
        rdsDbCluster.connections.allowDefaultPortFrom(props.bastion);
      }

      connectionDetails = {
        secretArn: rdsDbCluster.secret!.secretArn,
        readHostname: rdsDbCluster.clusterReadEndpoint.hostname,
      };
    } else {
      const instance = new rds.DatabaseInstance(this, `${props.appName}-${props.envName}-DbInstance`, {
        engine: rds.DatabaseInstanceEngine.mysql({ version: rds.MysqlEngineVersion.VER_5_7 }),
        databaseName: props.appName,
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO), // free tier
        vpc: props.vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PUBLIC,
        },
        allocatedStorage: 10,
        backupRetention: Duration.days(0),
        removalPolicy: RemovalPolicy.DESTROY,
        storageEncrypted: false, // DB Instance class db.t2.micro does not support encryption at rest
      });

      instance.connections.allowDefaultPortFrom(ec2.Peer.anyIpv4());

      connectionDetails = {
        secretArn: instance.secret!.secretArn,
        readHostname: instance.dbInstanceEndpointAddress,
      };
    }

    new CfnOutput(this, "connectionDetails", { value: JSON.stringify(connectionDetails) });
  }
}
