# CDK RDS Multi Env

Set's up a test and prod RDS environment, test being accessible to developers through the internet and prod only via a Bastion host.

Set the account number for the environment you wish to deploy in `cdk.json` then run `npm run deploy`.

Based on https://github.com/rfpedrosa/aws-cdk

# Access the Database

In test you should be able to access the DB from anywhere with credentials in the secrets managers.

For prod use the bastion host.

# Bastion Host

Get the bastion host instance ID and availability zone, then run the `ec2-instance-connect` command to allow your SSH key to be used for the next 60 seconds:

```
aws ec2 describe-instances --filters 'Name=tag:Name,Values=BastionHost' --query 'Reservations[0].Instances[0].[InstanceId, Placement.AvailabilityZone, PublicDnsName]'
aws ec2-instance-connect send-ssh-public-key --region [REGION] --instance-id [ID] --availability-zone [ZONE] --instance-os-user ec2-user --ssh-public-key file://~/.ssh/id_rsa.pub
ssh ec2-user@[PublicDnsName]
```

Once on the host you should be able to connect to the RDS database with credentials in the secrets managers.